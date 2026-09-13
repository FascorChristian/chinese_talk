import React, { useState } from 'react';
import { 
  Volume2, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { ChatMessage } from '../../types/index.js';
import { HanziWithPinyin } from '../common/HanziWithPinyin.js';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  showPinyin: boolean;
  showTranslation: boolean;
  onPlayAudio: (text: string) => void;
  isCurrentlyPlaying: boolean;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  showPinyin,
  showTranslation,
  onPlayAudio,
  isCurrentlyPlaying,
}) => {
  const isAssistant = message.sender === 'assistant';
  const [isTranslationExpanded, setIsTranslationExpanded] = useState<boolean>(showTranslation);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    setIsTranslationExpanded(showTranslation);
  }, [showTranslation]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.hanzi);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isAssistant) {
    return (
      <div className="flex items-start gap-3 w-full max-w-3xl mr-auto mb-4 animate-fadeIn">
        {/* Assistant Avatar Icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-rose-600 to-amber-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-rose-950/50 mt-1">
          <span>李</span>
        </div>

        {/* Assistant Bubble Content */}
        <div className="flex-1 bg-slate-900/90 border border-slate-800/90 rounded-2xl rounded-tl-sm p-4 sm:p-5 shadow-lg shadow-black/20 text-slate-100">
          
          {/* Header of Bubble */}
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800/60 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="text-rose-400 font-semibold">Li Ming</span>
              <span className="text-[10px] text-slate-500">• Tutor</span>
            </div>

            <div className="flex items-center gap-1">
              {/* Play Audio Button */}
              <button
                id={`play-audio-${message.id}`}
                onClick={() => onPlayAudio(message.hanzi)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  isCurrentlyPlaying
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60'
                }`}
                title="Escuchar pronunciación nativa"
              >
                <Volume2 className={`w-3.5 h-3.5 ${isCurrentlyPlaying ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{isCurrentlyPlaying ? 'Reproduciendo...' : 'Escuchar'}</span>
              </button>

              {/* Copy Hanzi Button */}
              <button
                onClick={handleCopy}
                className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                title="Copiar caracteres"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Chinese Hanzi with Pinyin */}
          <div className="py-1">
            <HanziWithPinyin
              text={message.hanzi}
              showPinyin={showPinyin}
              className="text-lg sm:text-xl md:text-2xl font-normal"
            />
          </div>

          {/* Translation Dropdown */}
          {message.translation && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/60">
              <button
                onClick={() => setIsTranslationExpanded(!isTranslationExpanded)}
                className="flex items-center justify-between w-full text-left text-xs font-medium text-slate-400 hover:text-amber-300 transition-colors cursor-pointer py-0.5"
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">ES</span>
                  <span>Traducción al español</span>
                </span>
                {isTranslationExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {isTranslationExpanded && (
                <p className="mt-1.5 text-sm sm:text-base text-amber-200/90 leading-relaxed pl-1 italic font-sans">
                  "{message.translation}"
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    );
  }

  // User Message
  return (
    <div className="flex items-start justify-end gap-3 w-full max-w-3xl ml-auto mb-4 animate-fadeIn">
      <div className="flex-1 max-w-2xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border border-rose-800/40 rounded-2xl rounded-tr-sm p-4 sm:p-5 shadow-lg shadow-black/20 text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60 text-xs text-slate-400">
          <div className="flex items-center gap-1 font-medium">
            <span className="text-slate-300 font-semibold">Tú (Tu voz)</span>
            <span className="text-[10px] text-slate-500">• Estudiante</span>
          </div>

          <button
            onClick={() => onPlayAudio(message.hanzi)}
            className="p-1 rounded-md text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Re-escuchar frase"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* User Hanzi / Transcribed text */}
        <div className="py-1">
          <HanziWithPinyin
            text={message.hanzi}
            showPinyin={showPinyin}
            className="text-lg sm:text-xl font-medium text-rose-100"
          />
        </div>

        {/* Feedback Section */}
        {(message.userCorrection || message.nativeAlternative) && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2.5">
            
            {message.userCorrection ? (
              <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200/90 leading-relaxed">
                <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span>Feedback de pronunciación y gramática:</span>
                </div>
                <p className="pl-5">{message.userCorrection}</p>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400/90 bg-emerald-950/20 border border-emerald-800/30 px-3 py-1.5 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>¡Excelente pronunciación y estructura gramatical!</span>
              </div>
            )}

            {message.nativeAlternative && (
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs leading-relaxed">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 font-semibold text-rose-300">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span>Cómo lo diría un nativo (Pekín):</span>
                  </span>

                  <button
                    onClick={() => onPlayAudio(message.nativeAlternative!)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition-colors cursor-pointer"
                    title="Escuchar cómo lo pronuncia un nativo"
                  >
                    <Volume2 className="w-3 h-3 text-rose-400" />
                    <span>Escuchar versión nativa</span>
                  </button>
                </div>
                
                <p className="text-slate-200 font-medium text-sm pl-1">
                  {message.nativeAlternative}
                </p>
              </div>
            )}

          </div>
        )}

      </div>

      {/* User Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shadow-md mt-1">
        <span>我</span>
      </div>
    </div>
  );
};

