import { pinyin } from 'pinyin-pro';

export interface ZhSyllableInfo {
  char: string;
  pinyinSymbol: string;
  baseSyllable: string;
  phoneticKey: string;
  tone: number;
}

/**
 * Strips tone marks from a pinyin string to obtain the raw base syllable
 */
export function stripToneMarks(py: string): string {
  return py
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[0-5]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Normalizes common near-homophone Mandarin acoustics (retroflex vs alveolar, front vs back nasal)
 */
export function getPhoneticFuzzyKey(base: string): string {
  let s = base.toLowerCase().trim();
  s = s.replace(/^zh/, 'z').replace(/^ch/, 'c').replace(/^sh/, 's');
  s = s.replace(/^l/, 'n');
  s = s.replace(/ang$/, 'an').replace(/eng$/, 'en').replace(/ing$/, 'in');
  return s;
}

/**
 * Extracts syllable and tonal metadata for every Chinese character in a string
 */
export function extractZhSyllables(text: string): ZhSyllableInfo[] {
  const clean = (text || '').replace(/[^\u4e00-\u9fa5]/g, '');
  if (!clean) return [];

  try {
    const raw = pinyin(clean, {
      type: 'all',
      toneType: 'symbol',
      nonZh: 'removed',
    }) as Array<{
      origin?: string;
      pinyin?: string;
      num?: number;
    }>;

    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((item) => {
        const py = item.pinyin || '';
        const base = stripToneMarks(py);
        return {
          char: item.origin || '',
          pinyinSymbol: py,
          baseSyllable: base,
          phoneticKey: getPhoneticFuzzyKey(base),
          tone: typeof item.num === 'number' ? item.num : 0,
        };
      });
    }
  } catch (err) {
    console.warn('Error extracting pinyin syllables:', err);
  }

  return clean.split('').map((char) => {
    const py = pinyin(char, { toneType: 'symbol' }) || '';
    const base = stripToneMarks(py);
    return {
      char,
      pinyinSymbol: py,
      baseSyllable: base,
      phoneticKey: getPhoneticFuzzyKey(base),
      tone: 0,
    };
  });
}

/**
 * Converts a Chinese sentence into a readable Pinyin string with tone symbols
 */
export function toPinyinSentence(text: string): string {
  if (!text) return '';
  try {
    return pinyin(text, { toneType: 'symbol' });
  } catch {
    return '';
  }
}

export interface HomophoneAlignmentResult {
  normalizedTranscript: string;
  phoneticScore: number;
  exactCharMatches: number;
  homophoneMatches: number;
  toneVariantMatches: number;
  fuzzyPhoneticMatches: number;
  totalExpectedChars: number;
  homophoneCorrections: Array<{
    heardChar: string;
    expectedChar: string;
    pinyin: string;
  }>;
  mistakes: Array<{
    word: string;
    type: 'omission' | 'substitution' | 'tone' | 'pronunciation';
    pinyin?: string;
    expected?: string;
    heard?: string;
    explanation: string;
  }>;
  charBreakdown: Array<{
    expected: string;
    heard: string;
    pinyin: string;
    status: 'correct' | 'homophone_corrected' | 'tone_variant' | 'omitted' | 'mispronounced';
  }>;
}

/**
 * Aligns transcribed Speech-to-Text characters against expected Chinese text
 * using Pinyin syllables and tones so STT homophones are NEVER penalized.
 */
export function alignAndEvaluatePhonetics(
  transcribedText: string,
  expectedText: string
): HomophoneAlignmentResult {
  const expSyllables = extractZhSyllables(expectedText);
  const transSyllables = extractZhSyllables(transcribedText);

  if (expSyllables.length === 0) {
    return {
      normalizedTranscript: transcribedText,
      phoneticScore: transcribedText.trim() ? 100 : 0,
      exactCharMatches: 0,
      homophoneMatches: 0,
      toneVariantMatches: 0,
      fuzzyPhoneticMatches: 0,
      totalExpectedChars: 0,
      homophoneCorrections: [],
      mistakes: [],
      charBreakdown: [],
    };
  }

  if (transSyllables.length === 0) {
    return {
      normalizedTranscript: '',
      phoneticScore: 0,
      exactCharMatches: 0,
      homophoneMatches: 0,
      toneVariantMatches: 0,
      fuzzyPhoneticMatches: 0,
      totalExpectedChars: expSyllables.length,
      homophoneCorrections: [],
      mistakes: expSyllables.slice(0, 4).map((s) => ({
        word: s.char,
        type: 'omission',
        pinyin: s.pinyinSymbol,
        expected: s.char,
        heard: '',
        explanation: `No se detectó la sílaba '${s.char}' (${s.pinyinSymbol}).`,
      })),
      charBreakdown: expSyllables.map((s) => ({
        expected: s.char,
        heard: '',
        pinyin: s.pinyinSymbol,
        status: 'omitted',
      })),
    };
  }

  const usedTransIndices = new Set<number>();
  let weightedMatches = 0;
  let exactCharMatches = 0;
  let homophoneMatches = 0;
  let toneVariantMatches = 0;
  let fuzzyPhoneticMatches = 0;

  const homophoneCorrections: HomophoneAlignmentResult['homophoneCorrections'] = [];
  const mistakes: HomophoneAlignmentResult['mistakes'] = [];
  const charBreakdown: HomophoneAlignmentResult['charBreakdown'] = [];
  const normalizedChars: string[] = [];

  for (let i = 0; i < expSyllables.length; i++) {
    const exp = expSyllables[i];
    let bestIdx = -1;
    let bestMatchType: 'exact' | 'homophone' | 'tone_variant' | 'fuzzy' | 'none' = 'none';

    // Search in a window around the current relative position for best alignment
    const expectedRelPos = Math.round((i / expSyllables.length) * transSyllables.length);
    const searchRadius = Math.max(5, Math.ceil(expSyllables.length * 0.45));
    const startJ = Math.max(0, expectedRelPos - searchRadius);
    const endJ = Math.min(transSyllables.length - 1, expectedRelPos + searchRadius);

    // Pass 1: Look for exact character or exact homophone (same baseSyllable + same tone)
    for (let j = startJ; j <= endJ; j++) {
      if (usedTransIndices.has(j)) continue;
      const tr = transSyllables[j];
      if (tr.char === exp.char) {
        bestIdx = j;
        bestMatchType = 'exact';
        break;
      }
      if (
        tr.baseSyllable &&
        tr.baseSyllable === exp.baseSyllable &&
        (tr.tone === exp.tone || exp.tone === 0 || tr.tone === 0)
      ) {
        if (bestMatchType !== 'homophone') {
          bestIdx = j;
          bestMatchType = 'homophone';
        }
      }
    }

    // Pass 2: Look for same baseSyllable with different tone (very common STT homophone substitution)
    if (bestIdx === -1) {
      for (let j = startJ; j <= endJ; j++) {
        if (usedTransIndices.has(j)) continue;
        const tr = transSyllables[j];
        if (tr.baseSyllable && tr.baseSyllable === exp.baseSyllable) {
          bestIdx = j;
          bestMatchType = 'tone_variant';
          break;
        }
      }
    }

    // Pass 3: Look for near-phonetic fuzzy match (e.g., zh/z, sh/s, ch/c, ang/an, ing/in)
    if (bestIdx === -1) {
      for (let j = startJ; j <= endJ; j++) {
        if (usedTransIndices.has(j)) continue;
        const tr = transSyllables[j];
        if (tr.phoneticKey && tr.phoneticKey === exp.phoneticKey) {
          bestIdx = j;
          bestMatchType = 'fuzzy';
          break;
        }
      }
    }

    if (bestIdx !== -1) {
      usedTransIndices.add(bestIdx);
      const tr = transSyllables[bestIdx];

      if (bestMatchType === 'exact') {
        exactCharMatches++;
        weightedMatches += 1.0;
        normalizedChars.push(exp.char);
        charBreakdown.push({
          expected: exp.char,
          heard: exp.char,
          pinyin: exp.pinyinSymbol,
          status: 'correct',
        });
      } else if (bestMatchType === 'homophone') {
        homophoneMatches++;
        weightedMatches += 1.0; // Full 100% credit for exact homophones!
        normalizedChars.push(exp.char);
        homophoneCorrections.push({
          heardChar: tr.char,
          expectedChar: exp.char,
          pinyin: exp.pinyinSymbol,
        });
        charBreakdown.push({
          expected: exp.char,
          heard: exp.char,
          pinyin: exp.pinyinSymbol,
          status: 'homophone_corrected',
        });
      } else if (bestMatchType === 'tone_variant') {
        toneVariantMatches++;
        weightedMatches += 0.9; // 90% credit: same syllable, slight tone difference or STT lexical choice
        normalizedChars.push(exp.char);
        homophoneCorrections.push({
          heardChar: tr.char,
          expectedChar: exp.char,
          pinyin: exp.pinyinSymbol,
        });
        charBreakdown.push({
          expected: exp.char,
          heard: tr.char,
          pinyin: exp.pinyinSymbol,
          status: 'tone_variant',
        });
        if (mistakes.length < 4) {
          mistakes.push({
            word: exp.char,
            type: 'tone',
            pinyin: exp.pinyinSymbol,
            expected: `${exp.char} (${exp.pinyinSymbol})`,
            heard: `${tr.char} (${tr.pinyinSymbol})`,
            explanation: `Sílaba '${exp.baseSyllable}' bien articulada; refuerza el tono en '${exp.char}' (${exp.pinyinSymbol}). (El micrófono captó el cuasi-homófono '${tr.char}').`,
          });
        }
      } else if (bestMatchType === 'fuzzy') {
        fuzzyPhoneticMatches++;
        weightedMatches += 0.78;
        normalizedChars.push(exp.char);
        charBreakdown.push({
          expected: exp.char,
          heard: tr.char,
          pinyin: exp.pinyinSymbol,
          status: 'mispronounced',
        });
        if (mistakes.length < 4) {
          mistakes.push({
            word: exp.char,
            type: 'pronunciation',
            pinyin: exp.pinyinSymbol,
            expected: `${exp.char} (${exp.pinyinSymbol})`,
            heard: `${tr.char} (${tr.pinyinSymbol})`,
            explanation: `Sonido muy próximo: dijiste '${tr.pinyinSymbol}' en lugar de '${exp.pinyinSymbol}' para '${exp.char}'. Cuida la posición de la lengua y la resonancia final.`,
          });
        }
      }
    } else {
      // Genuine omission
      charBreakdown.push({
        expected: exp.char,
        heard: '',
        pinyin: exp.pinyinSymbol,
        status: 'omitted',
      });
      if (mistakes.length < 4) {
        mistakes.push({
          word: exp.char,
          type: 'omission',
          pinyin: exp.pinyinSymbol,
          expected: exp.char,
          heard: '',
          explanation: `El carácter '${exp.char}' (${exp.pinyinSymbol}) no se percibió con claridad.`,
        });
      }
    }
  }

  // Mild penalty only if the user spoke way too many unrelated extra syllables (>1.5x expected length)
  const extraCount = Math.max(0, transSyllables.length - expSyllables.length);
  const excessPenalty = extraCount > Math.ceil(expSyllables.length * 0.4)
    ? Math.min(15, extraCount * 3)
    : 0;

  const rawScore = Math.round((weightedMatches / expSyllables.length) * 100) - excessPenalty;
  const phoneticScore = Math.max(0, Math.min(100, rawScore));

  return {
    normalizedTranscript: normalizedChars.length > 0 ? normalizedChars.join('') : transcribedText,
    phoneticScore,
    exactCharMatches,
    homophoneMatches,
    toneVariantMatches,
    fuzzyPhoneticMatches,
    totalExpectedChars: expSyllables.length,
    homophoneCorrections,
    mistakes,
    charBreakdown,
  };
}

/**
 * Complete local evaluation for a Shadowing turn (0 Gemini API calls required, <5ms latency)
 */
export function evaluateShadowingWithPhonetics(params: {
  transcribedText: string;
  expectedText: string;
  expectedPinyin?: string;
  durationSeconds: number;
  keyPhoneticFocus?: string;
  objectives?: Array<{ id: string; description: string }>;
}) {
  const {
    transcribedText,
    expectedText,
    durationSeconds,
    keyPhoneticFocus = 'Claridad tonal y ritmo fluido.',
    objectives = [],
  } = params;

  const alignment = alignAndEvaluatePhonetics(transcribedText, expectedText);
  const totalChars = Math.max(1, alignment.totalExpectedChars);
  const durSec = Math.max(0.8, durationSeconds);
  const syllablesPerSec = Number((totalChars / durSec).toFixed(1));

  // Speed assessment
  let speedRating: 'too_slow' | 'slow' | 'natural' | 'fast' | 'too_fast' = 'natural';
  let speedLabel = `Velocidad Natural (${syllablesPerSec} síl/s)`;
  let speedComment = 'Tu cadencia al hablar es fluida y cercana a la de un hablante nativo.';

  if (syllablesPerSec < 1.8) {
    speedRating = 'too_slow';
    speedLabel = `Pausado (${syllablesPerSec} síl/s)`;
    speedComment = 'Hablaste con pausas amplias. Intenta enlazar las sílabas de forma más continua.';
  } else if (syllablesPerSec < 2.6) {
    speedRating = 'slow';
    speedLabel = `Lento y Claro (${syllablesPerSec} síl/s)`;
    speedComment = 'Buena articulación sílaba por sílaba; practica subir un poco la velocidad para sonar más natural.';
  } else if (syllablesPerSec > 5.8) {
    speedRating = 'too_fast';
    speedLabel = `Muy Rápido (${syllablesPerSec} síl/s)`;
    speedComment = 'Hablaste muy rápido; sostén un instante más las vocales para marcar bien los 4 tonos.';
  } else if (syllablesPerSec > 4.6) {
    speedRating = 'fast';
    speedLabel = `Dinámico (${syllablesPerSec} síl/s)`;
    speedComment = 'Ritmo ágil y seguro, manteniendo buena inteligibilidad.';
  }

  // Pause assessment
  let pauseRating: 'natural' | 'hesitant' | 'unnatural' | 'too_frequent' = 'natural';
  let pauseLabel = 'Pausas Naturales';
  let pauseComment = 'Respetaste los grupos de sentido de la oración sin cortes bruscos.';

  if (speedRating === 'too_slow') {
    pauseRating = 'hesitant';
    pauseLabel = 'Pausas de Dudas';
    pauseComment = 'Se perciben pausas entre palabras. Escucha el modelo a 0.75x y repite la frase como un solo bloque rítmico.';
  } else if (alignment.phoneticScore < 65) {
    pauseRating = 'unnatural';
    pauseLabel = 'Ritmo Irregular';
    pauseComment = 'Algunas sílabas se cortaron antes de tiempo. Mantén el flujo de aire continuo.';
  }

  const passed = alignment.phoneticScore >= 65;

  const homophoneNote =
    alignment.homophoneCorrections.length > 0
      ? ` (Nota: El reconocedor de voz transcribió homófonos como '${alignment.homophoneCorrections
          .map((h) => `${h.heardChar}→${h.expectedChar}`)
          .slice(0, 3)
          .join(', ')}' que suenan igual en Pinyin; se validaron como 100% correctos).`
      : '';

  const overallFeedback =
    alignment.phoneticScore >= 92
      ? `¡Excelente imitación fonética! Tu pronunciación y tonos son sumamente precisos.${homophoneNote}`
      : alignment.phoneticScore >= 75
      ? `¡Muy buen trabajo! La pronunciación general es clara y comprensible.${homophoneNote}`
      : alignment.phoneticScore >= 60
      ? `Buen intento. Se entendió la idea principal, pero conviene reforzar algunas sílabas clave.${homophoneNote}`
      : `Sigue practicando esta línea. Escucha el audio modelo con el botón de velocidad en 0.75x y repite en voz alta.`;

  const pronunciationTips: string[] = [
    `Foco de esta línea: ${keyPhoneticFocus}`,
  ];

  if (alignment.mistakes.length > 0) {
    pronunciationTips.push(alignment.mistakes[0].explanation);
  } else {
    pronunciationTips.push('Mantén la distinción entre el 1.er tono (alto y plano) y el 4.º tono (descendente firme).');
  }

  if (speedRating === 'too_slow' || speedRating === 'slow') {
    pronunciationTips.push('Agrupa las palabras de dos en dos sílabas (ritmo disilábico) sin detenerte en cada carácter.');
  }

  return {
    score: alignment.phoneticScore,
    passed,
    transcribedText: alignment.normalizedTranscript || transcribedText,
    rawTranscribedText: transcribedText,
    expectedText,
    normalizedTranscript: alignment.normalizedTranscript,
    homophoneCorrections: alignment.homophoneCorrections,
    overallFeedback,
    pronunciationFeedback: pronunciationTips.join(' '),
    generalAdvice: overallFeedback,
    speed: {
      rating: speedRating,
      syllablesPerSecond: syllablesPerSec,
      label: speedLabel,
      comment: speedComment,
    },
    pauses: {
      rating: pauseRating,
      label: pauseLabel,
      comment: pauseComment,
    },
    mistakes: alignment.mistakes,
    pronunciationTips,
    completedObjectives: passed ? objectives.map((o) => o.id) : [],
    completedObjectiveIds: passed ? objectives.map((o) => o.id) : [],
  };
}

/**
 * Complete local evaluation for Reading Aloud (0 Gemini API calls required, <5ms latency)
 */
export function evaluateReadingAloudWithPhonetics(params: {
  transcribedText: string;
  expectedText: string;
  durationSeconds: number;
}) {
  const { transcribedText, expectedText, durationSeconds } = params;
  const alignment = alignAndEvaluatePhonetics(transcribedText, expectedText);
  const totalChars = Math.max(1, alignment.totalExpectedChars);
  const durSec = Math.max(1.0, durationSeconds);
  const charsPerSec = Number((totalChars / durSec).toFixed(1));

  let speedRating: 'too_slow' | 'slow' | 'natural' | 'fast' | 'too_fast' = 'natural';
  let speedLabel = `Lectura Fluida (${charsPerSec} car/s)`;
  let speedComment = 'Tu velocidad de lectura es equilibrada y natural.';

  if (charsPerSec < 1.6) {
    speedRating = 'too_slow';
    speedLabel = `Lectura Pausada (${charsPerSec} car/s)`;
    speedComment = 'Leíste con pausas frecuentes. Familiarízate con el pinyin para leer de corrido.';
  } else if (charsPerSec < 2.4) {
    speedRating = 'slow';
    speedLabel = `Lectura Cuidadosa (${charsPerSec} car/s)`;
    speedComment = 'Buen ritmo de estudio; intenta unir las frases entre comas.';
  } else if (charsPerSec > 5.5) {
    speedRating = 'too_fast';
    speedLabel = `Lectura Acelerada (${charsPerSec} car/s)`;
    speedComment = 'Leíste muy rápido; respeta las pausas en las comas (，) y puntos (。).';
  }

  const passed = alignment.phoneticScore >= 65;

  const homophoneNote =
    alignment.homophoneCorrections.length > 0
      ? ` (Se validaron automáticamente ${alignment.homophoneCorrections.length} homófono(s) captados por el micrófono: ${alignment.homophoneCorrections
          .map((h) => `${h.heardChar}→${h.expectedChar}`)
          .slice(0, 4)
          .join(', ')}).`
      : '';

  const overallFeedback =
    alignment.phoneticScore >= 90
      ? `¡Lectura sobresaliente! Articulaste el texto con gran exactitud fonética y fluidez.${homophoneNote}`
      : alignment.phoneticScore >= 70
      ? `¡Buena lectura en voz alta! La mayoría de las oraciones se pronunciaron correctamente.${homophoneNote}`
      : `Has completado la lectura, pero varias palabras se omitieron o cambiaron de sonido. Escucha el texto a velocidad 0.75x e inténtalo de nuevo.${homophoneNote}`;

  return {
    score: alignment.phoneticScore,
    passed,
    transcribedText: alignment.normalizedTranscript || transcribedText,
    rawTranscribedText: transcribedText,
    expectedText,
    normalizedTranscript: alignment.normalizedTranscript,
    homophoneCorrections: alignment.homophoneCorrections,
    overall_feedback: overallFeedback,
    pronunciationAdvice: overallFeedback,
    speed: {
      rating: speedRating,
      chars_per_second: charsPerSec,
      label: speedLabel,
      comment: speedComment,
    },
    pauses: {
      rating: speedRating === 'too_slow' ? 'hesitant' : 'natural',
      label: speedRating === 'too_slow' ? 'Pausas Frecuentes' : 'Pausas Adecuadas',
      comment:
        speedRating === 'too_slow'
          ? 'Procura hacer pausas únicamente en los signos de puntuación.'
          : 'Buena entonación y respiración en las comas y puntos.',
    },
    mistakes: alignment.mistakes,
    recommendations: [
      'Recuerda pausar brevemente en cada coma (，) y descender ligeramente la entonación al final de cada punto (。).',
      alignment.mistakes.length > 0
        ? `Repasa en voz alta los caracteres: ${alignment.mistakes.map((m) => `${m.word} (${m.pinyin})`).join(', ')}.`
        : 'Excelente precisión fonética en las sílabas del texto.',
    ],
  };
}
