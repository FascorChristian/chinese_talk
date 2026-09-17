export interface MockReadingItem {
  id?: string;
  title_hanzi: string;
  title_pinyin: string;
  title_translation: string;
  topic: string;
  level: string;
  badge?: string;
  genre?: string;
  reading_tip: string;
  full_text_hanzi?: string;
  sentences: Array<{
    id: string;
    hanzi: string;
    pinyin: string;
    translation: string;
  }>;
  vocabulary: Array<{
    word: string;
    pinyin: string;
    meaning: string;
  }>;
  comprehension_questions: Array<{
    id: string;
    question_zh: string;
    question_pinyin?: string;
    question_es: string;
    expected_answer_summary: string;
  }>;
}

export const READING_MOCKS: MockReadingItem[] = [
  {
    id: 'mock_tea_culture',
    title_hanzi: '中国茶文化与客来敬茶',
    title_pinyin: 'Zhōngguó chá wénhuà yǔ kè lái jìng chá',
    title_translation: 'La cultura del té chino y la hospitalidad',
    topic: 'Tradición y cultura',
    level: 'HSK 2-3',
    badge: 'Cultura • Tradición Milenaria',
    genre: 'Relato cultural',
    reading_tip: 'Presta especial atención al cambio de tono (sandhi) en "一个" (yí gè) y al tercer tono suave en "茶" (chá).',
    full_text_hanzi: '在中国，喝茶不仅是一种习惯，更是一种生活艺术。中国人常说：“客来敬茶”，这是最传统的待客礼节。绿茶清香，红茶温润，乌龙茶回味悠长。下午和朋友一起喝一杯热茶，心情会特别放松。',
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
    ],
    comprehension_questions: [
      {
        id: 'q1',
        question_zh: '中国人常说的“客来敬茶”是什么意思？',
        question_pinyin: 'Zhōngguórén cháng shuō de “kè lái jìng chá” shì shénme yìsi?',
        question_es: '¿Qué significa la frase tradicional china "客来敬茶" (cuando viene un huésped, sírvele té)?',
        expected_answer_summary: 'Significa que servir té a los invitados al llegar es la cortesía tradicional más importante de hospitalidad.'
      },
      {
        id: 'q2',
        question_zh: '根据短文，下午和朋友喝茶有什么好处？',
        question_pinyin: 'Gēnjù duǎnwén, xiàwǔ hé péngyou hēchá yǒu shénme hǎochù?',
        question_es: 'Según el texto, ¿qué beneficio tiene tomar una taza de té con amigos por la tarde?',
        expected_answer_summary: 'Ayuda a relajar el estado de ánimo (心情特别放松).'
      }
    ]
  },
  {
    id: 'mock_hutong_morning',
    title_hanzi: '北京胡同里的烟火早晨',
    title_pinyin: 'Běijīng hútòng lǐ de yānhuǒ zǎochen',
    title_translation: 'Una mañana cotidiana en los callejones de Pekín',
    topic: 'Vida cotidiana',
    level: 'HSK 2-3',
    badge: 'Vida Diaria • Costumbres',
    genre: 'Descripción costumbrista',
    reading_tip: 'Trata de pronunciar la rhotacización pequinesa suavemente en palabras como "早点儿" (zǎodiǎnr).',
    full_text_hanzi: '清晨的北京胡同非常安静，只能听到自行车的铃声。老街坊们起得很早，在路边的小吃摊吃热腾腾的包子和豆浆。公园里，很多老人在打太极拳，练习书法。这就是充满烟火气与人情味的北京日常生活。',
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
    ],
    comprehension_questions: [
      {
        id: 'q1',
        question_zh: '早晨胡同里的街坊们早餐吃什么？',
        question_pinyin: 'Zǎochen hútòng lǐ de jiēfang men zǎocān chī shénme?',
        question_es: '¿Qué desayunan los vecinos en los puestos callejeros del hutong por la mañana?',
        expected_answer_summary: 'Comen bollos al vapor humeantes (包子, baozi) y leche de soja caliente (豆浆, dòujiāng).'
      },
      {
        id: 'q2',
        question_zh: '公园里的老人们在做哪些活动？',
        question_pinyin: 'Gōngyuán lǐ de lǎorén men zài zuò nǎxiē huódòng?',
        question_es: '¿Qué actividades realizan los ancianos en el parque por la mañana?',
        expected_answer_summary: 'Practican tai chi (打太极拳) y caligrafía china (练习书法).'
      }
    ]
  }
];

