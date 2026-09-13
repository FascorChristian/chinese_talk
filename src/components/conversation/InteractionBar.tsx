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
  hints = [],
  onPlayAudio,
  showPinyin = true,
  onOpenHints,
}) => {
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  // 1-Clic mode is active by default
  const [clickMode, setClickMode] = useState(true);
  // Hints panel visible by default on the main screen so the user can read while speaking
  const [showInlineHints, setShowInlineHints] = useState(true);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (showTextInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showTextInput]);

  // Keep hints open when new hints arrive from Li Ming
  useEffect(() => {
    if (hints && hints.length > 0) {
      setShowInlineHints(true);
    }
  }, [hints]);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    onSendMessage(textInput.trim());
    setTextInput('');
    setShowTextInput(false);
  };

  // 1-Click vs Push-To-Talk handlers
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

  const handleMouseDown = (e: React.SyntheticEvent) => {
    if (clickMode) return; // Handled by click in 1-clic mode
    e.preventDefault();
    if (isProcessing) return;
    if (!isRecording) {
      onStartRecording();
    }
  };

  const handleMouseUp = (e: React.SyntheticEvent) => {
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
    <footer className="sticky bottom-0 z-30 w-full border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl px-3 sm:px-4 py-2.5 sm:py-3.5 transition-colors shadow-2xl shadow-black/80">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-2 sm:gap-2.5">
        
        {/* Error notification banner if any */}
        {speechError && (
          <div className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 animate-shake">
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

        {/* INTEGRATED CONTEXTUAL HINTS PANEL (Directly in main conversation screen) */}
        {hints && hints.length > 0 && (
          <div className={`w-full rounded-2xl transition-all duration-200 overflow-hidden ${
            isRecording 
              ? 'bg-slate-900/95 border-2 border-rose-500/70 shadow-lg shadow-rose-950/30 ring-2 ring-rose-500/20' 
              : 'bg-slate-900/90 border border-amber-500/30 shadow-md shadow-black/30'
          }`}>
            {/* Header / Toggle bar */}
            <div 
              onClick={() => setShowInlineHints(!showInlineHints)}
              className="flex items-center justify-between px-3 py-1.5 bg-slate-950/60 border-b border-slate-800/60 cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 text-xs font-bold">
                <Sparkles className={`w-3.5 h-3.5 ${isRecording ? 'text-rose-400 animate-spin' : 'text-amber-400 animate-pulse'}`} />
                <span className={isRecording ? 'text-rose-300' : 'text-amber-300'}>
                  {isRecording 
                    ? '🎙️ Grabando... Lee en voz alta cualquiera de estas opciones a tu ritmo:' 
                    : 'Pistas contextuales de qué responder a Li Ming:'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200">
                <span>{showInlineHints ? 'Ocultar' : 'Ver opciones'}</span>
                {showInlineHints ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </div>
            </div>

            {/* Suggestions list */}
            {showInlineHints && (
              <div className="p-2.5 sm:p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fadeIn">
                {hints.map((hint, idx) => (
                  <div
                    key={idx}
                    className={`group relative p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isRecording
                        ? 'bg-slate-950/90 border-slate-800 hover:border-rose-500/50'
                        : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/40'
                    }`}
                  >
                    <div>
                      {/* Hanzi with Pinyin */}
                      <div className="mb-1">
                        <HanziWithPinyin
                          text={hint.hanzi}
                          showPinyin={showPinyin}
                          className="text-sm sm:text-base font-bold text-slate-100"
                        />
                      </div>
                      {/* Pinyin text if showPinyin is on */}
                      <div className="text-[11px] text-amber-400/90 font-mono mb-1">
                        {hint.pinyin}
                      </div>
                      {/* Spanish Translation */}
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {hint.meaning}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/80">
                      {/* Listen button */}
                      {onPlayAudio && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayAudio(hint.hanzi);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[10px] text-amber-300 font-medium transition-colors cursor-pointer"
                          title="Escuchar pronunciación nativa de Li Ming"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Escuchar</span>
                        </button>
                      )}

                      {/* Quick send button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSendMessage(hint.hanzi);
                        }}
                        disabled={isProcessing}
                        className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer disabled:opacity-50"
                        title="Enviar esta respuesta"
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
            className="w-full flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-700/80 shadow-xl shadow-black/40 animate-fadeIn"
          >
            <input
              ref={inputRef}
              type="text"
              id="manual-mandarin-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Escribe en chino o pinyin (ej: 你好, 我想练习点餐)..."
              className="flex-1 bg-transparent px-3 py-2 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isProcessing}
              className="flex items-center justify-center p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white transition-all cursor-pointer"
              title="Enviar respuesta"
            >
              <Send className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowTextInput(false)}
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
            >
              Cancelar
            </button>
          </form>
        )}

        {/* Main Controls Row */}
        <div className="w-full flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Left Side: Hints Toggle / Keyboard Button */}
          <div className="flex-1 flex justify-start items-center gap-2">
            {hints && hints.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowInlineHints(!showInlineHints)}
                disabled={isProcessing}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-700/50 text-slate-300 hover:text-amber-300 transition-all shadow-md shadow-black/20 cursor-pointer disabled:opacity-50"
                title="Mostrar u ocultar las sugerencias en pantalla"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 flex items-center justify-center text-amber-400 transition-colors">
                  <Lightbulb className="w-3.5 h-3.5" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold leading-tight">{showInlineHints ? 'Ocultar pistas' : 'Ver pistas'}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">En pantalla</div>
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenHints}
                disabled={isProcessing}
                className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-700/50 text-slate-300 hover:text-amber-300 transition-all cursor-pointer disabled:opacity-50"
              >
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold hidden sm:inline">Pistas</span>
              </button>
            )}

            {/* Manual text write toggle */}
            <button
              type="button"
              onClick={() => setShowTextInput(!showTextInput)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Escribir con teclado"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Push To Talk / 1-Click Button */}
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              
              {isRecording && (
                <>
                  <span className="absolute -inset-3 rounded-full bg-rose-500/30 animate-ping duration-1000" />
                  <span className="absolute -inset-6 rounded-full bg-rose-600/15 animate-pulse" />
                </>
              )}

              <button
                id="push-to-talk-btn"
                type="button"
                onClick={handleButtonClick}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handlePointerCancel}
                onTouchStart={handleMouseDown}
                onTouchEnd={handleMouseUp}
                onTouchCancel={handlePointerCancel}
                onContextMenu={(e) => e.preventDefault()}
                disabled={isProcessing}
                className={`relative z-10 flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full select-none cursor-pointer transition-all duration-200 ${
                  isRecording
                    ? 'bg-gradient-to-tr from-rose-600 to-red-500 scale-105 shadow-xl shadow-rose-600/50 ring-4 ring-rose-400/60'
                    : isProcessing
                    ? 'bg-slate-800 opacity-60 cursor-not-allowed'
                    : 'bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 hover:scale-105 hover:shadow-xl hover:shadow-rose-600/30 shadow-lg shadow-rose-950 active:scale-95'
                }`}
                title={
                  clickMode
                    ? (isRecording ? 'Clic para enviar audio' : 'Clic para hablar (graba continuo hasta que vuelvas a hacer clic)')
                    : 'Mantén presionado para hablar en chino'
                }
              >
                {isRecording ? (
                  <Square className="w-6 h-6 sm:w-7 sm:h-7 text-white fill-white animate-pulse" />
                ) : (
                  <Mic className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                )}
              </button>
            </div>

            {/* Instruction / Timer Text */}
            <div className="mt-1.5 flex items-center gap-1.5 text-center">
              {isRecording ? (
                <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  {clickMode
                    ? `Grabando (${recordingSeconds}s) • Clic para terminar y enviar`
                    : `Grabando (${recordingSeconds}s) • Suelta para enviar`}
                </span>
              ) : isProcessing ? (
                <span className="text-xs text-amber-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Li Ming está pensando...
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">
                  {clickMode ? '1 Clic para hablar • 1 Clic para enviar' : 'Mantén presionado para hablar'}
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
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                clickMode
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={
                clickMode
                  ? 'Modo 1-Clic: Clic para empezar a hablar y clic de nuevo para enviar'
                  : 'Modo Mantener: Presiona para hablar y suelta para enviar'
              }
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
