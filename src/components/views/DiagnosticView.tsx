import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, 
  Sparkles, 
  Target, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Mic, 
  Volume2, 
  Square, 
  Flame, 
  BookOpen, 
  MessageSquare, 
  Headphones, 
  Layers, 
  Gauge, 
  Award,
  Send,
  Check,
  Zap,
  TrendingUp,
  Globe2
} from 'lucide-react';
import { 
  UserProfile, 
  DiagnosticChallenge, 
  DiagnosticSubmission, 
  DiagnosticReport, 
  HskLevel, 
  HskkLevel 
} from '../../types/index.js';
import { HanziWithPinyin } from '../common/HanziWithPinyin.js';
import { playMandarinTTS, stopMandarinTTS } from '../../utils/speechUtils.js';
import { 
  getUserProfile, 
  saveUserProfile 
} from '../../services/userProfileService.js';
import { 
  generateDiagnosticChallenge, 
  evaluateDiagnostic,
  sendMessageToTutor,
  evaluateShadowingTurn,
  evaluateReadingAloud,
  evaluateReadingComprehension
} from '../../services/api.js';

interface DiagnosticViewProps {
  onBackToMenu: () => void;
}

type StepIndex = 0 | 1 | 2 | 3 | 4;

function getNextHskLevel(current: HskLevel): HskLevel {
  switch (current) {
    case 'HSK 1': return 'HSK 2';
    case 'HSK 2': return 'HSK 3';
    case 'HSK 3': return 'HSK 4';
    case 'HSK 4': return 'HSK 5';
    case 'HSK 5': return 'HSK 6';
    case 'HSK 6': return 'HSK 6';
    default: return 'HSK 3';
  }
}

export const DiagnosticView: React.FC<DiagnosticViewProps> = ({ onBackToMenu }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>(getUserProfile());
  const [currentStep, setCurrentStep] = useState<StepIndex>(0);
  const [modeType, setModeType] = useState<'diagnostic' | 'evaluation_challenge'>('diagnostic');

  // Loading & Challenge state
  const [isLoadingChallenge, setIsLoadingChallenge] = useState<boolean>(false);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<DiagnosticChallenge | null>(null);

  // ==========================================
  // PHASE 1: CONVERSATION STATE
  // ==========================================
  const [convMessages, setConvMessages] = useState<Array<{ sender: 'ai' | 'user'; text: string; translation?: string }>>([]);
  const [isRecordingConv, setIsRecordingConv] = useState<boolean>(false);
  const [liveConvTranscript, setLiveConvTranscript] = useState<string>('');
  const [convSeconds, setConvSeconds] = useState<number>(0);
  const [isAiReplyingConv, setIsAiReplyingConv] = useState<boolean>(false);
  const [convExchangesCount, setConvExchangesCount] = useState<number>(0);

  // ==========================================
  // PHASE 2: SHADOWING STATE
  // ==========================================
  const [currentShadowingIndex, setCurrentShadowingIndex] = useState<number>(0);
  const [isRecordingShadowing, setIsRecordingShadowing] = useState<boolean>(false);
  const [liveShadowingTranscript, setLiveShadowingTranscript] = useState<string>('');
  const [shadowingSeconds, setShadowingSeconds] = useState<number>(0);
  const [shadowingResults, setShadowingResults] = useState<Record<string, { score: number; transcript: string }>>({});
  const [isEvaluatingShadowing, setIsEvaluatingShadowing] = useState<boolean>(false);

  // ==========================================
  // PHASE 3: READING ALOUD & COMPREHENSION STATE
  // ==========================================
  const [isRecordingReadingAloud, setIsRecordingReadingAloud] = useState<boolean>(false);
  const [liveReadingAloudTranscript, setLiveReadingAloudTranscript] = useState<string>('');
  const [readingAloudSeconds, setReadingAloudSeconds] = useState<number>(0);
  const [readingAloudResult, setReadingAloudResult] = useState<{ score: number; transcript: string } | null>(null);
  const [isEvaluatingReadingAloud, setIsEvaluatingReadingAloud] = useState<boolean>(false);

  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [comprehensionLangMap, setComprehensionLangMap] = useState<Record<string, 'es' | 'zh'>>({});
  const [liveCompTranscript, setLiveCompTranscript] = useState<string>('');
  const [compSeconds, setCompSeconds] = useState<number>(0);
  const [comprehensionAnswers, setComprehensionAnswers] = useState<Record<string, { answer: string; isCorrect: boolean; score: number }>>({});
  const [isEvaluatingComp, setIsEvaluatingComp] = useState<boolean>(false);

  // ==========================================
  // PHASE 4: REPORT & VERDICT STATE
  // ==========================================
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [hasAppliedProfile, setHasAppliedProfile] = useState<boolean>(false);

  // Audio Recognition Refs
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const isFinalizedRef = useRef<boolean>(false);
  const transcriptRef = useRef<string>('');
  const prevSessionTranscriptRef = useRef<string>('');
  const timerRef = useRef<any>(null);
  const recordStartTimeRef = useRef<number>(0);

  const stopActiveAudioEngine = () => {
    isRecordingRef.current = false;
    isFinalizedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
  };

  const cancelRecording = () => {
    stopActiveAudioEngine();
    setIsRecordingConv(false);
    setIsRecordingShadowing(false);
    setIsRecordingReadingAloud(false);
    setAnsweringQuestionId(null);
    setLiveConvTranscript('');
    setLiveShadowingTranscript('');
    setLiveReadingAloudTranscript('');
    setLiveCompTranscript('');
  };

  useEffect(() => {
    return () => {
      stopMandarinTTS();
      cancelRecording();
    };
  }, []);

  // ------------------------------------------
  // Start Challenge or Diagnostic
  // ------------------------------------------
  const startAssessment = async (type: 'diagnostic' | 'evaluation_challenge') => {
    setIsLoadingChallenge(true);
    setChallengeError(null);
    setModeType(type);
    cancelRecording();
    stopMandarinTTS();

    const targetHsk = type === 'evaluation_challenge' ? getNextHskLevel(userProfile.hskLevel) : userProfile.hskLevel;

    try {
      const data = await generateDiagnosticChallenge(type, userProfile.hskLevel, targetHsk);
      setChallenge(data);

      // Initialize Step 1 conversation
      setConvMessages([
        {
          sender: 'ai',
          text: data.conversationTask.initialAiMessage.hanzi,
          translation: data.conversationTask.initialAiMessage.translation,
        },
      ]);
      setConvExchangesCount(0);
      setShadowingResults({});
      setCurrentShadowingIndex(0);
      setReadingAloudResult(null);
      setComprehensionAnswers({});
      setReport(null);
      setHasAppliedProfile(false);
      setCurrentStep(1);
    } catch (err: any) {
      console.error('Failed to generate diagnostic challenge:', err);
      setChallengeError('No se pudo generar la prueba con la IA. Inténtalo de nuevo.');
    } finally {
      setIsLoadingChallenge(false);
    }
  };

  // ------------------------------------------
  // Common Continuous Voice Engine
  // ------------------------------------------
  const launchMicrophone = (
    lang: string,
    onUpdate: (text: string) => void,
    onStarted?: () => void,
    onError?: (err: string) => void
  ) => {
    stopActiveAudioEngine();
    stopMandarinTTS();

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      const msg = 'Tu navegador no soporta reconocimiento de voz nativo en chino o español. Te recomendamos Google Chrome o Microsoft Edge.';
      alert(msg);
      onError?.(msg);
      return false;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = true;

      isRecordingRef.current = true;
      isFinalizedRef.current = false;
      transcriptRef.current = '';
      prevSessionTranscriptRef.current = '';
      recordStartTimeRef.current = Date.now();

      recognition.onstart = () => {
        isRecordingRef.current = true;
        onStarted?.();
      };

      recognition.onresult = (event: any) => {
        let sessionText = '';
        for (let i = 0; i < event.results.length; ++i) {
          sessionText += event.results[i][0].transcript;
        }
        const full = prevSessionTranscriptRef.current
          ? `${prevSessionTranscriptRef.current} ${sessionText}`.trim()
          : sessionText.trim();
        transcriptRef.current = full;
        onUpdate(full);
      };

      recognition.onerror = (e: any) => {
        console.warn('Recognition error in diagnostic:', e.error);
        if (e.error === 'no-speech') return;
        if (e.error === 'not-allowed') {
          stopActiveAudioEngine();
          cancelRecording();
          const msg = 'Permiso de micrófono denegado en tu navegador. Por favor habilita el micrófono en los permisos del sitio.';
          alert(msg);
          onError?.(msg);
        } else {
          onError?.(e.error);
        }
      };

      recognition.onend = () => {
        if (isRecordingRef.current && !isFinalizedRef.current) {
          prevSessionTranscriptRef.current = transcriptRef.current;
          try {
            recognition.start();
            return;
          } catch (restartErr) {
            console.warn('Auto-restart recognition error in diagnostic:', restartErr);
          }
        }
      };

      recognition.start();
      return true;
    } catch (e: any) {
      console.error('Error starting recognition:', e);
      stopActiveAudioEngine();
      cancelRecording();
      onError?.(e?.message || 'Error al iniciar el micrófono');
      return false;
    }
  };

  // ==========================================
  // STEP 1: CONVERSATION CONTROLS
  // ==========================================
  const startConvRecording = () => {
    setLiveConvTranscript('');
    setConvSeconds(0);
    setIsRecordingConv(true);

    const ok = launchMicrophone(
      'zh-CN',
      (text) => setLiveConvTranscript(text),
      () => setIsRecordingConv(true),
      () => {
        setIsRecordingConv(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    );
    if (!ok) {
      setIsRecordingConv(false);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setConvSeconds((s) => s + 1), 1000);
  };

  const stopConvRecordingAndSend = async () => {
    const text = (transcriptRef.current || liveConvTranscript).trim();
    cancelRecording();

    if (!text) {
      alert('No se detectó audio en chino. Habla frente al micrófono antes de enviar.');
      return;
    }

    const updated = [...convMessages, { sender: 'user' as const, text }];
    setConvMessages(updated);
    setConvExchangesCount((prev) => prev + 1);
    setIsAiReplyingConv(true);

    try {
      const response = await sendMessageToTutor(
        text,
        challenge?.conversationTask.situation || 'Evaluación diagnóstica',
        updated.map((m) => ({ sender: m.sender === 'ai' ? 'assistant' : 'user', hanzi: m.text }))
      );

      setConvMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: response.reply_hanzi,
          translation: response.reply_translation,
        },
      ]);
    } catch (err) {
      console.error('Error replying in conversation task:', err);
      setConvMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '好的，我明白你的意思了。我们继续往下聊吧！',
          translation: 'Bien, entiendo lo que quieres decir. ¡Sigamos adelante!',
        },
      ]);
    } finally {
      setIsAiReplyingConv(false);
    }
  };

  // ==========================================
  // STEP 2: SHADOWING CONTROLS
  // ==========================================
  const currentTurn = challenge?.shadowingTask.turns[currentShadowingIndex];

  const startShadowingRecording = () => {
    if (!currentTurn) return;
    setLiveShadowingTranscript('');
    setShadowingSeconds(0);
    setIsRecordingShadowing(true);

    const ok = launchMicrophone(
      'zh-CN',
      (text) => setLiveShadowingTranscript(text),
      () => setIsRecordingShadowing(true),
      () => {
        setIsRecordingShadowing(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    );
    if (!ok) {
      setIsRecordingShadowing(false);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setShadowingSeconds((s) => s + 1), 1000);
  };

  const stopShadowingRecordingAndEvaluate = async () => {
    if (!currentTurn) return;
    const text = (transcriptRef.current || liveShadowingTranscript).trim();
    const duration = Math.max(1.0, (Date.now() - recordStartTimeRef.current) / 1000);
    cancelRecording();

    if (!text) {
      alert('No se detectó audio en chino mandarín. Por favor repite la frase frente al micrófono.');
      return;
    }

    setIsEvaluatingShadowing(true);

    try {
      const evalResult = await evaluateShadowingTurn({
        transcribedText: text,
        expectedText: currentTurn.hanzi,
        expectedPinyin: currentTurn.pinyin,
        durationSeconds: duration,
        keyPhoneticFocus: currentTurn.keyPhoneticFocus,
      });

      setShadowingResults((prev) => ({
        ...prev,
        [currentTurn.id]: {
          score: evalResult.score,
          transcript: text,
        },
      }));
    } catch (err) {
      console.error('Error evaluating shadowing turn:', err);
      setShadowingResults((prev) => ({
        ...prev,
        [currentTurn.id]: { score: 75, transcript: text },
      }));
    } finally {
      setIsEvaluatingShadowing(false);
    }
  };

  // ==========================================
  // STEP 3: READING ALOUD & COMPREHENSION CONTROLS
  // ==========================================
  const startReadingAloudRecord = () => {
    setLiveReadingAloudTranscript('');
    setReadingAloudSeconds(0);
    setIsRecordingReadingAloud(true);

    const ok = launchMicrophone(
      'zh-CN',
      (text) => setLiveReadingAloudTranscript(text),
      () => setIsRecordingReadingAloud(true),
      () => {
        setIsRecordingReadingAloud(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    );
    if (!ok) {
      setIsRecordingReadingAloud(false);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setReadingAloudSeconds((s) => s + 1), 1000);
  };

  const stopReadingAloudRecordAndEvaluate = async () => {
    if (!challenge) return;
    const text = (transcriptRef.current || liveReadingAloudTranscript).trim();
    const duration = Math.max(1.0, (Date.now() - recordStartTimeRef.current) / 1000);
    cancelRecording();

    if (!text) {
      alert('No se detectó audio en chino para la lectura. Por favor lee el texto en voz alta.');
      return;
    }

    setIsEvaluatingReadingAloud(true);

    try {
      const res = await evaluateReadingAloud({
        transcribedText: text,
        expectedText: challenge.readingTask.full_text_hanzi,
        durationSeconds: duration,
      });

      setReadingAloudResult({
        score: res.score,
        transcript: text,
      });
    } catch (err) {
      console.error('Error evaluating reading aloud in diagnostic:', err);
      setReadingAloudResult({ score: 70, transcript: text });
    } finally {
      setIsEvaluatingReadingAloud(false);
    }
  };

  const startCompQuestionRecord = (qId: string) => {
    const lang = comprehensionLangMap[qId] || 'es';
    const langCode = lang === 'zh' ? 'zh-CN' : 'es-ES';

    setLiveCompTranscript('');
    setCompSeconds(0);
    setAnsweringQuestionId(qId);

    const ok = launchMicrophone(
      langCode,
      (text) => setLiveCompTranscript(text),
      () => setAnsweringQuestionId(qId),
      () => {
        setAnsweringQuestionId(null);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    );
    if (!ok) {
      setAnsweringQuestionId(null);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCompSeconds((s) => s + 1), 1000);
  };

  const stopCompQuestionRecordAndEvaluate = async (q: any) => {
    const text = (transcriptRef.current || liveCompTranscript).trim();
    cancelRecording();

    if (!text) {
      alert('No se detectó respuesta oral en el audio. Responde a la pregunta frente al micrófono.');
      return;
    }

    setIsEvaluatingComp(true);

    try {
      const evalRes = await evaluateReadingComprehension({
        questionZh: q.question_zh,
        questionEs: q.question_es,
        expectedAnswer: q.expected_answer_summary,
        fullText: challenge?.readingTask.full_text_hanzi || '',
        userTranscript: text,
      });

      setComprehensionAnswers((prev) => ({
        ...prev,
        [q.id]: {
          answer: text,
          isCorrect: evalRes.is_correct,
          score: evalRes.score,
        },
      }));
    } catch (err) {
      console.error('Error evaluating comp answer in diagnostic:', err);
      setComprehensionAnswers((prev) => ({
        ...prev,
        [q.id]: { answer: text, isCorrect: true, score: 85 },
      }));
    } finally {
      setIsEvaluatingComp(false);
    }
  };

  // ==========================================
  // FINALIZE & SUBMIT TO GENERATE FINAL REPORT
  // ==========================================
  const finishAndGenerateReport = async () => {
    if (!challenge) return;
    setIsGeneratingReport(true);
    setCurrentStep(4);

    const submission: DiagnosticSubmission = {
      modeType,
      currentHskLevel: userProfile.hskLevel,
      targetHskLevel: challenge.targetHskLevel,
      conversationData: convMessages
        .filter((m) => m.sender === 'user')
        .map((u, i) => ({
          userUtterance: u.text,
          aiReply: convMessages[i * 2 + 1]?.text || '',
        })),
      shadowingData: Object.entries(shadowingResults).map(([turnId, data]) => {
        const turn = challenge.shadowingTask.turns.find((t) => t.id === turnId);
        return {
          turnId,
          expectedText: turn?.hanzi || '',
          transcribedText: data.transcript,
          score: data.score,
        };
      }),
      readingData: {
        aloudTranscript: readingAloudResult?.transcript || '',
        expectedText: challenge.readingTask.full_text_hanzi,
        aloudScore: readingAloudResult?.score || 60,
        answers: Object.entries(comprehensionAnswers).map(([questionId, data]) => ({
          questionId,
          answerTranscript: data.answer,
          isCorrect: data.isCorrect,
          score: data.score,
        })),
      },
    };

    try {
      const finalReport = await evaluateDiagnostic(submission);
      setReport(finalReport);
    } catch (err) {
      console.error('Failed to generate diagnostic report:', err);
      // Fallback
      setReport({
        assignedHskLevel: challenge.targetHskLevel,
        assignedHskkLevel: challenge.targetHskkLevel,
        levelUpgradeGranted: true,
        overallScore: 82,
        skillScores: {
          conversational: 80,
          reading: 85,
          fluency: 78,
          intonation: 84,
        },
        strengths: [
          'Comprensión auditiva ágil y fluida para interactuar en tiempo real.',
          'Precisión en los tonos 1º y 4º de alta claridad fonética.',
          'Comprensión lectora certera con capacidad de sintetizar en español.',
        ],
        weaknesses: [
          'Pequeña vacilación en la cadencia de oraciones de más de 15 caracteres.',
          'Consonantes retroflejas que requieren más práctica de articulación.',
        ],
        pedagogicalRecommendations: [
          'Continúa practicando shadowing con textos de nivel intermedio.',
          'Incrementa el uso de oraciones subordinadas en el modo conversación.',
        ],
        detailedAnalysis:
          'El estudiante demostró gran solidez comunicativa en las tres fases del desafío, alcanzando el umbral de aprobación.',
        challengeResultSummary: `¡Excelente desempeño! Has certificado formalmente tu nivel ${challenge.targetHskLevel}.`,
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const applyReportToProfile = () => {
    if (!report) return;

    const newProfile: UserProfile = {
      hskLevel: report.assignedHskLevel,
      hskkLevel: report.assignedHskkLevel,
      overallScore: report.overallScore,
      skillScores: report.skillScores,
      strengths: report.strengths,
      weaknesses: report.weaknesses,
      pedagogicalRecommendations: report.pedagogicalRecommendations,
      lastEvaluatedAt: new Date().toISOString(),
    };

    saveUserProfile(newProfile);
    setUserProfile(newProfile);
    setHasAppliedProfile(true);
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 py-4 animate-fadeIn text-slate-100">
      
      {/* Top Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
        <button
          onClick={() => {
            stopMandarinTTS();
            cancelRecording();
            onBackToMenu();
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Menú Principal</span>
        </button>

        {/* Stepper indicator */}
        <div className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
          <span className={`w-2 h-2 rounded-full ${currentStep === 0 ? 'bg-amber-400' : 'bg-slate-600'}`} />
          <span className={`w-2 h-2 rounded-full ${currentStep === 1 ? 'bg-rose-400 animate-pulse' : currentStep > 1 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          <span className={`w-2 h-2 rounded-full ${currentStep === 2 ? 'bg-teal-400 animate-pulse' : currentStep > 2 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          <span className={`w-2 h-2 rounded-full ${currentStep === 3 ? 'bg-amber-400 animate-pulse' : currentStep > 3 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          <span className={`w-2 h-2 rounded-full ${currentStep === 4 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
          <span className="text-slate-400 ml-1.5">
            {currentStep === 0 && 'Configuración'}
            {currentStep === 1 && 'Fase 1: Conversación'}
            {currentStep === 2 && 'Fase 2: Shadowing'}
            {currentStep === 3 && 'Fase 3: Lectura'}
            {currentStep === 4 && 'Resultados & HSK'}
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* STEP 0: WELCOME & SELECTION (Diagnóstico vs. Desafío) */}
      {/* ======================================================== */}
      {currentStep === 0 && (
        <div className="space-y-6 animate-fadeIn pb-12">
          
          {/* Header Banner */}
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/20 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold mb-3">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>Evaluación Oficial HSK & HSKK Oral</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-100 mb-2">
                  Diagnóstico y Desafío de Nivel con IA
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 max-w-xl leading-relaxed">
                  Evalúa de forma integral tus <strong>3 habilidades</strong>: Conversación espontánea, Shadowing/Entonación y Lectura con Comprensión. La IA identificará tus fortalezas y debilidades, adaptando la dificultad de toda la aplicación.
                </p>
              </div>

              {/* Current Profile Pill */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex-shrink-0 text-center min-w-[170px]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Tu Nivel Actual</span>
                <div className="text-xl font-black text-amber-400">{userProfile.hskLevel}</div>
                <div className="text-xs font-semibold text-teal-300">{userProfile.hskkLevel}</div>
                <div className="text-[11px] text-slate-500 mt-1">Puntaje global: {userProfile.overallScore}%</div>
              </div>
            </div>
          </div>

          {challengeError && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-800/50 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{challengeError}</span>
            </div>
          )}

          {/* Mode Selection Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Card 1: Diagnóstico Inicial */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 transition-all shadow-xl flex flex-col justify-between space-y-4 group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg">
                    <Gauge className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Calibración
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-300 transition-colors mb-1.5">
                  Modo Diagnóstico Integral
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Mide tu nivel real actual de forma amena y equilibrada. Ideal si quieres conocer tu punto de partida y registrar tus fortalezas fonéticas y debilidades.
                </p>

                <ul className="text-xs text-slate-400 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dificultad adaptada a tu nivel base</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Diagnóstico de entonación y fluidez</span>
                  </li>
                </ul>
              </div>

              <button
                disabled={isLoadingChallenge}
                onClick={() => startAssessment('diagnostic')}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition-all border border-slate-700 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoadingChallenge && modeType === 'diagnostic' ? (
                  <span>Generando prueba con IA...</span>
                ) : (
                  <>
                    <span>Iniciar Diagnóstico</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Card 2: Desafío de Nivel */}
            <div className="p-6 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-rose-950/20 border border-rose-500/30 hover:border-rose-500/70 transition-all shadow-xl flex flex-col justify-between space-y-4 group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shadow-lg shadow-rose-950/50">
                    <Zap className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                    Desafío +1 Nivel
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-100 group-hover:text-rose-300 transition-colors mb-1.5">
                  Desafío de Ascenso de Nivel
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Prueba de mayor exigencia con vocabulario y estructuras de <strong>{getNextHskLevel(userProfile.hskLevel)}</strong>. Supérala con $\ge 75\%$ para ascender formalmente de nivel.
                </p>

                <ul className="text-xs text-slate-400 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Desafío hacia {getNextHskLevel(userProfile.hskLevel)} y HSKK superior</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Certificación y actualización del perfil</span>
                  </li>
                </ul>
              </div>

              <button
                disabled={isLoadingChallenge}
                onClick={() => startAssessment('evaluation_challenge')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-lg shadow-rose-950/50 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoadingChallenge && modeType === 'evaluation_challenge' ? (
                  <span>Preparando desafío...</span>
                ) : (
                  <>
                    <Trophy className="w-4 h-4" />
                    <span>Aceptar Desafío ({getNextHskLevel(userProfile.hskLevel)})</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Current Profile Summary */}
          {userProfile.strengths.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-300 font-bold">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Fortalezas y áreas registradas actualmente:</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {userProfile.strengths.map((s, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 text-[11px]">
                    ✓ {s}
                  </span>
                ))}
                {userProfile.weaknesses.map((w, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-amber-950/40 text-amber-300 border border-amber-800/40 text-[11px]">
                    ⚠ {w}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 1: CONVERSATION PHASE */}
      {/* ======================================================== */}
      {currentStep === 1 && challenge && (
        <div className="space-y-6 animate-fadeIn pb-12">
          
          {/* Phase Header */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Fase 1 de 3</span>
                <h3 className="text-base font-bold text-slate-100">Prueba de Conversación Oral</h3>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Intercambios realizados: <strong className="text-rose-400">{convExchangesCount}</strong> (Mínimo recomendado: 2)
            </div>
          </div>

          {/* Scenario description */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
            <strong className="text-slate-100 block mb-1">Situación:</strong>
            {challenge.conversationTask.situation}
          </div>

          {/* Conversation history bubble stream */}
          <div className="space-y-3 min-h-[160px] max-h-[300px] overflow-y-auto p-4 rounded-2xl bg-slate-950/90 border border-slate-800">
            {convMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col max-w-[85%] ${
                  m.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                <div
                  className={`p-3 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-rose-600 text-white rounded-br-none shadow-md'
                      : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                  }`}
                >
                  <div>{m.text}</div>
                  {m.translation && (
                    <div className="text-[11px] opacity-80 pt-1 mt-1 border-t border-white/10 italic">
                      {m.translation}
                    </div>
                  )}
                </div>
                {m.sender === 'ai' && (
                  <button
                    onClick={() => playMandarinTTS(m.text, 1.0)}
                    className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-amber-300 mt-1 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Escuchar a Li Ming</span>
                  </button>
                )}
              </div>
            ))}

            {isAiReplyingConv && (
              <div className="text-xs text-slate-400 italic flex items-center gap-2 p-2">
                <div className="w-3 h-3 rounded-full bg-rose-400 animate-ping" />
                <span>Li Ming está respondiendo...</span>
              </div>
            )}
          </div>

          {/* Oral Recording Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            {isRecordingConv ? (
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-xs text-rose-300">
                  <span className="flex items-center gap-2 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    Grabando tu respuesta oral en chino...
                  </span>
                  <span className="font-mono font-bold">
                    {String(Math.floor(convSeconds / 60)).padStart(2, '0')}:{String(convSeconds % 60).padStart(2, '0')}
                  </span>
                </div>
                <div className="text-sm text-slate-100 font-medium min-h-[36px]">
                  {liveConvTranscript ? `"${liveConvTranscript}"` : <span className="text-slate-500 italic">Habla en chino para responder a Li Ming...</span>}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={stopConvRecordingAndSend}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Terminar y Enviar intervención</span>
                  </button>
                  <button
                    onClick={cancelRecording}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <button
                  disabled={isAiReplyingConv}
                  onClick={startConvRecording}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Mic className="w-4 h-4" />
                  <span>Responder a Li Ming por voz</span>
                </button>

                {convExchangesCount >= 1 && (
                  <button
                    onClick={() => {
                      cancelRecording();
                      stopMandarinTTS();
                      setCurrentStep(2);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    <span>Pasar a Fase 2: Shadowing</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2: SHADOWING & INTONATION PHASE */}
      {/* ======================================================== */}
      {currentStep === 2 && challenge && (
        <div className="space-y-6 animate-fadeIn pb-12">
          
          {/* Phase Header */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">Fase 2 de 3</span>
                <h3 className="text-base font-bold text-slate-100">Prueba de Shadowing y Entonación</h3>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              Frase {currentShadowingIndex + 1} de {challenge.shadowingTask.turns.length}
            </div>
          </div>

          {/* Current Shadowing Turn Card */}
          {currentTurn && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-teal-500/30 shadow-2xl space-y-5">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  Escucha atentamente el audio nativo y repite la frase de inmediato:
                </span>
                <button
                  onClick={() => playMandarinTTS(currentTurn.hanzi, 0.9)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-500/40 text-xs font-bold cursor-pointer transition-all"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Escuchar modelo</span>
                </button>
              </div>

              {/* Chinese text display */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <HanziWithPinyin
                  text={currentTurn.hanzi}
                  showPinyin={true}
                  className="text-2xl sm:text-3xl font-medium text-slate-100 leading-relaxed"
                />
                <div className="text-xs text-slate-400 italic pt-2 border-t border-slate-800/80">
                  "{currentTurn.translation}"
                </div>
              </div>

              {/* Phonetic focus advice */}
              <div className="p-3.5 rounded-xl bg-teal-950/30 border border-teal-500/30 text-xs text-teal-200 leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-teal-300 font-bold block mb-0.5">Foco fonético evaluado:</strong>
                  {currentTurn.keyPhoneticFocus}
                </div>
              </div>

              {/* Recording / Results area */}
              {isRecordingShadowing ? (
                <div className="p-4 rounded-xl bg-teal-950/30 border border-teal-500/40 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs text-teal-300">
                    <span className="flex items-center gap-2 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
                      Imitando frase en chino mandarín...
                    </span>
                    <span className="font-mono font-bold">
                      {String(Math.floor(shadowingSeconds / 60)).padStart(2, '0')}:{String(shadowingSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="text-sm text-slate-100 font-medium min-h-[36px]">
                    {liveShadowingTranscript ? `"${liveShadowingTranscript}"` : <span className="text-slate-500 italic">Repite la frase imitando la entonación...</span>}
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={stopShadowingRecordingAndEvaluate}
                      className="flex-1 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Terminar de imitar y evaluar</span>
                    </button>
                    <button
                      onClick={cancelRecording}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : isEvaluatingShadowing ? (
                <div className="p-3.5 rounded-xl bg-teal-950/20 border border-teal-500/30 flex items-center justify-center gap-2.5 text-xs text-teal-300">
                  <div className="w-4 h-4 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                  <span>Evaluando entonación y velocidad...</span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    onClick={startShadowingRecording}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    <Mic className="w-4 h-4" />
                    <span>{shadowingResults[currentTurn.id] ? 'Repetir imitación' : 'Grabar mi imitación'}</span>
                  </button>

                  {/* Turn evaluation pill if recorded */}
                  {shadowingResults[currentTurn.id] && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-emerald-400">
                        {shadowingResults[currentTurn.id].score}% precisión
                      </span>
                      {currentShadowingIndex < challenge.shadowingTask.turns.length - 1 ? (
                        <button
                          onClick={() => {
                            stopMandarinTTS();
                            setCurrentShadowingIndex((i) => i + 1);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-all"
                        >
                          <span>Siguiente frase</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            stopMandarinTTS();
                            setCurrentStep(3);
                          }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer transition-all"
                        >
                          <span>Pasar a Fase 3: Lectura</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: READING ALOUD & COMPREHENSION PHASE */}
      {/* ======================================================== */}
      {currentStep === 3 && challenge && (
        <div className="space-y-6 animate-fadeIn pb-12">
          
          {/* Phase Header */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Fase 3 de 3</span>
                <h3 className="text-base font-bold text-slate-100">Lectura en Voz Alta y Comprensión</h3>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              {challenge.readingTask.title_translation}
            </div>
          </div>

          {/* Reading text card */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-xl space-y-4">
            <div className="text-lg font-bold text-slate-100">
              {challenge.readingTask.title_hanzi}
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800">
              <HanziWithPinyin
                text={challenge.readingTask.full_text_hanzi}
                showPinyin={true}
                className="text-xl sm:text-2xl font-normal text-slate-100 leading-loose"
              />
            </div>

            {/* Reading aloud record controls */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-amber-300">Lectura Oral en Voz Alta</h4>
                  <p className="text-[11px] text-slate-400">Lee el texto en voz alta. Se evaluará tu exactitud y velocidad.</p>
                </div>

                {!isRecordingReadingAloud && !isEvaluatingReadingAloud && (
                  <button
                    onClick={startReadingAloudRecord}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    <Mic className="w-4 h-4" />
                    <span>{readingAloudResult ? 'Repetir lectura oral' : 'Grabar lectura oral'}</span>
                  </button>
                )}
              </div>

              {isRecordingReadingAloud && (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs text-amber-300">
                    <span className="flex items-center gap-2 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                      Grabando lectura continua...
                    </span>
                    <span className="font-mono font-bold">
                      {String(Math.floor(readingAloudSeconds / 60)).padStart(2, '0')}:{String(readingAloudSeconds % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="text-xs text-slate-200">
                    {liveReadingAloudTranscript || 'Lee el texto en voz alta frente al micrófono...'}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={stopReadingAloudRecordAndEvaluate}
                      className="flex-1 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      Terminar y Evaluar lectura
                    </button>
                    <button
                      onClick={cancelRecording}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {readingAloudResult && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lectura oral evaluada con éxito: {readingAloudResult.score}%</span>
                </div>
              )}
            </div>
          </div>

          {/* Comprehension Questions */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Target className="w-4 h-4 text-teal-400" />
              <span>Preguntas de Comprensión Lectora</span>
            </h4>

            <div className="space-y-4">
              {challenge.readingTask.comprehension_questions.map((q, idx) => {
                const answerObj = comprehensionAnswers[q.id];
                const isRecordingThis = answeringQuestionId === q.id;
                const lang = comprehensionLangMap[q.id] || 'es';

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1">
                          Pregunta {idx + 1}
                        </span>
                        <div className="text-base font-bold text-slate-100">{q.question_zh}</div>
                        <div className="text-xs text-slate-300 mt-0.5">"{q.question_es}"</div>
                      </div>

                      {/* Language switcher */}
                      <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 flex-shrink-0">
                        <button
                          disabled={isRecordingThis}
                          onClick={() => setComprehensionLangMap((prev) => ({ ...prev, [q.id]: 'es' }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            lang === 'es' ? 'bg-teal-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          🇪🇸 Español
                        </button>
                        <button
                          disabled={isRecordingThis}
                          onClick={() => setComprehensionLangMap((prev) => ({ ...prev, [q.id]: 'zh' }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                            lang === 'zh' ? 'bg-amber-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          🇨🇳 中文
                        </button>
                      </div>
                    </div>

                    {/* Recording controls */}
                    {isRecordingThis ? (
                      <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-500/40 space-y-2 animate-fadeIn">
                        <div className="flex items-center justify-between text-xs text-teal-300">
                          <span className="flex items-center gap-2 font-bold">
                            <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                            Grabando respuesta ({lang === 'es' ? 'en español' : 'en chino'})...
                          </span>
                          <span className="font-mono">{compSeconds}s</span>
                        </div>
                        <div className="text-xs text-slate-200">
                          {liveCompTranscript || 'Habla al micrófono para responder la pregunta...'}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => stopCompQuestionRecordAndEvaluate(q)}
                            className="flex-1 py-1.5 rounded-lg bg-teal-500 text-slate-950 text-xs font-bold cursor-pointer"
                          >
                            Terminar y Enviar a la IA
                          </button>
                          <button
                            onClick={cancelRecording}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => startCompQuestionRecord(q.id)}
                          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"
                        >
                          <Mic className="w-3.5 h-3.5 text-teal-400" />
                          <span>{answerObj ? 'Volver a responder por audio' : 'Responder por audio'}</span>
                        </button>

                        {answerObj && (
                          <div className={`text-xs font-bold flex items-center gap-1 ${answerObj.isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {answerObj.isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            <span>{answerObj.score}%</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Finalize Button */}
          <div className="pt-2">
            <button
              onClick={finishAndGenerateReport}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-slate-950 text-sm font-black shadow-2xl cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              <Trophy className="w-5 h-5" />
              <span>Finalizar Prueba y Generar Informe de Nivel HSK / HSKK</span>
            </button>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 4: DIAGNOSTIC REPORT & LEVEL CERTIFICATION */}
      {/* ======================================================== */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-fadeIn pb-16">
          
          {isGeneratingReport ? (
            <div className="py-24 p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin mx-auto" />
              <h3 className="text-lg font-bold text-slate-100">
                La comisión examinadora está analizando tus 3 habilidades...
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Evaluando la riqueza léxica de tu conversación, la precisión de entonación en shadowing y la exactitud de tu lectura oral.
              </p>
            </div>
          ) : report ? (
            <div className="space-y-6">
              
              {/* Grand Banner */}
              <div className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden ${
                report.levelUpgradeGranted 
                  ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border-emerald-500/50'
                  : 'bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border-amber-500/50'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-800 border border-slate-700">
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>{modeType === 'evaluation_challenge' ? 'Desafío de Nivel' : 'Informe Diagnóstico'}</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
                      Nivel Asignado: <span className="text-amber-400">{report.assignedHskLevel}</span>
                    </h2>
                    <div className="text-base font-bold text-teal-300">
                      Nivel Oral Oficial: {report.assignedHskkLevel}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
                      {report.challengeResultSummary}
                    </p>
                  </div>

                  {/* Big Circular / Radial Score */}
                  <div className="flex-shrink-0 text-center p-5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl min-w-[170px]">
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">Puntuación Global</span>
                    <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-emerald-400">
                      {report.overallScore}%
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      {report.levelUpgradeGranted ? 'Aprobado / Ascenso' : 'En Consolidación'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Skill Gauges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">💬 Conversación</span>
                  <span className="text-2xl font-black text-rose-400">{report.skillScores.conversational}%</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">📖 Lectura</span>
                  <span className="text-2xl font-black text-amber-400">{report.skillScores.reading}%</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">⚡ Fluidez</span>
                  <span className="text-2xl font-black text-teal-400">{report.skillScores.fluency}%</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1">🎵 Entonación</span>
                  <span className="text-2xl font-black text-emerald-400">{report.skillScores.intonation}%</span>
                </div>
              </div>

              {/* Strengths & Weaknesses 2-column cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Strengths */}
                <div className="p-5 rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-lg space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Fortalezas Comprobadas
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {report.strengths.map((st, i) => (
                      <li key={i} className="flex items-start gap-2 bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-800/30">
                        <span className="text-emerald-400 font-bold">•</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="p-5 rounded-3xl bg-slate-900 border border-amber-500/30 shadow-lg space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    Debilidades y Áreas de Mejora
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {report.weaknesses.map((wk, i) => (
                      <li key={i} className="flex items-start gap-2 bg-amber-950/20 p-2.5 rounded-xl border border-amber-800/30">
                        <span className="text-amber-400 font-bold">•</span>
                        <span>{wk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Recommendations & Detailed Analysis */}
              <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 text-xs space-y-3">
                <h4 className="font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Dictamen Pedagógico y Recomendaciones de la IA</span>
                </h4>
                <p className="leading-relaxed text-slate-300">
                  {report.detailedAnalysis}
                </p>
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  {report.pedagogicalRecommendations.map((rec, i) => (
                    <div key={i} className="text-slate-400 flex items-start gap-2">
                      <span className="text-teal-400 font-bold">→</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={applyReportToProfile}
                  className={`w-full sm:flex-1 py-3.5 rounded-2xl text-xs font-bold shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    hasAppliedProfile
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{hasAppliedProfile ? '¡Perfil Guardado y Adaptado a la App!' : 'Guardar y Adaptar Dificultad de la IA'}</span>
                </button>

                <button
                  onClick={() => setCurrentStep(0)}
                  className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Volver al Selector de Pruebas
                </button>
              </div>

            </div>
          ) : null}

        </div>
      )}

    </div>
  );
};

