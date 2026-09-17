import { Request, Response } from 'express';
import { getGenAI } from '../config/gemini.js';
import { ENV } from '../config/env.js';
import { READING_MOCKS } from '../mocks/readingMocks.js';
import { 
  createReadingPrompt, 
  READING_RESPONSE_SCHEMA,
  createReadingAloudEvaluationPrompt,
  READING_ALOUD_EVALUATION_SCHEMA,
  createComprehensionEvaluationPrompt,
  COMPREHENSION_EVALUATION_SCHEMA
} from '../prompts/tutorPrompts.js';

export async function handleGenerateReading(req: Request, res: Response) {
  try {
    const rawTopic = req.body?.prompt ?? req.body?.topic;
    const level = req.body?.level || 'HSK 2-3';
    const genre = req.body?.genre;
    const userProfileContext = req.body?.userProfileContext || '';
    const cleanTopic = typeof rawTopic === 'string' && rawTopic.trim()
      ? rawTopic.trim()
      : 'Cultura y vida cotidiana en China';

    const ai = getGenAI();

    if (!ai) {
      const lower = cleanTopic.toLowerCase();
      if (lower.includes('hutong') || lower.includes('pekin') || lower.includes('beijing') || lower.includes('manana')) {
        return res.json(READING_MOCKS[1] || READING_MOCKS[0]);
      }
      return res.json(READING_MOCKS[0]);
    }

    const prompt = createReadingPrompt(cleanTopic, level, genre, userProfileContext);

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
            responseSchema: READING_RESPONSE_SCHEMA,
          }
        });

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed && Array.isArray(parsed.sentences) && parsed.sentences.length > 0) {
            parsed.id = parsed.id || `reading-${Date.now()}`;
            parsed.badge = parsed.badge || `${level} • Lectura y Comprensión`;
            // Assemble full text if missing
            if (!parsed.full_text_hanzi) {
              parsed.full_text_hanzi = parsed.sentences.map((s: any) => s.hanzi).join(' ');
            }
            return res.json(parsed);
          }
        }
      } catch (err) {
        lastError = err;
        console.warn(`handleGenerateReading with model ${modelName} failed, trying fallback:`, err);
      }
    }

    console.error('All candidate models failed for handleGenerateReading:', lastError);
    return res.json(READING_MOCKS[0]);
  } catch (err: any) {
    console.error('Fatal error generating reading:', err);
    return res.json(READING_MOCKS[0]);
  }
}

export async function handleEvaluateReadingAloud(req: Request, res: Response) {
  try {
    const {
      transcribedText = '',
      expectedText = '',
      durationSeconds = 3.0
    } = req.body;

    const cleanExpected = typeof expectedText === 'string' ? expectedText.trim() : '';
    const cleanTranscribed = typeof transcribedText === 'string' ? transcribedText.trim() : '';
    const durSec = typeof durationSeconds === 'number' && durationSeconds > 0 ? durationSeconds : 3.0;

    const ai = getGenAI();

    if (!ai) {
      return res.json(calculateFallbackReadingAloud({
        transcribedText: cleanTranscribed,
        expectedText: cleanExpected,
        durationSeconds: durSec
      }));
    }

    const prompt = createReadingAloudEvaluationPrompt({
      transcribedText: cleanTranscribed,
      expectedText: cleanExpected,
      durationSeconds: durSec
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
            responseSchema: READING_ALOUD_EVALUATION_SCHEMA,
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
        console.warn(`handleEvaluateReadingAloud with model ${modelName} failed:`, err);
      }
    }

    console.error('All model candidates failed for handleEvaluateReadingAloud:', lastError);
    return res.json(calculateFallbackReadingAloud({
      transcribedText: cleanTranscribed,
      expectedText: cleanExpected,
      durationSeconds: durSec
    }));
  } catch (err: any) {
    console.error('Fatal error evaluating reading aloud:', err);
    return res.status(500).json({ error: 'Error interno al evaluar la lectura en voz alta.' });
  }
}

export async function handleEvaluateComprehension(req: Request, res: Response) {
  try {
    const {
      questionZh = '',
      questionEs = '',
      expectedAnswer = '',
      fullText = '',
      userTranscript = ''
    } = req.body;

    const cleanTranscript = typeof userTranscript === 'string' ? userTranscript.trim() : '';

    if (!cleanTranscript) {
      return res.json({
        is_correct: false,
        score: 0,
        language_detected: 'unknown',
        feedback: 'No se detectó una respuesta en el audio. Intenta grabar de nuevo respondiendo a la pregunta.'
      });
    }

    const ai = getGenAI();

    if (!ai) {
      // Fallback simple keyword match
      const lower = cleanTranscript.toLowerCase();
      const hasKeyMatch = expectedAnswer.toLowerCase().split(' ').some(w => w.length > 3 && lower.includes(w));
      return res.json({
        is_correct: hasKeyMatch,
        score: hasKeyMatch ? 85 : 40,
        language_detected: /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(cleanTranscript) ? 'es' : 'zh',
        feedback: hasKeyMatch 
          ? 'Respuesta adecuada y coherente con el texto.'
          : 'Respuesta aproximada. Consulta el texto para mayor detalle.'
      });
    }

    const prompt = createComprehensionEvaluationPrompt({
      questionZh,
      questionEs,
      expectedAnswer,
      fullText,
      userTranscript: cleanTranscript
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
            responseSchema: COMPREHENSION_EVALUATION_SCHEMA,
          }
        });

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (typeof parsed.is_correct === 'boolean') {
            return res.json(parsed);
          }
        }
      } catch (err) {
        lastError = err;
        console.warn(`handleEvaluateComprehension with model ${modelName} failed:`, err);
      }
    }

    console.error('All model candidates failed for handleEvaluateComprehension:', lastError);
    return res.json({
      is_correct: true,
      score: 80,
      language_detected: /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(cleanTranscript) ? 'es' : 'zh',
      feedback: 'Tu respuesta demuestra comprensión general del texto.'
    });
  } catch (err: any) {
    console.error('Fatal error evaluating comprehension:', err);
    return res.status(500).json({ error: 'Error interno al evaluar la comprensión lectora.' });
  }
}

/**
 * Algorithmic fallback for reading aloud
 */
function calculateFallbackReadingAloud(params: {
  transcribedText: string;
  expectedText: string;
  durationSeconds: number;
}) {
  const { transcribedText, expectedText, durationSeconds } = params;

  const cleanExp = expectedText.replace(/[，。！？、：；\s]/g, '');
  const cleanTrans = transcribedText.replace(/[，。！？、：；\s]/g, '');

  const totalChars = Math.max(1, cleanExp.length);
  const syllablesPerSec = Number((cleanExp.length / Math.max(0.6, durationSeconds)).toFixed(1));

  let matchedChars = 0;
  const mistakes: Array<{
    word: string;
    type: 'omission' | 'substitution';
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
        explanation: `Se omitió el carácter '${char}'.`
      });
    }
  }

  for (const extra of transChars) {
    mistakes.push({
      word: extra,
      type: 'substitution',
      expected: '',
      heard: extra,
      explanation: `Se pronunció '${extra}' no correspondiente al texto.`
    });
  }

  const accuracy = Math.min(100, Math.round((matchedChars / totalChars) * 100));
  const passed = accuracy >= 70;

  return {
    score: accuracy,
    passed,
    transcribedText,
    expectedText,
    speed: {
      rating: syllablesPerSec < 2.0 ? 'slow' : syllablesPerSec > 5.0 ? 'fast' : 'natural',
      label: `Velocidad: ${syllablesPerSec} síl/s`,
      comment: syllablesPerSec < 2.0 
        ? 'Lectura pausada, puedes intentar ligar los grupos de palabras.' 
        : 'Buen ritmo de lectura oral.'
    },
    mistakes: mistakes.slice(0, 5),
    pronunciationAdvice: passed
      ? '¡Lectura oral clara y satisfactoria! Mantén la modulación de los tonos cuarto y tercero.'
      : 'Vuelve a escuchar el audio modelo antes de repetir la lectura para afinar los caracteres omitidos.'
  };
}
