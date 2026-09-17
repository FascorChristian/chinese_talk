export interface MockShadowingItem {
  id?: string;
  title: string;
  chineseTitle?: string;
  badge?: string;
  situation: string;
  characters: string[];
  dialogueStructure?: string[];
  objectives?: Array<{
    id: string;
    description: string;
  }>;
  turns: Array<{
    id: string;
    speaker: string;
    hanzi: string;
    pinyin: string;
    translation: string;
    key_phonetic_focus: string;
  }>;
}

export const SHADOWING_MOCKS: MockShadowingItem[] = [
  {
    id: 'mock_shadowing_hotpot',
    title: 'Fin de semana: ¡Vamos por un caldero mongol!',
    chineseTitle: '周末我们去吃老北京涮羊肉',
    badge: 'HSK 2-3 • Amistad y Comida',
    situation: 'Dos amigos, Xiao Wang y Li Ming, se encuentran el viernes por la tarde y planean cenar caldero juntos para combatir el frío de Pekín.',
    characters: ['小王 (Xiao Wang)', '李明 (Li Ming)'],
    dialogueStructure: [
      '1. Saludar y comentar el cansancio de la semana',
      '2. Proponer un plan gastronómico para el sábado',
      '3. Acordar la hora y el lugar de encuentro en el metro'
    ],
    objectives: [
      { id: 'obj_1', description: 'Preguntar por planes futuros con "明天周六你有什么安排吗？"' },
      { id: 'obj_2', description: 'Expresar acuerdo entusiasta con "好主意" y "太棒了"' },
      { id: 'obj_3', description: 'Sellar un compromiso con modismos nativos ("一言为定", "不见不散")' }
    ],
    turns: [
      {
        id: 't1',
        speaker: '小王 (Xiao Wang)',
        hanzi: '李明，这周工作太忙了，明天周六你有什么安排吗？',
        pinyin: 'Lǐ Míng, zhè zhōu gōngzuò tài máng le, míngtiān zhōuliù nǐ yǒu shénme ānpái ma?',
        translation: '¡Li Ming! Esta semana el trabajo estuvo ajetreado, ¿tienes algún plan para mañana sábado?',
        key_phonetic_focus: 'Enfatiza el tono alto de "忙" (máng, 2º tono) y la pregunta al final "吗" (neutro).'
      },
      {
        id: 't2',
        speaker: '李明 (Li Ming)',
        hanzi: '我正好没事！天气这么冷，不如我们去吃地道的老北京涮羊肉吧！',
        pinyin: 'Wǒ zhènghǎo méishì! Tiānqì zhème lěng, bùrú wǒmen qù chī dìdao de Lǎoběijīng shuànyángròu ba!',
        translation: '¡Justo no tengo nada que hacer! Con este frío, ¿qué tal si vamos a comer auténtico cordero al caldero estilo Pekín?',
        key_phonetic_focus: 'Conexión fluida en "不如我们" (bùrú wǒmen) y entonación entusiasmada.'
      },
      {
        id: 't3',
        speaker: '小王 (Xiao Wang)',
        hanzi: '太棒了！我知道前门附近有一家百年老店，麻酱小料特别香。',
        pinyin: 'Tài bàng le! Wǒ zhīdào Qiánmén fùjìn yǒu yì jiā bǎinián lǎodiàn, májiàng xiǎoliào tèbié xiāng.',
        translation: '¡Genial! Conozco un local centenario cerca de Qianmen, su salsa de sésamo huele riquísima.',
        key_phonetic_focus: 'Cuarto tono contundente en "太棒了" (Tài bàng le).'
      },
      {
        id: 't4',
        speaker: '李明 (Li Ming)',
        hanzi: '好主意！那我们明天下午六点在地铁站门口见，怎么样？',
        pinyin: 'Hǎo zhǔyi! Nà wǒmen míngtiān xiàwǔ liù diǎn zài dìtiězhàn ménkǒu jiàn, zěnmeyàng?',
        translation: '¡Buena idea! Entonces nos vemos mañana a las 6 de la tarde en la salida del metro, ¿te parece?',
        key_phonetic_focus: 'Cambio de tono en "好主意" (hǎo zhǔyi -> háo zhǔyi por doble tercer tono).'
      },
      {
        id: 't5',
        speaker: '小王 (Xiao Wang)',
        hanzi: '没问题，一言为定，明天不见不散！',
        pinyin: 'Méi wèntí, yì yán wéi dìng, míngtiān bú jiàn bú sàn!',
        translation: '¡Sin problema, trato hecho, nos vemos mañana sin falta!',
        key_phonetic_focus: 'Expresión idiomática china (Chengyu): "一言为定" e "不见不散".'
      }
    ]
  },
  {
    id: 'mock_shadowing_taxi',
    title: 'Llegada al Aeropuerto y Taxi a la Ciudad',
    chineseTitle: '首都机场打车到市区',
    badge: 'HSK 2 • Viajes y Transporte',
    situation: 'Un pasajero llega al Aeropuerto Capital de Pekín y toma un taxi para dirigirse a su hotel en Wangfujing.',
    characters: ['乘客 (Pasajero)', '司机 (Taxista)'],
    dialogueStructure: [
      '1. Saludar e indicar el destino deseado',
      '2. Preguntar tiempo estimado de trayecto y tráfico',
      '3. Llegada, consultar método de pago y agradecer'
    ],
    objectives: [
      { id: 'obj_1', description: 'Indicar destino y pedir poner el taxímetro ("打表")' },
      { id: 'obj_2', description: 'Preguntar por el tiempo estimado con "大概需要多长时间？"' },
      { id: 'obj_3', description: 'Preguntar y pagar con código QR o WeChat Pay' }
    ],
    turns: [
      {
        id: 't1',
        speaker: '乘客 (Pasajero)',
        hanzi: '师傅您好，请问去王府井步行街大概需要多长时间？',
        pinyin: 'Shīfu nín hǎo, qǐngwèn qù Wángfǔjǐng bùxíngjiē dàgài xūyào duō cháng shíjiān?',
        translation: 'Hola maestro (conductor), ¿cuánto tiempo toma aproximadamente ir a la calle peatonal Wangfujing?',
        key_phonetic_focus: 'El vocativo respetuoso "师傅" (shīfu) debe pronunciarse con segundo tono ligero.'
      },
      {
        id: 't2',
        speaker: '司机 (Taxista)',
        hanzi: '现在不堵车，走机场高速大概四十分钟就到了。请系好安全带！',
        pinyin: 'Xiànzài bù dǔchē, zǒu jīchǎng gāosù dàgài sìshí fēnzhōng jiù dào le. Qǐng jì hǎo ānquándài!',
        translation: 'Ahora no hay atasco, por la autopista del aeropuerto son unos 40 minutos. ¡Por favor abróchese el cinturón!',
        key_phonetic_focus: 'Distinción clara entre sì (4) y shí (10) en "四十分钟" (sìshí fēnzhōng).'
      },
      {
        id: 't3',
        speaker: '乘客 (Pasajero)',
        hanzi: '好的，请打表计费，谢谢您。',
        pinyin: 'Hǎo de, qǐng dǎbiǎo jìfèi, xièxie nín.',
        translation: 'De acuerdo, por favor use el taxímetro, muchas gracias.',
        key_phonetic_focus: 'Tercer tono claro en "打表" (dǎbiǎo).'
      },
      {
        id: 't4',
        speaker: '司机 (Taxista)',
        hanzi: '到了！一共一百零五块，微信或者支付宝扫码都可以。',
        pinyin: 'Dào le! Yígòng yìbǎi líng wǔ kuài, Wēixìn huòzhě Zhīfùbǎo sǎomǎ dōu kěyǐ.',
        translation: '¡Llegamos! Son 105 yuanes en total, puede escanear con WeChat o Alipay.',
        key_phonetic_focus: 'Entonación conclusiva y nombres de aplicaciones de pago.'
      }
    ]
  }
];

