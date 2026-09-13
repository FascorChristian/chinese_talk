/**
 * Calculates phonetic match accuracy between expected target Chinese text
 * and transcribed user speech recognition text without overcounting repetition.
 */
export interface AccuracyResult {
  score: number;
  matchedCount: number;
  targetCount: number;
  transcriptCount: number;
}

export function calculateAccuracyScore(
  targetHanzi: string,
  userTranscript: string
): AccuracyResult {
  const punctuationRegex = /[，。！？、“”‘’（）()…—\- \t\n\r]/g;
  const cleanTarget = targetHanzi.replace(punctuationRegex, '').trim();
  const cleanTranscript = userTranscript.replace(punctuationRegex, '').trim();

  if (!cleanTarget || !cleanTranscript) {
    return {
      score: 0,
      matchedCount: 0,
      targetCount: cleanTarget.length,
      transcriptCount: cleanTranscript.length,
    };
  }

  // Multiset frequency map of expected characters
  const targetCounts: Record<string, number> = {};
  for (const char of cleanTarget) {
    targetCounts[char] = (targetCounts[char] || 0) + 1;
  }

  // Count matches without exceeding available counts
  let matchedCount = 0;
  for (const char of cleanTranscript) {
    if (targetCounts[char] && targetCounts[char] > 0) {
      matchedCount++;
      targetCounts[char]--;
    }
  }

  // Score accounts for both missing characters and excess words
  const maxLen = Math.max(cleanTarget.length, cleanTranscript.length);
  const score = Math.max(0, Math.min(100, Math.round((matchedCount / maxLen) * 100)));

  return {
    score,
    matchedCount,
    targetCount: cleanTarget.length,
    transcriptCount: cleanTranscript.length,
  };
}

