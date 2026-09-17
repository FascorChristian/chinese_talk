import React, { useState, useEffect, useRef } from 'react';
import { 
  Headphones, 
  Volume2, 
  RefreshCw, 
  ArrowLeft, 
  ArrowRight, 
  Sparkles, 
  Mic, 
  CheckCircle2, 
  Users, 
  Play, 
  Square,
  Lightbulb,
  Gauge,
  Timer,
  AlertCircle,
  XCircle,
  Trophy,
  Activity,
  Layers,
  Target,
  RotateCcw,
  Check,
  ChevronRight
} from 'lucide-react';
import { 
  ShadowingDialogue, 
  ShadowingTurn, 
  ShadowingTurnEvaluation, 
  DialogueObjective 
} from '../../types/index.js';
import { HanziWithPinyin } from '../common/HanziWithPinyin.js';
import { playMandarinTTS, stopMandarinTTS } from '../../utils/speechUtils.js';
import { generateShadowingContent, evaluateShadowingTurn } from '../../services/api.js';
import { ShadowingScenarioModal } from '../modals/ShadowingScenarioModal.js';

interface ShadowingViewProps {
  onBackToMenu: () => void;
  initialTopic?: string;
}

export const ShadowingView: React.FC<ShadowingViewProps> = ({
  onBackToMenu,
  initialTopic = 'Planes espontáneos de fin de semana y comida en Pekín',
}) => {
  const [dialogue, setDialogue] = useState<ShadowingDialogue | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Scenario modal
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState<boolean>(false);

  // Turn tracking
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [isPlayingModel, setIsPlayingModel] = useState<boolean>(false);
  const [isPlayingFullDialogue, setIsPlayingFullDialogue] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(0.85);

  // Recording & Evaluation
  const [clickMode, setClickMode] = useState<boolean>(true);
  const [isRecordingUser, setIsRecordingUser] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [isEvaluatingTurn, setIsEvaluatingTurn] = useState<boolean>(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [userRecordings, setUserRecordings] = useState<Record<string, string>>({});
  const [turnEvaluations, setTurnEvaluations] = useState<Record<string, ShadowingTurnEvaluation>>({});
  const [completedTurns, setCompletedTurns] = useState<Record<string, boolean>>({});
  const [completedObjectiveIds, setCompletedObjectiveIds] = useState<string[]>([]);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);

  // Display toggles
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);

  const cancelTtsRef = useRef<(() => void) | null>(null);
  const recognitionRef = useRef<any>(null);
  const recordStartTimeRef = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false);
  const isFinalizedRef = useRef<boolean>(false);
  const transcriptRef = useRef<string>('');
  const prevSessionTranscriptRef = useRef<string>('');
  const timerRef = useRef<any>(null);
  const currentTurnRef = useRef<ShadowingTurn | null>(null);

  const clearRecordingTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopPlayback = () => {
    if (cancelTtsRef.current) {
      cancelTtsRef.current();
      cancelTtsRef.current = null;
    }
    stopMandarinTTS();
    setIsPlayingModel(false);
    setIsPlayingFullDialogue(false);
  };

  const cancelShadowingRecord = () => {
    isRecordingRef.current = false;
    isFinalizedRef.current = true;
    clearRecordingTimer();
    setIsRecordingUser(false);
    setLiveTranscript('');
    setRecordingSeconds(0);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
  };

  const stopShadowingRecord = cancelShadowingRecord;

  const changeTurn = (newIndex: number) => {
    stopPlayback();
    cancelShadowingRecord();
    setEvaluationError(null);
    setCurrentTurnIndex(newIndex);
  };

  const loadDialogue = async (param: string | { prompt?: string; topic?: string; category?: string }) => {
    setIsLoading(true);
    setError(null);
    stopPlayback();
    cancelShadowingRecord();
    setCurrentTurnIndex(0);
    setUserRecordings({});
    setTurnEvaluations({});
    setCompletedTurns({});
    setCompletedObjectiveIds([]);
    setShowCompletionModal(false);

    try {
      const data = await generateShadowingContent(param);
      setDialogue(data);
    } catch (err) {
      console.error('Fetch shadowing error:', err);
      setError('No se pudo conectar con la IA. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDialogue(initialTopic);
    return () => {
      stopPlayback();
      cancelShadowingRecord();
    };
  }, []);

  // Check if dialogue is fully completed
  useEffect(() => {
    if (!dialogue || !dialogue.turns.length) return;
    const allDone = dialogue.turns.every((t) => completedTurns[t.id]);
    if (allDone && dialogue.turns.length > 0) {
      setShowCompletionModal(true);
    }
  }, [completedTurns, dialogue]);

  // Play model turn audio
  const playTurnModelAudio = (turn: ShadowingTurn) => {
    stopPlayback();
    cancelShadowingRecord();
    setIsPlayingModel(true);

    cancelTtsRef.current = playMandarinTTS(
      turn.hanzi,
      speechRate,
      () => setIsPlayingModel(true),
      () => setIsPlayingModel(false),
      () => setIsPlayingModel(false)
    );
  };

  // Play entire conversation continuously
  const playFullDialogue = () => {
    if (!dialogue || !dialogue.turns.length) return;

    if (isPlayingFullDialogue) {
      stopPlayback();
      return;
    }

    cancelShadowingRecord();
    setIsPlayingFullDialogue(true);
    let idx = 0;

    const playNext = () => {
      if (idx >= dialogue.turns.length) {
        setIsPlayingFullDialogue(false);
        return;
      }

      setCurrentTurnIndex(idx);
      const current = dialogue.turns[idx];

      cancelTtsRef.current = playMandarinTTS(
        current.hanzi,
        speechRate,
        undefined,
        () => {
          idx++;
          setTimeout(() => {
            playNext();
          }, 600);
        },
        () => {
          setIsPlayingFullDialogue(false);
        }
      );
    };

    playNext();
  };

  // Continuous Shadowing Microphone Recording & Evaluation
  const startShadowingRecord = (turn: ShadowingTurn) => {
    stopPlayback();
    setEvaluationError(null);
    currentTurnRef.current = turn;
    isRecordingRef.current = true;
    isFinalizedRef.current = false;
    transcriptRef.current = '';
    prevSessionTranscriptRef.current = '';
    setLiveTranscript('');
    setRecordingSeconds(0);
    recordStartTimeRef.current = Date.now();
    setIsRecordingUser(true);

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz en chino mandarín (zh-CN). Recomendamos Google Chrome o Microsoft Edge.');
      cancelShadowingRecord();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'zh-CN';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      // CRITICAL: continuous = true ensures the audio engine does NOT close when user pauses or takes a breath
      recognition.continuous = true;

      recognition.onstart = () => {
        isRecordingRef.current = true;
        setIsRecordingUser(true);
      };

      recognition.onresult = (event: any) => {
        let currentSessionTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentSessionTranscript += event.results[i][0].transcript;
        }

        const prefix = prevSessionTranscriptRef.current;
        const full = prefix 
          ? `${prefix} ${currentSessionTranscript}`.trim() 
          : currentSessionTranscript.trim();

        transcriptRef.current = full;
        setLiveTranscript(full);
        // NOTE: We do NOT stop recording here! User speaks until they decide to stop!
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error in shadowing:', event.error);
        if (event.error === 'no-speech') {
          // Normal during brief thinking or breath pause; keep recording!
          return;
        }
        if (event.error === 'not-allowed') {
          cancelShadowingRecord();
          setEvaluationError('Permiso de micrófono denegado. Habilita el acceso en tu navegador.');
        }
      };

      recognition.onend = () => {
        // If the browser fires onend prematurely while user is still recording, auto-restart seamlessly
        if (isRecordingRef.current && !isFinalizedRef.current) {
          prevSessionTranscriptRef.current = transcriptRef.current;
          try {
            recognition.start();
            return;
          } catch (restartErr) {
            console.warn('Could not auto-restart recognition session:', restartErr);
          }
        }

        if (!isRecordingRef.current) {
          setIsRecordingUser(false);
          clearRecordingTimer();
        }
      };

      recognition.start();

      // Start elapsed seconds timer
      clearRecordingTimer();
      timerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);

    } catch (e) {
      console.error('Recognition start exception:', e);
      cancelShadowingRecord();
      setEvaluationError('No se pudo inicializar el micrófono.');
    }
  };

  const stopShadowingRecordAndEvaluate = async () => {
    if (!isRecordingRef.current || isFinalizedRef.current) return;

    isFinalizedRef.current = true;
    isRecordingRef.current = false;
    clearRecordingTimer();
    setIsRecordingUser(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    const durationSeconds = Math.max(0.6, (Date.now() - recordStartTimeRef.current) / 1000);
    const finalTranscript = transcriptRef.current.trim();
    const turn = currentTurnRef.current || dialogue?.turns[currentTurnIndex];

    if (!turn) return;

    if (!finalTranscript) {
      setEvaluationError('No se detectó audio en chino mandarín. Intenta hablar más cerca del micrófono.');
      return;
    }

    setUserRecordings((prev) => ({ ...prev, [turn.id]: finalTranscript }));
    await evaluateUserTurn(turn, finalTranscript, durationSeconds);
  };

  const handleRecordButtonClick = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isEvaluatingTurn) return;

    if (clickMode) {
      if (isRecordingUser) {
        stopShadowingRecordAndEvaluate();
      } else if (currentTurn) {
        startShadowingRecord(currentTurn);
      }
    }
  };

  const handleRecordMouseDown = (e: React.SyntheticEvent) => {
    if (clickMode || isEvaluatingTurn) return;
    e.preventDefault();
    if (!isRecordingUser && currentTurn) {
      startShadowingRecord(currentTurn);
    }
  };

  const handleRecordMouseUp = (e: React.SyntheticEvent) => {
    if (clickMode) return;
    e.preventDefault();
    if (isRecordingUser) {
      stopShadowingRecordAndEvaluate();
    }
  };

  const handleRecordPointerCancel = () => {
    if (!clickMode && isRecordingUser) {
      stopShadowingRecordAndEvaluate();
    }
  };

  const evaluateUserTurn = async (turn: ShadowingTurn, transcript: string, durationSeconds: number) => {
    setIsEvaluatingTurn(true);
    setEvaluationError(null);

    try {
      const evaluation = await evaluateShadowingTurn({
        transcribedText: transcript,
        expectedText: turn.hanzi,
        expectedPinyin: turn.pinyin,
        durationSeconds,
        keyPhoneticFocus: turn.key_phonetic_focus,
        objectives: dialogue?.objectives
      });

      setTurnEvaluations((prev) => ({ ...prev, [turn.id]: evaluation }));

      if (evaluation.passed) {
        setCompletedTurns((prev) => ({ ...prev, [turn.id]: true }));
      }

      if (evaluation.completedObjectives && evaluation.completedObjectives.length > 0) {
        setCompletedObjectiveIds((prev) => {
          const next = new Set([...prev, ...(evaluation.completedObjectives || [])]);
          return Array.from(next);
        });
      }
    } catch (err: any) {
      console.error('Error evaluating turn:', err);
      setEvaluationError('La evaluación de la IA no pudo completarse en este momento.');
    } finally {
      setIsEvaluatingTurn(false);
    }
  };

  const currentTurn = dialogue?.turns[currentTurnIndex];
  const currentEvaluation = currentTurn ? turnEvaluations[currentTurn.id] : undefined;

  // Calculate overall stats
  const totalTurnsCount = dialogue?.turns.length || 0;
  const completedTurnsCount = Object.values(completedTurns).filter(Boolean).length;
  const evaluationValues = Object.values(turnEvaluations);
  const averageScore = evaluationValues.length > 0
    ? Math.round(evaluationValues.reduce((acc, ev) => acc + ev.score, 0) / evaluationValues.length)
    : 0;

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 py-4 animate-fadeIn">
      
      {/* Navigation & Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
        <button
          onClick={() => {
            stopPlayback();
            cancelShadowingRecord();
            onBackToMenu();
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Menú Principal</span>
        </button>

        {/* Global Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Button: Change Scenario Modal */}
          <button
            onClick={() => {
              stopPlayback();
              cancelShadowingRecord();
              setIsScenarioModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cambiar Escenario / IA</span>
          </button>

          <button
            onClick={() => setShowPinyin(!showPinyin)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showPinyin
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            拼 Pinyin {showPinyin ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showTranslation
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            Traducción {showTranslation ? 'ON' : 'OFF'}
          </button>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            {[0.75, 0.85, 1.0].map((speed) => (
              <button
                key={speed}
                onClick={() => setSpeechRate(speed)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  speechRate === speed
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Velocidad de reproducción ${speed}x`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center animate-fadeIn">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <Headphones className="w-7 h-7 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h4 className="text-lg font-bold text-slate-100 mb-1">
            La IA está estructurando la conversación de Shadowing...
          </h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Creando dos personajes nativos, las etapas del diálogo y los objetivos fonéticos para imitar.
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-950/20 border border-rose-800/40 rounded-2xl">
          <p className="text-sm text-rose-300 mb-4">{error}</p>
          <button
            onClick={() => loadDialogue(initialTopic)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      ) : dialogue && currentTurn ? (
        <div className="space-y-5 pb-12">
          
          {/* Situation & Dialogue Header Card */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/20 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                    {dialogue.badge || 'HSK • Diálogo Shadowing'}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{dialogue.characters.join(' & ')}</span>
                  </div>
                  {dialogue.chineseTitle && (
                    <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                      ({dialogue.chineseTitle})
                    </span>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-100">
                  {dialogue.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                  {dialogue.situation}
                </p>
              </div>

              {/* Action Buttons: Full Dialogue Run-through */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={playFullDialogue}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                    isPlayingFullDialogue
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title="Escuchar toda la conversación completa con pausas naturales"
                >
                  {isPlayingFullDialogue ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Detener</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Escuchar diálogo completo</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsScenarioModalOpen(true)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Cambiar escenario o escribir prompt"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* STRUCTURE & OBJECTIVES HUD */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              
              {/* Dialogue Stages */}
              {dialogue.dialogueStructure && dialogue.dialogueStructure.length > 0 && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-teal-400" />
                    <span>Estructura del Diálogo</span>
                  </div>
                  <div className="space-y-1">
                    {dialogue.dialogueStructure.map((step, sIdx) => {
                      const isCurrentStep = Math.floor((currentTurnIndex / dialogue.turns.length) * dialogue.dialogueStructure!.length) === sIdx;
                      return (
                        <div 
                          key={sIdx}
                          className={`flex items-center gap-1.5 text-[11px] ${
                            isCurrentStep ? 'text-emerald-300 font-semibold' : 'text-slate-400'
                          }`}
                        >
                          <ChevronRight className={`w-3 h-3 ${isCurrentStep ? 'text-emerald-400' : 'text-slate-600'}`} />
                          <span>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Learning Objectives */}
              {dialogue.objectives && dialogue.objectives.length > 0 && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Objetivos por Cumplir</span>
                    </span>
                    <span className="text-[10px] text-emerald-400">
                      {completedObjectiveIds.length} / {dialogue.objectives.length} logrados
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {dialogue.objectives.map((obj) => {
                      const isObjDone = completedObjectiveIds.includes(obj.id);
                      return (
                        <div 
                          key={obj.id} 
                          className="flex items-start gap-1.5 text-[11px]"
                        >
                          {isObjDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-3 h-3 rounded-full border border-slate-600 flex-shrink-0 mt-0.5" />
                          )}
                          <span className={isObjDone ? 'text-emerald-300 line-through opacity-80' : 'text-slate-300'}>
                            {obj.description}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Turn Progress Stepper */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-400">
                  Línea {currentTurnIndex + 1} de {dialogue.turns.length}
                </span>
                <span className="text-[11px] text-slate-500">
                  • {completedTurnsCount} imitadas con éxito
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {dialogue.turns.map((turn, i) => {
                  const isDone = completedTurns[turn.id];
                  const isCurrent = i === currentTurnIndex;
                  return (
                    <button
                      key={turn.id || i}
                      onClick={() => changeTurn(i)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? 'bg-emerald-500 text-slate-950 scale-110 shadow-md shadow-emerald-950'
                          : isDone
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                      title={`Línea ${i + 1} - ${turn.speaker}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ACTIVE SHADOWING WORKSPACE */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

            {/* Speaker info */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-md ${
                  currentTurn.speaker === dialogue.characters[0]
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                    : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                }`}>
                  {currentTurn.speaker.slice(0, 1)}
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-200">
                    {currentTurn.speaker}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    Frase nativa a imitar
                  </span>
                </div>
              </div>

              {completedTurns[currentTurn.id] && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Turno superado</span>
                </div>
              )}
            </div>

            {/* Target Hanzi + Pinyin */}
            <div className="my-6">
              <HanziWithPinyin
                text={currentTurn.hanzi}
                showPinyin={showPinyin}
                className="text-2xl sm:text-3xl font-bold leading-relaxed text-slate-100"
              />
            </div>

            {/* Translation */}
            {showTranslation && (
              <p className="text-sm sm:text-base text-slate-400 italic mb-4">
                "{currentTurn.translation}"
              </p>
            )}

            {/* Key Phonetic Focus */}
            {currentTurn.key_phonetic_focus && (
              <div className="mb-6 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-2.5 text-xs text-emerald-300">
                <Lightbulb className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Foco de entonación y ritmo:</strong> {currentTurn.key_phonetic_focus}
                </span>
              </div>
            )}

            {/* Mode Switcher (1-Clic vs Mantener presionado) */}
            <div className="flex items-center justify-center gap-2 mb-3 pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium">Modo de grabación:</span>
              <button
                type="button"
                onClick={() => setClickMode(!clickMode)}
                disabled={isRecordingUser || isEvaluatingTurn}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-50 ${
                  clickMode
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title={clickMode ? 'Modo 1-Clic activado: Clic para hablar, clic para terminar' : 'Modo Mantener activado: Mantén pulsado para hablar'}
              >
                {clickMode ? '1-Clic (Recomendado)' : 'Mantener pulsado'}
              </button>
            </div>

            {/* Action Buttons: Listen Model vs Shadow Record */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              
              {/* Button 1: Escuchar modelo nativo */}
              <button
                onClick={() => playTurnModelAudio(currentTurn)}
                disabled={isRecordingUser}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer disabled:opacity-40 ${
                  isPlayingModel
                    ? 'bg-emerald-500 text-slate-950 scale-105 shadow-xl shadow-emerald-950 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 shadow-md'
                }`}
              >
                <Volume2 className="w-5 h-5" />
                <span>{isPlayingModel ? 'Reproduciendo modelo...' : '1. Escuchar frase nativa'}</span>
              </button>

              {/* Button 2: Hacer Shadowing (Grabar voz continuo) */}
              <button
                type="button"
                onClick={handleRecordButtonClick}
                onMouseDown={handleRecordMouseDown}
                onMouseUp={handleRecordMouseUp}
                onMouseLeave={handleRecordPointerCancel}
                onTouchStart={handleRecordMouseDown}
                onTouchEnd={handleRecordMouseUp}
                onTouchCancel={handleRecordPointerCancel}
                onContextMenu={(e) => e.preventDefault()}
                disabled={isEvaluatingTurn}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer shadow-lg select-none disabled:opacity-50 ${
                  isRecordingUser
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white ring-4 ring-rose-500/40 scale-105 animate-pulse'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-950/50'
                }`}
              >
                {isRecordingUser ? (
                  <>
                    <Square className="w-5 h-5 fill-white" />
                    <span>
                      {clickMode
                        ? `Terminar de hablar y evaluar (${recordingSeconds}s)`
                        : `Grabando (${recordingSeconds}s)... Suelta para evaluar`}
                    </span>
                  </>
                ) : isEvaluatingTurn ? (
                  <>
                    <Activity className="w-5 h-5 animate-spin" />
                    <span>Evaluando tu habla con IA...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    <span>2. Hacer Shadowing (Imitar)</span>
                  </>
                )}
              </button>

            </div>

            {/* LIVE CONTINUOUS RECORDING FEEDBACK */}
            {isRecordingUser && (
              <div className="w-full mt-4 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/60 shadow-xl animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mb-2">
                  <span className="text-rose-300 font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    Micrófono activo sin cortes ({recordingSeconds}s)
                  </span>
                  <span className="text-slate-300 text-[11px] bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
                    {clickMode
                      ? '💡 Habla a tu ritmo. Haz clic en "Terminar de hablar" cuando concluyas toda la frase.'
                      : '💡 Mantén presionado hasta terminar toda la frase.'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-sm">
                  <span className="text-[11px] text-slate-500 block mb-1">Detectando en tiempo real:</span>
                  {liveTranscript ? (
                    <span className="text-emerald-300 font-medium">"{liveTranscript}"</span>
                  ) : (
                    <span className="text-slate-500 italic">Comienza a hablar en chino mandarín...</span>
                  )}
                </div>
              </div>
            )}

            {/* Evaluation Loading Spinner */}
            {isEvaluatingTurn && (
              <div className="mt-5 p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 flex items-center justify-center gap-3 animate-fadeIn">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-emerald-300">
                  La IA está evaluando tu precisión léxica, velocidad y naturalidad de pausas...
                </span>
              </div>
            )}

            {/* Evaluation Error */}
            {evaluationError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{evaluationError}</span>
              </div>
            )}

            {/* DETAILED AI EVALUATION CARD */}
            {currentEvaluation && !isEvaluatingTurn && (
              <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-xl space-y-4 animate-fadeIn">
                
                {/* Score & Passed Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-md ${
                      currentEvaluation.score >= 85
                        ? 'bg-emerald-500 text-slate-950 shadow-emerald-950/50'
                        : currentEvaluation.score >= 70
                        ? 'bg-amber-500 text-slate-950 shadow-amber-950/50'
                        : 'bg-rose-600 text-white shadow-rose-950/50'
                    }`}>
                      {currentEvaluation.score}%
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{currentEvaluation.score >= 85 ? '¡Excelente Imitación!' : currentEvaluation.score >= 70 ? '¡Buen Intento!' : 'Requiere más práctica'}</span>
                        {currentEvaluation.passed && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {currentEvaluation.passed ? 'Línea aprobada para tu entrenamiento' : 'Intenta repetir para superar el 75%'}
                      </p>
                    </div>
                  </div>

                  {userRecordings[currentTurn.id] && (
                    <div className="text-xs text-right max-w-xs">
                      <span className="text-[11px] text-slate-500 block">Texto captado de tu voz:</span>
                      <strong className="text-slate-300 font-medium">"{userRecordings[currentTurn.id]}"</strong>
                    </div>
                  )}
                </div>

                {/* Speed & Pauses Gauges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Gauge 1: Velocidad (Speed) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Gauge className="w-4 h-4 text-teal-400" />
                        <span>Velocidad de Habla</span>
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        currentEvaluation.speed.rating === 'natural'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {currentEvaluation.speed.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {currentEvaluation.speed.comment}
                    </p>
                  </div>

                  {/* Gauge 2: Naturalidad de las pausas (Pauses) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Timer className="w-4 h-4 text-emerald-400" />
                        <span>Naturalidad de Pausas</span>
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        currentEvaluation.pauses.rating === 'natural'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {currentEvaluation.pauses.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {currentEvaluation.pauses.comment}
                    </p>
                  </div>

                </div>

                {/* Mistake Chips (Palabras omitidas o sustituidas) */}
                {currentEvaluation.mistakes && currentEvaluation.mistakes.length > 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                    <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Detalle de diferencias o errores detectados:</span>
                    </div>
                    <div className="space-y-2">
                      {currentEvaluation.mistakes.map((mistake, mIdx) => (
                        <div 
                          key={mIdx}
                          className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-rose-300 font-mono text-sm px-2 py-0.5 bg-rose-950/50 rounded border border-rose-800/50">
                              {mistake.word}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                              {mistake.type === 'omission' ? 'Omitido' : mistake.type === 'substitution' ? 'Sustituido' : mistake.type}
                            </span>
                            {mistake.pinyin && (
                              <span className="text-slate-400 font-mono">({mistake.pinyin})</span>
                            )}
                          </div>
                          <span className="text-slate-400 text-[11px] sm:text-right">
                            {mistake.explanation}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>¡Excelente! Calibraste cada carácter sin omisiones ni sustituciones.</span>
                  </div>
                )}

                {/* Pronunciation & General Advice */}
                {currentEvaluation.pronunciationFeedback && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border border-emerald-500/30 text-xs">
                    <div className="font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-emerald-400" />
                      <span>Recomendaciones fonéticas de la IA:</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {currentEvaluation.pronunciationFeedback}
                    </p>
                    {currentEvaluation.generalAdvice && (
                      <p className="text-slate-400 text-[11px] mt-1.5 italic">
                        💡 {currentEvaluation.generalAdvice}
                      </p>
                    )}
                  </div>
                )}

                {/* Bottom Card Actions: Retry or Next Turn */}
                <div className="pt-2 flex items-center justify-between gap-3 text-xs">
                  <button
                    onClick={() => startShadowingRecord(currentTurn)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Volver a imitar (mejorar puntaje)</span>
                  </button>

                  {currentTurnIndex < dialogue.turns.length - 1 && (
                    <button
                      onClick={() => changeTurn(currentTurnIndex + 1)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all shadow-md cursor-pointer"
                    >
                      <span>Siguiente turno</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

              </div>
            )}

            {/* Turn Navigation buttons */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-800 text-xs">
              <button
                disabled={currentTurnIndex === 0}
                onClick={() => changeTurn(Math.max(0, currentTurnIndex - 1))}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Turno anterior</span>
              </button>

              <button
                disabled={currentTurnIndex === dialogue.turns.length - 1}
                onClick={() => changeTurn(Math.min(dialogue.turns.length - 1, currentTurnIndex + 1))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold disabled:opacity-30 cursor-pointer"
              >
                <span>Siguiente turno</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Full Dialogue Transcript Accordion */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Transcripción completa del diálogo</span>
              </h4>
              <span className="text-[11px] text-slate-500">
                Haz clic en cualquier turno para practicarlo
              </span>
            </div>

            <div className="space-y-2.5">
              {dialogue.turns.map((turn, idx) => {
                const isPassed = completedTurns[turn.id];
                const turnEval = turnEvaluations[turn.id];
                return (
                  <div
                    key={turn.id || idx}
                    onClick={() => changeTurn(idx)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      idx === currentTurnIndex
                        ? 'bg-emerald-950/30 border-emerald-500/50 shadow-md'
                        : isPassed
                        ? 'bg-slate-950/60 border-emerald-500/20 hover:bg-slate-900'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {turn.speaker}
                      </span>
                      <span className="text-sm font-medium text-slate-200">
                        {turn.hanzi}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {turnEval && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          turnEval.score >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {turnEval.score}%
                        </span>
                      )}
                      {isPassed && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      )}
                      <Volume2 className="w-4 h-4 text-slate-500 hover:text-emerald-400 flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : null}

      {/* DIALOGUE COMPLETION MODAL */}
      {showCompletionModal && dialogue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-emerald-500/60 rounded-3xl p-6 sm:p-7 shadow-2xl text-center animate-scaleUp text-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-xl shadow-emerald-950/50 mx-auto mb-4">
              <Trophy className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-black text-slate-100 mb-1">
              ¡Diálogo Completado con Éxito!
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Has imitado con éxito todas las frases de la conversación "{dialogue.title}".
            </p>

            {/* Score & Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Puntaje Promedio</span>
                <span className="text-2xl font-black text-emerald-400">{averageScore}%</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">Objetivos Cumplidos</span>
                <span className="text-2xl font-black text-teal-400">
                  {completedObjectiveIds.length} / {dialogue.objectives?.length || totalTurnsCount}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  playFullDialogue();
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Escuchar todo el diálogo corrido</span>
              </button>

              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  setIsScenarioModalOpen(true);
                }}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Elegir o crear nuevo escenario</span>
              </button>

              <button
                onClick={() => setShowCompletionModal(false)}
                className="w-full py-2.5 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Repasar diálogo actual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCENARIO GENERATOR MODAL */}
      <ShadowingScenarioModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        currentDialogue={dialogue}
        onDialogueGenerated={(newDialogue) => {
          setDialogue(newDialogue);
          setCurrentTurnIndex(0);
          setUserRecordings({});
          setTurnEvaluations({});
          setCompletedTurns({});
          setCompletedObjectiveIds([]);
          setShowCompletionModal(false);
        }}
      />

    </div>
  );
};
