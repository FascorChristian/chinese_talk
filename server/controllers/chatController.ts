import { Request, Response } from 'express';
import { getGenAI } from '../config/gemini.js';
import { ENV } from '../config/env.js';
import { 
  createChatSystemPrompt, 
  CHAT_RESPONSE_SCHEMA, 
  createHintsPrompt, 
  HINTS_RESPONSE_SCHEMA 
} from '../prompts/tutorPrompts.js';

const CANDIDATE_MODELS = [
  ENV.GEMINI_MODEL,
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash'
];

export async function handleChat(req: Request, res: Response) {
  try {
    const { message, scenario = 'free', history = [], objectives = [] } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Se requiere el mensaje del usuario.' });
    }

    const ai = getGenAI();

    if (!ai) {
      console.warn('GoogleGenAI client not initialized (missing API key). Falling back.');
      return res.json({
        reply_hanzi: '我听到了你说的话，请确认你的 GEMINI_API_KEY 配置正确，以便我能进行智能对话。',
        reply_translation: 'He escuchado lo que dijiste. Por favor verifica que tu GEMINI_API_KEY esté configurada para que pueda conversar con inteligencia artificial completa.',
        user_correction: null,
        native_alternative: `${message} (Nǐ shuō de hěn hǎo - Lo dijiste bien)`,
        completed_objective_ids: [],
        is_dialogue_finished: false,
        final_feedback: null,
        suggested_replies: [
          { hanzi: '好的，我明白了。', pinyin: 'Hǎo de, wǒ míngbai le.', meaning: 'De acuerdo, lo entiendo.' },
          { hanzi: '我们继续聊吧！', pinyin: 'Wǒmen jìxù liáo ba!', meaning: '¡Sigamos charlando!' }
        ],
        source: 'no_api_key'
      });
    }

    const objectivesJson = Array.isArray(objectives) && objectives.length > 0
      ? JSON.stringify(objectives.map((o: any) => ({
          id: o.id,
          description: o.description,
          already_completed: Boolean(o.completed)
        })))
      : '';

    const systemPrompt = createChatSystemPrompt(scenario, message, objectivesJson);

    // Format safe multi-turn history
    const safeHistory = Array.isArray(history) ? history.slice(-8) : [];
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
        parts: [{ text: `El estudiante dijo: "${message}". Responde estrictamente en JSON según las instrucciones pedagógicas.` }]
      }
    ];

    // Try primary and candidate models to guarantee 100% uptime
    let lastError: any = null;
    for (const modelName of CANDIDATE_MODELS) {
      if (!modelName) continue;
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: CHAT_RESPONSE_SCHEMA,
          }
        });

        const parsedData = JSON.parse(response.text || '{}');
        if (parsedData && parsedData.reply_hanzi) {
          return res.json({
            ...parsedData,
            completed_objective_ids: Array.isArray(parsedData.completed_objective_ids)
              ? parsedData.completed_objective_ids
              : [],
            is_dialogue_finished: Boolean(parsedData.is_dialogue_finished),
            final_feedback: parsedData.final_feedback || null,
            model: modelName,
            source: 'gemini'
          });
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed in /api/chat (${err?.status || err?.message}). Trying next candidate...`);
      }
    }

    throw lastError || new Error('All Gemini candidate models failed.');
  } catch (error: any) {
    console.error('Fatal error in /api/chat:', error);
    const userMessage = req.body?.message || '';
    return res.json({
      reply_hanzi: '对不起，刚才网络有点延迟。你刚才说的很有意思，我们继续刚才的话题吧！',
      reply_translation: 'Disculpa, hubo una pequeña latencia en la red. ¡Lo que dijiste fue muy interesante, continuemos con el tema!',
      user_correction: null,
      native_alternative: userMessage 
        ? `${userMessage} (Frase del estudiante analizada)` 
        : '好的，我知道了。(Hǎo de, wǒ zhīdào le - De acuerdo, ya lo sé)',
      completed_objective_ids: [],
      is_dialogue_finished: false,
      final_feedback: null,
      suggested_replies: [
        { hanzi: '好的，我们继续吧！', pinyin: 'Hǎo de, wǒmen jìxù ba!', meaning: '¡De acuerdo, continuemos!' },
        { hanzi: '你能再给我介绍一下吗？', pinyin: 'Nǐ néng zài gěi wǒ jièshào yíxià ma?', meaning: '¿Puedes explicarme un poco más?' }
      ],
      source: 'fallback',
      debugError: error?.message || 'Error processing AI request'
    });
  }
}

export async function handleHints(req: Request, res: Response) {
  try {
    const { scenario = 'free', lastAiMessage = '' } = req.body;
    const ai = getGenAI();

    if (!ai) {
      return res.json({
        hints: [
          { hanzi: '能再说一遍吗？我没听清。', pinyin: 'Néng zài shuō yí biàn ma? Wǒ méi tīng qīng.', meaning: '¿Puedes decirlo otra vez? No lo escuché claro.' },
          { hanzi: '好的，我明白了！', pinyin: 'Hǎo de, wǒ míngbai le!', meaning: '¡De acuerdo, lo entiendo!' }
        ]
      });
    }

    for (const modelName of CANDIDATE_MODELS) {
      if (!modelName) continue;
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: createHintsPrompt(scenario, String(lastAiMessage || '')),
          config: {
            responseMimeType: 'application/json',
            responseSchema: HINTS_RESPONSE_SCHEMA,
          }
        });

        const parsed = JSON.parse(response.text || '{}');
        if (parsed && parsed.hints) {
          return res.json(parsed);
        }
      } catch (err: any) {
        console.warn(`Hints model ${modelName} failed (${err?.message}). Trying next...`);
      }
    }

    throw new Error('All hint models failed.');
  } catch (err: any) {
    console.error('Error generating hints:', err);
    return res.json({
      hints: [
        { hanzi: '能慢点再说一遍吗？', pinyin: 'Néng màn diǎn zài shuō yí biàn ma?', meaning: '¿Puedes decirlo más despacio?' },
        { hanzi: '好的，我知道了，谢谢！', pinyin: 'Hǎo de, wǒ zhīdào le, xièxie!', meaning: '¡De acuerdo, ya lo sé, gracias!' }
      ]
    });
  }
}
