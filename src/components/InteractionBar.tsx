import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, 
  Lightbulb, 
  Keyboard, 
  Send, 
  AlertCircle, 
  Square,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface InteractionBarProps {
  isRecording: boolean;
  isProcessing: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onOpenHints: () => void;
  onSendMessage: (text: string) => void;
  hasSpeechRecognition: boolean;
  recordingSeconds: number;
  speechError: string | null;
}

export const InteractionBar: React.FC<InteractionBarProps> = ({
  isRecording,
  isProcessing,
  onStartRecording,
  onStopRecording,
  onOpenHints,
  onSendMessage,
  hasSpeechRecognition,
  recordingSeconds,
  speechError,
}) => {
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [clickMode, setClickMode] = useState(false); // If true, click to toggle recording instead of hold
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

  // Push to talk mouse/touch handlers
  const handleButtonDown = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (isProcessing) return;

    if (clickMode) {
      if (isRecording) {
        onStopRecording();
      } else {
        onStartRecording();
      }
    } else {
      if (!isRecording) {
        onStartRecording();
      }
    }
  };

  const handleButtonUp = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!clickMode && isRecording) {
      onStopRecording();
    }
  };

  return (
    <footer className="sticky bottom-0 z-30 w-full border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-xl px-4 py-3 sm:py-4 transition-colors">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-2 sm:gap-3">
        
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
              className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 font-medium"
            >
              Cancelar
            </button>
          </form>
        )}

        {/* Main Controls Row */}
        <div className="w-full flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Left Side: Hints Button ("Pista / ¿Qué puedo responder?") */}
          <div className="flex-1 flex justify-start">
            <button
              id="btn-hints-trigger"
              type="button"
              onClick={onOpenHints}
              disabled={isProcessing}
              className="group flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-amber-950/30 border border-slate-800 hover:border-amber-700/50 text-slate-300 hover:text-amber-300 transition-all shadow-md shadow-black/20 cursor-pointer disabled:opacity-50"
              title="Ver sugerencias de qué responder a Li Ming"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 flex items-center justify-center text-amber-400 transition-colors">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold leading-tight">Pista</div>
                <div className="text-[10px] text-slate-400 group-hover:text-amber-400/80 leading-tight">¿Qué responder?</div>
              </div>
            </button>
          </div>

          {/* Center: Giant Push To Talk Button */}
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              
              {/* Outer pulsing ring when recording */}
              {isRecording && (
                <>
                  <span className="absolute -inset-3 rounded-full bg-rose-500/30 animate-ping duration-1000" />
                  <span className="absolute -inset-6 rounded-full bg-rose-600/15 animate-pulse" />
                </>
              )}

              {/* Giant Button */}
              <button
                id="push-to-talk-btn"
                type="button"
                onMouseDown={handleButtonDown}
                onMouseUp={handleButtonUp}
                onTouchStart={handleButtonDown}
                onTouchEnd={handleButtonUp}
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
                    ? (isRecording ? 'Clic para enviar audio' : 'Clic para empezar a hablar')
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
                  Grabando ({recordingSeconds}s)... Suelta para enviar
                </span>
              ) : isProcessing ? (
                <span className="text-xs font-medium text-amber-400 animate-pulse">
                  Procesando respuesta...
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">
                  {clickMode ? 'Haz clic para hablar' : 'Mantén presionado para hablar'}
                </span>
              )}
            </div>
          </div>

          {/* Right Side: Keyboard & Mode Toggle */}
          <div className="flex-1 flex justify-end items-center gap-2">
            
            {/* Click Mode Toggle (Hold vs Click) */}
            <button
              id="btn-toggle-click-mode"
              type="button"
              onClick={() => setClickMode(!clickMode)}
              className={`p-2 rounded-xl border text-xs transition-colors hidden md:flex items-center gap-1 cursor-pointer ${
                clickMode
                  ? 'bg-slate-800 text-rose-300 border-rose-500/30'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title={clickMode ? 'Modo: Clic para iniciar/detener' : 'Modo: Mantener presionado (Push to Talk)'}
            >
              <span className="text-[10px] font-semibold">{clickMode ? '1-Clic' : 'Push'}</span>
            </button>

            {/* Toggle Text Input Button */}
            <button
              id="btn-toggle-keyboard"
              type="button"
              onClick={() => setShowTextInput(!showTextInput)}
              className={`group flex items-center gap-2 px-3 sm:px-3.5 py-2.5 rounded-xl border transition-all shadow-md shadow-black/20 cursor-pointer ${
                showTextInput
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                  : 'bg-slate-900/90 hover:bg-slate-800/80 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Escribir por teclado"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 group-hover:text-white transition-colors">
                <Keyboard className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold hidden sm:inline">Teclado</span>
            </button>

          </div>

        </div>

      </div>
    </footer>
  );
};
