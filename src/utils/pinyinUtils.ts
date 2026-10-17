import { pinyin } from 'pinyin-pro';
import { PinyinCharInfo } from '../types';

/**
 * Parses Chinese text into segmented characters with their corresponding
 * Pinyin and tone marks, suitable for <ruby> and <rt> rendering.
 */
export function getPinyinChars(text: string): PinyinCharInfo[] {
  if (!text) return [];

  try {
    const rawResult = pinyin(text, {
      type: 'all',
      toneType: 'symbol',
      nonZh: 'consecutive',
    }) as Array<{
      origin?: string;
      pinyin?: string;
      isZh?: boolean;
      num?: number;
      result?: string;
    }>;

    if (!Array.isArray(rawResult)) {
      return text.split('').map((char) => ({
        origin: char,
        pinyin: '',
        isZh: /[\u4e00-\u9fa5]/.test(char),
        tone: 0,
      }));
    }

    return rawResult.map((item) => ({
      origin: item.origin || '',
      pinyin: item.isZh ? (item.pinyin || '') : '',
      isZh: Boolean(item.isZh),
      tone: typeof item.num === 'number' ? item.num : 0,
    }));
  } catch (err) {
    console.warn('pinyin-pro processing fallback:', err);
    return text.split('').map((char) => ({
      origin: char,
      pinyin: '',
      isZh: /[\u4e00-\u9fa5]/.test(char),
      tone: 0,
    }));
  }
}

/**
 * Returns full pinyin sentence with tonal diacritics
 */
export function getFullPinyin(text: string): string {
  try {
    return pinyin(text, { toneType: 'symbol' });
  } catch {
    return '';
  }
}

export const toPinyinDisplay = getFullPinyin;

/**
 * Tone color mapping for optional tone highlighting
 */
export function getToneColor(tone: number): string {
  switch (tone) {
    case 1:
      return 'text-rose-400'; // 1st tone (flat / high): Red / Rose
    case 2:
      return 'text-amber-400'; // 2nd tone (rising): Orange / Amber
    case 3:
      return 'text-emerald-400'; // 3rd tone (dipping): Green / Emerald
    case 4:
      return 'text-sky-400'; // 4th tone (falling): Blue / Sky
    default:
      return 'text-slate-400'; // Neutral tone (5 or 0)
  }
}
