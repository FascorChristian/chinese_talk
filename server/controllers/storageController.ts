import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'user_cloud_store.json');

export interface SavedExerciseItem {
  id: string;
  type: 'conversation' | 'shadowing' | 'reading' | 'diagnostic';
  title: string;
  chineseTitle?: string;
  level: string;
  summary: string;
  content: any; // Full Scenario, ShadowingDialogue, or ReadingContent
  createdAt: string;
  driveFileUrl?: string;
}

export interface SavedVocabItem {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  exampleHanzi?: string;
  exampleTranslation?: string;
  sourceMode?: string;
  mastered?: boolean;
  createdAt: string;
}

export interface SavedResultItem {
  id: string;
  mode: 'conversation' | 'shadowing' | 'reading' | 'diagnostic';
  title: string;
  score: number;
  passed: boolean;
  hskLevel: string;
  feedback: string;
  mistakesCount: number;
  createdAt: string;
}

export interface CloudStoreData {
  webhookUrl: string;
  apiToken?: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
  exercises: SavedExerciseItem[];
  vocabulary: SavedVocabItem[];
  results: SavedResultItem[];
}

function loadStore(): CloudStoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        webhookUrl: parsed.webhookUrl || ENV.GOOGLE_SCRIPT_WEBHOOK_URL || '',
        apiToken: parsed.apiToken || ENV.GOOGLE_SCRIPT_API_TOKEN || '',
        autoSync: parsed.autoSync !== undefined ? parsed.autoSync : true,
        lastSyncedAt: parsed.lastSyncedAt || null,
        exercises: Array.isArray(parsed.exercises) ? parsed.exercises : [],
        vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
        results: Array.isArray(parsed.results) ? parsed.results : [],
      };
    }
  } catch (err) {
    console.warn('Error loading cloud store file:', err);
  }
  return {
    webhookUrl: ENV.GOOGLE_SCRIPT_WEBHOOK_URL || '',
    apiToken: ENV.GOOGLE_SCRIPT_API_TOKEN || '',
    autoSync: true,
    lastSyncedAt: null,
    exercises: [],
    vocabulary: [],
    results: [],
  };
}

function saveStore(data: CloudStoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Error writing cloud store file:', err);
  }
}

/**
 * Sends payload to Google Apps Script Web App (Google Sheets + Google Drive)
 */
async function pushToGoogleWorkspace(
  webhookUrl: string,
  payload: any,
  token?: string
): Promise<{ ok: boolean; message?: string; data?: any }> {
  if (!webhookUrl || !webhookUrl.startsWith('https://script.google.com/')) {
    return { ok: false, message: 'URL de Google Apps Script no configurada o inválida.' };
  }

  const activeToken = token || ENV.GOOGLE_SCRIPT_API_TOKEN || '';
  const bodyPayload = {
    ...payload,
    ...(activeToken ? { token: activeToken } : {}),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
      },
      body: JSON.stringify(bodyPayload),
      redirect: 'follow',
    });

    const text = await response.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 200) };
    }

    if (response.ok) {
      if (parsed && parsed.ok === false) {
        return { ok: false, message: parsed.error || parsed.message || 'Error en Google Apps Script' };
      }
      return { ok: true, data: parsed };
    }
    return { ok: false, message: `Google respondió con estado ${response.status}: ${parsed?.error || text.slice(0, 150)}` };
  } catch (err: any) {
    console.warn('Error syncing with Google Sheets/Drive:', err);
    return { ok: false, message: err?.message || 'Error de red al conectar con Google Drive/Sheets' };
  }
}

export async function handleGetStorage(_req: Request, res: Response) {
  const store = loadStore();
  return res.json({
    autoSync: store.autoSync,
    lastSyncedAt: store.lastSyncedAt,
    exercises: store.exercises,
    vocabulary: store.vocabulary,
    results: store.results,
  });
}

export async function handleSyncStorage(req: Request, res: Response) {
  try {
    const store = loadStore();
    const {
      action = 'sync_all', // 'add_exercise' | 'add_vocab' | 'add_result' | 'save_config' | 'sync_all' | 'save_exercise_to_drive'
      item,
      webhookUrl,
      apiToken,
      token,
      googleScriptToken,
      googleScriptWebhookUrl,
      autoSync,
      clientStore,
    } = req.body || {};

    const rawUrl = webhookUrl || googleScriptWebhookUrl;
    if (typeof rawUrl === 'string') {
      store.webhookUrl = rawUrl.trim();
    }
    const rawToken = apiToken || token || googleScriptToken;
    if (typeof rawToken === 'string') {
      store.apiToken = rawToken.trim();
    }
    if (typeof autoSync === 'boolean') {
      store.autoSync = autoSync;
    }

    // Merge client items if provided
    if (clientStore) {
      if (Array.isArray(clientStore.exercises)) {
        const existingIds = new Set(store.exercises.map((e) => e.id));
        for (const ex of clientStore.exercises) {
          if (ex && ex.id && !existingIds.has(ex.id)) {
            store.exercises.unshift(ex);
          }
        }
      }
      if (Array.isArray(clientStore.vocabulary)) {
        const existingWords = new Set(store.vocabulary.map((v) => v.hanzi));
        for (const voc of clientStore.vocabulary) {
          if (voc && voc.hanzi && !existingWords.has(voc.hanzi)) {
            store.vocabulary.unshift(voc);
          }
        }
      }
      if (Array.isArray(clientStore.results)) {
        const existingResIds = new Set(store.results.map((r) => r.id));
        for (const r of clientStore.results) {
          if (r && r.id && !existingResIds.has(r.id)) {
            store.results.unshift(r);
          }
        }
      }
    }

    if (action === 'add_exercise' && item) {
      store.exercises = [item, ...store.exercises.filter((e) => e.id !== item.id)].slice(0, 200);
    } else if (action === 'add_vocab' && item) {
      store.vocabulary = [item, ...store.vocabulary.filter((v) => v.id !== item.id && v.hanzi !== item.hanzi)].slice(0, 500);
    } else if (action === 'add_result' && item) {
      store.results = [item, ...store.results.filter((r) => r.id !== item.id)].slice(0, 300);
    }

    saveStore(store);

    // If webhookUrl is configured, push to Google Sheets & Google Drive
    const activeUrl = store.webhookUrl || ENV.GOOGLE_SCRIPT_WEBHOOK_URL;
    const activeToken = store.apiToken || ENV.GOOGLE_SCRIPT_API_TOKEN;
    let googleSyncResult: { ok: boolean; message?: string; data?: any } = {
      ok: false,
      message: 'Guardado localmente. Configura tu URL de Google Apps Script para sincronizar con Google Sheets y Drive.',
    };

    if (activeUrl && (store.autoSync || action === 'sync_all' || action === 'save_exercise_to_drive')) {
      googleSyncResult = await pushToGoogleWorkspace(activeUrl, {
        action,
        timestamp: new Date().toISOString(),
        item: item || null,
        fullStore: action === 'sync_all' ? {
          exercises: store.exercises,
          vocabulary: store.vocabulary,
          results: store.results,
        } : undefined,
      }, activeToken);

      if (googleSyncResult.ok) {
        store.lastSyncedAt = new Date().toISOString();
        if (item && googleSyncResult.data?.driveFileUrl && action === 'add_exercise') {
          const target = store.exercises.find((e) => e.id === item.id);
          if (target) target.driveFileUrl = googleSyncResult.data.driveFileUrl;
        }
        saveStore(store);
      }
    }

    return res.json({
      store: {
        autoSync: store.autoSync,
        lastSyncedAt: store.lastSyncedAt,
        exercises: store.exercises,
        vocabulary: store.vocabulary,
        results: store.results,
      },
      googleSync: googleSyncResult,
    });
  } catch (err: any) {
    console.error('Error in handleSyncStorage:', err);
    return res.status(500).json({ error: 'Error al sincronizar el almacenamiento.' });
  }
}

export async function handleDeleteStorageItem(req: Request, res: Response) {
  try {
    const { category, id } = req.params;
    const store = loadStore();

    if (category === 'exercises') {
      store.exercises = store.exercises.filter((e) => e.id !== id);
    } else if (category === 'vocabulary') {
      store.vocabulary = store.vocabulary.filter((v) => v.id !== id);
    } else if (category === 'results') {
      store.results = store.results.filter((r) => r.id !== id);
    }

    saveStore(store);
    return res.json({ store });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error eliminando elemento.' });
  }
}

export async function handleExportCsv(req: Request, res: Response) {
  const { category } = req.params;
  const store = loadStore();

  const escapeCsv = (val: any) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  if (category === 'anki') {
    // Generate TSV file specially formatted for Anki desktop and AnkiMobile/AnkiDroid
    // Fields: Front, Pinyin, Back, ExampleHanzi, ExamplePinyin, ExampleTranslation, PhoneticFocus, Tags
    const tsvRows: string[] = [];
    tsvRows.push([
      '#Front (Hanzi)',
      'Pinyin',
      '#Back (Español)',
      'Ejemplo (Hanzi)',
      'Ejemplo (Pinyin)',
      'Ejemplo (Español)',
      'Foco Fonético / Nota',
      'Tags (Anki)',
    ].join('\t'));

    // 1. Vocabulary entries
    for (const v of store.vocabulary) {
      if (v.hanzi && v.meaning) {
        const tag = `LiMing Vocabulario ${(v.sourceMode || 'General').replace(/[^\w]/g, '_')}`;
        tsvRows.push([
          v.hanzi,
          v.pinyin || '',
          v.meaning,
          v.exampleHanzi || '',
          '',
          v.exampleTranslation || '',
          'Vocabulario Li Ming',
          tag,
        ].map(cell => String(cell || '').replace(/[\t\r\n]/g, ' ')).join('\t'));
      }
    }

    // 2. Exercise dialogue sentences (Shadowing & Reading)
    for (const ex of store.exercises) {
      const content = ex.content || {};
      const level = ex.level || 'HSK';
      const cleanTitle = (ex.title || 'Ejercicio').replace(/[^\w]/g, '_');

      // Shadowing turns
      if (Array.isArray(content.turns)) {
        for (const t of content.turns) {
          if (t.hanzi && t.translation) {
            tsvRows.push([
              t.hanzi,
              t.pinyin || '',
              t.translation,
              `${ex.title} (${t.speaker || 'Tutor'})`,
              '',
              '',
              t.key_phonetic_focus || 'Shadowing',
              `LiMing Shadowing ${level} ${cleanTitle}`,
            ].map(cell => String(cell || '').replace(/[\t\r\n]/g, ' ')).join('\t'));
          }
        }
      }

      // Reading sentences
      if (Array.isArray(content.sentences)) {
        for (const s of content.sentences) {
          if (s.hanzi && s.translation) {
            tsvRows.push([
              s.hanzi,
              s.pinyin || '',
              s.translation,
              content.title_hanzi || ex.title,
              content.title_pinyin || '',
              content.title_translation || '',
              'Comprensión Lectora',
              `LiMing Lectura ${level} ${cleanTitle}`,
            ].map(cell => String(cell || '').replace(/[\t\r\n]/g, ' ')).join('\t'));
          }
        }
      }
    }

    // Include UTF-8 BOM so Anki preserves Chinese characters properly
    const tsvContent = '\uFEFF' + tsvRows.join('\r\n');
    res.setHeader('Content-Type', 'text/tab-separated-values; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="li_ming_anki_tarjetas.tsv"');
    return res.send(tsvContent);
  }

  let rows: string[] = [];

  if (category === 'vocabulary') {
    rows.push(['Fecha', 'Hanzi', 'Pinyin', 'Significado', 'Ejemplo Chino', 'Modo Origen'].map(escapeCsv).join(','));
    for (const v of store.vocabulary) {
      rows.push([
        v.createdAt,
        v.hanzi,
        v.pinyin,
        v.meaning,
        v.exampleHanzi || '',
        v.sourceMode || '',
      ].map(escapeCsv).join(','));
    }
  } else if (category === 'results') {
    rows.push(['Fecha', 'Modo', 'Título', 'Puntaje (%)', 'Aprobado', 'Nivel HSK', 'Retroalimentación'].map(escapeCsv).join(','));
    for (const r of store.results) {
      rows.push([
        r.createdAt,
        r.mode,
        r.title,
        r.score,
        r.passed ? 'Sí' : 'No',
        r.hskLevel,
        r.feedback,
      ].map(escapeCsv).join(','));
    }
  } else {
    rows.push(['Fecha', 'Tipo', 'Título', 'Título Chino', 'Nivel', 'Resumen'].map(escapeCsv).join(','));
    for (const e of store.exercises) {
      rows.push([
        e.createdAt,
        e.type,
        e.title,
        e.chineseTitle || '',
        e.level,
        e.summary,
      ].map(escapeCsv).join(','));
    }
  }

  // Include UTF-8 BOM (\uFEFF) so Excel and Google Sheets open Chinese characters cleanly
  const csvContent = '\uFEFF' + rows.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="chinese_talk_${category}.csv"`);
  return res.send(csvContent);
}

