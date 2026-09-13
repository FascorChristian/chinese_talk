export interface MockShadowingItem {
  title: string;
  situation: string;
  characters: string[];
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

