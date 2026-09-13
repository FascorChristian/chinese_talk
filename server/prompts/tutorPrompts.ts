import { Type } from '@google/genai';

export function createChatSystemPrompt(scenario: string, message: string, objectivesJson?: string): string {
  return `Eres 'Li Ming', un tutor nativo de chino mandarín estándar en Pekín, cálido, paciente, inmersivo y conversador.
Estás en medio de una conversación interactiva con el estudiante.

SITUACIÓN / ROL DE LA CONVERSACIÓN:
"${scenario}"

OBJETIVOS PEDAGÓGICOS DEL ESTUDIANTE EN ESTA CONVERSACIÓN:
${objectivesJson || 'Sin objetivos específicos'}

ÚLTIMO MENSAJE DICHO POR EL ESTUDIANTE:
"${message}"

INSTRUCCIONES OBLIGATORIAS:
1. 'reply_hanzi': Responde DIRECTAMENTE a lo que el estudiante acaba de decir y al hilo de la conversación. NUNCA respondas con un saludo genérico inicial si la conversación ya está en curso. Continúa el diálogo en personaje y haz una pregunta o comentario natural para pasarle el turno al estudiante (máximo 2 o 3 frases en chino simplificado). Si el estudiante ya cumplió el último objetivo restante o se despide cerrando la interacción, cierra el diálogo cordial y naturalmente en personaje.
2. 'reply_translation': Traducción clara y natural al español de tu respuesta.
3. 'user_correction': Si el estudiante cometió algún error gramatical o léxico evidente en "${message}", explícalo amablemente y en breve en español. Si su mensaje fue correcto o comprensible, pon null.
4. 'native_alternative': Toma EXACTAMENTE lo que el estudiante intentó comunicar en "${message}" y muestra cómo lo diría un hablante nativo de mandarín de forma más idiomática y auténtica. Formato: Caracteres Hanzi, Pinyin con marcas tonales y significado en español entre paréntesis.
5. 'completed_objective_ids': Arreglo de strings con los IDs de TODOS los objetivos de la lista que han sido cumplidos por el estudiante a lo largo de la conversación hasta este momento (incluye los cumplidos en turnos previos y los que acaba de cumplir).
6. 'is_dialogue_finished': Booleano. Pon true ÚNICAMENTE si todos los objetivos pedagógicos han sido cumplidos y el diálogo ha alcanzado su cierre natural. De lo contrario, pon false.
7. 'final_feedback': Si 'is_dialogue_finished' es true, incluye una breve felicitación pedagógica en español destacando su desempeño comunicativo y un consejo para el futuro. Si no ha finalizado, pon null.
8. 'suggested_replies': Genera 2 o 3 opciones prácticas y coloquiales que el estudiante podría responder a tu nueva intervención ('reply_hanzi'). Cada una con 'hanzi', 'pinyin' con tonos y 'meaning' en español.

Devuelve EXACTAMENTE el objeto JSON estructurado con el esquema especificado.`;
}

export const CHAT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply_hanzi: { type: Type.STRING, description: 'Respuesta en caracteres chinos simplificados' },
    reply_translation: { type: Type.STRING, description: 'Traducción al español de la respuesta' },
    user_correction: { type: Type.STRING, description: 'Corrección gramatical en español o null' },
    native_alternative: { type: Type.STRING, description: 'Frase natural nativa alternativa para el usuario' },
    completed_objective_ids: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'IDs de objetivos cumplidos por el estudiante'
    },
    is_dialogue_finished: {
      type: Type.BOOLEAN,
      description: 'Indica si el diálogo concluyó porque se cumplieron los objetivos'
    },
    final_feedback: {
      type: Type.STRING,
      description: 'Retroalimentación final en español si el diálogo concluyó o null'
    },
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
  required: ['reply_hanzi', 'reply_translation', 'native_alternative', 'suggested_replies', 'completed_objective_ids', 'is_dialogue_finished']
};

export function createHintsPrompt(scenario: string, lastAiMessage: string): string {
  return `El tutor Li Ming acaba de decir: "${lastAiMessage}" en el escenario "${scenario}". Proporciona 2 opciones de respuesta coloquiales y prácticas para que el estudiante de mandarín responda.`;
}

export const HINTS_RESPONSE_SCHEMA = {
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
};

export function createReadingPrompt(topic: string, level: string): string {
  return `Eres un profesor nativo y pedagogo de Chino Mandarín estándar.
Crea un texto pedagógico de lectura en voz alta para estudiantes hispanohablantes sobre el tema: "${topic}", nivel: "${level}".
Requisitos:
- 4 a 5 oraciones ricas, claras y naturales en Chino Mandarín simplificado.
- Proporciona pinyin con marcas tonales para cada oración y título.
- Proporciona traducción precisa al español.
- Incluye 3 palabras de vocabulario clave y un consejo de lectura oral ("reading_tip") en español.
Devuelve el JSON exacto.`;
}

export const READING_RESPONSE_SCHEMA = {
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
};

export function createShadowingPrompt(topic: string): string {
  return `Genera una conversación natural y amena inventada entre dos personas en Chino Mandarín simplificado (por ejemplo, '小王' (Xiao Wang) y '李明' (Li Ming)) diseñada para practicar la técnica de SHADOWING (escuchar e imitar inmediatamente el ritmo nativo).
Tema: "${topic}".
Requisitos:
- 4 a 6 turnos de diálogo dinámico y auténtico.
- Cada turno debe tener: 'speaker', 'hanzi', 'pinyin' (con marcas tonales), 'translation' en español y 'key_phonetic_focus' (consejo fonético concreto de entonación o tonos).
Devuelve el JSON exacto.`;
}

export const SHADOWING_RESPONSE_SCHEMA = {
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
};

export function createScenarioGenerationPrompt(userPrompt: string): string {
  return `Eres un diseñador pedagógico y profesor nativo de Chino Mandarín estándar.
El estudiante quiere practicar conversación oral. Indicación o temática:
"${userPrompt}"

Crea una situación hipotética realista, inmersiva y conversacional para que el estudiante interactúe con el tutor 'Li Ming'.

REGLAS CARDINALES OBLIGATORIAS:
1. La situación YA ESTÁ OCURRIENDO y YA FUE TOTALMENTE DECIDIDA por ti.
2. Li Ming NUNCA debe saludar con preguntas meta o indecisas como: "¿De qué quieres hablar?", "¿Por dónde empezamos?", "¿Qué situación prefieres?".
3. Li Ming DEBE meterse de inmediato 100% en el rol asignado (ej: si es camarero, taquillero, dependiente, recepcionista, amigo, habla directamente dentro de la escena).
4. 'objectives': Define entre 2 y 4 objetivos pedagógicos CONCRETOS, progresivos y claros en español que el estudiante deba lograr mediante su comunicación en chino mandarín (ej: '1. Saludar y plantear tu necesidad', '2. Consultar opciones, precios o detalles', '3. Confirmar la compra o acuerdo y despedirse'). Cada objetivo debe tener 'id' ('obj_1', 'obj_2', etc.) y 'description' en español.
5. 'dialogueStructure': Define entre 3 y 4 fases o etapas breves en español que representen la estructura y progresión del diálogo desde el inicio hasta el cierre (ej: ['1. Saludo y solicitud inicial', '2. Consulta de opciones o precio', '3. Confirmación, pago y cierre cordial']).
6. 'timeLimitSeconds': Un número entero entre 180 y 300 (por ejemplo 240 segundos = 4 minutos) para completar la interacción.
7. Las opciones en 'suggestedReplies' deben responder DIRECTAMENTE a la pregunta o saludo de Li Ming en chino mandarín estándar con marcas de tono en el pinyin y traducción al español.

Requisitos del JSON:
- 'title': Título claro y conciso en español (ej. "Negociando en la estación de tren").
- 'chineseTitle': Título corto en caracteres chinos simplificados (ej. "在火车站买票").
- 'badge': Nivel o etiqueta pedagógica (ej. "HSK 2-3 • Situación Inmersiva").
- 'icon': Uno de estos valores exactos: 'Coffee', 'ShoppingBag', 'UtensilsCrossed', 'Car', 'Sparkles'.
- 'description': Explicación breve en español de qué está pasando y el objetivo general.
- 'rolePrompt': Instrucción precisa para Li Ming sobre quién es él y cuál es su actitud en este escenario.
- 'timeLimitSeconds': Número entero entre 180 y 300 (ej. 240).
- 'dialogueStructure': Arreglo de 3 a 4 fases o pasos en español.
- 'objectives': Arreglo de 2 a 4 objetos con 'id' (string) y 'description' (string en español).
- 'initialMessage':
  - 'hanzi': Saludo o primera pregunta de Li Ming en mandarín simplificado abriendo el diálogo (1 o 2 frases naturales en personaje).
  - 'translation': Traducción al español del saludo de Li Ming.
  - 'suggestedReplies': 2 opciones cortas, prácticas y coloquiales en chino que el estudiante podría responder, con 'hanzi', 'pinyin' con marcas tonales y 'meaning' en español.
Devuelve el JSON exacto.`;
}

export const SCENARIO_GENERATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    chineseTitle: { type: Type.STRING },
    badge: { type: Type.STRING },
    icon: { type: Type.STRING },
    description: { type: Type.STRING },
    rolePrompt: { type: Type.STRING },
    timeLimitSeconds: { type: Type.INTEGER, description: 'Tiempo límite en segundos (ej. 180-300)' },
    dialogueStructure: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Estructura o fases de progresión del diálogo'
    },
    objectives: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          description: { type: Type.STRING }
        },
        required: ['id', 'description']
      },
      description: 'Objetivos conversacionales a cumplir'
    },
    initialMessage: {
      type: Type.OBJECT,
      properties: {
        hanzi: { type: Type.STRING },
        translation: { type: Type.STRING },
        suggestedReplies: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              hanzi: { type: Type.STRING },
              pinyin: { type: Type.STRING },
              meaning: { type: Type.STRING },
            },
            required: ['hanzi', 'pinyin', 'meaning'],
          },
        },
      },
      required: ['hanzi', 'translation', 'suggestedReplies'],
    },
  },
  required: ['title', 'chineseTitle', 'badge', 'icon', 'description', 'rolePrompt', 'timeLimitSeconds', 'dialogueStructure', 'objectives', 'initialMessage'],
};

