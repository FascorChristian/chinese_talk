import { Type } from '@google/genai';

export function createChatSystemPrompt(
  scenario: string, 
  message: string, 
  objectivesJson?: string,
  userProfileContext?: string,
  messagePinyin?: string
): string {
  const profileSection = userProfileContext 
    ? `\nADAPTACIÓN PEDAGÓGICA AL PERFIL DEL ESTUDIANTE:\n${userProfileContext}\nAdapta la velocidad aparente, vocabulario y estructuras a este nivel. Si tiene debilidades señaladas, ayúdale con paciencia y desafía sus puntos de mejora.\n` 
    : '';

  return `Eres 'Li Ming', un tutor nativo de chino mandarín estándar en Pekín, cálido, paciente, inmersivo y conversador.
Estás en medio de una conversación interactiva con el estudiante.
${profileSection}
SITUACIÓN / ROL DE LA CONVERSACIÓN:
"${scenario}"

OBJETIVOS PEDAGÓGICOS DEL ESTUDIANTE EN ESTA CONVERSACIÓN:
${objectivesJson || 'Sin objetivos específicos'}

ÚLTIMO MENSAJE DICHO POR EL ESTUDIANTE (captado por micrófono Speech-to-Text):
- Caracteres transcritos: "${message}"
${messagePinyin ? `- Pinyin fonético: "${messagePinyin}"` : ''}

REGLA CRÍTICA SOBRE SPEECH-TO-TEXT Y HOMÓFONOS EN CHINO:
El mensaje del estudiante fue transcrito automáticamente por reconocimiento de voz (STT), el cual frecuentemente sustituye palabras por caracteres HOMÓFONOS que tienen el mismo Pinyin o sonido parecido (por ejemplo: escribir 他 en vez de 她, 事 en vez de 是, 再 en vez de 在, 做 en vez de 坐, 期 en vez de 七).
- Evalúa SIEMPRE lo que el estudiante DIJO FONÉTICAMENTE según su Pinyin y el contexto de la situación.
- NUNCA señales como error del estudiante en 'user_correction' un carácter homófono elegido por el micrófono si fonéticamente (en Pinyin) la palabra era correcta.

INSTRUCCIONES OBLIGATORIAS:
1. 'reply_hanzi': Responde DIRECTAMENTE a lo que el estudiante acaba de decir y al hilo de la conversación. NUNCA respondas con un saludo genérico inicial si la conversación ya está en curso. Continúa el diálogo en personaje y haz una pregunta o comentario natural para pasarle el turno al estudiante (máximo 2 o 3 frases en chino simplificado). Si el estudiante ya cumplió el último objetivo restante o se despide cerrando la interacción, cierra el diálogo cordial y naturalmente en personaje.
2. 'reply_translation': Traducción clara y natural al español de tu respuesta.
3. 'user_correction': Si el estudiante cometió algún error gramatical real (no homófonos del micrófono), explícalo amablemente y en breve en español. Si su mensaje fue fonéticamente correcto o comprensible, pon null.
4. 'native_alternative': Toma EXACTAMENTE lo que el estudiante intentó comunicar (corrigiendo silenciosamente cualquier homófono del STT al Hanzi correcto) y muestra cómo lo diría un hablante nativo de mandarín de forma más idiomática y auténtica. Formato: Caracteres Hanzi, Pinyin con marcas tonales y significado en español entre paréntesis.
5. 'completed_objective_ids': Arreglo de strings con los IDs de TODOS los objetivos de la lista que han sido cumplidos por el estudiante a lo largo de la conversación hasta este momento (incluye los cumplidos en turnos previos y los que acaba de cumplir, interpretando con flexibilidad fonética).
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

export function createReadingPrompt(
  topic: string, 
  level: string = 'HSK 2-3', 
  genre?: string,
  userProfileContext?: string
): string {
  const genreNote = genre ? ` Género literario o estilo: "${genre}".` : '';
  const profileNote = userProfileContext ? `\nPERFIL DEL ESTUDIANTE:\n${userProfileContext}\nAsegúrate de calibrar el texto al nivel y desafiar las debilidades mencionadas.\n` : '';
  return `Eres un profesor nativo y pedagogo de Chino Mandarín estándar.
Crea un texto corto coherente y enriquecedor para lectura en voz alta y evaluación de comprensión lectora para estudiantes hispanohablantes.
Tema o indicación: "${topic}". Nivel: "${level}".${genreNote}${profileNote}

REQUISITOS PEDAGÓGICOS:
1. No debe ser un diálogo entre personas, sino un texto corto de distinta índole (por ejemplo: una historia tradicional china, una fábula, un relato cultural, una anécdota curiosa, una descripción de viajes o costumbres).
2. Longitud: Entre 4 y 6 oraciones coherentes y bien estructuradas en Chino Mandarín simplificado (aprox. 80-140 caracteres en total).
3. 'full_text_hanzi': El texto completo unificado en chino mandarín estándar para lectura corrida.
4. 'sentences': Desglose de cada oración con 'id' ('s1', 's2', etc.), 'hanzi', 'pinyin' con marcas tonales y 'translation' en español.
5. 'vocabulary': 3 a 4 palabras clave relevantes con 'word', 'pinyin' y 'meaning' en español.
6. 'reading_tip': Un consejo fonético concreto para leer este texto en voz alta con buena dicción y fluidez.
7. 'comprehension_questions': Exactamente 2 o 3 preguntas concisas de comprensión lectora basadas estrictamente en la información del texto.
   - Cada pregunta debe contener:
     - 'id': 'q1', 'q2', etc.
     - 'question_zh': Pregunta en chino mandarín simplificado.
     - 'question_pinyin': Transcripción en pinyin con marcas de tono.
     - 'question_es': Pregunta clara en español.
     - 'expected_answer_summary': Resumen en español de la información requerida que responde a la pregunta según el texto.

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
    badge: { type: Type.STRING },
    genre: { type: Type.STRING },
    full_text_hanzi: { type: Type.STRING },
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
    },
    comprehension_questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question_zh: { type: Type.STRING },
          question_pinyin: { type: Type.STRING },
          question_es: { type: Type.STRING },
          expected_answer_summary: { type: Type.STRING }
        },
        required: ['id', 'question_zh', 'question_es', 'expected_answer_summary']
      }
    }
  },
  required: ['title_hanzi', 'title_pinyin', 'title_translation', 'sentences', 'reading_tip', 'comprehension_questions']
};

export function createReadingAloudEvaluationPrompt(params: {
  transcribedText: string;
  expectedText: string;
  durationSeconds: number;
}): string {
  return `Eres un examinador de fonética y lectura oral de Chino Mandarín estándar.
El estudiante leyó en voz alta un texto en chino. Evalúa su audio transcrito comparado con el texto original.

DATOS:
- Texto esperado (Hanzi): "${params.expectedText}"
- Audio transcrito del estudiante: "${params.transcribedText}"
- Duración de la lectura: ${params.durationSeconds.toFixed(2)} segundos

TAREAS:
1. Compara carácter por carácter.
2. Puntaje general de 0 a 100 evaluando precisión, completitud y fluidez (score >= 75 es aprobado/passed).
3. Detecta omisiones ('omission') y sustituciones ('substitution').
4. Evalúa velocidad ('too_slow', 'slow', 'natural', 'fast', 'too_fast') con etiqueta y consejo.
5. Proporciona recomendaciones pedagógicas de pronunciación en español ('pronunciationAdvice').

Devuelve el JSON exacto.`;
}

export const READING_ALOUD_EVALUATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER, description: 'Puntaje de 0 a 100' },
    passed: { type: Type.BOOLEAN, description: 'True si score >= 75' },
    transcribedText: { type: Type.STRING },
    expectedText: { type: Type.STRING },
    speed: {
      type: Type.OBJECT,
      properties: {
        rating: { type: Type.STRING },
        label: { type: Type.STRING },
        comment: { type: Type.STRING }
      },
      required: ['rating', 'label', 'comment']
    },
    mistakes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          type: { type: Type.STRING },
          expected: { type: Type.STRING },
          heard: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ['word', 'type', 'explanation']
      }
    },
    pronunciationAdvice: { type: Type.STRING }
  },
  required: ['score', 'passed', 'transcribedText', 'expectedText', 'mistakes', 'pronunciationAdvice']
};

export function createComprehensionEvaluationPrompt(params: {
  questionZh: string;
  questionEs: string;
  expectedAnswer: string;
  fullText: string;
  userTranscript: string;
  userPinyin?: string;
}): string {
  return `Eres un profesor experto de comprensión lectora de Chino Mandarín.
El estudiante leyó un texto en chino y ha respondido a una pregunta de comprensión enviando un audio.

TEXTO DE REFERENCIA:
"${params.fullText}"

PREGUNTA DE COMPRENSIÓN:
- En chino: "${params.questionZh}"
- En español: "${params.questionEs}"
- Respuesta esperada: "${params.expectedAnswer}"

RESPUESTA DEL ESTUDIANTE (transcripción vía Speech-to-Text):
- Texto transcrito: "${params.userTranscript}"
${params.userPinyin ? `- Pinyin fonético: "${params.userPinyin}"` : ''}

REGLAS CLAVE DE EVALUACIÓN:
1. El estudiante puede haber respondido en ESPAÑOL o en CHINO MANDARÍN (o una mezcla).
2. TOLERANCIA A HOMÓFONOS DEL MICRÓFONO (STT): La respuesta proviene de reconocimiento de voz automático. Si el estudiante respondió en chino y el micrófono escribió caracteres homófonos con el mismo Pinyin o sonido parecido a las palabras del texto, valóralo como 100% CORRECTO según su sonido fonético (Pinyin) e intención comunicativa.

Devuelve:
- 'is_correct': boolean (true si responde adecuadamente según el texto o su sonido en Pinyin, false si es incorrecta o incompleta).
- 'score': número entero entre 0 y 100 (85-100 = respuesta acertada, 55-84 = parcialmente acertada, 0-50 = incorrecta).
- 'language_detected': 'es' si respondió en español, 'zh' si respondió en chino, 'mixed' si combinó ambos.
- 'feedback': Explicación constructiva y pedagógica en español felicitándolo o indicando qué dato del texto faltó.

Devuelve el JSON exacto.`;
}

export const COMPREHENSION_EVALUATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    is_correct: { type: Type.BOOLEAN },
    score: { type: Type.INTEGER },
    language_detected: { type: Type.STRING },
    feedback: { type: Type.STRING }
  },
  required: ['is_correct', 'score', 'language_detected', 'feedback']
};

export function createShadowingPrompt(
  topic: string, 
  category?: string,
  userProfileContext?: string
): string {
  const categoryContext = category ? ` (Categoría o enfoque: ${category})` : '';
  const profileNote = userProfileContext ? `\nPERFIL DEL ESTUDIANTE:\n${userProfileContext}\nAjusta la longitud de las frases y enfoca key_phonetic_focus en sus debilidades fonéticas.\n` : '';
  return `Genera una conversación natural, amena y auténtica inventada entre dos personas en Chino Mandarín simplificado (por ejemplo, '小王' (Xiao Wang) y '李明' (Li Ming) o dos personajes idóneos según la escena) diseñada específicamente para practicar la técnica de SHADOWING (escuchar e imitar de inmediato el ritmo, pausas y pronunciación nativa).

Tema o contexto solicitado:
"${topic}"${categoryContext}${profileNote}

Requisitos pedagógicos obligatorios:
1. 'title': Título atractivo y conciso en español (ej. "Planeando cena de fin de semana", "En el mercado de seda").
2. 'chineseTitle': Título corto en caracteres chinos simplificados (ej. "周末去吃火锅", "在丝绸市场购物").
3. 'badge': Nivel o etiqueta pedagógica (ej. "HSK 2-3 • Shadowing Ritmo Nativo").
4. 'situation': Breve descripción en español de la situación y por qué están conversando.
5. 'characters': Array con los dos nombres de los interlocutores (ej. ["小王 (Xiao Wang)", "李明 (Li Ming)"]).
6. 'dialogueStructure': Array de 3 a 4 fases o etapas del diálogo que muestren progresión natural (ej. ["1. Saludo y propuesta de encuentro", "2. Discusión de lugar y comida", "3. Confirmar hora y despedida"]).
7. 'objectives': Array de 2 a 3 objetivos pedagógicos claros y medibles en español con 'id' ('obj_1', 'obj_2', etc.) y 'description' (ej. 'obj_1': 'Saludar e indagar disponibilidad para el fin de semana').
8. 'turns': Entre 4 y 6 turnos dinámicos y alternados entre ambos personajes.
   - Cada turno debe tener:
     - 'id': Identificador único (ej. 't1', 't2', ...).
     - 'speaker': Nombre del personaje que habla (coincidente con characters).
     - 'hanzi': Frase en chino mandarín estándar simplificado (de longitud adecuada para imitar en shadowing, entre 8 y 25 caracteres).
     - 'pinyin': Transcripción en pinyin estándar con marcas de tono exactas.
     - 'translation': Traducción natural al español.
     - 'key_phonetic_focus': Consejo fonético concreto sobre entonación, enlace sonoro, cambios de tono (sandhi de 3er tono o 不/一) o pausas recomendadas.

Devuelve el JSON exacto.`;
}

export const SHADOWING_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    chineseTitle: { type: Type.STRING },
    badge: { type: Type.STRING },
    situation: { type: Type.STRING },
    characters: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    dialogueStructure: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Fases o estructura del diálogo'
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
      description: 'Objetivos conversacionales y de entonación'
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

export function createShadowingEvaluationPrompt(params: {
  transcribedText: string;
  expectedText: string;
  expectedPinyin: string;
  durationSeconds: number;
  keyPhoneticFocus?: string;
  objectives?: { id: string; description: string }[];
}): string {
  const {
    transcribedText,
    expectedText,
    expectedPinyin,
    durationSeconds,
    keyPhoneticFocus = 'Claridad fonética y tonos estándar.',
    objectives = []
  } = params;

  return `Eres un evaluador lingüístico experto y profesor nativo de fonética de Chino Mandarín estándar especializado en la técnica de Shadowing (影子跟读法).
El estudiante de mandarín acaba de escuchar una frase modelo de un diálogo nativo y la ha imitado con su micrófono.

DATOS DE LA LÍNEA:
- Frase modelo esperada (Hanzi): "${expectedText}"
- Pinyin esperado: "${expectedPinyin}"
- Audio transcrito del estudiante: "${transcribedText}"
- Duración del audio del estudiante: ${durationSeconds.toFixed(2)} segundos
- Foco fonético de la frase: "${keyPhoneticFocus}"
- Objetivos pedagógicos del diálogo: ${JSON.stringify(objectives)}

TAREAS DE EVALUACIÓN OBLIGATORIAS:
1. Comparación Léxica y Fonética ('transcribedText' vs 'expectedText'):
   - Compara carácter por carácter y palabra por palabra.
   - Identifica omisiones (caracteres o palabras que el estudiante omitió).
   - Identifica sustituciones (palabras que el estudiante cambió o dijo diferente, o errores causados por tono incorrecto captados por el reconocimiento de voz).
2. Puntaje general (score: 0 a 100):
   - 90-100: Imitación casi perfecta o idéntica en ritmo y palabras.
   - 75-89: Buena imitación con pequeñas omisiones de partículas o leves variaciones.
   - 50-74: Se entiende parte del mensaje, pero faltaron varias palabras clave o hubo sustituciones notorias.
   - 0-49: Frase muy incompleta, incorrecta o ininteligible.
   - 'passed': true si el score es >= 75, false en caso contrario.
3. Evaluación de Velocidad (Speed):
   - Considera el número de caracteres/sílabas de la frase esperada (${expectedText.length} caracteres) y la duración de ${durationSeconds.toFixed(2)} segundos.
   - En chino conversacional estándar, la velocidad natural es de aproximadamente 2.8 a 4.5 sílabas por segundo.
   - 'rating': Uno de 'too_slow', 'slow', 'natural', 'fast', 'too_fast'.
   - 'syllablesPerSecond': Número decimal (ej. 3.2).
   - 'label': Texto descriptivo en español (ej. "Velocidad Natural (3.2 síl/seg)", "Un poco lenta (1.8 síl/seg)").
   - 'comment': Comentario pedagógico en español explicando si el estudiante debe acelerar, mantener esa cadencia o hablar con más calma.
4. Evaluación de la Naturalidad de las Pausas (Pauses):
   - Evalúa si el estudiante pausó en las unidades de pensamiento correctas (意群) o si hizo pausas indebidas en mitad de palabras o partículas gramaticales.
   - 'rating': Uno de 'natural', 'hesitant', 'unnatural', 'too_frequent'.
   - 'label': Etiqueta en español (ej. "Pausas Naturales y Fluidas", "Pausas Vacilantes", "Pausas en Lugares Inadecuados").
   - 'comment': Observación detallada en español sobre cómo respirar y dónde hacer la pausa según comas o grupos de sentido.
5. Lista de Errores ('mistakes'):
   - Arreglo con cada error encontrado:
     - 'word': Carácter o palabra afectada.
     - 'type': 'omission' (omitido), 'substitution' (cambiado por otra palabra), 'tone' (error de tono perceptible), 'pronunciation' (pronunciación defectuosa).
     - 'pinyin': Pinyin correcto con marcas de tono.
     - 'expected': Lo que debía decir.
     - 'heard': Lo que se escuchó.
     - 'explanation': Breve explicación en español de qué ocurrió y cómo corregirlo.
   - Si no hubo errores, devuelve un array vacío [].
6. Recomendación de Pronunciación ('pronunciationFeedback'):
   - Consejos directos y prácticos de fonética (colocación de la lengua, aspiración zh/ch/sh/r, j/q/x, o tonos 1º, 2º, 3º, 4º).
7. Consejo General ('generalAdvice'):
   - Consejo estimulante y sugerencia clave para la siguiente repetición.
8. Objetivos Cumplidos ('completedObjectives'):
   - Arreglo de IDs de objetivos del diálogo que hayan sido logrados con éxito gracias a esta imitación (ej. ['obj_1']).

Devuelve el JSON exacto.`;
}

export const SHADOWING_EVALUATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.INTEGER, description: 'Puntaje de 0 a 100' },
    passed: { type: Type.BOOLEAN, description: 'True si score >= 75' },
    transcribedText: { type: Type.STRING },
    expectedText: { type: Type.STRING },
    speed: {
      type: Type.OBJECT,
      properties: {
        rating: { type: Type.STRING },
        syllablesPerSecond: { type: Type.NUMBER },
        label: { type: Type.STRING },
        comment: { type: Type.STRING }
      },
      required: ['rating', 'syllablesPerSecond', 'label', 'comment']
    },
    pauses: {
      type: Type.OBJECT,
      properties: {
        rating: { type: Type.STRING },
        label: { type: Type.STRING },
        comment: { type: Type.STRING }
      },
      required: ['rating', 'label', 'comment']
    },
    mistakes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          type: { type: Type.STRING },
          pinyin: { type: Type.STRING },
          expected: { type: Type.STRING },
          heard: { type: Type.STRING },
          explanation: { type: Type.STRING }
        },
        required: ['word', 'type', 'explanation']
      }
    },
    pronunciationFeedback: { type: Type.STRING },
    generalAdvice: { type: Type.STRING },
    completedObjectives: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ['score', 'passed', 'speed', 'pauses', 'mistakes', 'pronunciationFeedback', 'generalAdvice']
};

export function createScenarioGenerationPrompt(
  userPrompt: string,
  userProfileContext?: string
): string {
  const profileNote = userProfileContext ? `\nPERFIL DEL ESTUDIANTE:\n${userProfileContext}\nAdapta la situación, el badge de nivel HSK y los objetivos al perfil del alumno.\n` : '';
  return `Eres un diseñador pedagógico y profesor nativo de Chino Mandarín estándar.
El estudiante quiere practicar conversación oral. Indicación o temática:
"${userPrompt}"${profileNote}

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

// ==========================================
// DIAGNOSTIC ASSESSMENT & LEVEL UPGRADE PROMPTS
// ==========================================

export function createDiagnosticChallengePrompt(params: {
  modeType: 'diagnostic' | 'evaluation_challenge';
  currentHskLevel: string;
  targetHskLevel: string;
  userProfileContext?: string;
}): string {
  const isChallenge = params.modeType === 'evaluation_challenge';
  const modeContext = isChallenge
    ? `MODO DESAFÍO DE EVALUACIÓN (SUBIDA DE NIVEL HSK / HSKK):
El estudiante tiene actualmente nivel ${params.currentHskLevel} y desea superarse para ascender formalmente a ${params.targetHskLevel}.
Diseña una prueba EXIGENTE y DESAFIANTE con una dificultad mayor (+1 nivel por encima de su nivel base actual) que ponga a prueba su verdadera solidez comunicativa.`
    : `MODO DIAGNÓSTICO INTEGRAL DE 3 HABILIDADES:
El estudiante desea calibrar y medir sus habilidades con precisión para identificar su nivel real de HSK y HSKK oral, además de anotar fortalezas y debilidades.
Nivel estimado de referencia: ${params.currentHskLevel}.`;

  const profileNote = params.userProfileContext ? `\nPERFIL PREVIO DEL ALUMNO:\n${params.userProfileContext}\n` : '';

  return `Eres la comisión examinadora senior de Chino Mandarín estándar (HSK / HSKK 口语) para estudiantes hispanohablantes.
${modeContext}
${profileNote}

Diseña una prueba de 3 habilidades integradas con la siguiente estructura exacta:

1. 'conversationTask':
   - 'situation': Una situación conversacional realista y dinámica en español donde el estudiante deba comunicarse en chino con Li Ming (ej. negociar un billete de tren, pedir comida callejera auténtica o pedir indicaciones en una estación).
   - 'rolePrompt': Rol que asumirá Li Ming en el intercambio.
   - 'initialAiMessage': Saludo e intervención inicial de Li Ming ('hanzi', 'pinyin', 'translation') que obligue al estudiante a formular respuestas orales completas.
   - 'suggestedTopics': 2 ideas temáticas para orientar el diálogo.

2. 'shadowingTask':
   - 'turns': Exactamente 3 frases modelo de dificultad progresiva (entre 8 y 22 caracteres) en chino simplificado para que el estudiante las escuche y las imite de inmediato (shadowing).
   - Cada turno con: 'id' ('sh1', 'sh2', 'sh3'), 'speaker' ('Li Ming'), 'hanzi', 'pinyin', 'translation', y 'keyPhoneticFocus' (enfocado en pares mínimos zh/ch/sh, sandhi de 3er tono o entonación natural).

3. 'readingTask':
   - 'title_hanzi', 'title_pinyin', 'title_translation': Título de la lectura cultural o narrativa.
   - 'full_text_hanzi': Un texto corto continuo en prosa de 4 a 5 oraciones en chino simplificado (aprox. 85-130 caracteres) adecuado para lectura en voz alta.
   - 'pinyin': Pinyin completo del texto con marcas tonales.
   - 'translation': Traducción natural completa al español.
   - 'comprehension_questions': Exactamente 2 preguntas de comprensión lectora ('id', 'question_zh', 'question_pinyin', 'question_es', 'expected_answer_summary').

Devuelve el JSON exacto.`;
}

export const DIAGNOSTIC_CHALLENGE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    modeType: { type: Type.STRING },
    targetHskLevel: { type: Type.STRING },
    targetHskkLevel: { type: Type.STRING },
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    conversationTask: {
      type: Type.OBJECT,
      properties: {
        situation: { type: Type.STRING },
        rolePrompt: { type: Type.STRING },
        initialAiMessage: {
          type: Type.OBJECT,
          properties: {
            hanzi: { type: Type.STRING },
            pinyin: { type: Type.STRING },
            translation: { type: Type.STRING },
          },
          required: ['hanzi', 'pinyin', 'translation'],
        },
        suggestedTopics: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: ['situation', 'rolePrompt', 'initialAiMessage', 'suggestedTopics'],
    },
    shadowingTask: {
      type: Type.OBJECT,
      properties: {
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
              keyPhoneticFocus: { type: Type.STRING },
            },
            required: ['id', 'speaker', 'hanzi', 'pinyin', 'translation', 'keyPhoneticFocus'],
          },
        },
      },
      required: ['turns'],
    },
    readingTask: {
      type: Type.OBJECT,
      properties: {
        title_hanzi: { type: Type.STRING },
        title_pinyin: { type: Type.STRING },
        title_translation: { type: Type.STRING },
        full_text_hanzi: { type: Type.STRING },
        pinyin: { type: Type.STRING },
        translation: { type: Type.STRING },
        comprehension_questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              question_zh: { type: Type.STRING },
              question_pinyin: { type: Type.STRING },
              question_es: { type: Type.STRING },
              expected_answer_summary: { type: Type.STRING },
            },
            required: ['id', 'question_zh', 'question_es', 'expected_answer_summary'],
          },
        },
      },
      required: ['title_hanzi', 'title_pinyin', 'title_translation', 'full_text_hanzi', 'pinyin', 'translation', 'comprehension_questions'],
    },
  },
  required: ['id', 'modeType', 'targetHskLevel', 'targetHskkLevel', 'title', 'description', 'conversationTask', 'shadowingTask', 'readingTask'],
};

export function createDiagnosticReportPrompt(submission: any): string {
  const isChallenge = submission.modeType === 'evaluation_challenge';

  return `Eres la comisión evaluadora académica oficial para certificar niveles HSK (comprensión y lecto-escritura) y HSKK (汉语水平口语考试 - expresión oral en mandarín).

TIPO DE PRUEBA: ${isChallenge ? 'DESAFÍO DE ASCENSO DE NIVEL' : 'EVALUACIÓN DIAGNÓSTICA INICIAL'}
NIVEL ACTUAL: ${submission.currentHskLevel || 'HSK 2'}
NIVEL OBJETIVO DEL DESAFÍO: ${submission.targetHskLevel || 'HSK 3'}

EVIDENCIAS DEL ESTUDIANTE RECOGIDAS EN LA PRUEBA:

1. FASE CONVERSACIONAL (Diálogo Oral):
${JSON.stringify(submission.conversationData || [], null, 2)}

2. FASE SHADOWING & FONÉTICA (Imitación y Cadencia):
${JSON.stringify(submission.shadowingData || [], null, 2)}

3. FASE LECTURA EN VOZ ALTA & PREGUNTAS DE COMPRENSIÓN:
- Audio transcrito en lectura: "${submission.readingData?.aloudTranscript || ''}"
- Puntaje fonético de lectura: ${submission.readingData?.aloudScore || 0}%
- Respuestas a preguntas de comprensión: ${JSON.stringify(submission.readingData?.answers || [], null, 2)}

CRITERIOS RIGUROSOS DE CALIFICACIÓN:
1. 'assignedHskLevel': 'HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5' o 'HSK 6' según vocabulario, gramática y comprensión mostrada.
2. 'assignedHskkLevel':
   - 'HSKK Inicial' (初级): Comprensión y producción de frases cotidianas sencillas (HSK 1 - HSK 2).
   - 'HSKK Intermedio' (中级): Expresión fluida sobre viajes, compras y trabajo con oraciones compuestas (HSK 3 - HSK 4).
   - 'HSKK Avanzado' (高级): Discurso oral natural, vocabulario formal/idiomático, debate y precisión en velocidad nativa (HSK 5 - HSK 6).
3. 'levelUpgradeGranted': Boolean.
   - En modo desafío ('evaluation_challenge'): true ÚNICAMENTE si el estudiante alcanzó un overallScore >= 75% y demostró suficiencia en las 3 fases para ascender a ${submission.targetHskLevel}; false si no alcanzó el umbral del desafío.
   - En modo diagnóstico: true si el nivel asignado es igual o superior al nivel actual.
4. 'skillScores': Puntuación entera de 0 a 100 para cada una:
   - 'conversational': Capacidad de respuesta interactiva, gramática y léxico en el diálogo.
   - 'reading': Exactitud de lectura oral y comprensión profunda de los datos del texto.
   - 'fluency': Velocidad, ritmo continuo y reducción de pausas vacilantes.
   - 'intonation': Precisión de los 4 tonos y tono neutro en chino mandarín.
5. 'overallScore': Promedio ponderado de las 4 sub-habilidades (0 a 100).
6. 'strengths': Arreglo de 3 a 4 fortalezas concretas demostradas por el estudiante (ej. "Dominio claro del 4º tono descendente", "Excelente comprensión de ideas complejas en la lectura").
7. 'weaknesses': Arreglo de 3 a 4 debilidades y áreas de mejora fonéticas, gramaticales o de fluidez (ej. "Vacilación en sonidos retroflejos zh/ch/sh", "Respuestas orales breves con omisión de conectores").
8. 'pedagogicalRecommendations': Arreglo de 3 consejos específicos para que la IA y el estudiante continúen su entrenamiento.
9. 'detailedAnalysis': Informe pedagógico detallado en español (2 párrafos) explicando el dictamen de la comisión.
10. 'challengeResultSummary': Frase contundente de resumen del resultado del desafío (ej. "¡Felicidades! Has superado el desafío con 84% y asciendes a HSK 3 y HSKK Intermedio." o "Has demostrado buen avance, pero requieres afianzar la fluidez conversacional antes de ascender.").

Devuelve el JSON exacto.`;
}

export const DIAGNOSTIC_REPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    assignedHskLevel: { type: Type.STRING },
    assignedHskkLevel: { type: Type.STRING },
    previousHskLevel: { type: Type.STRING },
    levelUpgradeGranted: { type: Type.BOOLEAN },
    overallScore: { type: Type.INTEGER },
    skillScores: {
      type: Type.OBJECT,
      properties: {
        conversational: { type: Type.INTEGER },
        reading: { type: Type.INTEGER },
        fluency: { type: Type.INTEGER },
        intonation: { type: Type.INTEGER },
      },
      required: ['conversational', 'reading', 'fluency', 'intonation'],
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    weaknesses: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    pedagogicalRecommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    detailedAnalysis: { type: Type.STRING },
    challengeResultSummary: { type: Type.STRING },
  },
  required: [
    'assignedHskLevel',
    'assignedHskkLevel',
    'levelUpgradeGranted',
    'overallScore',
    'skillScores',
    'strengths',
    'weaknesses',
    'pedagogicalRecommendations',
    'detailedAnalysis',
    'challengeResultSummary',
  ],
};


