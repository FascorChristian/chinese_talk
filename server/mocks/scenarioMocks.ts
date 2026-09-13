export interface ChatResponsePayload {
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

export const SCENARIO_MOCKS: Record<string, ChatResponsePayload[]> = {
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
  ],
  restaurant: [
    {
      reply_hanzi: '您好几位？我们今天有刚出锅的现包水饺，您看先来点凉菜还是直接点主食？',
      reply_translation: '¿Hola, cuántas personas son? Hoy tenemos ravioles recién hechos. ¿Desean entremeses fríos o piden el plato principal?',
      user_correction: null,
      native_alternative: '两位，来两盘水饺，一盘猪肉大葱的。(Liǎng wèi, lái liǎng pán shuǐjiǎo, yì pán zhūròu dàcōng de - Dos personas, dos platos de ravioles, uno de cerdo con puerro)',
      suggested_replies: [
        { hanzi: '两位，我们要一盘猪肉白菜水饺。', pinyin: 'Liǎng wèi, wǒmen yào yì pán zhūròu báicài shuǐjiǎo.', meaning: 'Dos personas, queremos un plato de ravioles de cerdo y col.' },
        { hanzi: '请问有什么推荐的招牌菜吗？', pinyin: 'Qǐngwèn yǒu shénme tuījiàn de zhāopái cài ma?', meaning: '¿Disculpe, qué plato de la casa recomienda?' }
      ]
    }
  ],
  airport: [
    {
      reply_hanzi: '去哪儿啊朋友？把大件行李放后备箱就行，上车请系好安全带！',
      reply_translation: '¿A dónde va, amigo? Ponga el equipaje grande en el maletero, ¡suba y abróchese el cinturón!',
      user_correction: null,
      native_alternative: '师傅，去王府井，麻烦打表。(Shīfu, qù Wángfǔjǐng, máfan dǎbiǎo - Chofer, a Wangfujing, ponga el taxímetro por favor)',
      suggested_replies: [
        { hanzi: '师傅，请去市中心的酒店，请打表。', pinyin: 'Shīfu, qǐng qù shìzhōngxīn de jiǔdiàn, qǐng dǎbiǎo.', meaning: 'Chofer, por favor vamos al hotel del centro, ponga el taxímetro.' },
        { hanzi: '请问到市区大概要多长时间？', pinyin: 'Qǐngwèn dào shìqū dàgài yào duō cháng shíjiān?', meaning: '¿Cuánto tiempo tardará aproximadamente en llegar al área urbana?' }
      ]
    }
  ]
};

export const DEFAULT_HINTS = [
  { hanzi: '我想了解更多细节。', pinyin: 'Wǒ xiǎng liǎojiě gèng duō xìjié.', meaning: 'Me gustaría conocer más detalles.' },
  { hanzi: '你可以慢慢再说一遍吗？', pinyin: 'Nǐ kěyǐ mànmàn zài shuō yí biàn ma?', meaning: '¿Podrías repetirlo más despacio, por favor?' }
];

