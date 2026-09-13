import { 
  ChatApiResponse, 
  HintsApiResponse, 
  ReadingContent, 
  ShadowingDialogue,
  ScenarioId,
  Scenario,
  DialogueObjective
} from '../types/index.js';

function createLocalFallbackScenario(prompt: string): Scenario {
  const clean = prompt.trim() || 'Conversación cotidiana en Beijing';
  const lower = clean.toLowerCase();
  const id = `scenario-${Date.now()}`;

  if (lower.includes('tren') || lower.includes('viaj') || lower.includes('estacion') || lower.includes('boleto')) {
    return {
      id,
      title: 'Comprando boletos de tren de alta velocidad',
      chineseTitle: '火车站买高铁票',
      badge: 'Viajes • Situación IA',
      icon: 'Car',
      description: `Situación: "${clean}". Estás en la estación de tren de Beijing queriendo comprar billetes para viajar.`,
      rolePrompt: 'Eres un taquillero amable y eficiente en la estación de tren de Pekín.',
      timeLimitSeconds: 240,
      dialogueStructure: [
        '1. Saludar e indicar el destino',
        '2. Elegir clase de asiento y consultar precio',
        '3. Pagar y confirmar horario'
      ],
      objectives: [
        { id: 'obj_1', description: 'Saludar e indicar a qué ciudad deseas viajar', completed: false },
        { id: 'obj_2', description: 'Preguntar por el precio o pedir asiento de segunda clase', completed: false },
        { id: 'obj_3', description: 'Confirmar la compra y forma de pago', completed: false }
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
    };
  }

  if (lower.includes('restauran') || lower.includes('comid') || lower.includes('fideo') || lower.includes('plato') || lower.includes('pedir')) {
    return {
      id,
      title: 'Pidiendo Comida en un Restaurante Tradicional',
      chineseTitle: '餐馆点餐与特色菜',
      badge: 'Gastronomía • Situación IA',
      icon: 'UtensilsCrossed',
      description: `Situación: "${clean}". Estás en un restaurante en Beijing y quieres probar los platos recomendados.`,
      rolePrompt: 'Eres un mesero cordial y servicial en un restaurante típico chino en Beijing.',
      timeLimitSeconds: 240,
      dialogueStructure: [
        '1. Saludar y consultar los platos típicos',
        '2. Pedir un plato especificando detalles de picante',
        '3. Confirmar el pedido'
      ],
      objectives: [
        { id: 'obj_1', description: 'Saludar y consultar la especialidad de la casa', completed: false },
        { id: 'obj_2', description: 'Pedir tu comida especificando picante o ingredientes', completed: false },
        { id: 'obj_3', description: 'Confirmar el pedido y agradecer', completed: false }
      ],
      initialMessage: {
        hanzi: '欢迎光临！两位里面请。今天想尝尝我们这里的招牌牛肉面还是宫保鸡丁？',
        translation: '¡Bienvenidos! Tomen asiento por favor. ¿Hoy desean probar nuestros fideos con carne o el pollo Kung Pao?',
        suggestedReplies: [
          {
            hanzi: '你好！请给我来一碗招牌牛肉面，少放辣。',
            pinyin: 'Nǐ hǎo, qǐng gěi wǒ lái yì wǎn zhāopái niúròumiàn, shǎo fàng là.',
            meaning: '¡Hola! Tráigame un tazón de fideos con carne de la casa, poco picante por favor.'
          },
          {
            hanzi: '请问有什么不辣的特色菜推荐吗？',
            pinyin: 'Qǐngwèn yǒu shénme bú là de tèsècài tuījiàn ma?',
            meaning: '¿Disculpe, tiene algún plato típico no picante para recomendarnos?'
          }
        ]
      }
    };
  }

  if (lower.includes('hotel') || lower.includes('habitacion') || lower.includes('aloj')) {
    return {
      id,
      title: 'Registro en el Hotel',
      chineseTitle: '酒店入住登记',
      badge: 'Alojamiento • Situación IA',
      icon: 'Sparkles',
      description: `Situación: "${clean}". Llegas al hotel tras un largo viaje y realizas el check-in en recepción.`,
      rolePrompt: 'Eres la recepcionista cordial de un hotel boutique en Pekín.',
      timeLimitSeconds: 240,
      dialogueStructure: [
        '1. Saludar y mostrar reserva',
        '2. Pedir habitación tranquila o consultar servicios',
        '3. Recibir la llave y agradecer'
      ],
      objectives: [
        { id: 'obj_1', description: 'Saludar e indicar el nombre de tu reserva de habitación', completed: false },
        { id: 'obj_2', description: 'Consultar por servicios como el desayuno o piso alto', completed: false },
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
    };
  }

  if (lower.includes('mercad') || lower.includes('compr') || lower.includes('regate') || lower.includes('seda')) {
    return {
      id,
      title: 'Regateo en el Mercado de Beijing',
      chineseTitle: '潘家园特色砍价',
      badge: 'Compras • Situación IA',
      icon: 'ShoppingBag',
      description: `Situación: "${clean}". Estás en el mercado tradicional buscando un buen recuerdo y negociando el precio.`,
      rolePrompt: 'Eres un comerciante hábil y simpático en el mercado de Panjiayuan en Beijing.',
      timeLimitSeconds: 240,
      dialogueStructure: [
        '1. Preguntar por el producto y precio',
        '2. Proponer un precio menor y regatear',
        '3. Cerrar la compra'
      ],
      objectives: [
        { id: 'obj_1', description: 'Preguntar el precio del juego de té o artesanía', completed: false },
        { id: 'obj_2', description: 'Regatear pidiendo un descuento u oferta', completed: false },
        { id: 'obj_3', description: 'Concretar la compra o despedirse cordialmente', completed: false }
      ],
      initialMessage: {
        hanzi: '好眼光！这套茶具是景德镇的陶瓷，真心要的话我给你打个八折！',
        translation: '¡Buen ojo! Este juego de té es de porcelana de Jingdezhen. Si de verdad lo quieres ¡te hago un 20% de descuento!',
        suggestedReplies: [
          {
            hanzi: '老板，能不能再便宜一点？一百块卖不卖？',
            pinyin: 'Lǎobǎn, néng bu néng zài piányi yìdiǎn? Yìbǎi kuài mài bu mài?',
            meaning: 'Jefe, ¿no puede dejarlo un poco más barato? ¿Me lo deja por 100 yuanes?'
          },
          {
            hanzi: '我再去别家看看，谢谢老板。',
            pinyin: 'Wǒ zài qù biéjiā kànkan, xièxie lǎobǎn.',
            meaning: 'Voy a mirar en otras tiendas primero, gracias jefe.'
          }
        ]
      }
    };
  }

  // General in-character default fallback (Tea Master at Maliandao)
  return {
    id,
    title: 'Degustando Té en la Casa de Té Maliandao',
    chineseTitle: '马连道茶馆品茶',
    badge: 'Cultura • Situación IA',
    icon: 'Coffee',
    description: `Situación: "${clean}". Estás en una casa de té en Beijing conversando con el maestro Li Ming sobre cosechas de té.`,
    rolePrompt: 'Eres Li Ming, maestro de té experto, sereno y hospitalario en Beijing.',
    timeLimitSeconds: 240,
    dialogueStructure: [
      '1. Saludo y selección de tipo de té',
      '2. Preguntar aroma, cosecha o precio',
      '3. Degustación y agradecimiento'
    ],
    objectives: [
      { id: 'obj_1', description: 'Saludar y elegir qué té probar (Longjing o Pu\'er)', completed: false },
      { id: 'obj_2', description: 'Preguntar por el precio o características del té', completed: false },
      { id: 'obj_3', description: 'Agradecer la hospitalidad al maestro Li Ming', completed: false }
    ],
    initialMessage: {
      hanzi: '您好，快请坐！今天刚到了上好的西湖龙井和云南普洱，您想尝尝清香的绿茶还是醇厚的老茶？',
      translation: '¡Hola, tome asiento por favor! Hoy nos llegó té Longjing de Hangzhou y Pu\'er de Yunnan. ¿Desea probar el té verde aromático o el té añejo con cuerpo?',
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
  };
}

export async function generateCustomScenario(
  prompt: string,
  signal?: AbortSignal
): Promise<Scenario> {
  try {
    const response = await fetch('/api/generate-scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal,
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.title && data.initialMessage) {
        return data;
      }
    }
    console.warn(`Server responded with ${response.status} to /api/generate-scenario, using local fallback.`);
  } catch (err) {
    console.warn('Network issue calling /api/generate-scenario, using local fallback:', err);
  }

  // Graceful fallback guarantees 100% uptime for scenario generation
  return createLocalFallbackScenario(prompt);
}


export async function sendMessageToTutor(
  message: string,
  scenario: ScenarioId,
  history: Array<{ sender: string; hanzi: string }>,
  objectives?: DialogueObjective[],
  signal?: AbortSignal
): Promise<ChatApiResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      scenario,
      objectives,
      history: history.slice(-6).map((m) => ({
        sender: m.sender,
        hanzi: m.hanzi,
      })),
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status} en /api/chat`);
  }

  return response.json();
}

export async function fetchHints(
  scenario: ScenarioId,
  lastAiMessage: string,
  signal?: AbortSignal
): Promise<HintsApiResponse> {
  const response = await fetch('/api/hints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario, lastAiMessage }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status} en /api/hints`);
  }

  return response.json();
}

export async function generateReadingContent(
  topic: string,
  level: string = 'HSK 2-3',
  signal?: AbortSignal
): Promise<ReadingContent> {
  const response = await fetch('/api/generate-reading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic, level }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status} en /api/generate-reading`);
  }

  return response.json();
}

export async function generateShadowingContent(
  topic: string,
  signal?: AbortSignal
): Promise<ShadowingDialogue> {
  const response = await fetch('/api/generate-shadowing', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status} en /api/generate-shadowing`);
  }

  return response.json();
}

