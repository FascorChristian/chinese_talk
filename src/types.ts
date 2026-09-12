export type TutorState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type AppMode = 'menu' | 'conversation' | 'reading' | 'shadowing';

export interface SuggestedReply {
  hanzi: string;
  pinyin: string;
  meaning: string;
}

export interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  hanzi: string;
  translation?: string;
  pinyin?: string;
  userCorrection?: string | null;
  nativeAlternative?: string | null;
  suggestedReplies?: SuggestedReply[];
  timestamp: number;
  audioDuration?: number;
}

export type ScenarioId = 'cafe' | 'market' | 'free' | 'airport' | 'restaurant';

export interface Scenario {
  id: ScenarioId;
  title: string;
  chineseTitle: string;
  badge: string;
  icon: string;
  description: string;
  rolePrompt: string;
  initialMessage: {
    hanzi: string;
    translation: string;
    suggestedReplies: SuggestedReply[];
  };
}

export interface PinyinCharInfo {
  origin: string;
  pinyin: string;
  isZh: boolean;
  tone: number; // 0, 1, 2, 3, 4
}

export interface ReadingSentence {
  id: string;
  hanzi: string;
  pinyin: string;
  translation: string;
}

export interface ReadingVocabulary {
  word: string;
  pinyin: string;
  meaning: string;
}

export interface ReadingContent {
  title_hanzi: string;
  title_pinyin: string;
  title_translation: string;
  topic: string;
  level: string;
  sentences: ReadingSentence[];
  vocabulary?: ReadingVocabulary[];
  reading_tip?: string;
}

export interface ShadowingTurn {
  id: string;
  speaker: string;
  hanzi: string;
  pinyin: string;
  translation: string;
  key_phonetic_focus?: string;
}

export interface ShadowingDialogue {
  title: string;
  situation: string;
  characters: string[];
  turns: ShadowingTurn[];
}

