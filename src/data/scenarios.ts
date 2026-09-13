import { Scenario } from '../types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'cafe',
    title: 'Cafetería en Pekín',
    chineseTitle: '北京咖啡馆',
    badge: 'HSK 1-3 • Principiante',
    icon: 'Coffee',
    description: 'Aprende a pedir café, té tradicional, especificar azúcar y temperatura, y pagar con WeChat o Alipay.',
    rolePrompt: 'Eres un barista amable en una cafetería moderna en el distrito de Sanlitun, Pekín.',
    timeLimitSeconds: 180,
    dialogueStructure: [
      '1. Saludo y pedido de bebidas',
      '2. Especificar leche, azúcar o temperatura',
      '3. Confirmar pedido y pagar'
    ],
    objectives: [
      { id: 'obj_1', description: 'Saludar al barista y pedir una bebida (café, té o latte)', completed: false },
      { id: 'obj_2', description: 'Personalizar tu bebida (tipo de leche, temperatura o nivel de azúcar)', completed: false },
      { id: 'obj_3', description: 'Preguntar cómo pagar o abonar con WeChat/Alipay', completed: false }
    ],
    initialMessage: {
      hanzi: '欢迎光临！请问您今天想喝点什么？我们有美式、拿铁和茉莉花茶。',
      translation: '¡Bienvenido! ¿Qué le gustaría beber hoy? Tenemos café americano, latte y té de jazmín.',
      suggestedReplies: [
        {
          hanzi: '你好！我要一杯冰拿铁，加燕麦奶。',
          pinyin: 'Nǐ hǎo! Wǒ yào yì bēi bīng nátiě, jiā yànmàinǎi.',
          meaning: '¡Hola! Quiero un latte helado con leche de avena.',
        },
        {
          hanzi: '请问茉莉花茶可以做无糖的吗？',
          pinyin: 'Qǐngwèn mòlìhuā chá kěyǐ zuò wútáng de ma?',
          meaning: '¿Disculpe, se puede hacer el té de jazmín sin azúcar?',
        },
      ],
    },
  },
  {
    id: 'market',
    title: 'Mercado de ropa (regateo)',
    chineseTitle: '秀水街服装市场',
    badge: 'HSK 2-4 • Intermedio',
    icon: 'ShoppingBag',
    description: 'Prueba tu habilidad para preguntar precios, pedir tallas y regatear amistosamente en el famoso Mercado de la Seda.',
    rolePrompt: 'Eres el dueño entusiasta y negociador de un puesto de ropa de seda tradicional en Xiushui, Pekín.',
    timeLimitSeconds: 240,
    dialogueStructure: [
      '1. Interés en la prenda y preguntar el precio',
      '2. Proponer un precio de regateo amistoso',
      '3. Llegar a un acuerdo y pagar'
    ],
    objectives: [
      { id: 'obj_1', description: 'Preguntar el precio de la prenda o pedir probarse otra talla', completed: false },
      { id: 'obj_2', description: 'Pedir una rebaja de precio de forma amistosa', completed: false },
      { id: 'obj_3', description: 'Llegar a un acuerdo final y concretar la compra', completed: false }
    ],
    initialMessage: {
      hanzi: '帅哥/美女，来看一看！这件真丝唐装是刚到的新款，质量特别好，试一下吧！',
      translation: '¡Ven a ver! Esta chaqueta tradicional de seda acaba de llegar, la calidad es magnífica, ¡pruébatela!',
      suggestedReplies: [
        {
          hanzi: '老板，这件衣服多少钱？',
          pinyin: 'Lǎobǎn, zhè jiàn yīfu duōshao qián?',
          meaning: 'Jefe, ¿cuánto cuesta esta prenda?',
        },
        {
          hanzi: '太贵了！能不能便宜点？八十块卖不卖？',
          pinyin: 'Tài guì le! Néng bu néng piányi diǎn? Bāshí kuài mài bu mài?',
          meaning: '¡Es muy caro! ¿Puede rebajar un poco? ¿Me lo deja en 80 yuanes?',
        },
      ],
    },
  },
  {
    id: 'free',
    title: 'Tutor libre',
    chineseTitle: '自由对话 (李老师)',
    badge: 'Todos los niveles',
    icon: 'Sparkles',
    description: 'Conversación abierta y espontánea con Li Ming sobre cultura china, comida, vida diaria o preguntas de vocabulario.',
    rolePrompt: 'Eres Li Ming, un tutor de mandarín paciente y cálido de Pekín.',
    timeLimitSeconds: 300,
    dialogueStructure: [
      '1. Saludo e introducción del tema de interés',
      '2. Compartir impresiones y hacer preguntas mutuas',
      '3. Resumen y despedida cordial'
    ],
    objectives: [
      { id: 'obj_1', description: 'Responder sobre qué tema deseas practicar o comentar', completed: false },
      { id: 'obj_2', description: 'Hacer una pregunta o expresar una opinión personal en chino', completed: false },
      { id: 'obj_3', description: 'Mantener un intercambio continuo de al menos 3 turnos fluidos', completed: false }
    ],
    initialMessage: {
      hanzi: '你好！今天你想聊些什么呢？我们可以聊聊中国美食、旅行或者日常爱好。',
      translation: '¡Hola! ¿De qué te gustaría charlar hoy? Podemos hablar de comida china, viajes o tus pasatiempos diarios.',
      suggestedReplies: [
        {
          hanzi: '我想练习点餐和聊聊中国美食。',
          pinyin: 'Wǒ xiǎng liànxí diǎncān hé liáoliao Zhōngguó měishí.',
          meaning: 'Quiero practicar pedir comida y hablar sobre gastronomía china.',
        },
        {
          hanzi: '今天我们随便聊聊日常生活吧。',
          pinyin: 'Jīntiān wǒmen suíbiàn liáoliao rìcháng shēnghuó ba.',
          meaning: 'Hoy hablemos relajadamente sobre la vida diaria.',
        },
      ],
    },
  },
  {
    id: 'restaurant',
    title: 'Restaurante de Dumplings',
    chineseTitle: '老北京饺子馆',
    badge: 'HSK 2-3 • Comida',
    icon: 'UtensilsCrossed',
    description: 'Práctica cómo pedir jiaozi cocidos al vapor o a la plancha, pedir salsa de vinagre y ajo, y pedir la cuenta.',
    rolePrompt: 'Eres un mesero dinámico en un restaurante tradicional de ravioles chinos en el centro de Pekín.',
    timeLimitSeconds: 240,
    dialogueStructure: [
      '1. Indicar cuántas personas son y tomar asiento',
      '2. Elegir el relleno y cantidad de los dumplings',
      '3. Pedir bebida o condimentos y pedir la cuenta'
    ],
    objectives: [
      { id: 'obj_1', description: 'Indicar para cuántas personas es la mesa', completed: false },
      { id: 'obj_2', description: 'Pedir el tipo de relleno y porciones de ravioles', completed: false },
      { id: 'obj_3', description: 'Pedir una bebida, vinagre o la cuenta', completed: false }
    ],
    initialMessage: {
      hanzi: '您好几位？我们今天有现包的水饺：猪肉大葱、三鲜和素馅的，您想来几两？',
      translation: '¿Hola, cuántas personas son? Hoy tenemos ravioles recién hechos: cerdo con cebolleta, tres delicias y vegetariano. ¿Cuántas raciones desea?',
      suggestedReplies: [
        {
          hanzi: '两位，我们要一斤猪肉大葱水饺，再来一瓶北冰洋汽水。',
          pinyin: 'Liǎng wèi, wǒmen yào yì jīn zhūròu dàcōng shuǐjiǎo, zài lái yì píng Běibīngyáng qìshuǐ.',
          meaning: 'Dos personas. Queremos 500g de ravioles de cerdo con cebolleta y un refresco Beibingyang.',
        },
        {
          hanzi: '请问有素馅的吗？我不吃肉。',
          pinyin: 'Qǐngwèn yǒu sùxiàn de ma? Wǒ bù chī ròu.',
          meaning: '¿Disculpe, tienen rellenos vegetarianos? No como carne.',
        },
      ],
    },
  },
  {
    id: 'airport',
    title: 'Aeropuerto y Taxi',
    chineseTitle: '首都机场与打车',
    badge: 'HSK 1-2 • Viajes',
    icon: 'Car',
    description: 'Llegada al Aeropuerto de Pekín: pedir un taxi, dar la dirección de tu hotel y pedir que pongan el taxímetro.',
    rolePrompt: 'Eres un taxista afable y con acento típico pekinés esperando en la terminal del aeropuerto.',
    timeLimitSeconds: 180,
    dialogueStructure: [
      '1. Subir al taxi e indicar la dirección de destino',
      '2. Pedir encender el taxímetro y consultar el tiempo estimado',
      '3. Llegada, pago y despedida'
    ],
    objectives: [
      { id: 'obj_1', description: 'Indicar al taxista el nombre del hotel o calle de destino', completed: false },
      { id: 'obj_2', description: 'Pedir que ponga el taxímetro (打表) o preguntar si habrá atasco', completed: false },
      { id: 'obj_3', description: 'Preguntar el total y agradecer el viaje', completed: false }
    ],
    initialMessage: {
      hanzi: '去哪儿啊朋友？把行李放后备箱吧，上车系好安全带！',
      translation: '¿A dónde va, amigo? Ponga el equipaje en el maletero, ¡suba y abróchese el cinturón!',
      suggestedReplies: [
        {
          hanzi: '师傅您好，请去王府井步行街附近的酒店，请打表。',
          pinyin: 'Shīfu nǐ hǎo, qǐng qù Wángfǔjǐng bùxíngjiē fùjìn de jiǔdiàn, qǐng dǎbiǎo.',
          meaning: 'Hola maestro (chofer), por favor vamos al hotel cerca de Wangfujing, use el taxímetro por favor.',
        },
        {
          hanzi: '请问到市中心大概需要多长时间？会堵车吗？',
          pinyin: 'Qǐngwèn dào shìzhōngxīn dàgài xūyào duō cháng shíjiān? Huì dǔchē ma?',
          meaning: '¿Disculpe, cuánto tiempo toma aproximadamente llegar al centro? ¿Habrá atasco de tráfico?',
        },
      ],
    },
  },
];
