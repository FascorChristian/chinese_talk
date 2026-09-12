import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy Google GenAI Client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Fallback dynamic responses for instant mock experience when API key is unconfigured
interface ChatResponsePayload {
  reply_hanzi: string;
  reply_translation: string;
  user_correction: string | null;
  native_alternative: string;
  suggested_replies: Array<{
    hanzi: string;
    pinyin: string;
    meaning: string;
  }>;
}

const SCENARIO_MOCKS: Record<string, ChatResponsePayload[]> = {
  cafe: [
    {
      reply_hanzi: '欢迎光临！请问您今天想喝点什么？我们有美式、拿铁和茉莉花茶。',
      reply_translation: '¡Bienvenido! ¿Qué le gustaría beber hoy? Tenemos americano, latte y té de jazmín.',
      user_correction: null,
      native_alternative: '来一杯热美式，打包。(Lái yì bēi rè měishì, dǎbāo - Ponme un americano caliente para llevar)',
      suggested_replies: [
        { hanzi: '我要一杯冰拿铁，加燕麦奶。', pinyin: 'Wǒ yào yì bēi bīng nátiě, jiā yànmàinǎi.', meaning: 'Quiero un latte helado con leche de avena.' },
        { hanzi: '请问有无糖的茶吗？', pinyin: 'Qǐngwèn yǒu wútáng de chá ma?', meaning: '¿Disculpe, tienen té sin azúcar?' }
      ]
    },
    {
      reply_hanzi: '好的，一杯冰拿铁！您需要加糖吗？另外，请问是在这里喝还是带走？',
      reply_translation: '¡De acuerdo, un latte helado! ¿Desea azúcar? Además, ¿es para tomar aquí o para llevar?',
      user_correction: null,
      native_alternative: '不加糖，打包带走。(Bù jiātáng, dǎbāo dàizǒu - Sin azúcar, para llevar)',
      suggested_replies: [
        { hanzi: '不加糖，带走，谢谢。', pinyin: 'Bù jiātáng, dàizǒu, xièxie.', meaning: 'Sin azúcar, para llevar, gracias.' },
        { hanzi: '微糖，在店里喝。', pinyin: 'Wēitáng, zài diàn lǐ hē.', meaning: 'Poco azúcar, para tomar aquí en el local.' }
      ]
    },
    {
      reply_hanzi: '一共三十五元。请问您是用微信还是支付宝支付呢？',
      reply_translation: 'En total son 35 yuanes. ¿Va a pagar con WeChat o Alipay?',
      user_correction: null,
      native_alternative: '我扫你吧。(Wǒ sǎo nǐ ba - Yo escaneo tu código)',
      suggested_replies: [
        { hanzi: '我用微信支付，请扫我。', pinyin: 'Wǒ yòng Wēixìn zhīfù, qǐng sǎo wǒ.', meaning: 'Pago con WeChat, por favor escanea mi código.' },
        { hanzi: '支付宝可以吗？', pinyin: 'Zhìfùbǎo kěyǐ ma?', meaning: '¿Se puede con Alipay?' }
      ]
    }
  ],
  market: [
    {
      reply_hanzi: '帅哥/美女，来看一看！这件真丝唐装和丝巾都是刚到的新款，质量特别好。',
      reply_translation: '¡Guapo/Guapa, ven a echar un vistazo! Este traje tradicional y las bufandas de seda acaban de llegar, la calidad es excelente.',
      user_correction: null,
      native_alternative: '老板，这件怎么卖？(Lǎobǎn, zhè jiàn zěnme mài? - Jefe, ¿a cuánto sale esta prenda?)',
      suggested_replies: [
        { hanzi: '老板，这件衣服多少钱？', pinyin: 'Lǎobǎn, zhè jiàn yīfu duōshao qián?', meaning: 'Jefe, ¿cuánto cuesta esta prenda?' },
        { hanzi: '有没有大一号的尺码？', pinyin: 'Yǒu méiyǒu dà yí hào de chǐmǎ?', meaning: '¿Tiene una talla más grande?' }
      ]
    },
    {
      reply_hanzi: '这件原价三百块，看你诚心想要，两百块拿走吧！',
      reply_translation: 'Esta prenda cuesta originalmente 300 yuanes, pero como veo que tienes interés sincero, ¡llévatela por 200!',
      user_correction: 'En compras en mercados chinos es muy común decir "太贵了，便宜点儿吧" en lugar de traducir literalmente del español.',
      native_alternative: '太贵了！八十块卖不卖？(Tài guì le! Bāshí kuài mài bu mài? - ¡Demasiado caro! ¿Me lo dejas en 80?)',
      suggested_replies: [
        { hanzi: '太贵了，能不能便宜点？一百怎么样？', pinyin: 'Tài guì le, néng bu néng piányi diǎn? Yìbǎi zěnmeyàng?', meaning: 'Es muy caro, ¿puede rebajar un poco? ¿Qué tal 100?' },
        { hanzi: '如果买两件，能打几折？', pinyin: 'Rúguǒ mǎi liǎng jiàn, néng dǎ jǐ zhé?', meaning: 'Si compro dos piezas, ¿qué descuento me hace?' }
      ]
    }
  ],
  free: [
    {
      reply_hanzi: '你好呀！我是李明。很高兴和你练习中文！今天你的心情怎么样？',
      reply_translation: '¡Hola! Soy Li Ming. ¡Encantado de practicar chino contigo! ¿Cómo te sientes hoy?',
      user_correction: null,
      native_alternative: '我今天挺好的，刚下班。(Wǒ jīntiān tǐng hǎo de, gāng xiàbān - Hoy estoy muy bien, acabo de salir del trabajo)',
      suggested_replies: [
        { hanzi: '我今天很好，想和你聊聊中国美食。', pinyin: 'Wǒ jīntiān hěn hǎo, xiǎng hé nǐ liáoliao Zhōngguó měishí.', meaning: 'Hoy estoy muy bien, me gustaría hablar sobre gastronomía china.' },
        { hanzi: '我想练习一下自我介绍。', pinyin: 'Wǒ xiǎng liànxí yíxià zìwǒ jièshào.', meaning: 'Quiero practicar mi autopresentación.' }
      ]
    },
    {
      reply_hanzi: '太棒了！中国的美食文化博大精深。你吃过北京烤鸭或者火锅吗？',
      reply_translation: '¡Excelente! La cultura gastronómica china es muy rica. ¿Has probado el pato laqueado de Pekín o el hotpot?',
      user_correction: null,
      native_alternative: '我特别喜欢吃火锅，又麻又辣！(Wǒ tèbié xǐhuan chī huǒguō, yòu má yòu là! - ¡Me encanta el hotpot, picante y aromático!)',
      suggested_replies: [
        { hanzi: '我吃过火锅，麻辣锅底特别香！', pinyin: 'Wǒ chī guo huǒguō, málà guōdǐ tèbié xiāng!', meaning: 'He probado el hotpot, ¡el caldo picante huele delicioso!' },
        { hanzi: '我还没吃过烤鸭，能给我介绍一下吗？', pinyin: 'Wǒ hái méi chī guo kǎoyā, néng gěi wǒ jièshào yíxià ma?', meaning: 'Todavía no he probado el pato, ¿podrías explicármelo?' }
      ]
    }
  ]
};

// POST /api/chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message, scenario = 'free', history = [] } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Se requiere el mensaje del usuario.' });
    }

    const ai = getGenAI();

    if (!ai) {
      // Return smart mock response tailored to scenario
      const scenarioKey = scenario in SCENARIO_MOCKS ? scenario : 'free';
      const mockList = SCENARIO_MOCKS[scenarioKey];
      const selectedMock = mockList[Math.floor(Math.random() * mockList.length)];
      
      // Customize slightly if possible
      return res.json({
        ...selectedMock,
        source: 'mock'
      });
    }

    // System prompt exactly matching specification
    const systemPrompt = `Eres 'Li Ming', un tutor nativo de chino mandarín estándar en Pekín, cálido, paciente y conversador.
- Responde siempre en Chino Mandarín simplificado con un nivel conversacional adecuado y natural.
- Tus respuestas deben ser breves (máximo 2 a 3 frases) para facilitar la práctica oral y que el usuario tenga el turno de hablar.
- Contexto de la situación actual del usuario: Escenario "${scenario}".
- Evalúa con atención lo que dijo el usuario: "${message}".
- Si el usuario cometió algún error gramatical o de pronunciación evidente, indícalo amablemente en español en 'user_correction'; si no hubo errores claros, pon null.
- En 'native_alternative', muestra una forma más idiomática, auténtica o coloquial de decir lo que el usuario intentó comunicar (incluye el Hanzi, su Pinyin y traducción breve entre paréntesis).
- Devuelve EXACTAMENTE el objeto JSON estructurado con este esquema:
{
  "reply_hanzi": "texto en caracteres chinos simplificados",
  "reply_translation": "traducción fluida al español",
  "user_correction": "corrección pedagógica o null",
  "native_alternative": "cómo lo diría un nativo pekinés",
  "suggested_replies": [
    {"hanzi": "frase 1 corta en chino", "pinyin": "Pinyin con marcas de tono", "meaning": "significado en español"},
    {"hanzi": "frase 2 corta en chino", "pinyin": "Pinyin con marcas de tono", "meaning": "significado en español"}
  ]
}`;

    const formattedHistory = history.slice(-6).map((h: any) => ({
      role: h.sender === 'user' ? 'user' : 'model',
      parts: [{ text: h.hanzi || h.text || '' }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        ...formattedHistory,
        {
          role: 'user',
          parts: [{ text: `El estudiante dijo: "${message}". Responde en JSON estructurado como Li Ming.` }]
        }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply_hanzi: { type: Type.STRING, description: 'Respuesta en caracteres chinos simplificados' },
            reply_translation: { type: Type.STRING, description: 'Traducción al español de la respuesta' },
            user_correction: { type: Type.STRING, description: 'Corrección gramatical en español o null' },
            native_alternative: { type: Type.STRING, description: 'Frase natural nativa alternativa para el usuario' },
            suggested_replies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hanzi: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  meaning: { type: Type.STRING }
                },
                required: ['hanzi', 'pinyin', 'meaning']
              }
            }
          },
          required: ['reply_hanzi', 'reply_translation', 'native_alternative', 'suggested_replies']
        }
      }
    });

    const parsedData = JSON.parse(response.text || '{}');
    return res.json({
      ...parsedData,
      source: 'gemini'
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    // Graceful fallback to mock so conversation never breaks
    const fallback = SCENARIO_MOCKS.free[0];
    return res.json({
      ...fallback,
      source: 'fallback',
      debugError: error?.message || 'Error processing AI request'
    });
  }
});

// POST /api/hints
app.post('/api/hints', async (req, res) => {
  try {
    const { scenario = 'free', lastAiMessage = '' } = req.body;
    const ai = getGenAI();

    if (!ai) {
      const mockOptions = [
        { hanzi: '我想了解更多细节。', pinyin: 'Wǒ xiǎng liǎojiě gèng duō xìjié.', meaning: 'Me gustaría conocer más detalles.' },
        { hanzi: '你可以慢慢再说一遍吗？', pinyin: 'Nǐ kěyǐ mànmàn zài shuō yí biàn ma?', meaning: '¿Podrías repetirlo más despacio, por favor?' }
      ];
      return res.json({ hints: mockOptions });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `El tutor Li Ming acaba de decir: "${lastAiMessage}" en el escenario "${scenario}". Proporciona 2 opciones de respuesta coloquiales y prácticas para que el estudiante de mandarín responda.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hints: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hanzi: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  meaning: { type: Type.STRING }
                },
                required: ['hanzi', 'pinyin', 'meaning']
              }
            }
          },
          required: ['hints']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error generating hints:', err);
    return res.json({
      hints: [
        { hanzi: '能再说一遍吗？我没听清。', pinyin: 'Néng zài shuō yí biàn ma? Wǒ méi tīng qīng.', meaning: '¿Puedes decirlo otra vez? No lo escuché claro.' },
        { hanzi: '好的，我明白了！', pinyin: 'Hǎo de, wǒ míngbai le!', meaning: '¡De acuerdo, lo entiendo!' }
      ]
    });
  }
});

// POST /api/generate-reading
app.post('/api/generate-reading', async (req, res) => {
  try {
    const { topic = 'Cultura y vida diaria en China', level = 'HSK 2-3' } = req.body;
    const ai = getGenAI();

    const mockReadings = [
      {
        title_hanzi: '中国茶文化与生活',
        title_pinyin: 'Zhōngguó chá wénhuà yǔ shēnghuó',
        title_translation: 'La cultura del té chino y la vida diaria',
        topic: 'Tradición y bebidas',
        level: 'HSK 2-3',
        reading_tip: 'Presta especial atención al cambio de tono (sandhi) en "一个" (yí gè) y al tercer tono suave en "茶" (chá).',
        sentences: [
          {
            id: 's1',
            hanzi: '在中国，喝茶不仅是一种习惯，更是一种生活艺术。',
            pinyin: 'Zài Zhōngguó, hēchá bùjǐn shì yì zhǒng xíguàn, gèng shì yì zhǒng shēnghuó yìshù.',
            translation: 'En China, beber té no es solo un hábito, sino también un arte de vivir.'
          },
          {
            id: 's2',
            hanzi: '中国人常说：“客来敬茶”，这是最传统的待客礼节。',
            pinyin: 'Zhōngguórén cháng shuō: “Kè lái jìng chá”, zhè shì zuì chuántǒng de dàikè lǐjié.',
            translation: 'Los chinos suelen decir: "Cuando viene un huésped, sírvele té", que es la cortesía más tradicional.'
          },
          {
            id: 's3',
            hanzi: '绿茶清香，红茶温润，乌龙茶回味悠长。',
            pinyin: 'Lǜchá qīngxiāng, hóngchá wēnrùn, wūlóngchá huíwèi yōucháng.',
            translation: 'El té verde es fresco y aromático, el té rojo es suave y el té oolong tiene un regusto prolongado.'
          },
          {
            id: 's4',
            hanzi: '下午和朋友一起喝一杯热茶，心情会特别放松。',
            pinyin: 'Xiàwǔ hé péngyou yìqǐ hē yì bēi rè chá, xīnqíng huì tèbié fàngsōng.',
            translation: 'Tomar una taza de té caliente con amigos por la tarde relaja mucho el estado de ánimo.'
          }
        ],
        vocabulary: [
          { word: '习惯', pinyin: 'xíguàn', meaning: 'Hábito / Costumbre' },
          { word: '礼节', pinyin: 'lǐjié', meaning: 'Cortesía / Etiqueta' },
          { word: '放松', pinyin: 'fàngsōng', meaning: 'Relajarse' }
        ]
      },
      {
        title_hanzi: '北京胡同里的早晨',
        title_pinyin: 'Běijīng hútòng lǐ de zǎochen',
        title_translation: 'Una mañana en los hutongs de Pekín',
        topic: 'Vida en Pekín',
        level: 'HSK 2-3',
        reading_tip: 'Trata de pronunciar la rhotacización pequinesa suavemente en palabras como "早点儿" (zǎodiǎnr).',
        sentences: [
          {
            id: 's1',
            hanzi: '清晨的北京胡同非常安静，只能听到自行车的铃声。',
            pinyin: 'Qīngchén de Běijīng hútòng fēicháng ānjìng, zhǐ néng tīng dào zìxíngchē de língshēng.',
            translation: 'Temprano por la mañana, los callejones (hutongs) de Pekín están muy tranquilos, solo se escucha el timbre de las bicicletas.'
          },
          {
            id: 's2',
            hanzi: '老街坊们起得很早，在路边的小吃摊吃热腾腾的包子和豆浆。',
            pinyin: 'Lǎo jiēfang men qǐ de hěn zǎo, zài lùbiān de xiǎochītān chī rèténgténg de bāozi hé dòujiāng.',
            translation: 'Los vecinos de toda la vida se levantan temprano para comer baos humeantes y leche de soja en los puestos callejeros.'
          },
          {
            id: 's3',
            hanzi: '公园里，很多老人在打太极拳，练习书法。',
            pinyin: 'Gōngyuán lǐ, hěn duō lǎorén zài dǎ tàijíquán, liànxí shūfǎ.',
            translation: 'En el parque, muchos ancianos practican tai chi y caligrafía.'
          },
          {
            id: 's4',
            hanzi: '这就是充满烟火气与人情味的北京日常生活。',
            pinyin: 'Zhè jiù shì chōngmǎn yānhuǒqì yǔ rénqíngwèi de Běijīng rìcháng shēnghuó.',
            translation: 'Esta es la vida cotidiana de Pekín, llena de calidez humana y vitalidad.'
          }
        ],
        vocabulary: [
          { word: '清晨', pinyin: 'qīngchén', meaning: 'Madrugada / Primera hora de la mañana' },
          { word: '太极拳', pinyin: 'tàijíquán', meaning: 'Tai Chi' },
          { word: '烟火气', pinyin: 'yānhuǒqì', meaning: 'Calidez y sabor de la vida cotidiana' }
        ]
      }
    ];

    if (!ai) {
      const selected = mockReadings[Math.floor(Math.random() * mockReadings.length)];
      return res.json(selected);
    }

    const prompt = `Eres un profesor nativo y pedagogo de Chino Mandarín estándar.
Crea un texto pedagógico de lectura en voz alta para estudiantes hispanohablantes sobre el tema: "${topic}", nivel: "${level}".
Requisitos:
- 4 a 5 oraciones ricas, claras y naturales en Chino Mandarín simplificado.
- Proporciona pinyin con marcas tonales para cada oración y título.
- Proporciona traducción precisa al español.
- Incluye 3 palabras de vocabulario clave y un consejo de lectura oral ("reading_tip") en español.
Devuelve el JSON exacto.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title_hanzi: { type: Type.STRING },
            title_pinyin: { type: Type.STRING },
            title_translation: { type: Type.STRING },
            topic: { type: Type.STRING },
            level: { type: Type.STRING },
            reading_tip: { type: Type.STRING },
            sentences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  hanzi: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  translation: { type: Type.STRING }
                },
                required: ['id', 'hanzi', 'pinyin', 'translation']
              }
            },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  meaning: { type: Type.STRING }
                },
                required: ['word', 'pinyin', 'meaning']
              }
            }
          },
          required: ['title_hanzi', 'title_pinyin', 'title_translation', 'sentences', 'reading_tip']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error generating reading:', err);
    return res.json({
      title_hanzi: '中国茶文化与生活',
      title_pinyin: 'Zhōngguó chá wénhuà yǔ shēnghuó',
      title_translation: 'La cultura del té chino y la vida diaria',
      topic: 'Tradición y cultura',
      level: 'HSK 2-3',
      reading_tip: 'Recuerda respirar entre frases y entonar con firmeza el cuarto tono descendente.',
      sentences: [
        {
          id: 's1',
          hanzi: '在中国，喝茶不仅是一种习惯，更是一种生活艺术。',
          pinyin: 'Zài Zhōngguó, hēchá bùjǐn shì yì zhǒng xíguàn, gèng shì yì zhǒng shēnghuó yìshù.',
          translation: 'En China, beber té no es solo un hábito, sino también un arte de vivir.'
        },
        {
          id: 's2',
          hanzi: '中国人常说：“客来敬茶”，这是最传统的待客礼节。',
          pinyin: 'Zhōngguórén cháng shuō: “Kè lái jìng chá”, zhè shì zuì chuántǒng de dàikè lǐjié.',
          translation: 'Los chinos suelen decir: "Cuando viene un huésped, sírvele té", que es la cortesía más tradicional.'
        }
      ],
      vocabulary: [
        { word: '习惯', pinyin: 'xíguàn', meaning: 'Hábito' },
        { word: '礼节', pinyin: 'lǐjié', meaning: 'Cortesía' }
      ]
    });
  }
});

// POST /api/generate-shadowing
app.post('/api/generate-shadowing', async (req, res) => {
  try {
    const { topic = 'Planes espontáneos de fin de semana' } = req.body;
    const ai = getGenAI();

    const mockShadowings = [
      {
        title: '周末我们去吃火锅吧！',
        situation: 'Dos amigos, Xiao Wang y Li Ming, se encuentran el viernes por la tarde y planean cenar juntos.',
        characters: ['小王', '李明'],
        turns: [
          {
            id: 't1',
            speaker: '小王',
            hanzi: '李明，这周工作太忙了，明天周六你有什么安排吗？',
            pinyin: 'Lǐ Míng, zhè zhōu gōngzuò tài máng le, míngtiān zhōuliù nǐ yǒu shénme ānpái ma?',
            translation: '¡Li Ming! Esta semana el trabajo estuvo ajetreado, ¿tienes algún plan para mañana sábado?',
            key_phonetic_focus: 'Enfatiza el tono alto de "忙" (máng, 2º tono) y la pregunta al final "吗" (neutro).'
          },
          {
            id: 't2',
            speaker: '李明',
            hanzi: '我正好没事！天气这么冷，不如我们去吃地道的老北京涮羊肉吧！',
            pinyin: 'Wǒ zhènghǎo méishì! Tiānqì zhème lěng, bùrú wǒmen qù chī dìdao de Lǎoběijīng shuànyángròu ba!',
            translation: '¡Justo no tengo nada que hacer! Con este frío, ¿qué tal si vamos a comer auténtico cordero al caldero estilo Pekín?',
            key_phonetic_focus: 'Conexión fluida en "不如我们" (bùrú wǒmen) y entonación entusiasmada.'
          },
          {
            id: 't3',
            speaker: '小王',
            hanzi: '太棒了！我知道前门附近有一家百年老店，麻酱小料特别香。',
            pinyin: 'Tài bàng le! Wǒ zhīdào Qiánmén fùjìn yǒu yì jiā bǎinián lǎodiàn, májiàng xiǎoliào tèbié xiāng.',
            translation: '¡Genial! Conozco un local centenario cerca de Qianmen, su salsa de sésamo huele riquísima.',
            key_phonetic_focus: 'Cuarto tono contundente en "太棒了" (Tài bàng le).'
          },
          {
            id: 't4',
            speaker: '李明',
            hanzi: '好主意！那我们明天下午六点在地铁站门口见，怎么样？',
            pinyin: 'Hǎo zhǔyi! Nà wǒmen míngtiān xiàwǔ liù diǎn zài dìtiězhàn ménkǒu jiàn, zěnmeyàng?',
            translation: '¡Buena idea! Entonces nos vemos mañana a las 6 de la tarde en la salida del metro, ¿te parece?',
            key_phonetic_focus: 'Cambio de tono en "好主意" (hǎo zhǔyi -> háo zhǔyi por doble tercer tono).'
          },
          {
            id: 't5',
            speaker: '小王',
            hanzi: '没问题，一言为定，明天不见不散！',
            pinyin: 'Méi wèntí, yì yán wéi dìng, míngtiān bú jiàn bú sàn!',
            translation: '¡Sin problema, trato hecho, nos vemos mañana sin falta!',
            key_phonetic_focus: 'Expresión idiomática china (Chengyu): "一言为定" e "不见不散".'
          }
        ]
      }
    ];

    if (!ai) {
      return res.json(mockShadowings[0]);
    }

    const prompt = `Genera una conversación natural y amena inventada entre dos personas en Chino Mandarín simplificado (por ejemplo, '小王' (Xiao Wang) y '李明' (Li Ming)) diseñada para practicar la técnica de SHADOWING (escuchar e imitar inmediatamente el ritmo nativo).
Tema: "${topic}".
Requisitos:
- 4 a 6 turnos de diálogo dinámico y auténtico.
- Cada turno debe tener: 'speaker', 'hanzi', 'pinyin' (con marcas tonales), 'translation' en español y 'key_phonetic_focus' (consejo fonético concreto de entonación o tonos).
Devuelve el JSON exacto.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            situation: { type: Type.STRING },
            characters: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            turns: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  speaker: { type: Type.STRING },
                  hanzi: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  translation: { type: Type.STRING },
                  key_phonetic_focus: { type: Type.STRING }
                },
                required: ['id', 'speaker', 'hanzi', 'pinyin', 'translation']
              }
            }
          },
          required: ['title', 'situation', 'characters', 'turns']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Error generating shadowing:', err);
    return res.json({
      title: '周末我们去吃火锅吧！',
      situation: 'Xiao Wang y Li Ming planean salir a cenar.',
      characters: ['小王', '李明'],
      turns: [
        {
          id: 't1',
          speaker: '小王',
          hanzi: '李明，这周末你有什么安排吗？',
          pinyin: 'Lǐ Míng, zhè zhōumò nǐ yǒu shénme ānpái ma?',
          translation: 'Li Ming, ¿tienes algún plan para este fin de semana?',
          key_phonetic_focus: 'Enfócate en la entonación natural de la pregunta.'
        },
        {
          id: 't2',
          speaker: '李明',
          hanzi: '我们去吃地道的北京火锅吧！',
          pinyin: 'Wǒmen qù chī dìdao de Běijīng huǒguō ba!',
          translation: '¡Vayamos a comer un auténtico hotpot de Pekín!',
          key_phonetic_focus: 'Articula claramente "火锅" (huǒguō).'
        }
      ]
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Li Ming Mandarin Tutor server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
