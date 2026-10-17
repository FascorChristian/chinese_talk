import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Lightbulb, 
  Keyboard, 
  Send, 
  AlertCircle, 
  Square,
  Volume2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { HanziWithPinyin } from '../common/HanziWithPinyin.js';

interface InteractionBarProps {
  isRecording: boolean;
  isProcessing: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSendMessage: (text: string) => void;
  hasSpeechRecognition: boolean;
  recordingSeconds: number;
  speechError: string | null;
  liveTranscript?: string;
  hints?: Array<{ hanzi: string; pinyin: string; meaning: string }>;
  onPlayAudio?: (text: string) => void;
  showPinyin?: boolean;
  onOpenHints?: () => void;
}

export const InteractionBar: React.FC<InteractionBarProps> = ({
  isRecording,
  isProcessing,
  onStartRecording,
  onStopRecording,
  onSendMessage,
  recordingSeconds,
  speechError,
  liveTranscript = '',
  hints = [],
  onPlayAudio,
  showPinyin = true,
  onOpenHints,
}) => {
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [clickMode, setClickMode] = useState(true);
  // Collapse hints by default on small mobile screens so chat history has plenty of vertical space
  const [showInlineHints, setShowInlineHints] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (showTextInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showTextInput]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    onSendMessage(textInput.trim());
    setTextInput('');
    setShowTextInput(false);
  };

  // Unified click/pointer handlers that never double-fire on mobile touchscreens
  const handleButtonClick = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    if (clickMode) {
      if (isRecording) {
        onStopRecording();
      } else {
        onStartRecording();
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (clickMode) return;
    e.preventDefault();
    if (isProcessing) return;
    if (!isRecording) {
      onStartRecording();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (clickMode) return;
    e.preventDefault();
    if (isRecording) {
      onStopRecording();
    }
  };

  const handlePointerCancel = () => {
    if (!clickMode && isRecording) {
      onStopRecording();
    }
  };

  return (
    <footer className="sticky bottom-0 z-30 w-full border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl px-2.5 sm:px-4 py-2 sm:py-3 transition-colors shadow-2xl shadow-black/80">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-1.5 sm:gap-2">
        
        {/* Live Speech Transcript Banner while recording */}
        {isRecording && (
          <div className="w-full px-3 py-1.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping flex-shrink-0" />
              <span className="truncate font-medium">
                {liveTranscript ? `Escuchando: "${liveTranscript}"` : 'Habla ahora en chino mandarín...'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-rose-300 flex-shrink-0">{recordingSeconds}s</span>
          </div>
        )}

        {/* Error notification banner if any */}
        {speechError && (
          <div className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{speechError}</span>
            </div>
            <button
              onClick={() => setShowTextInput(true)}
              className="text-xs underline text-rose-200 hover:text-white font-semibold cursor-pointer whitespace-nowrap"
            >
              Escribir texto
            </button>
          </div>
        )}

        {/* INTEGRATED CONTEXTUAL HINTS PANEL (Scrollable & compact on mobile) */}
        {hints && hints.length > 0 && (
          <div className={`w-full rounded-xl sm:rounded-2xl transition-all duration-200 overflow-hidden ${
            isRecording 
              ? 'bg-slate-900/95 border border-rose-500/60 shadow-md' 
              : 'bg-slate-900/90 border border-amber-500/30 shadow-md'
          }`}>
            {/* Header / Toggle bar */}
            <div 
              onClick={() => setShowInlineHints(!showInlineHints)}
              className="flex items-center justify-between px-3 py-1.5 bg-slate-950/60 border-b border-slate-800/60 cursor-pointer select-none"
            >
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold truncate">
                <Sparkles className={`w-3.5 h-3.5 flex-shrink-0 ${isRecording ? 'text-rose-400 animate-spin' : 'text-amber-400'}`} />
                <span className={`truncate ${isRecording ? 'text-rose-300' : 'text-amber-300'}`}>
                  {isRecording 
                    ? 'Pistas para leer en voz alta:' 
                    : `Pistas de respuesta (${hints.length}):`}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 flex-shrink-0">
                <span>{showInlineHints ? 'Ocultar' : 'Mostrar'}</span>
                {showInlineHints ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Suggestions list with mobile max-height scroll */}
            {showInlineHints && (
              <div className="p-2 sm:p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[24vh] sm:max-h-[32vh] overflow-y-auto">
                {hints.map((hint, idx) => (
                  <div
                    key={idx}
                    className="group relative p-2 rounded-xl border bg-slate-950/85 border-slate-800 hover:border-amber-500/40 flex flex-col justify-between"
                  >
                    <div>
                      <div className="mb-0.5">
                        <HanziWithPinyin
                          text={hint.hanzi}
                          showPinyin={showPinyin}
                          className="text-sm font-bold text-slate-100"
                        />
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {hint.meaning}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-800/80">
                      {onPlayAudio && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayAudio(hint.hanzi);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[10px] text-amber-300 font-medium cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Escuchar</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendMessage(hint.hanzi);
                        }}
                        disabled={isProcessing}
                        className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer disabled:opacity-50"
                      >
                        <span>Enviar frase</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Text Input Drawer if active */}
        {showTextInput && (
          <form
            onSubmit={handleTextSubmit}
            className="w-full flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-xl"
          >
            <input
              ref={inputRef}
              type="text"
              id="manual-mandarin-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Escribe en chino (ej: 你好)..."
              className="flex-1 min-w-0 bg-transparent px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isProcessing}
              className="flex items-center justify-center p-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white cursor-pointer"
              title="Enviar respuesta"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowTextInput(false)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
            >
              Cerrar
            </button>
          </form>
        )}

        {/* Main Controls Row */}
        <div className="w-full flex items-center justify-between gap-2 sm:gap-6">
          
          {/* Left Side: Hints Toggle & Keyboard Button */}
          <div className="flex-1 flex justify-start items-center gap-1.5 sm:gap-2">
            {hints && hints.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowInlineHints(!showInlineHints)}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-900/90 hover:bg-amber-950/30 border border-slate-800 text-slate-300 hover:text-amber-300 transition-all cursor-pointer disabled:opacity-50"
                title="Mostrar u ocultar pistas"
              >
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold">{showInlineHints ? 'Ocultar' : 'Pistas'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenHints}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 cursor-pointer disabled:opacity-50"
              >
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold">Pistas</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowTextInput(!showTextInput)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Escribir con teclado"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Push To Talk / 1-Click Button */}
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <span className="absolute -inset-2 rounded-full bg-rose-500/30 animate-ping duration-1000" />
              )}

              <button
                id="push-to-talk-btn"
                type="button"
                onClick={handleButtonClick}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerCancel}
                onContextMenu={(e) => e.preventDefault()}
                disabled={isProcessing}
                className={`relative z-10 flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full select-none touch-manipulation cursor-pointer transition-all duration-200 ${
                  isRecording
                    ? 'bg-gradient-to-tr from-rose-600 to-red-500 scale-105 shadow-xl shadow-rose-600/50 ring-4 ring-rose-400/60'
                    : isProcessing
                    ? 'bg-slate-800 opacity-60 cursor-not-allowed'
                    : 'bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 hover:scale-105 shadow-lg shadow-rose-950 active:scale-95'
                }`}
              >
                {isRecording ? (
                  <Square className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white animate-pulse" />
                ) : (
                  <Mic className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                )}
              </button>
            </div>

            <div className="mt-1 flex items-center gap-1 text-center">
              {isRecording ? (
                <span className="text-[11px] font-bold text-rose-400">
                  {clickMode ? 'Toca para enviar' : 'Suelta para enviar'}
                </span>
              ) : isProcessing ? (
                <span className="text-[11px] text-amber-400">Evaluando...</span>
              ) : (
                <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                  {clickMode ? 'Toca para hablar' : 'Mantén para hablar'}
                </span>
              )}
            </div>
          </div>

          {/* Right Side: Mode Switcher (1-Click vs Hold) */}
          <div className="flex-1 flex justify-end">
            <button
              id="btn-click-mode-toggle"
              type="button"
              onClick={() => setClickMode(!clickMode)}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                clickMode
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span className="hidden sm:inline">Modo: </span>
              <span>{clickMode ? '1-Clic' : 'Mantener'}</span>
            </button>
          </div>

        </div>

      </div>
    </footer>
  );
};
