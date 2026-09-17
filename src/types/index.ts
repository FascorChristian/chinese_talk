export type TutorState = 'idle' | 'listening' | 'thinking' | 'speaking';

export type AppMode = 'menu' | 'conversation' | 'reading' | 'shadowing' | 'diagnostic';

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

export type ScenarioId = string;

export interface DialogueObjective {
  id: string;
  description: string;
  completed?: boolean;
}

export interface Scenario {
  id: ScenarioId;
  title: string;
  chineseTitle: string;
  badge: string;
  icon: string;
  description: string;
  rolePrompt: string;
  timeLimitSeconds?: number;
  dialogueStructure?: string[];
  objectives?: DialogueObjective[];
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

export interface ReadingQuestion {
  id: string; // 'q1', 'q2', 'q3'
  question_zh: string;
  question_pinyin?: string;
  question_es: string;
  expected_answer_summary: string;
}

export interface ReadingComprehensionAnswer {
  question_id: string;
  user_audio_transcript: string;
  language_detected?: 'es' | 'zh' | 'mixed';
  is_correct: boolean;
  score: number;
  feedback: string;
}

export interface ReadingAloudEvaluation {
  score: number; // 0-100
  passed: boolean;
  transcribedText: string;
  expectedText: string;
  speed?: {
    rating: 'too_slow' | 'slow' | 'natural' | 'fast' | 'too_fast';
    label: string;
    comment: string;
  };
  mistakes?: Array<{
    word: string;
    type: 'omission' | 'substitution' | 'tone' | 'pronunciation';
    expected?: string;
    heard?: string;
    explanation: string;
  }>;
  pronunciationAdvice: string;
}

export interface ReadingOverallEvaluation {
  overallScore: number;
  readingScore: number;
  readingPassed: boolean;
  comprehensionPassed: boolean;
  comprehensionCorrectCount: number;
  comprehensionTotalCount: number;
  summaryFeedback: string;
}

export interface ReadingContent {
  id?: string;
  title_hanzi: string;
  title_pinyin: string;
  title_translation: string;
  topic: string;
  level: string;
  badge?: string;
  genre?: string;
  full_text_hanzi?: string;
  sentences: ReadingSentence[];
  vocabulary?: ReadingVocabulary[];
  reading_tip?: string;
  comprehension_questions?: ReadingQuestion[];
}

export interface ShadowingEvaluationMistake {
  word: string;
  type: 'omission' | 'substitution' | 'tone' | 'pronunciation';
  pinyin?: string;
  expected?: string;
  heard?: string;
  explanation: string;
}

export interface ShadowingSpeedEvaluation {
  rating: 'too_slow' | 'slow' | 'natural' | 'fast' | 'too_fast';
  syllablesPerSecond: number;
  label: string;
  comment: string;
}

export interface ShadowingPauseEvaluation {
  rating: 'natural' | 'hesitant' | 'unnatural' | 'too_frequent';
  label: string;
  comment: string;
}

export interface ShadowingTurnEvaluation {
  score: number;
  passed: boolean;
  transcribedText: string;
  expectedText: string;
  speed: ShadowingSpeedEvaluation;
  pauses: ShadowingPauseEvaluation;
  mistakes: ShadowingEvaluationMistake[];
  pronunciationFeedback: string;
  generalAdvice: string;
  completedObjectives?: string[];
}

export interface ShadowingTurn {
  id: string;
  speaker: string;
  hanzi: string;
  pinyin: string;
  translation: string;
  key_phonetic_focus?: string;
  evaluation?: ShadowingTurnEvaluation;
}

export interface ShadowingDialogue {
  id?: string;
  title: string;
  chineseTitle?: string;
  badge?: string;
  situation: string;
  characters: string[];
  dialogueStructure?: string[];
  objectives?: DialogueObjective[];
  turns: ShadowingTurn[];
}

export interface ChatApiResponse {
  reply_hanzi: string;
  reply_translation: string;
  user_correction: string | null;
  native_alternative: string;
  suggested_replies?: SuggestedReply[];
  completed_objective_ids?: string[];
  is_dialogue_finished?: boolean;
  final_feedback?: string | null;
  source?: 'gemini' | 'mock' | 'fallback' | 'no_api_key';
  debugError?: string;
}

export interface HintsApiResponse {
  hints: SuggestedReply[];
}

// ==========================================
// USER PROFILE & DIAGNOSTIC ASSESSMENT TYPES
// ==========================================
export type HskLevel = 'HSK 1' | 'HSK 2' | 'HSK 3' | 'HSK 4' | 'HSK 5' | 'HSK 6';
export type HskkLevel = 'HSKK Inicial' | 'HSKK Intermedio' | 'HSKK Avanzado';
export type DiagnosticModeType = 'diagnostic' | 'evaluation_challenge';

export interface DiagnosticSkillBreakdown {
  conversational: number; // 0-100
  reading: number;        // 0-100
  fluency: number;        // 0-100
  intonation: number;     // 0-100
}

export interface UserProfile {
  hskLevel: HskLevel;
  hskkLevel: HskkLevel;
  overallScore: number;
  skillScores: DiagnosticSkillBreakdown;
  strengths: string[];
  weaknesses: string[];
  pedagogicalRecommendations: string[];
  lastEvaluatedAt?: string;
}

export interface DiagnosticChallenge {
  id: string;
  modeType: DiagnosticModeType;
  targetHskLevel: HskLevel;
  targetHskkLevel: HskkLevel;
  title: string;
  description: string;
  conversationTask: {
    situation: string;
    rolePrompt: string;
    initialAiMessage: {
      hanzi: string;
      pinyin: string;
      translation: string;
    };
    suggestedTopics: string[];
  };
  shadowingTask: {
    turns: Array<{
      id: string;
      speaker: string;
      hanzi: string;
      pinyin: string;
      translation: string;
      keyPhoneticFocus: string;
    }>;
  };
  readingTask: {
    title_hanzi: string;
    title_pinyin: string;
    title_translation: string;
    full_text_hanzi: string;
    pinyin: string;
    translation: string;
    comprehension_questions: Array<{
      id: string;
      question_zh: string;
      question_pinyin?: string;
      question_es: string;
      expected_answer_summary: string;
    }>;
  };
}

export interface DiagnosticSubmission {
  modeType: DiagnosticModeType;
  currentHskLevel: HskLevel;
  targetHskLevel: HskLevel;
  conversationData: Array<{
    userUtterance: string;
    aiReply: string;
  }>;
  shadowingData: Array<{
    turnId: string;
    expectedText: string;
    transcribedText: string;
    score: number;
  }>;
  readingData: {
    aloudTranscript: string;
    expectedText: string;
    aloudScore: number;
    answers: Array<{
      questionId: string;
      answerTranscript: string;
      isCorrect: boolean;
      score: number;
    }>;
  };
}

export interface DiagnosticReport {
  assignedHskLevel: HskLevel;
  assignedHskkLevel: HskkLevel;
  previousHskLevel?: HskLevel;
  levelUpgradeGranted: boolean;
  overallScore: number;
  skillScores: DiagnosticSkillBreakdown;
  strengths: string[];
  weaknesses: string[];
  pedagogicalRecommendations: string[];
  detailedAnalysis: string;
  challengeResultSummary?: string;
}
