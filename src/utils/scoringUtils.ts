import { pinyin } from 'pinyin-pro';

/**
 * Calculates phonetic match accuracy between expected target Chinese text
 * and transcribed user speech recognition text using Pinyin & Homophone alignment,
 * preventing false penalties when Speech-to-Text picks a homophone Hanzi.
 */
export interface AccuracyResult {
  score: number;
  matchedCount: number;
  targetCount: number;
  transcriptCount: number;
  normalizedTranscript: string;
  homophoneCount: number;
}

function stripTone(py: string): string {
  return py
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[0-5]/g, '')
    .toLowerCase()
    .trim();
}

function getFuzzyPhonetic(base: string): string {
  return base
    .toLowerCase()
    .trim()
    .replace(/^zh/, 'z')
    .replace(/^ch/, 'c')
    .replace(/^sh/, 's')
    .replace(/^l/, 'n')
    .replace(/ang$/, 'an')
    .replace(/eng$/, 'en')
    .replace(/ing$/, 'in');
}

interface CharSyllable {
  char: string;
  base: string;
  fuzzy: string;
  tone: number;
}

function parseZhSyllables(text: string): CharSyllable[] {
  const clean = (text || '').replace(/[^\u4e00-\u9fa5]/g, '');
  if (!clean) return [];
  try {
    const raw = pinyin(clean, { type: 'all', toneType: 'symbol', nonZh: 'removed' }) as any[];
    if (Array.isArray(raw)) {
      return raw.map((r) => {
        const base = stripTone(r.pinyin || '');
        return {
          char: r.origin || '',
          base,
          fuzzy: getFuzzyPhonetic(base),
          tone: typeof r.num === 'number' ? r.num : 0,
        };
      });
    }
  } catch {}
  return clean.split('').map((c) => {
    const py = pinyin(c, { toneType: 'symbol' }) || '';
    const base = stripTone(py);
    return {
      char: c,
      base,
      fuzzy: getFuzzyPhonetic(base),
      tone: 0,
    };
  });
}

/**
 * Normalizes homophones in transcribed text against expected target text
 * so characters that sound identical in Pinyin are corrected to expected Hanzi.
 */
export function normalizeHomophonesWithTarget(
  userTranscript: string,
  targetHanzi: string
): string {
  if (!userTranscript || !targetHanzi) return userTranscript;
  const res = calculateAccuracyScore(targetHanzi, userTranscript);
  return res.normalizedTranscript || userTranscript;
}

export function calculateAccuracyScore(
  targetHanzi: string,
  userTranscript: string
): AccuracyResult {
  const targetSyllables = parseZhSyllables(targetHanzi);
  const transSyllables = parseZhSyllables(userTranscript);

  if (targetSyllables.length === 0 || transSyllables.length === 0) {
    return {
      score: 0,
      matchedCount: 0,
      targetCount: targetSyllables.length,
      transcriptCount: transSyllables.length,
      normalizedTranscript: userTranscript,
      homophoneCount: 0,
    };
  }

  const used = new Set<number>();
  let weightedMatches = 0;
  let homophoneCount = 0;
  const normalizedChars = transSyllables.map((t) => t.char);

  for (let i = 0; i < targetSyllables.length; i++) {
    const exp = targetSyllables[i];
    const relPos = Math.round((i / targetSyllables.length) * transSyllables.length);
    const radius = Math.max(5, Math.ceil(targetSyllables.length * 0.45));
    const start = Math.max(0, relPos - radius);
    const end = Math.min(transSyllables.length - 1, relPos + radius);

    let matchedIdx = -1;
    let weight = 0;

    // 1. Exact character or exact homophone (same base + same tone)
    for (let j = start; j <= end; j++) {
      if (used.has(j)) continue;
      const tr = transSyllables[j];
      if (tr.char === exp.char) {
        matchedIdx = j;
        weight = 1.0;
        break;
      }
      if (tr.base && tr.base === exp.base && (tr.tone === exp.tone || exp.tone === 0 || tr.tone === 0)) {
        matchedIdx = j;
        weight = 1.0;
        break;
      }
    }

    // 2. Same syllable, different tone (homophone variant)
    if (matchedIdx === -1) {
      for (let j = start; j <= end; j++) {
        if (used.has(j)) continue;
        const tr = transSyllables[j];
        if (tr.base && tr.base === exp.base) {
          matchedIdx = j;
          weight = 0.9;
          break;
        }
      }
    }

    // 3. Fuzzy phonetic match
    if (matchedIdx === -1) {
      for (let j = start; j <= end; j++) {
        if (used.has(j)) continue;
        const tr = transSyllables[j];
        if (tr.fuzzy && tr.fuzzy === exp.fuzzy) {
          matchedIdx = j;
          weight = 0.78;
          break;
        }
      }
    }

    if (matchedIdx !== -1) {
      used.add(matchedIdx);
      weightedMatches += weight;
      if (transSyllables[matchedIdx].char !== exp.char) {
        homophoneCount++;
        normalizedChars[matchedIdx] = exp.char;
      }
    }
  }

  const maxLen = Math.max(targetSyllables.length, Math.min(transSyllables.length, Math.ceil(targetSyllables.length * 1.3)));
  const score = Math.max(0, Math.min(100, Math.round((weightedMatches / maxLen) * 100)));

  return {
    score,
    matchedCount: Math.round(weightedMatches),
    targetCount: targetSyllables.length,
    transcriptCount: transSyllables.length,
    normalizedTranscript: normalizedChars.join(''),
    homophoneCount,
  };
}
