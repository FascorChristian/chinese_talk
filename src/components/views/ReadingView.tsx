import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BookOpen, 
  Volume2, 
  Square, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Languages, 
  Sparkles, 
  Mic, 
  MicOff, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowLeft, 
  Flame, 
  Award, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Send,
  Play,
  Trophy,
  Globe2,
  Check,
  Timer,
  Cloud,
  BookmarkPlus
} from 'lucide-react';
import { 
  ReadingContent, 
  ReadingSentence, 
  ReadingQuestion, 
  ReadingComprehensionAnswer, 
  ReadingAloudEvaluation 
} from '../../types/index.js';
import { HanziWithPinyin } from '../common/HanziWithPinyin.js';
import { playMandarinTTS, stopMandarinTTS, setGlobalPlaybackRate, isMobileBrowser } from '../../utils/speechUtils.js';
import { 
  generateReadingContent, 
  evaluateReadingAloud, 
  evaluateReadingComprehension 
} from '../../services/api.js';
import {
  saveExerciseToCloud,
  saveVocabularyToCloud,
  savePracticeResultToCloud,
} from '../../services/storageService.js';
import { ReadingScenarioModal } from '../modals/ReadingScenarioModal.js';

interface ReadingViewProps {
  onBackToMenu: () => void;
  initialTopic?: string;
  initialSavedContent?: ReadingContent | null;
  speechRate?: number;
  onChangeSpeed?: (rate: number) => void;
}

export const ReadingView: React.FC<ReadingViewProps> = ({
  onBackToMenu,
  initialTopic = 'La cultura del té chino y la hospitalidad',
  initialSavedContent = null,
  speechRate: externalSpeechRate,
  onChangeSpeed,
}) => {
  // Reading content & scenario modal
  const [content, setContent] = useState<ReadingContent | null>(initialSavedContent);
  const [isLoading, setIsLoading] = useState<boolean>(!initialSavedContent);
  const [error, setError] = useState<string | null>(null);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);

  // User visibility toggles
  const [showHanzi, setShowHanzi] = useState<boolean>(true);
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [showSentencesAccordion, setShowSentencesAccordion] = useState<boolean>(false);

  // TTS audio playback
  const [localSpeechRate, setLocalSpeechRate] = useState<number>(externalSpeechRate ?? 1.0);
  const speechRate = externalSpeechRate ?? localSpeechRate;

  const handleSpeedChange = (newRate: number) => {
    setLocalSpeechRate(newRate);
    setGlobalPlaybackRate(newRate);
    onChangeSpeed?.(newRate);
  };

  const [savedReadingNotice, setSavedReadingNotice] = useState(false);
  const [savedVocabMap, setSavedVocabMap] = useState<Record<string, boolean>>({});
  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(null);
  const [isPlayingFullText, setIsPlayingFullText] = useState<boolean>(false);
  const cancelTtsRef = useRef<(() => void) | null>(null);


  // ==========================================
  // READING ALOUD (Lectura en Voz Alta) STATE
  // ==========================================
  const [isRecordingAloud, setIsRecordingAloud] = useState<boolean>(false);
  const [aloudRecordingSeconds, setAloudRecordingSeconds] = useState<number>(0);
  const [liveAloudTranscript, setLiveAloudTranscript] = useState<string>('');
  const [isEvaluatingAloud, setIsEvaluatingAloud] = useState<boolean>(false);
  const [aloudEvaluation, setAloudEvaluation] = useState<ReadingAloudEvaluation | null>(null);
  const [aloudError, setAloudError] = useState<string | null>(null);

  const aloudRecordStartTimeRef = useRef<number>(0);
  const aloudIsRecordingRef = useRef<boolean>(false);
  const aloudIsFinalizedRef = useRef<boolean>(false);
  const aloudTranscriptRef = useRef<string>('');
  const aloudPrevSessionTranscriptRef = useRef<string>('');
  const aloudTimerRef = useRef<any>(null);
  const aloudRecognitionRef = useRef<any>(null);

  // ==========================================
  // COMPREHENSION QUESTIONS STATE
  // ==========================================
  // Answers evaluated by question ID
  const [comprehensionAnswers, setComprehensionAnswers] = useState<Record<string, ReadingComprehensionAnswer>>({});
  // Language selected to answer for each question ('es' | 'zh')
  const [answerLanguageMap, setAnswerLanguageMap] = useState<Record<string, 'es' | 'zh'>>({});
  // Currently recording question ID
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [liveComprehensionTranscript, setLiveComprehensionTranscript] = useState<string>('');
  const [comprehensionRecordingSeconds, setComprehensionRecordingSeconds] = useState<number>(0);
  const [evaluatingQuestionId, setEvaluatingQuestionId] = useState<string | null>(null);
  const [comprehensionError, setComprehensionError] = useState<string | null>(null);

  const compRecordStartTimeRef = useRef<number>(0);
  const compIsRecordingRef = useRef<boolean>(false);
  const compIsFinalizedRef = useRef<boolean>(false);
  const compTranscriptRef = useRef<string>('');
  const compPrevSessionTranscriptRef = useRef<string>('');
  const compTimerRef = useRef<any>(null);
  const compRecognitionRef = useRef<any>(null);

  // ------------------------------------------
  // Cleanups
  // ------------------------------------------
  const stopPlayback = () => {
    if (cancelTtsRef.current) {
      cancelTtsRef.current();
      cancelTtsRef.current = null;
    }
    stopMandarinTTS();
    setIsPlayingFullText(false);
    setActiveSentenceId(null);
  };

  const cancelAloudRecording = () => {
    aloudIsRecordingRef.current = false;
    aloudIsFinalizedRef.current = true;
    if (aloudTimerRef.current) {
      clearInterval(aloudTimerRef.current);
      aloudTimerRef.current = null;
    }
    setIsRecordingAloud(false);
    setLiveAloudTranscript('');
    setAloudRecordingSeconds(0);
    if (aloudRecognitionRef.current) {
      try {
        aloudRecognitionRef.current.abort();
      } catch {}
      aloudRecognitionRef.current = null;
    }
  };

  const cancelComprehensionRecording = () => {
    compIsRecordingRef.current = false;
    compIsFinalizedRef.current = true;
    if (compTimerRef.current) {
      clearInterval(compTimerRef.current);
      compTimerRef.current = null;
    }
    setAnsweringQuestionId(null);
    setLiveComprehensionTranscript('');
    setComprehensionRecordingSeconds(0);
    if (compRecognitionRef.current) {
      try {
        compRecognitionRef.current.abort();
      } catch {}
      compRecognitionRef.current = null;
    }
  };

  const resetSessionEvaluations = () => {
    cancelAloudRecording();
    cancelComprehensionRecording();
    stopPlayback();
    setAloudEvaluation(null);
    setAloudError(null);
    setComprehensionAnswers({});
    setComprehensionError(null);
  };

  // ------------------------------------------
  // Fetch initial or refreshed reading
  // ------------------------------------------
  const fetchReading = async (topic: string) => {
    setIsLoading(true);
    setError(null);
    resetSessionEvaluations();

    try {
      const data = await generateReadingContent(topic, 'HSK 2-3');
      setContent(data);
    } catch (err: any) {
      console.error('Fetch reading error:', err);
      setError('No se pudo generar la lectura con la IA. Inténtalo de nuevo o abre el selector de temas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialSavedContent) {
      setContent(initialSavedContent);
      setIsLoading(false);
    } else {
      fetchReading(initialTopic);
    }
    return () => {
      stopPlayback();
      cancelAloudRecording();
      cancelComprehensionRecording();
    };
  }, [initialSavedContent]);

  // Text string references
  const fullText = useMemo(() => {
    if (!content) return '';
    return content.full_text_hanzi || content.sentences.map((s) => s.hanzi).join('');
  }, [content]);

  const fullTranslation = useMemo(() => {
    if (!content) return '';
    return content.sentences.map((s) => s.translation).join(' ');
  }, [content]);

  // ------------------------------------------
  // Audio playback of full text or sentences
  // ------------------------------------------
  const playFullTextSequential = () => {
    if (!content || !content.sentences.length) return;

    if (isPlayingFullText) {
      stopPlayback();
      return;
    }

    setIsPlayingFullText(true);
    let index = 0;

    const playNext = () => {
      if (index >= content.sentences.length) {
        setIsPlayingFullText(false);
        setActiveSentenceId(null);
        return;
      }

      const current = content.sentences[index];
      setActiveSentenceId(current.id);

      cancelTtsRef.current = playMandarinTTS(
        current.hanzi,
        speechRate,
        undefined,
        () => {
          index++;
          setTimeout(() => {
            playNext();
          }, 350);
        },
        () => {
          setIsPlayingFullText(false);
          setActiveSentenceId(null);
        }
      );
    };

    playNext();
  };

  const playSingleSentence = (sentence: ReadingSentence) => {
    stopPlayback();
    setActiveSentenceId(sentence.id);

    cancelTtsRef.current = playMandarinTTS(
      sentence.hanzi,
      speechRate,
      () => setActiveSentenceId(sentence.id),
      () => setActiveSentenceId(null),
      () => setActiveSentenceId(null)
    );
  };

  const playChineseWord = (text: string) => {
    stopPlayback();
    playMandarinTTS(text, speechRate);
  };

  // =======================================================
  // READING ALOUD RECORDING LOGIC (Mobile & Desktop safe)
  // =======================================================
  const startReadingAloudRecording = () => {
    stopPlayback();
    cancelAloudRecording();
    cancelComprehensionRecording();
    setAloudError(null);

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz en chino mandarín (zh-CN). Recomendamos Google Chrome o Microsoft Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      aloudRecognitionRef.current = recognition;
      recognition.lang = 'zh-CN';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = !isMobileBrowser();

      aloudIsRecordingRef.current = true;
      aloudIsFinalizedRef.current = false;
      aloudTranscriptRef.current = '';
      aloudPrevSessionTranscriptRef.current = '';
      setLiveAloudTranscript('');
      setAloudRecordingSeconds(0);
      aloudRecordStartTimeRef.current = Date.now();
      setIsRecordingAloud(true);

      recognition.onstart = () => {
        aloudIsRecordingRef.current = true;
        setIsRecordingAloud(true);
      };

      recognition.onresult = (event: any) => {
        let currentSessionTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          const seg = (event.results[i][0]?.transcript || '').trim();
          if (!seg) continue;
          if (currentSessionTranscript && seg.startsWith(currentSessionTranscript)) {
            currentSessionTranscript = seg;
          } else if (currentSessionTranscript && currentSessionTranscript.endsWith(seg)) {
            // Already included
          } else {
            currentSessionTranscript += seg;
          }
        }

        const prefix = aloudPrevSessionTranscriptRef.current;
        let full = currentSessionTranscript.trim();
        if (prefix && !full.startsWith(prefix)) {
          full = `${prefix} ${full}`.trim();
        }

        aloudTranscriptRef.current = full;
        setLiveAloudTranscript(full);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        if (event.error === 'not-allowed') {
          cancelAloudRecording();
          setAloudError('Permiso de micrófono denegado. Habilita el acceso en tu navegador.');
        }
      };

      recognition.onend = () => {
        if (aloudIsRecordingRef.current && !aloudIsFinalizedRef.current) {
          aloudPrevSessionTranscriptRef.current = aloudTranscriptRef.current;
          try {
            recognition.start();
            return;
          } catch (err) {
            console.warn('Could not auto-restart aloud recognition session:', err);
          }
        }

        if (!aloudIsRecordingRef.current) {
          setIsRecordingAloud(false);
          if (aloudTimerRef.current) {
            clearInterval(aloudTimerRef.current);
            aloudTimerRef.current = null;
          }
        }
      };

      recognition.start();

      if (aloudTimerRef.current) clearInterval(aloudTimerRef.current);
      aloudTimerRef.current = setInterval(() => {
        setAloudRecordingSeconds((s) => s + 1);
      }, 1000);

    } catch (e) {
      console.error('Aloud recognition start error:', e);
      cancelAloudRecording();
      setAloudError('No se pudo inicializar el micrófono para la lectura.');
    }
  };

  const stopReadingAloudAndEvaluate = async () => {
    if (!aloudIsRecordingRef.current || aloudIsFinalizedRef.current) return;

    aloudIsFinalizedRef.current = true;
    aloudIsRecordingRef.current = false;
    if (aloudTimerRef.current) {
      clearInterval(aloudTimerRef.current);
      aloudTimerRef.current = null;
    }
    setIsRecordingAloud(false);

    if (aloudRecognitionRef.current) {
      try {
        aloudRecognitionRef.current.stop();
      } catch {}
      aloudRecognitionRef.current = null;
    }

    const durationSeconds = Math.max(1.0, (Date.now() - aloudRecordStartTimeRef.current) / 1000);
    // Allow mobile browser 260ms to flush the final SpeechRecognition onresult buffer
    await new Promise((r) => setTimeout(r, 260));
    const finalTranscript = aloudTranscriptRef.current.trim();

    if (!finalTranscript) {
      setAloudError('No se detectaron palabras en chino mandarín. Por favor, lee en voz alta frente al micrófono.');
      return;
    }

    setIsEvaluatingAloud(true);
    setAloudError(null);

    try {
      const evaluation = await evaluateReadingAloud({
        transcribedText: finalTranscript,
        expectedText: fullText,
        durationSeconds,
      });

      setAloudEvaluation(evaluation);
      if (content) {
        savePracticeResultToCloud({
          mode: 'reading',
          title: `${content.title_translation} (${content.title_hanzi})`,
          score: evaluation.score,
          passed: evaluation.passed,
          hskLevel: content.level,
          details: 'Evaluación de lectura en voz alta',
        });
      }
    } catch (err: any) {
      console.error('Evaluation aloud error:', err);
      setAloudError('Hubo un error al evaluar tu lectura con la IA. Inténtalo de nuevo.');
    } finally {
      setIsEvaluatingAloud(false);
    }
  };

  // =======================================================
  // COMPREHENSION QUESTIONS RECORDING LOGIC (ES or ZH)
  // =======================================================
  const startComprehensionRecording = (question: ReadingQuestion) => {
    stopPlayback();
    cancelAloudRecording();
    cancelComprehensionRecording();
    setComprehensionError(null);

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz nativo.');
      return;
    }

    const langChoice = answerLanguageMap[question.id] || 'es';
    const langCode = langChoice === 'zh' ? 'zh-CN' : 'es-ES';

    try {
      const recognition = new SpeechRecognition();
      compRecognitionRef.current = recognition;
      recognition.lang = langCode;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = !isMobileBrowser();

      compIsRecordingRef.current = true;
      compIsFinalizedRef.current = false;
      compTranscriptRef.current = '';
      compPrevSessionTranscriptRef.current = '';
      setLiveComprehensionTranscript('');
      setComprehensionRecordingSeconds(0);
      compRecordStartTimeRef.current = Date.now();
      setAnsweringQuestionId(question.id);

      recognition.onresult = (event: any) => {
        let currentSessionTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          const seg = (event.results[i][0]?.transcript || '').trim();
          if (!seg) continue;
          if (currentSessionTranscript && seg.startsWith(currentSessionTranscript)) {
            currentSessionTranscript = seg;
          } else if (currentSessionTranscript && currentSessionTranscript.endsWith(seg)) {
            // Already included
          } else {
            currentSessionTranscript += `${currentSessionTranscript ? ' ' : ''}${seg}`;
          }
        }

        const prefix = compPrevSessionTranscriptRef.current;
        let full = currentSessionTranscript.trim();
        if (prefix && !full.startsWith(prefix)) {
          full = `${prefix} ${full}`.trim();
        }

        compTranscriptRef.current = full;
        setLiveComprehensionTranscript(full);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        if (event.error === 'not-allowed') {
          cancelComprehensionRecording();
          setComprehensionError('Permiso de micrófono denegado para responder.');
        }
      };

      recognition.onend = () => {
        if (compIsRecordingRef.current && !compIsFinalizedRef.current) {
          compPrevSessionTranscriptRef.current = compTranscriptRef.current;
          try {
            recognition.start();
            return;
          } catch (err) {
            console.warn('Could not auto-restart comp recognition session:', err);
          }
        }

        if (!compIsRecordingRef.current) {
          setAnsweringQuestionId(null);
          if (compTimerRef.current) {
            clearInterval(compTimerRef.current);
            compTimerRef.current = null;
          }
        }
      };

      recognition.start();

      if (compTimerRef.current) clearInterval(compTimerRef.current);
      compTimerRef.current = setInterval(() => {
        setComprehensionRecordingSeconds((s) => s + 1);
      }, 1000);

    } catch (e) {
      console.error('Comprehension recognition start error:', e);
      cancelComprehensionRecording();
      setComprehensionError('No se pudo inicializar el micrófono.');
    }
  };

  const stopComprehensionAndEvaluate = async (question: ReadingQuestion) => {
    if (!compIsRecordingRef.current || compIsFinalizedRef.current) return;

    compIsFinalizedRef.current = true;
    compIsRecordingRef.current = false;
    if (compTimerRef.current) {
      clearInterval(compTimerRef.current);
      compTimerRef.current = null;
    }
    setAnsweringQuestionId(null);

    if (compRecognitionRef.current) {
      try {
        compRecognitionRef.current.stop();
      } catch {}
      compRecognitionRef.current = null;
    }

    await new Promise((r) => setTimeout(r, 260));
    const finalTranscript = compTranscriptRef.current.trim();
    if (!finalTranscript) {
      setComprehensionError('No se detectó audio con tu respuesta. Intenta hablar más fuerte o cerca del micrófono.');
      return;
    }

    setEvaluatingQuestionId(question.id);
    setComprehensionError(null);


    try {
      const evaluation = await evaluateReadingComprehension({
        questionZh: question.question_zh,
        questionEs: question.question_es,
        expectedAnswer: question.expected_answer_summary,
        fullText,
        userTranscript: finalTranscript,
      });

      const fullAnswer: ReadingComprehensionAnswer = {
        ...evaluation,
        question_id: question.id,
        user_audio_transcript: finalTranscript,
      };

      setComprehensionAnswers((prev) => ({
        ...prev,
        [question.id]: fullAnswer,
      }));
    } catch (err: any) {
      console.error('Error evaluating comprehension answer:', err);
      setComprehensionError('No se pudo evaluar la respuesta con la IA. Inténtalo de nuevo.');
    } finally {
      setEvaluatingQuestionId(null);
    }
  };

  // ------------------------------------------
  // Global Session Score Calculation
  // ------------------------------------------
  const answeredQuestionsList = Object.values(comprehensionAnswers) as ReadingComprehensionAnswer[];
  const totalQuestionsCount = content?.comprehension_questions?.length || 0;
  const correctQuestionsCount = answeredQuestionsList.filter((a) => a.is_correct).length;
  
  const comprehensionAverageScore = answeredQuestionsList.length > 0
    ? Math.round(answeredQuestionsList.reduce((acc, curr) => acc + curr.score, 0) / answeredQuestionsList.length)
    : 0;

  const aloudScore = aloudEvaluation ? aloudEvaluation.score : 0;
  
  // Combined score: 45% Reading aloud accuracy + 55% Reading comprehension
  const combinedGlobalScore = useMemo(() => {
    if (!aloudEvaluation && answeredQuestionsList.length === 0) return 0;
    if (aloudEvaluation && answeredQuestionsList.length > 0) {
      return Math.round(aloudScore * 0.45 + comprehensionAverageScore * 0.55);
    }
    if (aloudEvaluation) return aloudScore;
    return comprehensionAverageScore;
  }, [aloudEvaluation, aloudScore, answeredQuestionsList.length, comprehensionAverageScore]);

  const hasSessionActivity = aloudEvaluation !== null || answeredQuestionsList.length > 0;

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 py-4 animate-fadeIn text-slate-100">
      
      {/* ======================================================== */}
      {/* TOP NAVIGATION & CONTROLS BAR */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
        <button
          onClick={() => {
            stopPlayback();
            cancelAloudRecording();
            cancelComprehensionRecording();
            onBackToMenu();
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Menú Principal</span>
        </button>

        {/* Global Controls & Modal Trigger */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Button: Change Reading / Scenario Modal */}
          <button
            onClick={() => {
              stopPlayback();
              cancelAloudRecording();
              cancelComprehensionRecording();
              setIsScenarioModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Elegir tema, generar texto por IA o escribir tu propio prompt"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Cambiar Lectura / IA</span>
          </button>

          {/* Toggle Hanzi */}
          <button
            onClick={() => setShowHanzi(!showHanzi)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
              showHanzi
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title={showHanzi ? 'Ocultar caracteres Hanzi' : 'Mostrar caracteres Hanzi'}
          >
            {showHanzi ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Hanzi {showHanzi ? 'ON' : 'OFF'}</span>
          </button>

          {/* Toggle Pinyin */}
          <button
            onClick={() => setShowPinyin(!showPinyin)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
              showPinyin
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title={showPinyin ? 'Ocultar fonética Pinyin' : 'Mostrar fonética Pinyin'}
          >
            <span>拼 Pinyin {showPinyin ? 'ON' : 'OFF'}</span>
          </button>

          {/* Toggle Translation */}
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
              showTranslation
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title={showTranslation ? 'Ocultar traducción al español' : 'Mostrar traducción al español'}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Traducción {showTranslation ? 'ON' : 'OFF'}</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            {[0.75, 1.0, 1.25].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  Math.abs(speechRate - speed) < 0.02
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {content && (
            <button
              onClick={async () => {
                await saveExerciseToCloud({
                  type: 'reading',
                  title: content.title_translation || content.topic,
                  chineseTitle: content.title_hanzi,
                  level: content.level,
                  payload: content,
                });
                setSavedReadingNotice(true);
                setTimeout(() => setSavedReadingNotice(false), 2000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-bold transition-all cursor-pointer"
              title="Guardar este texto de lectura en mi Cuaderno"
            >
              {savedReadingNotice ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>¡Guardado en Cuaderno!</span>
                </>
              ) : (
                <>
                  <Cloud className="w-3.5 h-3.5 text-sky-400" />
                  <span>Guardar en Cuaderno</span>
                </>
              )}
            </button>
          )}

        </div>
      </div>

      {/* ======================================================== */}
      {/* LOADING STATE */}
      {/* ======================================================== */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-24 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 text-center animate-fadeIn">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
            <BookOpen className="w-7 h-7 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h4 className="text-lg font-bold text-slate-100 mb-1">
            Generando texto y preguntas de comprensión...
          </h4>
          <p className="text-xs text-slate-400 max-w-sm">
            La IA está estructurando una narrativa coherente en mandarín, calculando pinyin y preparando preguntas evaluativas.
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-950/20 border border-rose-800/40 rounded-3xl my-6">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm text-rose-300 mb-4">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => fetchReading(initialTopic)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-all"
            >
              Reintentar
            </button>
            <button
              onClick={() => setIsScenarioModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Abrir Selector de Temas</span>
            </button>
          </div>
        </div>
      ) : content ? (
        <div className="space-y-6 animate-fadeIn pb-16">
          
          {/* ======================================================== */}
          {/* TEXT HEADER & NARRATIVE DETAILS */}
          {/* ======================================================== */}
          <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/20 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    {content.level || 'HSK 2-3'}
                  </span>
                  {content.genre && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {content.genre}
                    </span>
                  )}
                  {content.badge && (
                    <span className="text-[10px] font-medium text-slate-400">
                      {content.badge}
                    </span>
                  )}
                </div>

                {/* Title */}
                <div>
                  {showHanzi ? (
                    <HanziWithPinyin
                      text={content.title_hanzi}
                      showPinyin={showPinyin}
                      className="text-2xl sm:text-3xl font-black text-slate-100"
                    />
                  ) : (
                    <div className="text-xl sm:text-2xl font-bold text-amber-300 font-mono">
                      {content.title_pinyin}
                    </div>
                  )}
                </div>

                {showTranslation && (
                  <p className="text-sm text-slate-400 italic">
                    {content.title_translation}
                  </p>
                )}
              </div>

              {/* Action Buttons: Native Sequential Audio Player */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <button
                  id="btn-play-all-aloud"
                  onClick={playFullTextSequential}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer ${
                    isPlayingFullText
                      ? 'bg-rose-600 text-white shadow-rose-950 animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title="Escuchar todo el texto leído fluidamente por la IA"
                >
                  {isPlayingFullText ? (
                    <>
                      <Square className="w-4 h-4 fill-white" />
                      <span>Detener audio</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-amber-400" />
                      <span>Escuchar audio IA ({speechRate}x)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsScenarioModalOpen(true)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Cambiar texto o tema"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pedagogical Reading Tip */}
            {content.reading_tip && (
              <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-start gap-2 text-xs text-amber-300/90 bg-amber-500/5 p-3 rounded-2xl border border-amber-500/10">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Consejo pedagógico:</strong> {content.reading_tip}
                </span>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SECTION 1: COMPLETE TEXT & READING ALOUD ORAL PRACTICE */}
          {/* ======================================================== */}
          <div className="p-4 sm:p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
            
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Texto Completo de Lectura</h3>
                  <p className="text-[11px] text-slate-400">Lee el texto fluido o pulsa sobre las palabras para escuchar su pronunciación.</p>
                </div>
              </div>

              <div className="text-xs text-slate-400 font-medium">
                {content.sentences.length} oraciones
              </div>
            </div>

            {/* Full text narrative passage */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-4">
              {showHanzi ? (
                <HanziWithPinyin
                  text={fullText}
                  showPinyin={showPinyin}
                  onWordClick={(char) => playChineseWord(char)}
                  className="text-xl sm:text-3xl leading-loose font-normal text-slate-100 select-text"
                />
              ) : (
                <div className="text-base sm:text-xl font-mono text-amber-300 leading-relaxed">
                  {content.sentences.map((s) => s.pinyin).join(' ')}
                </div>
              )}

              {showTranslation && (
                <div className="pt-3 border-t border-slate-800/80 text-xs sm:text-sm text-slate-400 leading-relaxed italic">
                  "{fullTranslation}"
                </div>
              )}
            </div>

            {/* ======================================================== */}
            {/* READING ALOUD RECORDING & EVALUATION BOX */}
            {/* ======================================================== */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-950 to-amber-950/20 border border-amber-500/20 space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Mic className="w-4 h-4" />
                    Evaluación de Lectura en Voz Alta
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Grábate leyendo el texto completo. Se evalúa con tolerancia inteligente a homófonos Pinyin.
                  </p>
                </div>

                {/* Reading Aloud Record Controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isRecordingAloud ? (
                    <>
                      <button
                        onClick={stopReadingAloudAndEvaluate}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white text-xs font-bold shadow-lg shadow-rose-950/60 animate-pulse cursor-pointer"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        <span>Terminar y Evaluar ({String(Math.floor(aloudRecordingSeconds / 60)).padStart(2, '0')}:{String(aloudRecordingSeconds % 60).padStart(2, '0')})</span>
                      </button>

                      <button
                        onClick={cancelAloudRecording}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startReadingAloudRecording}
                      disabled={isEvaluatingAloud}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-950/40 cursor-pointer disabled:opacity-50"
                    >
                      <Mic className="w-4 h-4" />
                      <span>{aloudEvaluation ? 'Reintentar lectura en voz alta' : 'Grabar mi lectura en voz alta'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Active Recording Monitor */}
              {isRecordingAloud && (
                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs text-rose-300">
                    <span className="flex items-center gap-2 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                      Grabando tu lectura en chino mandarín...
                    </span>
                    <span className="font-mono text-rose-400 font-bold">
                      {String(Math.floor(aloudRecordingSeconds / 60)).padStart(2, '0')}:{String(aloudRecordingSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/80 rounded-lg text-sm text-slate-200 font-medium min-h-[44px]">
                    {liveAloudTranscript ? (
                      <span>"{liveAloudTranscript}"</span>
                    ) : (
                      <span className="text-slate-500 italic">Lee el texto en voz alta. El audio no se cortará hasta que presiones Terminar...</span>
                    )}
                  </div>
                </div>
              )}

              {/* Evaluating Aloud Loading Indicator */}
              {isEvaluatingAloud && (
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-center gap-3 text-xs text-amber-300 animate-fadeIn">
                  <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                  <span>Analizando tu fluidez, fonética Pinyin y homófonos...</span>
                </div>
              )}

              {/* Aloud Error Message */}
              {aloudError && (
                <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/50 text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>{aloudError}</span>
                </div>
              )}

              {/* Aloud Evaluation Results */}
              {aloudEvaluation && !isRecordingAloud && !isEvaluatingAloud && (
                <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/40 shadow-xl space-y-4 animate-scaleUp">
                  
                  {/* Score & Verdict Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${
                        aloudEvaluation.score >= 70
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-950/40'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-amber-950/40'
                      }`}>
                        {aloudEvaluation.score}%
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200">
                          {aloudEvaluation.passed ? '¡Lectura Satisfactoria!' : 'Lectura en Práctica'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {aloudEvaluation.speed?.label ? `Ritmo: ${aloudEvaluation.speed.label}` : 'Ritmo adecuado'}
                        </div>
                      </div>
                    </div>

                    {/* Speed Assessment */}
                    {aloudEvaluation.speed && (
                      <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                        <span className="text-slate-500">Velocidad: </span>
                        <span className="font-semibold text-amber-300">{aloudEvaluation.speed.comment}</span>
                      </div>
                    )}
                  </div>

                  {/* Homophone Auto-Correction Notice */}
                  {aloudEvaluation.homophoneCorrections && aloudEvaluation.homophoneCorrections.length > 0 && (
                    <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/40 text-xs text-sky-200 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Auto-corrección fonética de homófonos STT:</strong> Se validaron como correctos{' '}
                        {aloudEvaluation.homophoneCorrections.slice(0, 6).map((h, idx) => (
                          <span key={idx} className="inline-block font-mono bg-sky-900/50 px-1.5 py-0.2 rounded mx-0.5">
                            "{h.heard}" → "{h.correctedTo}" ({h.pinyin})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}


                  {/* Mistakes / Omissions */}
                  {aloudEvaluation.mistakes && aloudEvaluation.mistakes.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 block">Detalles fonéticos y omisiones detectadas:</span>
                      <div className="flex flex-wrap gap-2">
                        {aloudEvaluation.mistakes.map((m, idx) => (
                          <div
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-rose-950/30 border border-rose-800/40 text-[11px] text-rose-300 flex items-center gap-1.5"
                          >
                            <span className="font-bold">{m.word}</span>
                            <span className="text-slate-400 text-[10px]">({m.explanation})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pedagogical Advice */}
                  {aloudEvaluation.pronunciationAdvice && (
                    <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-xs text-amber-200 leading-relaxed flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-300 font-bold block mb-0.5">Consejo de pronunciación del tutor:</strong>
                        {aloudEvaluation.pronunciationAdvice}
                      </div>
                    </div>
                  )}

                  {/* Transcribed text */}
                  <div className="text-[11px] text-slate-400 pt-1">
                    <span className="text-slate-500">Audio reconocido: </span>
                    <span className="font-medium text-slate-300">"{aloudEvaluation.transcribedText}"</span>
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* ======================================================== */}
          {/* SECTION 2: READING COMPREHENSION QUESTIONS (ES or ZH) */}
          {/* ======================================================== */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">Comprensión Lectora</h3>
                  <p className="text-[11px] text-slate-400">
                    Responde oralmente por audio en español o chino mandarín. La IA interpretará tu voz y evaluará si responde a los hechos del texto.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-teal-300">
                  {correctQuestionsCount} / {totalQuestionsCount} Respondidas correctamente
                </span>
              </div>
            </div>

            {/* Questions List */}
            {content.comprehension_questions && content.comprehension_questions.length > 0 ? (
              <div className="space-y-5">
                {content.comprehension_questions.map((q, qIndex) => {
                  const evalAnswer = comprehensionAnswers[q.id];
                  const isRecordingThis = answeringQuestionId === q.id;
                  const isEvaluatingThis = evaluatingQuestionId === q.id;
                  const currentLang = answerLanguageMap[q.id] || 'es';

                  return (
                    <div
                      key={q.id}
                      className={`p-5 rounded-2xl border transition-all duration-200 space-y-4 ${
                        evalAnswer
                          ? evalAnswer.is_correct
                            ? 'bg-emerald-950/10 border-emerald-500/40 shadow-md'
                            : 'bg-rose-950/10 border-rose-500/40 shadow-md'
                          : isRecordingThis
                          ? 'bg-teal-950/20 border-teal-500/50 shadow-lg ring-1 ring-teal-500/30'
                          : 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      {/* Question Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                              Pregunta {qIndex + 1} de {content.comprehension_questions!.length}
                            </span>
                            {evalAnswer && (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                evalAnswer.is_correct
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                {evalAnswer.is_correct ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {evalAnswer.is_correct ? 'Correcto' : 'A revisar'} ({evalAnswer.score} pts)
                              </span>
                            )}
                          </div>

                          {/* Question in Chinese */}
                          <div className="flex items-start gap-2 pt-1">
                            <button
                              onClick={() => playMandarinTTS(q.question_zh, speechRate)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer flex-shrink-0 mt-0.5"
                              title="Escuchar pregunta en chino mandarín"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                            <div>
                              <div className="text-base sm:text-lg font-bold text-slate-100">
                                {q.question_zh}
                              </div>
                              {q.question_pinyin && showPinyin && (
                                <div className="text-xs text-amber-400 font-mono">
                                  {q.question_pinyin}
                                </div>
                              )}
                              <div className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
                                "{q.question_es}"
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Language switcher to answer */}
                        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 flex-shrink-0">
                          <button
                            disabled={isRecordingThis || isEvaluatingThis}
                            onClick={() => setAnswerLanguageMap((prev) => ({ ...prev, [q.id]: 'es' }))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              currentLang === 'es'
                                ? 'bg-teal-600 text-white font-bold shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span>🇪🇸 Español</span>
                          </button>
                          <button
                            disabled={isRecordingThis || isEvaluatingThis}
                            onClick={() => setAnswerLanguageMap((prev) => ({ ...prev, [q.id]: 'zh' }))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                              currentLang === 'zh'
                                ? 'bg-amber-600 text-white font-bold shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span>🇨🇳 中文</span>
                          </button>
                        </div>
                      </div>

                      {/* Question Answer Actions & Recording Area */}
                      <div className="pt-2 border-t border-slate-800/80">
                        {isRecordingThis ? (
                          <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-500/40 space-y-3 animate-fadeIn">
                            <div className="flex items-center justify-between text-xs text-teal-300">
                              <span className="flex items-center gap-2 font-bold">
                                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
                                Grabando tu respuesta ({currentLang === 'es' ? 'en español' : 'en chino mandarín'})...
                              </span>
                              <span className="font-mono text-teal-400 font-bold">
                                {String(Math.floor(comprehensionRecordingSeconds / 60)).padStart(2, '0')}:{String(comprehensionRecordingSeconds % 60).padStart(2, '0')}
                              </span>
                            </div>

                            <div className="p-3 bg-slate-950/90 rounded-lg text-sm text-slate-100 font-medium min-h-[44px]">
                              {liveComprehensionTranscript ? (
                                <span>"{liveComprehensionTranscript}"</span>
                              ) : (
                                <span className="text-slate-500 italic">Habla al micrófono explicando la respuesta según el texto...</span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => stopComprehensionAndEvaluate(q)}
                                className="flex-1 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-teal-950/40 cursor-pointer flex items-center justify-center gap-2"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Detener y Enviar a la IA</span>
                              </button>
                              <button
                                onClick={cancelComprehensionRecording}
                                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : isEvaluatingThis ? (
                          <div className="p-3.5 rounded-xl bg-teal-950/20 border border-teal-500/30 flex items-center justify-center gap-2.5 text-xs text-teal-300">
                            <div className="w-4 h-4 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                            <span>La IA está interpretando tu audio y comprobando la exactitud con el texto...</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <button
                              onClick={() => startComprehensionRecording(q)}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-teal-950/40 text-slate-200 hover:text-teal-300 border border-slate-700 hover:border-teal-500/40 text-xs font-bold transition-all cursor-pointer"
                            >
                              <Mic className="w-4 h-4 text-teal-400" />
                              <span>{evalAnswer ? 'Volver a responder por audio' : 'Grabar respuesta por audio'}</span>
                            </button>

                            {evalAnswer && (
                              <span className="text-[11px] text-slate-500">
                                Respondido en {evalAnswer.language_detected === 'zh' ? 'Chino' : 'Español'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Evaluation result card for this question */}
                      {evalAnswer && !isRecordingThis && !isEvaluatingThis && (
                        <div className={`p-4 rounded-xl border space-y-2 text-xs animate-fadeIn ${
                          evalAnswer.is_correct
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                            : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-slate-400 block text-[11px] mb-0.5">Tu respuesta en audio:</span>
                              <span className="font-semibold text-slate-100">"{evalAnswer.user_audio_transcript}"</span>
                            </div>
                            <span className="font-black text-sm">{evalAnswer.score}%</span>
                          </div>

                          <div className="pt-2 border-t border-slate-800/80 leading-relaxed text-slate-300">
                            <strong className="text-slate-100 font-semibold block mb-0.5">Evaluación del tutor IA:</strong>
                            {evalAnswer.feedback}
                          </div>

                          {q.expected_answer_summary && (
                            <div className="pt-1 text-[11px] text-slate-400 italic">
                              <strong>Dato clave del texto:</strong> {q.expected_answer_summary}
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 text-xs text-slate-400 text-center">
                No se generaron preguntas de comprensión para este texto.
              </div>
            )}

            {comprehensionError && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/50 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{comprehensionError}</span>
              </div>
            )}

          </div>

          {/* ======================================================== */}
          {/* SECTION 3: COMBINED OVERALL SESSION EVALUATION */}
          {/* ======================================================== */}
          {hasSessionActivity && (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 shadow-2xl space-y-5 animate-scaleUp">
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-950/40">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-100">
                    Evaluación Global de la Sesión de Lectura
                  </h3>
                  <p className="text-xs text-slate-400">
                    Puntaje combinado basado en tu lectura en voz alta y en tus respuestas de comprensión lectora.
                  </p>
                </div>
              </div>

              {/* Stats 3-column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Reading Aloud Score */}
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Lectura en Voz Alta</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-amber-400">
                      {aloudEvaluation ? `${aloudEvaluation.score}%` : 'Pendiente'}
                    </span>
                    {aloudEvaluation && (
                      <span className="text-[11px] text-slate-400">
                        {aloudEvaluation.passed ? 'Aprobada' : 'A mejorar'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Comprehension Score */}
                <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">Comprensión Lectora</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-teal-400">
                      {answeredQuestionsList.length > 0 ? `${comprehensionAverageScore}%` : 'Pendiente'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({correctQuestionsCount}/{totalQuestionsCount} correctas)
                    </span>
                  </div>
                </div>

                {/* Combined Overall Score */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-950 border border-amber-500/40">
                  <span className="text-[11px] font-bold text-amber-300 block mb-1">Puntaje Global</span>
                  <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400">
                    {combinedGlobalScore}%
                  </span>
                </div>
              </div>

              {/* Feedback Summary Banner */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs leading-relaxed text-slate-300 flex items-start gap-3">
                <Award className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-100 font-bold block mb-0.5">
                    {combinedGlobalScore >= 80 
                      ? '🎉 ¡Rendimiento Sobresaliente!' 
                      : combinedGlobalScore >= 60 
                      ? '🌟 ¡Buen Trabajo de Práctica!' 
                      : '📖 ¡Sigue Practicando!'}
                  </strong>
                  <span>
                    {combinedGlobalScore >= 80
                      ? 'Has demostrado excelente fluidez fonética en voz alta y una comprensión precisa del texto en las preguntas orales.'
                      : combinedGlobalScore >= 60
                      ? 'Comprendes bien los conceptos del texto. Continúa puliendo la entonación y velocidad de lectura en voz alta.'
                      : 'Repasa el vocabulario clave y vuelve a escuchar el audio nativo de la IA para consolidar la pronunciación y comprensión.'}
                  </span>
                </div>
              </div>

              {/* Session Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={() => setIsScenarioModalOpen(true)}
                  className="w-full sm:flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-950/50 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Elegir o crear nuevo texto con la IA</span>
                </button>

                <button
                  onClick={() => fetchReading(content.topic)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Generar otra versión</span>
                </button>
              </div>

            </div>
          )}

          {/* ======================================================== */}
          {/* SECTION 4: SENTENCE-BY-SENTENCE BREAKDOWN & VOCABULARY */}
          {/* ======================================================== */}
          <div className="rounded-3xl bg-slate-900/60 border border-slate-800/80 overflow-hidden">
            <button
              onClick={() => setShowSentencesAccordion(!showSentencesAccordion)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200">
                  Desglose Frase por Frase y Vocabulario Clave
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  {content.sentences.length} oraciones • {content.vocabulary?.length || 0} palabras
                </span>
              </div>
              {showSentencesAccordion ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showSentencesAccordion && (
              <div className="p-5 pt-2 border-t border-slate-800/80 space-y-6">
                
                {/* Sentences List */}
                <div className="space-y-3">
                  {content.sentences.map((sentence, idx) => {
                    const isActive = activeSentenceId === sentence.id;

                    return (
                      <div
                        key={sentence.id}
                        className={`p-4 rounded-xl border transition-all duration-200 ${
                          isActive
                            ? 'bg-amber-950/20 border-amber-500/60 shadow-lg ring-1 ring-amber-400/40'
                            : 'bg-slate-950/60 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>

                          <button
                            onClick={() => playSingleSentence(sentence)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                              isActive
                                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                            }`}
                          >
                            <Volume2 className="w-3 h-3" />
                            <span>{isActive ? 'Sonando...' : 'Escuchar frase'}</span>
                          </button>
                        </div>

                        {/* Hanzi / Pinyin */}
                        <div className="my-2">
                          {showHanzi ? (
                            <HanziWithPinyin
                              text={sentence.hanzi}
                              showPinyin={showPinyin}
                              className="text-lg sm:text-xl leading-relaxed text-slate-100 font-medium"
                            />
                          ) : (
                            <div className="text-base font-mono text-amber-300">
                              {sentence.pinyin}
                            </div>
                          )}
                        </div>

                        {showTranslation && (
                          <div className="text-xs text-slate-400 italic pt-1 border-t border-slate-800/60">
                            "{sentence.translation}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Vocabulary Grid */}
                {content.vocabulary && content.vocabulary.length > 0 && (
                  <div className="pt-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" />
                      Vocabulario Clave del Texto
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {content.vocabulary.map((vocab, i) => {
                        const isSaved = savedVocabMap[vocab.word];
                        return (
                          <div
                            key={`${i}-${vocab.word}`}
                            onClick={() => playChineseWord(vocab.word)}
                            className="group p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-amber-500/40 transition-all cursor-pointer flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="text-base font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                                {vocab.word}
                              </div>
                              <div className="text-xs text-amber-400 font-mono">
                                {vocab.pinyin}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {vocab.meaning}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await saveVocabularyToCloud({
                                    hanzi: vocab.word,
                                    pinyin: vocab.pinyin,
                                    meaning: vocab.meaning,
                                    sourceMode: `Lectura: ${content.title_translation}`,
                                  });
                                  setSavedVocabMap((prev) => ({ ...prev, [vocab.word]: true }));
                                }}
                                className="p-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 cursor-pointer"
                                title="Guardar palabra en Mi Cuaderno / Google Sheets"
                              >
                                {isSaved ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <BookmarkPlus className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <Volume2 className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                )}

              </div>
            )}
          </div>

        </div>
      ) : null}

      {/* ======================================================== */}
      {/* READING SCENARIO & TOPIC GENERATOR MODAL */}
      {/* ======================================================== */}
      <ReadingScenarioModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        currentReading={content}
        onReadingGenerated={(newReading) => {
          resetSessionEvaluations();
          setContent(newReading);
        }}
      />

    </div>
  );
};
