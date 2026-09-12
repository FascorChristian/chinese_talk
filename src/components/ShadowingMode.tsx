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
  Flame, 
  Play, 
  Square,
  Repeat,
  Lightbulb
} from 'lucide-react';
import { ShadowingDialogue, ShadowingTurn } from '../types';
import { HanziWithPinyin } from './HanziWithPinyin';
import { playMandarinTTS, stopMandarinTTS } from '../utils/speechUtils';

interface ShadowingModeProps {
  onBackToMenu: () => void;
  initialTopic?: string;
}

export const ShadowingMode: React.FC<ShadowingModeProps> = ({
  onBackToMenu,
  initialTopic = 'Planes espontáneos de fin de semana y comida',
}) => {
  const [dialogue, setDialogue] = useState<ShadowingDialogue | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Turn tracking
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [isPlayingModel, setIsPlayingModel] = useState<boolean>(false);
  const [isPlayingFullDialogue, setIsPlayingFullDialogue] = useState<boolean>(false);
  const [speechRate, setSpeechRate] = useState<number>(0.85); // Default slightly slower for comfortable shadowing!

  // Microphone shadowing record
  const [isRecordingUser, setIsRecordingUser] = useState<boolean>(false);
  const [userRecordings, setUserRecordings] = useState<Record<string, string>>({});
  const [completedTurns, setCompletedTurns] = useState<Record<string, boolean>>({});

  // Display toggles
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);

  const cancelTtsRef = useRef<(() => void) | null>(null);
  const recognitionRef = useRef<any>(null);

  const fetchShadowingDialogue = async (topic: string) => {
    setIsLoading(true);
    setError(null);
    stopPlayback();
    setCurrentTurnIndex(0);
    setUserRecordings({});
    setCompletedTurns({});

    try {
      const res = await fetch('/api/generate-shadowing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      if (!res.ok) throw new Error('Error al generar conversación de shadowing');
      const data: ShadowingDialogue = await res.json();
      setDialogue(data);
    } catch (err) {
      console.error('Fetch shadowing error:', err);
      setError('No se pudo conectar con la IA. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShadowingDialogue(initialTopic);
    return () => {
      stopPlayback();
    };
  }, []);

  const stopPlayback = () => {
    if (cancelTtsRef.current) {
      cancelTtsRef.current();
      cancelTtsRef.current = null;
    }
    stopMandarinTTS();
    setIsPlayingModel(false);
    setIsPlayingFullDialogue(false);
  };

  // Play model turn audio
  const playTurnModelAudio = (turn: ShadowingTurn) => {
    stopPlayback();
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

  // Shadowing Microphone Recording
  const startShadowingRecord = (turn: ShadowingTurn) => {
    stopPlayback();
    setIsRecordingUser(true);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz en zh-CN nativo.');
      setIsRecordingUser(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'zh-CN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        setUserRecordings((prev) => ({ ...prev, [turn.id]: transcript }));
        setCompletedTurns((prev) => ({ ...prev, [turn.id]: true }));
        setIsRecordingUser(false);
      };

      recognition.onerror = () => {
        setIsRecordingUser(false);
      };

      recognition.onend = () => {
        setIsRecordingUser(false);
      };

      recognition.start();
    } catch {
      setIsRecordingUser(false);
    }
  };

  const stopShadowingRecord = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsRecordingUser(false);
  };

  const SHADOWING_TOPICS = [
    'Planes espontáneos de fin de semana y comida',
    'Encontrarse en el aeropuerto y pedir un taxi',
    'Comprar ropa y regatear amistosamente',
    'Pedir recomendaciones de platos típicos de Pekín',
  ];

  const currentTurn = dialogue?.turns[currentTurnIndex];

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 py-4 animate-fadeIn">
      
      {/* Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
        <button
          onClick={() => {
            stopPlayback();
            onBackToMenu();
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Menú Principal</span>
        </button>

        {/* Global Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Pinyin */}
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

          {/* Toggle Translation */}
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

          {/* Speed Selector (Shadowing needs slow pace support) */}
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

      {/* Topic Suggestions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none text-xs">
        <span className="text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Conversaciones IA:
        </span>
        {SHADOWING_TOPICS.map((topic) => (
          <button
            key={topic}
            onClick={() => fetchShadowingDialogue(topic)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 whitespace-nowrap transition-all disabled:opacity-50 cursor-pointer"
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 text-center animate-fadeIn">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
            <Headphones className="w-7 h-7 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h4 className="text-lg font-bold text-slate-100 mb-1">
            La IA está creando una conversación nativa para Shadowing...
          </h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Creando un diálogo interactivo entre dos personajes con modismos auténticos y consejos de entonación.
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-950/20 border border-rose-800/40 rounded-2xl">
          <p className="text-sm text-rose-300 mb-4">{error}</p>
          <button
            onClick={() => fetchShadowingDialogue(initialTopic)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
          >
            Reintentar
          </button>
        </div>
      ) : dialogue && currentTurn ? (
        <div className="space-y-6 pb-12">
          
          {/* Situation & Dialogue Header */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/20 border border-slate-800 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                    Conversación Inventada por IA
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span>{dialogue.characters.join(' & ')}</span>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-100">
                  {dialogue.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {dialogue.situation}
                </p>
              </div>

              {/* Full Dialogue Run-through Button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={playFullDialogue}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                    isPlayingFullDialogue
                      ? 'bg-rose-600 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                  title="Escuchar toda la conversación seguida de principio a fin"
                >
                  {isPlayingFullDialogue ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>Detener</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Escuchar todo el diálogo</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => fetchShadowingDialogue(dialogue.title)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Inventar otra conversación con la IA"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Turn Progress Indicators */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-emerald-400">
                Turno {currentTurnIndex + 1} de {dialogue.turns.length}
              </span>

              <div className="flex items-center gap-1.5">
                {dialogue.turns.map((turn, i) => {
                  const isDone = completedTurns[turn.id];
                  const isCurrent = i === currentTurnIndex;
                  return (
                    <button
                      key={turn.id}
                      onClick={() => {
                        stopPlayback();
                        setCurrentTurnIndex(i);
                      }}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        isCurrent
                          ? 'bg-emerald-500 text-slate-950 scale-110 shadow-md shadow-emerald-950'
                          : isDone
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ACTIVE SHADOWING TURN WORKSPACE */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-2xl relative overflow-hidden">
            {/* Ambient subtle glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

            {/* Speaker identity badge */}
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
                    Frase modelo para imitar
                  </span>
                </div>
              </div>

              {/* Status Pill */}
              {completedTurns[currentTurn.id] && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Turno practicado</span>
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
              <p className="text-sm sm:text-base text-slate-400 italic mb-5">
                "{currentTurn.translation}"
              </p>
            )}

            {/* Phonetic advice focus */}
            {currentTurn.key_phonetic_focus && (
              <div className="mb-6 p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-2.5 text-xs text-emerald-300">
                <Lightbulb className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Foco de entonación y tono:</strong> {currentTurn.key_phonetic_focus}
                </span>
              </div>
            )}

            {/* Action Buttons: Listen Model vs Shadow Record */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 border-t border-slate-800">
              
              {/* Button 1: Listen Model */}
              <button
                onClick={() => playTurnModelAudio(currentTurn)}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer ${
                  isPlayingModel
                    ? 'bg-emerald-500 text-slate-950 scale-105 shadow-xl shadow-emerald-950 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 shadow-md'
                }`}
              >
                <Volume2 className="w-5 h-5" />
                <span>{isPlayingModel ? 'Reproduciendo modelo...' : '1. Escuchar frase nativa'}</span>
              </button>

              {/* Button 2: Shadow Voice Record */}
              <button
                onClick={() => {
                  if (isRecordingUser) {
                    stopShadowingRecord();
                  } else {
                    startShadowingRecord(currentTurn);
                  }
                }}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer shadow-lg ${
                  isRecordingUser
                    ? 'bg-rose-600 text-white ring-4 ring-rose-500/40 scale-105 animate-pulse'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-950/50'
                }`}
              >
                <Mic className="w-5 h-5" />
                <span>{isRecordingUser ? 'Escuchándote... (clic para parar)' : '2. Hacer Shadowing (Imitar)'}</span>
              </button>

            </div>

            {/* User Recording Result */}
            {userRecordings[currentTurn.id] && (
              <div className="mt-5 p-4 rounded-2xl bg-slate-950 border border-slate-800/80 animate-fadeIn">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-400 font-semibold">Tu imitación grabada:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Registrada con éxito
                  </span>
                </div>
                <div className="text-base text-slate-200 font-medium">
                  "{userRecordings[currentTurn.id]}"
                </div>
              </div>
            )}

            {/* Navigation between turns */}
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-800 text-xs">
              <button
                disabled={currentTurnIndex === 0}
                onClick={() => {
                  stopPlayback();
                  setCurrentTurnIndex((prev) => Math.max(0, prev - 1));
                }}
                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Turno anterior</span>
              </button>

              <button
                disabled={currentTurnIndex === dialogue.turns.length - 1}
                onClick={() => {
                  stopPlayback();
                  setCurrentTurnIndex((prev) => Math.min(dialogue.turns.length - 1, prev + 1));
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold disabled:opacity-30 cursor-pointer"
              >
                <span>Siguiente turno</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Full Dialogue Transcript Accordion / Review */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
              <span>Transcripción completa de la conversación</span>
            </h4>
            <div className="space-y-3">
              {dialogue.turns.map((turn, idx) => (
                <div
                  key={turn.id}
                  onClick={() => {
                    stopPlayback();
                    setCurrentTurnIndex(idx);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    idx === currentTurnIndex
                      ? 'bg-emerald-950/30 border-emerald-500/50'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                      {turn.speaker}
                    </span>
                    <span className="text-sm font-medium text-slate-200">
                      {turn.hanzi}
                    </span>
                  </div>

                  <Volume2 className="w-4 h-4 text-slate-500 hover:text-emerald-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>

        </div>
      ) : null}

    </div>
  );
};
