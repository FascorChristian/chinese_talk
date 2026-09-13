import React, { useState, useEffect, useRef } from 'react';
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
  CheckCircle2, 
  ArrowLeft,
  Flame
} from 'lucide-react';
import { ReadingContent, ReadingSentence } from '../../types/index.js';
import { HanziWithPinyin } from '../common/HanziWithPinyin.js';
import { playMandarinTTS, stopMandarinTTS } from '../../utils/speechUtils.js';
import { calculateAccuracyScore } from '../../utils/scoringUtils.js';
import { generateReadingContent } from '../../services/api.js';

interface ReadingViewProps {
  onBackToMenu: () => void;
  initialTopic?: string;
}

const TOPIC_SUGGESTIONS = [
  'Cultura del té chino y hospitalidad',
  'Un paseo matutino por los Hutongs de Pekín',
  'La comida picante de Sichuan y el Hotpot',
  'La Fiesta de las Linternas y Año Nuevo Chino',
  'El tren de alta velocidad y viajar por China',
];

export const ReadingView: React.FC<ReadingViewProps> = ({
  onBackToMenu,
  initialTopic = 'Cultura del té chino y hospitalidad',
}) => {
  const [content, setContent] = useState<ReadingContent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // User visibility toggles: Hanzi, Pinyin, Spanish Translation
  const [showHanzi, setShowHanzi] = useState<boolean>(true);
  const [showPinyin, setShowPinyin] = useState<boolean>(true);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);

  // Audio Playback
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [activeSentenceId, setActiveSentenceId] = useState<string | null>(null);
  const [isPlayingAll, setIsPlayingAll] = useState<boolean>(false);
  const cancelTtsRef = useRef<(() => void) | null>(null);

  // Oral practice
  const [practicingSentenceId, setPracticingSentenceId] = useState<string | null>(null);
  const [userTranscripts, setUserTranscripts] = useState<Record<string, string>>({});
  const [accuracyScores, setAccuracyScores] = useState<Record<string, number>>({});
  const recognitionRef = useRef<any>(null);

  const stopPlayback = () => {
    if (cancelTtsRef.current) {
      cancelTtsRef.current();
      cancelTtsRef.current = null;
    }
    stopMandarinTTS();
    setIsPlayingAll(false);
    setActiveSentenceId(null);
  };

  const stopRecordingSentence = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setPracticingSentenceId(null);
  };

  const fetchReading = async (topic: string) => {
    setIsLoading(true);
    setError(null);
    stopPlayback();
    stopRecordingSentence();

    try {
      const data = await generateReadingContent(topic, 'HSK 2-3');
      setContent(data);
    } catch (err: any) {
      console.error('Fetch reading error:', err);
      setError('No se pudo conectar con la IA para generar la lectura. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReading(initialTopic);
    return () => {
      stopPlayback();
      stopRecordingSentence();
    };
  }, []);

  // Play individual sentence audio
  const playSentenceAudio = (sentence: ReadingSentence) => {
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

  // Play entire reading sequentially aloud
  const playAllAloud = () => {
    if (!content || !content.sentences.length) return;

    if (isPlayingAll) {
      stopPlayback();
      return;
    }

    setIsPlayingAll(true);
    let index = 0;

    const playNext = () => {
      if (index >= content.sentences.length) {
        setIsPlayingAll(false);
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
          }, 450);
        },
        () => {
          setIsPlayingAll(false);
          setActiveSentenceId(null);
        }
      );
    };

    playNext();
  };

  // Read aloud oral practice with microphone
  const startRecordingSentence = (sentence: ReadingSentence) => {
    stopPlayback();
    stopRecordingSentence();
    setPracticingSentenceId(sentence.id);

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      alert('Tu navegador no soporta reconocimiento de voz en zh-CN nativo.');
      setPracticingSentenceId(null);
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
        setUserTranscripts((prev) => ({ ...prev, [sentence.id]: transcript }));

        // Correct accuracy scoring via multiset frequency match
        const result = calculateAccuracyScore(sentence.hanzi, transcript);
        setAccuracyScores((prev) => ({ ...prev, [sentence.id]: result.score }));
        setPracticingSentenceId(null);
      };

      recognition.onerror = () => {
        setPracticingSentenceId(null);
      };

      recognition.onend = () => {
        setPracticingSentenceId(null);
      };

      recognition.start();
    } catch {
      setPracticingSentenceId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 sm:px-6 py-4 animate-fadeIn">
      
      {/* Top Navigation & Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800">
        <button
          onClick={() => {
            stopPlayback();
            stopRecordingSentence();
            onBackToMenu();
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Menú Principal</span>
        </button>

        {/* Global Visibility Controls: Hanzi, Pinyin, Translation */}
        <div className="flex items-center gap-2 flex-wrap">
          
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
                onClick={() => setSpeechRate(speed)}
                className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  speechRate === speed
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Topics Selector Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none text-xs">
        <span className="text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Temas IA:
        </span>
        {TOPIC_SUGGESTIONS.map((topic) => (
          <button
            key={topic}
            onClick={() => fetchReading(topic)}
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
            <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
            <BookOpen className="w-7 h-7 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h4 className="text-lg font-bold text-slate-100 mb-1">
            La IA está generando tu texto de lectura...
          </h4>
          <p className="text-xs text-slate-400 max-w-sm">
            Creando oraciones en mandarín simplificado, calculando pinyin con tonos y preparando la traducción pedagógica.
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-950/20 border border-rose-800/40 rounded-2xl">
          <p className="text-sm text-rose-300 mb-4">{error}</p>
          <button
            onClick={() => fetchReading(initialTopic)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
          >
            Reintentar generación
          </button>
        </div>
      ) : content ? (
        <div className="space-y-6 animate-fadeIn pb-12">
          
          {/* Text Title & Main Aloud Control Banner */}
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/20 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    {content.level || 'HSK 2-3'}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {content.topic}
                  </span>
                </div>

                {/* Title with Hanzi / Pinyin / Translation */}
                <div className="mt-1">
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
                  <p className="text-sm text-slate-400 mt-1 italic">
                    {content.title_translation}
                  </p>
                )}
              </div>

              {/* Read Aloud Button */}
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <button
                  id="btn-play-all-aloud"
                  onClick={playAllAloud}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg cursor-pointer ${
                    isPlayingAll
                      ? 'bg-rose-600 text-white shadow-rose-950 animate-pulse'
                      : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold shadow-amber-950/40'
                  }`}
                  title="Leer todo el texto en voz alta con audio continuo"
                >
                  {isPlayingAll ? (
                    <>
                      <Square className="w-4 h-4 fill-white" />
                      <span>Detener lectura</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>Leer todo en voz alta</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => fetchReading(content.topic)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Generar otro texto sobre este tema con la IA"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reading Tip */}
            {content.reading_tip && (
              <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-start gap-2 text-xs text-amber-300/90 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Consejo de lectura oral:</strong> {content.reading_tip}
                </span>
              </div>
            )}
          </div>

          {/* Sentence by Sentence Reading Cards */}
          <div className="space-y-4">
            {content.sentences.map((sentence, idx) => {
              const isActive = activeSentenceId === sentence.id;
              const isPracticing = practicingSentenceId === sentence.id;
              const userTranscript = userTranscripts[sentence.id];
              const score = accuracyScores[sentence.id];

              return (
                <div
                  key={sentence.id}
                  className={`p-5 rounded-2xl border transition-all duration-200 ${
                    isActive
                      ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-950/30 ring-1 ring-amber-400/40'
                      : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => playSentenceAudio(sentence)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                        }`}
                        title="Escuchar esta frase en voz alta"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{isActive ? 'Sonando...' : 'Escuchar frase'}</span>
                      </button>

                      <button
                        onClick={() => {
                          if (isPracticing) {
                            stopRecordingSentence();
                          } else {
                            startRecordingSentence(sentence);
                          }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isPracticing
                            ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                            : 'bg-slate-800 hover:bg-rose-950/30 text-slate-300 hover:text-rose-300 border-slate-700/60'
                        }`}
                        title="Lee tú la frase en voz alta para evaluar tu pronunciación"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>{isPracticing ? 'Escuchándote...' : 'Leer yo'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Chinese Text */}
                  <div className="my-3 pl-1">
                    {showHanzi ? (
                      <HanziWithPinyin
                        text={sentence.hanzi}
                        showPinyin={showPinyin}
                        className="text-xl sm:text-2xl leading-relaxed text-slate-100 font-medium"
                      />
                    ) : (
                      <div className="text-lg sm:text-xl font-mono text-amber-300 leading-relaxed">
                        {sentence.pinyin}
                        <div className="mt-1 text-xs text-slate-500 font-sans italic">
                          (Caracteres ocultos para evaluar tu reconocimiento auditivo y lectura)
                        </div>
                      </div>
                    )}
                  </div>

                  {showTranslation && (
                    <div className="text-xs sm:text-sm text-slate-400 italic pt-2 border-t border-slate-800/60">
                      "{sentence.translation}"
                    </div>
                  )}

                  {/* Oral Recognition Result */}
                  {userTranscript && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-slate-500">Tu voz: </span>
                        <span className="text-slate-200 font-medium">"{userTranscript}"</span>
                      </div>
                      {score !== undefined && (
                        <div className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${
                          score >= 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{score}% precisión</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Key Vocabulary section */}
          {content.vocabulary && content.vocabulary.length > 0 && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
              <h5 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                <Flame className="w-4 h-4" />
                Vocabulario Clave del Texto
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {content.vocabulary.map((vocab, i) => (
                  <div
                    key={`${i}-${vocab.word}`}
                    onClick={() => playMandarinTTS(vocab.word, speechRate)}
                    className="group p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-amber-500/40 transition-all cursor-pointer flex items-center justify-between"
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
                    <Volume2 className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : null}

    </div>
  );
};

