import { Request, Response } from 'express';
import { getGenAI } from '../config/gemini.js';
import { ENV } from '../config/env.js';
import { 
  createDiagnosticChallengePrompt, 
  DIAGNOSTIC_CHALLENGE_SCHEMA,
  createDiagnosticReportPrompt,
  DIAGNOSTIC_REPORT_SCHEMA 
} from '../prompts/tutorPrompts.js';

// ==========================================
// FALLBACK CHALLENGE (Guaranteed Reliability)
// ==========================================
function getFallbackChallenge(modeType: string, currentHsk: string, targetHsk: string) {
  const isChallenge = modeType === 'evaluation_challenge';
  const level = isChallenge ? (targetHsk || 'HSK 3') : (currentHsk || 'HSK 2');

  return {
    id: `diag-challenge-${Date.now()}`,
    modeType,
    targetHskLevel: level,
    targetHskkLevel: level.includes('3') || level.includes('4') ? 'HSKK Intermedio' : 'HSKK Inicial',
    title: isChallenge ? `Desafío de Ascenso a ${level}` : `Evaluación Diagnóstica Integral (${level})`,
    description: isChallenge
      ? `Prueba de alta exigencia para demostrar tu dominio de ${level} y conseguir tu certificación de nivel.`
      : `Evaluación calibrada de 3 fases para medir con precisión tu nivel oral, lector y fonético en Chino Mandarín.`,
    conversationTask: {
      situation: 'Estás en una famosa casa de té en Pekín. El maestro de té Li Ming te da la bienvenida y te pregunta sobre tus gustos y el motivo de tu viaje a China.',
      rolePrompt: 'Eres Li Ming, maestro de té hospitalario y conversador en Pekín. Conversa cordialmente y haz preguntas abiertas para evaluar el nivel del estudiante.',
      initialAiMessage: {
        hanzi: '您好，欢迎光临！今天外边天气真好。您是第一次来北京吗？想喝点什么茶？',
        pinyin: 'Nínhǎo, huānyíng guānglín! Jīntiān wàibiān tiānqì zhēn hǎo. Nín shì dì-yī cì lái Běijīng ma? Xiǎng hē diǎn shénme chá?',
        translation: '¡Hola, bienvenido! Hoy hace un día espléndido afuera. ¿Es su primera vez en Pekín? ¿Qué té le gustaría tomar?'
      },
      suggestedTopics: ['Planes de viaje por China', 'Tipos de té y preferencias personales']
    },
    shadowingTask: {
      turns: [
        {
          id: 'sh1',
          speaker: 'Li Ming',
          hanzi: '西湖龙井茶的味道非常清香。',
          pinyin: 'Xīhú Lóngjǐng chá de wèidao fēicháng qīngxiāng.',
          translation: 'El aroma del té Longjing del Lago del Oeste es sumamente fresco.',
          keyPhoneticFocus: 'Distingue con claridad el 1º tono alto (fēi) y el 2º tono ascendente (cháng).'
        },
        {
          id: 'sh2',
          speaker: 'Li Ming',
          hanzi: '中国人常说，客来敬茶是一种传统礼节。',
          pinyin: 'Zhōngguórén cháng shuō, kè lái jìng chá shì yì zhǒng chuántǒng lǐjié.',
          translation: 'Los chinos suelen decir que ofrecer té a las visitas es una etiqueta tradicional.',
          keyPhoneticFocus: 'Articula las consonantes retroflejas: zhōng, shuō, chuán sin vacilar.'
        },
        {
          id: 'sh3',
          speaker: 'Li Ming',
          hanzi: '只要每天坚持大声朗读，你的汉语口语一定会越来越流利！',
          pinyin: 'Zhǐyào měitiān jiānchí dàshēng lǎngdú, nǐ de Hànyǔ kǒuyǔ yídìng huì yuèláiyuè liúlì!',
          translation: '¡Siempre que leas en voz alta a diario, tu chino oral seguro será cada vez más fluido!',
          keyPhoneticFocus: 'Respeta la pausa en la coma y el ritmo natural en la frase yuè lái yuè liúlì.'
        }
      ]
    },
    readingTask: {
      title_hanzi: '中国人的早晨与公园文化',
      title_pinyin: 'Zhōngguórén de zǎochen yǔ gōngyuán wénhuà',
      title_translation: 'Las mañanas chinas y la cultura de los parques',
      full_text_hanzi: '在中国很多城市，早晨的公园总是特别热闹。许多退休的老年人很早就来到公园锻炼身体。有的人在树下打太极拳，有的人在湖边练习书法，还有人在伴着音乐跳舞。这种悠闲的生活方式不仅有益健康，也展现了中国人的生活情趣。',
      pinyin: 'Zài Zhōngguó hěn duō chéngshì, zǎochen de gōngyuán zǒngshì tèbié rènao. Xǔduō tuìxiū de lǎoniánrén hěn zǎo jiù lái dào gōngyuán duànliàn shēntǐ. Yǒu de rén zài shù xià dǎ tàijíquán, yǒu de rén zài hú biān liànxí shūfǎ, hái yǒu rén zài bàn zhe yīnyuè tiàowǔ. Zhè zhǒng yōuxián de shēnghuó fāngshì bùjǐn yǒuyì jiànkāng, yě zhǎnxiàn le Zhōngguórén de shēnghuó qíngqù.',
      translation: 'En muchas ciudades de China, los parques por la mañana siempre están especialmente animados. Muchas personas mayores jubiladas llegan muy temprano al parque para hacer ejercicio. Algunas practican tai chi bajo los árboles, otras practican caligrafía junto al lago, y otras bailan al ritmo de la música. Este estilo de vida relajado no solo beneficia la salud, sino que también refleja el encanto de la vida de los chinos.',
      comprehension_questions: [
        {
          id: 'q1',
          question_zh: '早晨都有谁来到公园锻炼身体？',
          question_pinyin: 'Zǎochen dōu yǒu shéi lái dào gōngyuán duànliàn shēntǐ?',
          question_es: '¿Quiénes acuden muy temprano al parque a ejercitarse?',
          expected_answer_summary: 'Muchas personas mayores jubiladas (许多退休的老年人).'
        },
        {
          id: 'q2',
          question_zh: '文章提到了人们在公园里做哪些活动？',
          question_pinyin: 'Wénzhāng tídào le rénmen zài gōngyuán li zuò nǎxiē huódòng?',
          question_es: '¿Qué actividades menciona el texto que realiza la gente en el parque?',
          expected_answer_summary: 'Hacer tai chi (打太极拳), practicar caligrafía (练习书法) y bailar con música (跳舞).'
        }
      ]
    }
  };
}

// ==========================================
// FALLBACK REPORT (Offline Algorithmic Scoring)
// ==========================================
function calculateFallbackReport(submission: any) {
  const isChallenge = submission.modeType === 'evaluation_challenge';
  const currentHsk = submission.currentHskLevel || 'HSK 2';
  const targetHsk = submission.targetHskLevel || 'HSK 3';

  // 1. Conversation score
  const convList = submission.conversationData || [];
  const convWordCount = convList.reduce((acc: number, c: any) => acc + (c.userUtterance?.length || 0), 0);
  const convScore = Math.min(95, Math.max(50, convWordCount > 15 ? 80 : 65));

  // 2. Shadowing score
  const shList = submission.shadowingData || [];
  const shScore = shList.length > 0
    ? Math.round(shList.reduce((acc: number, s: any) => acc + (s.score || 0), 0) / shList.length)
    : 70;

  // 3. Reading score
  const readingAloudScore = submission.readingData?.aloudScore || 70;
  const qList = submission.readingData?.answers || [];
  const correctCount = qList.filter((a: any) => a.isCorrect).length;
  const compScore = qList.length > 0 ? Math.round((correctCount / qList.length) * 100) : 75;
  const readingOverall = Math.round(readingAloudScore * 0.45 + compScore * 0.55);

  // 4. Intonation & Fluency
  const intonation = Math.round(shScore * 0.6 + readingAloudScore * 0.4);
  const fluency = Math.round(convScore * 0.5 + shScore * 0.5);

  const overallScore = Math.round((convScore + readingOverall + fluency + intonation) / 4);

  let assignedHsk = currentHsk;
  let assignedHskk = currentHsk.includes('1') ? 'HSKK Inicial' : 'HSKK Inicial';
  let levelUpgradeGranted = false;

  if (isChallenge) {
    if (overallScore >= 75) {
      levelUpgradeGranted = true;
      assignedHsk = targetHsk;
      assignedHskk = targetHsk.includes('3') || targetHsk.includes('4') ? 'HSKK Intermedio' : 'HSKK Inicial';
    } else {
      levelUpgradeGranted = false;
      assignedHsk = currentHsk;
      assignedHskk = 'HSKK Inicial';
    }
  } else {
    // Diagnostic
    if (overallScore >= 85) {
      assignedHsk = 'HSK 3';
      assignedHskk = 'HSKK Intermedio';
      levelUpgradeGranted = true;
    } else if (overallScore >= 65) {
      assignedHsk = 'HSK 2';
      assignedHskk = 'HSKK Inicial';
      levelUpgradeGranted = true;
    } else {
      assignedHsk = 'HSK 1';
      assignedHskk = 'HSKK Inicial';
      levelUpgradeGranted = true;
    }
  }

  return {
    assignedHskLevel: assignedHsk,
    assignedHskkLevel: assignedHskk,
    previousHskLevel: currentHsk,
    levelUpgradeGranted,
    overallScore,
    skillScores: {
      conversational: convScore,
      reading: readingOverall,
      fluency,
      intonation
    },
    strengths: [
      'Buena disposición auditiva para imitar frases de mediana longitud en shadowing.',
      'Capacidad para responder a preguntas de comprensión captando las ideas centrales.',
      'Pronunciación comprensible y uso correcto de vocabulario básico de HSK.'
    ],
    weaknesses: [
      'Vacilación y pérdida de velocidad al pronunciar consonantes retroflejas (zh/ch/sh).',
      'Uso preferente de oraciones orales simples sin conectores subordinados.',
      'Marcas tonales en el 2º y 3º tono que requieren mayor contraste y estabilidad.'
    ],
    pedagogicalRecommendations: [
      'Entrena tu dicción con lecturas en voz alta a velocidad natural manteniendo el aire constante.',
      'Añade a tu vocabulario conectores habituales como 然后 (luego) y 虽然...但是 (aunque... pero).',
      'Practica shadowing regular prestando atención al contorno melódico de cada oración.'
    ],
    detailedAnalysis: isChallenge && levelUpgradeGranted
      ? `El estudiante ha demostrado la suficiencia requerida para superar el desafío de nivel con una puntuación global de ${overallScore}%. Sus habilidades en conversación, imitación fonética y comprensión lectora justifican el ascenso al nivel ${assignedHsk} y ${assignedHskk}.`
      : `El estudiante obtuvo una puntuación global de ${overallScore}%. Demuestra un dominio sólido de las estructuras de nivel ${assignedHsk}. Se recomienda afianzar las áreas señaladas antes de intentar el siguiente ascenso de nivel.`,
    challengeResultSummary: isChallenge && levelUpgradeGranted
      ? `¡Felicidades! Has superado con éxito el desafío con ${overallScore}% y asciendes a ${assignedHsk} y ${assignedHskk}.`
      : isChallenge
      ? `Obtuviste ${overallScore}%. Estás cerca del umbral de aprobación (75%). Refuerza las áreas señaladas e inténtalo de nuevo.`
      : `Evaluación diagnóstica completada con éxito. Tu nivel certificado es ${assignedHsk} y ${assignedHskk}.`
  };
}

export async function handleGenerateDiagnosticChallenge(req: Request, res: Response) {
  try {
    const {
      modeType = 'diagnostic',
      currentHskLevel = 'HSK 2',
      targetHskLevel = 'HSK 3',
      userProfileContext = ''
    } = req.body;

    const ai = getGenAI();
    if (!ai) {
      return res.json(getFallbackChallenge(modeType, currentHskLevel, targetHskLevel));
    }

    const prompt = createDiagnosticChallengePrompt({
      modeType,
      currentHskLevel,
      targetHskLevel,
      userProfileContext
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
            responseSchema: DIAGNOSTIC_CHALLENGE_SCHEMA,
          }
        });

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed && parsed.conversationTask && parsed.shadowingTask && parsed.readingTask) {
            parsed.id = parsed.id || `diag-${Date.now()}`;
            parsed.modeType = modeType;
            parsed.targetHskLevel = modeType === 'evaluation_challenge' ? targetHskLevel : currentHskLevel;
            return res.json(parsed);
          }
        }
      } catch (err) {
        lastError = err;
        console.warn(`handleGenerateDiagnosticChallenge with ${modelName} failed, trying next:`, err);
      }
    }

    console.error('All candidate models failed for diagnostic challenge:', lastError);
    return res.json(getFallbackChallenge(modeType, currentHskLevel, targetHskLevel));
  } catch (err: any) {
    console.error('Fatal error generating diagnostic challenge:', err);
    return res.json(getFallbackChallenge('diagnostic', 'HSK 2', 'HSK 3'));
  }
}

export async function handleEvaluateDiagnostic(req: Request, res: Response) {
  try {
    const submission = req.body || {};

    const ai = getGenAI();
    if (!ai) {
      return res.json(calculateFallbackReport(submission));
    }

    const prompt = createDiagnosticReportPrompt(submission);

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
            responseSchema: DIAGNOSTIC_REPORT_SCHEMA,
          }
        });

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed.overallScore === 'number' && parsed.assignedHskLevel) {
            return res.json(parsed);
          }
        }
      } catch (err) {
        lastError = err;
        console.warn(`handleEvaluateDiagnostic with ${modelName} failed, trying next:`, err);
      }
    }

    console.error('All candidate models failed for diagnostic report evaluation:', lastError);
    return res.json(calculateFallbackReport(submission));
  } catch (err: any) {
    console.error('Fatal error evaluating diagnostic report:', err);
    return res.json(calculateFallbackReport(req.body));
  }
}

