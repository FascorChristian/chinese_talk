import { Request, Response } from 'express';
import { getGenAI } from '../config/gemini.js';
import { ENV } from '../config/env.js';
import { 
  createScenarioGenerationPrompt, 
  SCENARIO_GENERATION_SCHEMA 
} from '../prompts/tutorPrompts.js';

export async function handleGenerateScenario(req: Request, res: Response) {
  try {
    const rawPrompt = req.body?.prompt ?? req.body?.userPrompt;
    const cleanPrompt = typeof rawPrompt === 'string' && rawPrompt.trim()
      ? rawPrompt.trim()
      : 'Conversación cotidiana y práctica en Pekín';

    const ai = getGenAI();

    if (!ai) {
      // Dynamic fallback based on keywords
      const lower = cleanPrompt.toLowerCase();
      const id = `custom-${Date.now()}`;

      if (lower.includes('tren') || lower.includes('viaj') || lower.includes('estacion') || lower.includes('boleto')) {
        return res.json({
          id,
          title: 'Comprando boletos de tren de alta velocidad',
          chineseTitle: '火车站买高铁票',
          badge: 'Viajes • Situación IA',
          icon: 'Car',
          description: `Situación creada a partir de: "${cleanPrompt}". Estás en la estación de tren de Pekín queriendo comprar billetes para viajar hoy.`,
          rolePrompt: 'Eres un taquillero amable y eficiente en la estación de tren de Pekín.',
          timeLimitSeconds: 240,
          dialogueStructure: [
            '1. Saludar e indicar la ciudad de destino y horario',
            '2. Preguntar el precio y la clase de asiento',
            '3. Confirmar la compra y pagar con WeChat o tarjeta'
          ],
          objectives: [
            { id: 'obj_1', description: 'Saludar e indicar a qué ciudad deseas viajar en tren de alta velocidad', completed: false },
            { id: 'obj_2', description: 'Preguntar el precio del boleto o pedir asiento de segunda clase', completed: false },
            { id: 'obj_3', description: 'Confirmar la compra y concretar el método de pago', completed: false }
          ],
          initialMessage: {
            hanzi: '您好！请问您要买去哪里的车票？买今天的二等座还是商务座？',
            translation: '¡Hola! ¿A dónde desea comprar su boleto? ¿Desea segunda clase o clase ejecutiva para hoy?',
            suggestedReplies: [
              {
                hanzi: '你好，我要两张今天去上海的高铁二等座。',
                pinyin: 'Nǐ hǎo, wǒ yào liǎng zhāng jīntiān qù Shànghǎi de gāotiě èrděngzuò.',
                meaning: 'Hola, quiero dos boletos de segunda clase en tren de alta velocidad a Shanghai para hoy.'
              },
              {
                hanzi: '请问最近一趟去杭州的列车是几点？',
                pinyin: 'Qǐngwèn zuìjìn yí tàng qù Hángzhōu de lièchē shì jǐ diǎn?',
                meaning: '¿Disculpe, a qué hora sale el tren más próximo hacia Hangzhou?'
              }
            ]
          }
        });
      }

      if (lower.includes('hotel') || lower.includes('habitacion') || lower.includes('reserva')) {
        return res.json({
          id,
          title: 'Registro en el Hotel',
          chineseTitle: '酒店入住登记',
          badge: 'Alojamiento • Situación IA',
          icon: 'Sparkles',
          description: `Situación creada a partir de: "${cleanPrompt}". Llegas al hotel tras un largo viaje y realizas el check-in en recepción.`,
          rolePrompt: 'Eres la recepcionista cordial de un hotel boutique en Pekín.',
          timeLimitSeconds: 240,
          dialogueStructure: [
            '1. Saludar y mencionar la reserva previa de habitación',
            '2. Presentar pasaporte y consultar por el piso o desayuno',
            '3. Recibir la llave y agradecer'
          ],
          objectives: [
            { id: 'obj_1', description: 'Saludar e indicar que tienes una reserva de habitación', completed: false },
            { id: 'obj_2', description: 'Preguntar por el desayuno o solicitar una habitación tranquila', completed: false },
            { id: 'obj_3', description: 'Agradecer a la recepcionista al recibir la llave', completed: false }
          ],
          initialMessage: {
            hanzi: '您好，欢迎光临！请问您有预订吗？请出示一下您的护照。',
            translation: '¡Hola, bienvenido! ¿Tiene una reserva? Por favor, muéstreme su pasaporte.',
            suggestedReplies: [
              {
                hanzi: '你好，我预订了一间大床房，名字叫张伟。',
                pinyin: 'Nǐ hǎo, wǒ yùdìng le yì jiān dàchuángfáng, míngzi jiào Zhāng Wěi.',
                meaning: 'Hola, he reservado una habitación con cama grande, a nombre de Zhang Wei.'
              },
              {
                hanzi: '请问有高楼层的安静房间吗？',
                pinyin: 'Qǐngwèn yǒu gāolóucéng de ānjìng fángjiān ma?',
                meaning: '¿Disculpe, tiene alguna habitación tranquila en una planta alta?'
              }
            ]
          }
        });
      }

      // Default concrete in-character fallback (Tea House in Beijing)
      return res.json({
        id,
        title: 'Degustando Té en la Casa de Té Maliandao',
        chineseTitle: '马连道茶馆品茶',
        badge: 'Cultura • Situación IA',
        icon: 'Coffee',
        description: `Situación decidida por IA: Estás en una prestigiosa casa de té en Beijing conversando con el maestro Li Ming sobre aromas y cosechas.`,
        rolePrompt: 'Eres Li Ming, maestro de té experto, sereno y amable en una casa de té tradicional en Beijing.',
        timeLimitSeconds: 240,
        dialogueStructure: [
          '1. Saludar y expresar tu gusto o curiosidad por el té chino',
          '2. Elegir entre té verde Longjing o té Pu\'er y preguntar su precio',
          '3. Degustar, agradecer la recomendación y pagar'
        ],
        objectives: [
          { id: 'obj_1', description: 'Saludar y elegir qué tipo de té deseas probar', completed: false },
          { id: 'obj_2', description: 'Preguntar sobre el sabor o el precio de la taza o tetera', completed: false },
          { id: 'obj_3', description: 'Agradecer la explicación al maestro Li Ming', completed: false }
        ],
        initialMessage: {
          hanzi: '您好，快请坐！今天刚到了上好的西湖龙井和云南普洱，您今天想尝尝清香的绿茶还是醇厚的老茶？',
          translation: '¡Hola, tome asiento por favor! Hoy nos llegó té Longjing de Hangzhou y Pu\'er de Yunnan de primera calidad. ¿Desea probar hoy el té verde aromático o el té añejo con cuerpo?',
          suggestedReplies: [
            {
              hanzi: '我想先尝尝西湖龙井，听说很新鲜。',
              pinyin: 'Wǒ xiǎng xiān chángchang Xīhú Lóngjǐng, tīngshuō hěn xīnxiān.',
              meaning: 'Quiero probar primero el té Longjing, he oído que es muy fresco.'
            },
            {
              hanzi: '老板，给我来一杯口感醇厚的云南普洱吧。',
              pinyin: 'Lǎobǎn, gěi wǒ lái yì bēi kǒugǎn chúnhòu de Yúnnán Pǔ\'ěr ba.',
              meaning: 'Jefe, sírvame una taza de Pu\'er de Yunnan con buen cuerpo.'
            }
          ]
        }
      });
    }

    const promptText = createScenarioGenerationPrompt(cleanPrompt);

    const CANDIDATE_MODELS = [
      ENV.GEMINI_MODEL,
      'gemini-3.5-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.7-flash'
    ];

    let lastError: any = null;
    for (const modelName of CANDIDATE_MODELS) {
      if (!modelName) continue;
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: promptText,
          config: {
            responseMimeType: 'application/json',
            responseSchema: SCENARIO_GENERATION_SCHEMA,
          }
        });

        const parsed = JSON.parse(response.text || '{}');
        if (parsed && parsed.title && parsed.initialMessage) {
          const id = `scenario-${Date.now()}`;
          return res.json({
            id,
            ...parsed,
            timeLimitSeconds: typeof parsed.timeLimitSeconds === 'number' ? parsed.timeLimitSeconds : 240,
            dialogueStructure: Array.isArray(parsed.dialogueStructure) && parsed.dialogueStructure.length > 0
              ? parsed.dialogueStructure
              : [
                  '1. Saludo inicial y planteamiento de la situación',
                  '2. Consulta de detalles, opciones o precio',
                  '3. Confirmación del acuerdo y cierre cordial'
                ],
            objectives: (Array.isArray(parsed.objectives) && parsed.objectives.length > 0
              ? parsed.objectives
              : [
                  { id: 'obj_1', description: 'Saludar y comunicar tu intención en mandarín' },
                  { id: 'obj_2', description: 'Consultar detalles o hacer una pregunta relevante' },
                  { id: 'obj_3', description: 'Concluir la conversación amablemente' }
                ]).map((obj: any, idx: number) => ({
                  id: obj.id || `obj_${idx + 1}`,
                  description: obj.description,
                  completed: false
                })),
            model: modelName,
            source: 'gemini'
          });
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Scenario generation model ${modelName} failed (${err?.status || err?.message}). Trying next candidate...`);
      }
    }

    throw lastError || new Error('All candidate models failed for scenario generation.');
  } catch (error: any) {
    console.error('Error in /api/generate-scenario:', error);
    return res.json({
      id: `scenario-${Date.now()}`,
      title: 'Almorzando Ravioles Caseros en Beijing',
      chineseTitle: '老北京水饺馆',
      badge: 'Gastronomía • Situación IA',
      icon: 'UtensilsCrossed',
      description: 'Estás en un restaurante acogedor en un hutong de Beijing pidiendo el almuerzo.',
      rolePrompt: 'Eres Li Ming, el dueño hospitalario de una cantina tradicional de ravioles en Beijing.',
      timeLimitSeconds: 240,
      dialogueStructure: [
        '1. Saludar e indicar cuántos comensales son',
        '2. Pedir las raciones y tipo de relleno de ravioles',
        '3. Pedir salsa o bebida y concretar el pago'
      ],
      objectives: [
        { id: 'obj_1', description: 'Saludar e indicar el número de comensales', completed: false },
        { id: 'obj_2', description: 'Pedir el relleno deseado (cerdo con puerro o tres delicias)', completed: false },
        { id: 'obj_3', description: 'Pedir la cuenta o consultar si se puede pagar con WeChat', completed: false }
      ],
      initialMessage: {
        hanzi: '欢迎光临！两位请里边坐。今天我们有刚包好的猪肉大葱和三鲜水饺，您来几盘尝尝？',
        translation: '¡Bienvenidos! Tomen asiento por favor. Hoy tenemos ravioles recién hechos de cerdo con puerro y de tres delicias. ¿Cuántos platos desean probar?',
        suggestedReplies: [
          {
            hanzi: '老板，来一盘猪肉大葱水饺，少放蒜。',
            pinyin: 'Lǎobǎn, lái yì pán zhūròu dàcōng shuǐjiǎo, shǎo fàng suàn.',
            meaning: 'Jefe, un plato de ravioles de cerdo y puerro, con poco ajo por favor.'
          },
          {
            hanzi: '请问三鲜水饺里面有什么特别的馅儿？',
            pinyin: 'Qǐngwèn sānxiān shuǐjiǎo lǐmiàn yǒu shénme tèbié de xiànr?',
            meaning: '¿Disculpe, qué relleno especial llevan los ravioles de tres delicias?'
          }
        ]
      },
      source: 'fallback'
    });
  }
}

