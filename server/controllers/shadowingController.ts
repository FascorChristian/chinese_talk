import { Request, Response } from 'express';
import { generateGeminiJson } from '../config/gemini.js';
import { SHADOWING_MOCKS } from '../mocks/shadowingMocks.js';
import { evaluateShadowingWithPhonetics } from '../utils/phoneticEngine.js';
import { 
  createShadowingPrompt, 
  SHADOWING_RESPONSE_SCHEMA
} from '../prompts/tutorPrompts.js';

export async function handleGenerateShadowing(req: Request, res: Response) {
  try {
    const rawTopic = req.body?.prompt ?? req.body?.topic;
    const category = req.body?.category;
    const userProfileContext = req.body?.userProfileContext || '';
    const cleanTopic = typeof rawTopic === 'string' && rawTopic.trim()
      ? rawTopic.trim()
      : 'Planes espontáneos de fin de semana y comida en Pekín';

    // Check if topic matches one of our built-in curated dialogues first to save RPM on initial load
    const lower = cleanTopic.toLowerCase();
    if (lower === 'planes espontáneos de fin de semana y comida en pekín' && !req.body?.forceAi) {
      return res.json(SHADOWING_MOCKS[0]);
    }

    const prompt = createShadowingPrompt(cleanTopic, category, userProfileContext);

    const result = await generateGeminiJson<any>({
      cacheScope: `shadowing-gen:${cleanTopic}:${category || ''}`,
      contents: prompt,
      responseSchema: SHADOWING_RESPONSE_SCHEMA,
      ttlMs: 1000 * 60 * 60, // Cache generated dialogues for 1 hour
    });

    if (result && result.data && Array.isArray(result.data.turns) && result.data.turns.length > 0) {
      const parsed = result.data;
      parsed.id = parsed.id || `shadowing-${Date.now()}`;
      parsed.chineseTitle = parsed.chineseTitle || '汉语跟读练习';
      parsed.badge = parsed.badge || 'HSK • Ritmo Nativo';
      return res.json(parsed);
    }

    if (lower.includes('taxi') || lower.includes('aeropuerto') || lower.includes('viaj')) {
      return res.json(SHADOWING_MOCKS[1] || SHADOWING_MOCKS[0]);
    }
    return res.json(SHADOWING_MOCKS[0]);
  } catch (err: any) {
    console.error('Error generating shadowing:', err);
    return res.json(SHADOWING_MOCKS[0]);
  }
}

export async function handleEvaluateShadowing(req: Request, res: Response) {
  try {
    const {
      transcribedText = '',
      expectedText = '',
      expectedPinyin = '',
      durationSeconds = 2.0,
      keyPhoneticFocus = 'Claridad fonética y tonos estándar.',
      objectives = []
    } = req.body;

    const cleanExpected = typeof expectedText === 'string' ? expectedText.trim() : '';
    const cleanTranscribed = typeof transcribedText === 'string' ? transcribedText.trim() : '';
    const durSec = typeof durationSeconds === 'number' && durationSeconds > 0 ? durationSeconds : 2.0;

    // Deterministic Pinyin + Homophone-Aware Phonetic Evaluation (0 RPM cost, <5ms, 100% fair on homophones)
    const evaluation = evaluateShadowingWithPhonetics({
      transcribedText: cleanTranscribed,
      expectedText: cleanExpected,
      expectedPinyin,
      durationSeconds: durSec,
      keyPhoneticFocus,
      objectives,
    });

    return res.json(evaluation);
  } catch (err: any) {
    console.error('Fatal error evaluating shadowing turn:', err);
    return res.status(500).json({ error: 'Error interno al evaluar el turno de shadowing.' });
  }
}
