import { Request, Response } from 'express';
import { getGenAI } from '../config/gemini.js';
import { ENV } from '../config/env.js';
import { SHADOWING_MOCKS } from '../mocks/shadowingMocks.js';
import { 
  createShadowingPrompt, 
  SHADOWING_RESPONSE_SCHEMA,
  createShadowingEvaluationPrompt,
  SHADOWING_EVALUATION_SCHEMA
} from '../prompts/tutorPrompts.js';

export async function handleGenerateShadowing(req: Request, res: Response) {
  try {
    const rawTopic = req.body?.prompt ?? req.body?.topic;
    const category = req.body?.category;
    const userProfileContext = req.body?.userProfileContext || '';
    const cleanTopic = typeof rawTopic === 'string' && rawTopic.trim()
      ? rawTopic.trim()
      : 'Planes espontáneos de fin de semana y comida en Pekín';

    const ai = getGenAI();

    if (!ai) {
      const lower = cleanTopic.toLowerCase();
      if (lower.includes('taxi') || lower.includes('aeropuerto') || lower.includes('viaj')) {
        return res.json(SHADOWING_MOCKS[1] || SHADOWING_MOCKS[0]);
      }
      return res.json(SHADOWING_MOCKS[0]);
    }

    const prompt = createShadowingPrompt(cleanTopic, category, userProfileContext);

    const candidateModels = [
      ENV.GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: SHADOWING_RESPONSE_SCHEMA,
          }
        });

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.turns) && parsed.turns.length > 0) {
            // Assign fallback ID and defaults if missing
            parsed.id = parsed.id || `shadowing-${Date.now()}`;
            parsed.chineseTitle = parsed.chineseTitle || '汉语跟读练习';
            parsed.badge = parsed.badge || 'HSK • Ritmo Nativo';
            return res.json(parsed);
          }
        }
      } catch (err) {
        lastError = err;
        console.warn(`handleGenerateShadowing with model ${modelName} failed, trying next fallback:`, err);
      }
    }

    console.error('All model candidates failed for handleGenerateShadowing:', lastError);
    return res.json(SHADOWING_MOCKS[0]);
  } catch (err: any) {
    console.error('Fatal error generating shadowing:', err);
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

    const ai = getGenAI();

    if (!ai) {
      return res.json(calculateFallbackEvaluation({
        transcribedText: cleanTranscribed,
        expectedText: cleanExpected,
        expectedPinyin,
        durationSeconds: durSec,
        keyPhoneticFocus,
        objectives
      }));
    }

    const prompt = createShadowingEvaluationPrompt({
      transcribedText: cleanTranscribed,
      expectedText: cleanExpected,
      expectedPinyin,
      durationSeconds: durSec,
      keyPhoneticFocus,
      objectives
    });

    const candidateModels = [
      ENV.GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];

    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: SHADOWING_EVALUATION_SCHEMA,
          }
        });

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (typeof parsed.score === 'number') {
            return res.json(parsed);
          }
        }
      } catch (err) {
        lastError = err;
        console.warn(`handleEvaluateShadowing with model ${modelName} failed, trying fallback:`, err);
      }
    }

    console.error('All model candidates failed for handleEvaluateShadowing:', lastError);
    return res.json(calculateFallbackEvaluation({
      transcribedText: cleanTranscribed,
      expectedText: cleanExpected,
      expectedPinyin,
      durationSeconds: durSec,
      keyPhoneticFocus,
      objectives
    }));
  } catch (err: any) {
    console.error('Fatal error evaluating shadowing turn:', err);
    return res.status(500).json({ error: 'Error interno al evaluar el turno de shadowing.' });
  }
}

/**
 * Algorithmic fallback evaluation when offline or LLM unavailable
 */
function calculateFallbackEvaluation(params: {
  transcribedText: string;
  expectedText: string;
  expectedPinyin: string;
  durationSeconds: number;
  keyPhoneticFocus: string;
  objectives: Array<{ id: string; description: string }>;
}) {
  const { transcribedText, expectedText, expectedPinyin, durationSeconds, objectives } = params;

  // Clean punctuation from Chinese text
  const cleanExp = expectedText.replace(/[，。！？、：；\s]/g, '');
  const cleanTrans = transcribedText.replace(/[，。！？、：；\s]/g, '');

  const totalChars = Math.max(1, cleanExp.length);
  const syllablesPerSec = Number((cleanExp.length / Math.max(0.6, durationSeconds)).toFixed(1));

  // Determine Speed
  let speedRating: 'too_slow' | 'slow' | 'natural' | 'fast' | 'too_fast' = 'natural';
  let speedLabel = `Velocidad Natural (${syllablesPerSec} síl/s)`;
  let speedComment = 'Tu cadencia al hablar es fluida y cercana a la de un hablante nativo.';

  if (syllablesPerSec < 2.0) {
    speedRating = 'too_slow';
    speedLabel = `Muy Lento (${syllablesPerSec} síl/s)`;
    speedComment = 'Hiciste pausas muy prolongadas. Intenta ligar las palabras con mayor fluidez.';
  } else if (syllablesPerSec < 2.8) {
    speedRating = 'slow';
    speedLabel = `Poco Lento (${syllablesPerSec} síl/s)`;
    speedComment = 'La velocidad es clara para principiantes, pero puedes acelerar un poco para ganar naturalidad.';
  } else if (syllablesPerSec > 5.5) {
    speedRating = 'too_fast';
    speedLabel = `Muy Rápido (${syllablesPerSec} síl/s)`;
    speedComment = 'Pronunciaste muy rápido, lo que puede desdibujar los tonos. Respira y modula con calma.';
  } else if (syllablesPerSec > 4.5) {
    speedRating = 'fast';
    speedLabel = `Rápido (${syllablesPerSec} síl/s)`;
    speedComment = 'Buen dinamismo, pero asegúrate de que cada vocal y tono se distinga con claridad.';
  }

  // Count character matches
  let matchedChars = 0;
  const mistakes: Array<{
    word: string;
    type: 'omission' | 'substitution' | 'tone' | 'pronunciation';
    pinyin?: string;
    expected?: string;
    heard?: string;
    explanation: string;
  }> = [];

  const transChars = cleanTrans.split('');
  for (const char of cleanExp) {
    const idx = transChars.indexOf(char);
    if (idx !== -1) {
      matchedChars++;
      transChars.splice(idx, 1);
    } else {
      mistakes.push({
        word: char,
        type: 'omission',
        expected: char,
        heard: '',
        explanation: `Se omitió el carácter '${char}' o no fue captado por el reconocedor.`
      });
    }
  }

  // Unmatched spoken characters count as substitutions
  for (const extraChar of transChars) {
    mistakes.push({
      word: extraChar,
      type: 'substitution',
      expected: '',
      heard: extraChar,
      explanation: `Se pronunció '${extraChar}' adicional o como sustitución de otra palabra.`
    });
  }

  // Accuracy calculation
  const accuracy = Math.min(100, Math.round((matchedChars / totalChars) * 100));
  const passed = accuracy >= 70;

  // Pauses evaluation
  let pauseRating: 'natural' | 'hesitant' | 'unnatural' | 'too_frequent' = 'natural';
  let pauseLabel = 'Pausas Naturales';
  let pauseComment = 'Respetaste la separación lógica de las frases y las comas del diálogo.';

  if (speedRating === 'too_slow' || durationSeconds > cleanExp.length * 0.8) {
    pauseRating = 'hesitant';
    pauseLabel = 'Pausas Vacilantes';
    pauseComment = 'Se detectaron pequeñas dudas entre caracteres. Intenta practicar la frase completa de una sola respiración.';
  }

  const completedObjectives = passed && objectives.length > 0 ? [objectives[0].id] : [];

  return {
    score: accuracy,
    passed,
    transcribedText,
    expectedText,
    speed: {
      rating: speedRating,
      syllablesPerSecond: syllablesPerSec,
      label: speedLabel,
      comment: speedComment
    },
    pauses: {
      rating: pauseRating,
      label: pauseLabel,
      comment: pauseComment
    },
    mistakes: mistakes.slice(0, 5),
    pronunciationFeedback: passed
      ? '¡Muy buena imitación! Continúa prestando atención a los tonos 3º y 4º para mantener la máxima autenticidad.'
      : 'Intenta escuchar el modelo nuevamente enfocándote en los grupos de palabras principales antes de repetir.',
    generalAdvice: 'El shadowing funciona mejor cuando repites la frase 2 o 3 veces hasta que la boca se acostumbre al movimiento articular.',
    completedObjectives
  };
}
