import { Request, Response } from 'express';
import { generateGeminiJson } from '../config/gemini.js';
import { toPinyinSentence } from '../utils/phoneticEngine.js';
import { 
  createChatSystemPrompt, 
  CHAT_RESPONSE_SCHEMA, 
  createHintsPrompt, 
  HINTS_RESPONSE_SCHEMA 
} from '../prompts/tutorPrompts.js';

export async function handleChat(req: Request, res: Response) {
  try {
    const { message, scenario = 'free', history = [], objectives = [], userProfileContext = '' } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Se requiere el mensaje del usuario.' });
    }

    const cleanMessage = message.trim();
    const messagePinyin = toPinyinSentence(cleanMessage);

    const objectivesJson = Array.isArray(objectives) && objectives.length > 0
      ? JSON.stringify(objectives.map((o: any) => ({
          id: o.id,
          description: o.description,
          already_completed: Boolean(o.completed)
        })))
      : '';

    const systemPrompt = createChatSystemPrompt(
      scenario,
      cleanMessage,
      objectivesJson,
      userProfileContext,
      messagePinyin
    );

    // Format safe multi-turn history (keep last 6 turns to minimize token usage)
    const safeHistory = Array.isArray(history) ? history.slice(-6) : [];
    const formattedHistory = safeHistory
      .filter((h: any) => Boolean(h && (h.hanzi || h.text)))
      .map((h: any) => ({
        role: (h.sender === 'user' || h.role === 'user') ? 'user' : 'model',
        parts: [{ text: String(h.hanzi || h.text) }]
      }));

    const contents = [
      ...formattedHistory,
      {
        role: 'user',
        parts: [
          {
            text: `El estudiante dijo: "${cleanMessage}" (Pinyin fonético: "${messagePinyin}"). Responde estrictamente en JSON según las instrucciones pedagógicas, ignorando homófonos del micrófono.`,
          },
        ],
      },
    ];

    const result = await generateGeminiJson<any>({
      cacheScope: `chat:${scenario}:${formattedHistory.length}`,
      contents,
      systemInstruction: systemPrompt,
      responseSchema: CHAT_RESPONSE_SCHEMA,
      ttlMs: 1000 * 60 * 15,
    });

    if (result && result.data && result.data.reply_hanzi) {
      const parsedData = result.data;
      return res.json({
        ...parsedData,
        completed_objective_ids: Array.isArray(parsedData.completed_objective_ids)
          ? parsedData.completed_objective_ids
          : [],
        is_dialogue_finished: Boolean(parsedData.is_dialogue_finished),
        final_feedback: parsedData.final_feedback || null,
        model: result.model,
        fromCache: result.fromCache,
        source: 'gemini',
      });
    }

    // Contextual fallback if API key is missing or RPM quota is temporarily protecting calls
    const completedIds = Array.isArray(objectives)
      ? objectives.filter((o: any) => o.completed).map((o: any) => o.id)
      : [];
    const nextPendingObj = Array.isArray(objectives)
      ? objectives.find((o: any) => !o.completed)
      : null;
    if (nextPendingObj && cleanMessage.length >= 2) {
      completedIds.push(nextPendingObj.id);
    }

    return res.json({
      reply_hanzi: '说得很好！你的发音很清楚。关于这件事，你还有什么想了解的吗？',
      reply_translation: '¡Muy bien dicho! Tu pronunciación es muy clara. Respecto a esto, ¿hay algo más que te gustaría consultar?',
      user_correction: null,
      native_alternative: `${cleanMessage} (${messagePinyin} - Expresión comprensible y natural)`,
      completed_objective_ids: completedIds,
      is_dialogue_finished: Array.isArray(objectives) && objectives.length > 0 && completedIds.length >= objectives.length,
      final_feedback: completedIds.length >= (objectives?.length || 99)
        ? '¡Excelente trabajo! Cumpliste todos los objetivos comunicativos de la escena.'
        : null,
      suggested_replies: [
        { hanzi: '我想知道这个多少钱？', pinyin: 'Wǒ xiǎng zhīdào zhège duōshao qián?', meaning: 'Me gustaría saber cuánto cuesta esto.' },
        { hanzi: '好的，太谢谢你了，再见！', pinyin: 'Hǎo de, tài xièxie nǐ le, zàijiàn!', meaning: '¡De acuerdo, muchísimas gracias, hasta luego!' },
      ],
      source: 'fallback',
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    const userMessage = req.body?.message || '';
    return res.json({
      reply_hanzi: '我明白了，你说得很清楚！我们继续往下聊吧。',
      reply_translation: '¡Entiendo, lo dijiste muy claro! Sigamos conversando.',
      user_correction: null,
      native_alternative: userMessage
        ? `${userMessage} (${toPinyinSentence(userMessage)})`
        : '好的，我知道了。(Hǎo de, wǒ zhīdào le)',
      completed_objective_ids: [],
      is_dialogue_finished: false,
      final_feedback: null,
      suggested_replies: [
        { hanzi: '好的，我们继续吧！', pinyin: 'Hǎo de, wǒmen jìxù ba!', meaning: '¡De acuerdo, continuemos!' },
        { hanzi: '你能再给我介绍一下吗？', pinyin: 'Nǐ néng zài gěi wǒ jièshào yíxià ma?', meaning: '¿Puedes explicarme un poco más?' },
      ],
      source: 'fallback',
    });
  }
}

export async function handleHints(req: Request, res: Response) {
  try {
    const { scenario = 'free', lastAiMessage = '' } = req.body;

    const result = await generateGeminiJson<any>({
      cacheScope: `hints:${scenario}`,
      contents: createHintsPrompt(scenario, String(lastAiMessage || '')),
      responseSchema: HINTS_RESPONSE_SCHEMA,
      ttlMs: 1000 * 60 * 60,
    });

    if (result && result.data && result.data.hints) {
      return res.json(result.data);
    }

    return res.json({
      hints: [
        { hanzi: '能再说一遍吗？我没听清。', pinyin: 'Néng zài shuō yí biàn ma? Wǒ méi tīng qīng.', meaning: '¿Puedes decirlo otra vez? No lo escuché claro.' },
        { hanzi: '好的，我明白了，谢谢！', pinyin: 'Hǎo de, wǒ míngbai le, xièxie!', meaning: '¡De acuerdo, lo entiendo, gracias!' },
      ],
    });
  } catch (err: any) {
    console.error('Error generating hints:', err);
    return res.json({
      hints: [
        { hanzi: '能慢点再说一遍吗？', pinyin: 'Néng màn diǎn zài shuō yí biàn ma?', meaning: '¿Puedes decirlo más despacio?' },
        { hanzi: '好的，我知道了，谢谢！', pinyin: 'Hǎo de, wǒ zhīdào le, xièxie!', meaning: '¡De acuerdo, ya lo sé, gracias!' },
      ],
    });
  }
}
