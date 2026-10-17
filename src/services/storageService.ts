import {
  SavedExercise,
  SavedVocabularyItem,
  SavedPracticeResult,
  UserCloudStore,
} from '../types/index.js';
import { getUserProfile } from './userProfileService.js';

const LOCAL_STORAGE_KEY = 'liming_user_cloud_store_v1';

function getDefaultStore(): UserCloudStore {
  return {
    updatedAt: new Date().toISOString(),
    googleScriptWebhookUrl: '',
    googleScriptToken: '',
    exercises: [],
    vocabulary: [],
    results: [],
  };
}

export function loadLocalCloudStore(): UserCloudStore {
  if (typeof window === 'undefined') return getDefaultStore();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return getDefaultStore();
    const parsed = JSON.parse(raw);
    return {
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      googleScriptWebhookUrl: parsed.googleScriptWebhookUrl || '',
      googleScriptToken: parsed.googleScriptToken || '',
      exercises: Array.isArray(parsed.exercises) ? parsed.exercises : [],
      vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [],
      results: Array.isArray(parsed.results) ? parsed.results : [],
    };
  } catch {
    return getDefaultStore();
  }
}

export function saveLocalCloudStore(store: UserCloudStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn('Could not persist cloud store to localStorage:', err);
  }
}

/**
 * Fetch and merge the latest store from the server
 */
export async function fetchServerCloudStore(): Promise<{
  store: UserCloudStore;
  hasGoogleWebhookConfigured: boolean;
}> {
  const local = loadLocalCloudStore();
  try {
    const res = await fetch('/api/storage');
    if (res.ok) {
      const data = await res.json();
      if (data && data.store) {
        const merged = mergeStores(local, data.store);
        saveLocalCloudStore(merged);
        return {
          store: merged,
          hasGoogleWebhookConfigured: Boolean(data.hasGoogleWebhookConfigured || merged.googleScriptWebhookUrl),
        };
      }
    }
  } catch (err) {
    console.warn('Could not fetch /api/storage, using local store:', err);
  }
  return {
    store: local,
    hasGoogleWebhookConfigured: Boolean(local.googleScriptWebhookUrl),
  };
}

function mergeById<T extends { id: string }>(a: T[], b: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of b) {
    if (item && item.id) map.set(item.id, item);
  }
  for (const item of a) {
    if (item && item.id) map.set(item.id, item);
  }
  return Array.from(map.values());
}

function mergeStores(local: UserCloudStore, remote: UserCloudStore): UserCloudStore {
  return {
    updatedAt: new Date().toISOString(),
    googleScriptWebhookUrl: local.googleScriptWebhookUrl || remote.googleScriptWebhookUrl || '',
    googleScriptToken: local.googleScriptToken || remote.googleScriptToken || '',
    exercises: mergeById(local.exercises, remote.exercises),
    vocabulary: mergeById(local.vocabulary, remote.vocabulary),
    results: mergeById(local.results, remote.results),
  };
}

/**
 * Save an exercise (Conversation scenario, Shadowing dialogue, or Reading text)
 * to local store + server + Google Drive / Google Sheets
 */
export async function saveExerciseToCloud(
  exercise: Omit<SavedExercise, 'id' | 'createdAt'> & { id?: string }
): Promise<SavedExercise> {
  const store = loadLocalCloudStore();
  const item: SavedExercise = {
    id: exercise.id || `ex-${Date.now()}`,
    type: exercise.type,
    title: exercise.title,
    chineseTitle: exercise.chineseTitle,
    level: exercise.level || getUserProfile().hskLevel,
    createdAt: new Date().toISOString(),
    payload: exercise.payload,
  };

  store.exercises = [item, ...store.exercises.filter((e) => e.id !== item.id)].slice(0, 200);
  store.updatedAt = new Date().toISOString();
  saveLocalCloudStore(store);

  try {
    await fetch('/api/storage/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        exercise: item,
        googleScriptWebhookUrl: store.googleScriptWebhookUrl,
        googleScriptToken: store.googleScriptToken,
      }),
    });
  } catch (err) {
    console.warn('Offline saveExerciseToCloud; stored locally:', err);
  }

  return item;
}

/**
 * Save a vocabulary word or phrase to local store + server + Google Sheets
 */
export async function saveVocabularyToCloud(
  vocab: Omit<SavedVocabularyItem, 'id' | 'createdAt'> & { id?: string }
): Promise<SavedVocabularyItem> {
  const store = loadLocalCloudStore();
  const existing = store.vocabulary.find((v) => v.hanzi === vocab.hanzi);
  const item: SavedVocabularyItem = {
    id: vocab.id || existing?.id || `voc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    hanzi: vocab.hanzi,
    pinyin: vocab.pinyin,
    meaning: vocab.meaning,
    exampleHanzi: vocab.exampleHanzi,
    sourceMode: vocab.sourceMode,
    createdAt: new Date().toISOString(),
  };

  store.vocabulary = [
    item,
    ...store.vocabulary.filter((v) => v.id !== item.id && v.hanzi !== item.hanzi),
  ].slice(0, 1000);
  store.updatedAt = new Date().toISOString();
  saveLocalCloudStore(store);

  try {
    await fetch('/api/storage/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vocabularyItem: item,
        googleScriptWebhookUrl: store.googleScriptWebhookUrl,
        googleScriptToken: store.googleScriptToken,
      }),
    });
  } catch (err) {
    console.warn('Offline saveVocabularyToCloud; stored locally:', err);
  }

  return item;
}

/**
 * Save a practice or diagnostic evaluation result to local store + server + Google Sheets
 */
export async function savePracticeResultToCloud(
  result: Omit<SavedPracticeResult, 'id' | 'createdAt'> & { id?: string }
): Promise<SavedPracticeResult> {
  const store = loadLocalCloudStore();
  const item: SavedPracticeResult = {
    id: result.id || `res-${Date.now()}`,
    mode: result.mode,
    title: result.title,
    score: result.score,
    passed: result.passed,
    hskLevel: result.hskLevel || getUserProfile().hskLevel,
    details: result.details,
    createdAt: new Date().toISOString(),
  };

  store.results = [item, ...store.results.filter((r) => r.id !== item.id)].slice(0, 500);
  store.updatedAt = new Date().toISOString();
  saveLocalCloudStore(store);

  try {
    await fetch('/api/storage/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resultItem: item,
        googleScriptWebhookUrl: store.googleScriptWebhookUrl,
        googleScriptToken: store.googleScriptToken,
      }),
    });
  } catch (err) {
    console.warn('Offline savePracticeResultToCloud; stored locally:', err);
  }

  return item;
}

/**
 * Delete an item from local store + server
 */
export async function deleteCloudStoreItem(
  category: 'exercises' | 'vocabulary' | 'results',
  id: string
): Promise<UserCloudStore> {
  const store = loadLocalCloudStore();
  store[category] = (store[category] as any[]).filter((item) => item.id !== id);
  store.updatedAt = new Date().toISOString();
  saveLocalCloudStore(store);

  try {
    await fetch(`/api/storage/${category}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.warn('Offline deleteCloudStoreItem:', err);
  }

  return store;
}

/**
 * Perform a full sync with the server and Google Sheets / Google Drive
 */
export async function syncAllWithGoogleWorkspace(
  customWebhookUrl?: string,
  customToken?: string
): Promise<{
  ok: boolean;
  store: UserCloudStore;
  cloudSync: { synced: boolean; message: string; remoteData?: any };
}> {
  const local = loadLocalCloudStore();
  if (customWebhookUrl !== undefined) {
    local.googleScriptWebhookUrl = customWebhookUrl.trim();
  }
  if (customToken !== undefined) {
    local.googleScriptToken = customToken.trim();
  }
  if (customWebhookUrl !== undefined || customToken !== undefined) {
    saveLocalCloudStore(local);
  }

  const res = await fetch('/api/storage/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      googleScriptWebhookUrl: local.googleScriptWebhookUrl,
      googleScriptToken: local.googleScriptToken,
      exercises: local.exercises,
      vocabulary: local.vocabulary,
      results: local.results,
      profile: getUserProfile(),
    }),
  });

  if (!res.ok) {
    throw new Error(`Error ${res.status} al sincronizar con el servidor`);
  }

  const data = await res.json();
  if (data.store) {
    const merged = mergeStores(local, data.store);
    saveLocalCloudStore(merged);
    return {
      ok: true,
      store: merged,
      cloudSync: data.cloudSync || { synced: false, message: 'Guardado en el servidor.' },
    };
  }

  return {
    ok: true,
    store: local,
    cloudSync: data.cloudSync || { synced: false, message: 'Guardado localmente.' },
  };
}

