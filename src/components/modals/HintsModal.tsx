import React from 'react';
import { X, Volume2, Lightbulb, Sparkles, ArrowRight } from 'lucide-react';
import { SuggestedReply } from '../../types/index.js';
import { HanziWithPinyin } from '../common/HanziWithPinyin.js';

interface HintsModalProps {
  isOpen: boolean;
  onClose: () => void;
  hints: SuggestedReply[];
  onSelectHint: (text: string) => void;
  onPlayAudio: (text: string) => void;
  showPinyin: boolean;
}

export const HintsModal: React.FC<HintsModalProps> = ({
  isOpen,
  onClose,
  hints,
  onSelectHint,
  onPlayAudio,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 sm:p-6 overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
                Pistas de Respuesta
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                  Sugerencias IA
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Elige una opción para practicar oralmente o enviarla a Li Ming
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hints list */}
        <div className="mt-4 space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
          {hints.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">
              <Sparkles className="w-6 h-6 mx-auto mb-2 text-amber-400 animate-spin" />
              Generando sugerencias inteligentes...
            </div>
          ) : (
            hints.map((hint, index) => (
              <div
                key={`${index}-${hint.hanzi}`}
                className="group relative p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 transition-all shadow-md"
              >
                {/* Header: Option Tag & Audio Play */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400/90 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">
                      {index + 1}
                    </span>
                    Opción sugerida
                  </span>

                  {/* Audio Preview Button */}
                  <button
                    onClick={() => onPlayAudio(hint.hanzi)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700/60 hover:border-amber-500/40 text-xs font-semibold transition-all cursor-pointer"
                    title="Escuchar pronunciación antes de hablar"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Escuchar antes de decir</span>
                  </button>
                </div>

                {/* Hanzi + Pinyin */}
                <div className="py-1">
                  <HanziWithPinyin
                    text={hint.hanzi}
                    showPinyin={true}
                    className="text-lg sm:text-xl font-medium text-slate-100"
                  />
                </div>

                {/* Spanish Meaning */}
                <p className="text-xs sm:text-sm text-slate-400 italic mt-1 mb-3">
                  "{hint.meaning}"
                </p>

                {/* Action button */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-900">
                  <button
                    onClick={() => {
                      onSelectHint(hint.hanzi);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition-all cursor-pointer"
                  >
                    <span>Usar esta respuesta</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <span>💡 Tip: Escúchala varias veces y repítela en voz alta.</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 font-semibold cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

