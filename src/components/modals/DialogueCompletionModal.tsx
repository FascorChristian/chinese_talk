import React from 'react';
import { 
  Trophy, 
  Clock, 
  RotateCcw, 
  Sparkles, 
  Menu, 
  MessageSquare, 
  CheckCircle2, 
  XCircle,
  X,
  Target
} from 'lucide-react';
import { DialogueObjective } from '../../types/index.js';

interface DialogueCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAllCompleted: boolean;
  isTimeUp: boolean;
  objectives: DialogueObjective[];
  elapsedSeconds: number;
  finalFeedback?: string | null;
  onRestart: () => void;
  onNewScenario: () => void;
  onGoToMenu: () => void;
}

export const DialogueCompletionModal: React.FC<DialogueCompletionModalProps> = ({
  isOpen,
  onClose,
  isAllCompleted,
  isTimeUp,
  objectives,
  elapsedSeconds,
  finalFeedback,
  onRestart,
  onNewScenario,
  onGoToMenu,
}) => {
  if (!isOpen) return null;

  const completedCount = objectives.filter((o) => o.completed).length;
  const totalCount = objectives.length;

  const formatElapsed = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s} segundos`;
    return `${m} min ${s} seg`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl p-5 sm:p-6 overflow-hidden animate-scaleUp text-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ambient banner */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${
          isAllCompleted 
            ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500' 
            : 'bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500'
        }`} />

        {/* Close button to review conversation */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          title="Cerrar y revisar conversación"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Header */}
        <div className="text-center pt-2 pb-4">
          <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center shadow-lg ${
            isAllCompleted
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-emerald-950/50'
              : 'bg-gradient-to-tr from-amber-600 to-rose-500 text-white shadow-amber-950/50'
          }`}>
            {isAllCompleted ? (
              <Trophy className="w-7 h-7 animate-bounce" />
            ) : (
              <Clock className="w-7 h-7 animate-pulse" />
            )}
          </div>

          <h3 className="text-xl font-bold text-slate-100">
            {isAllCompleted ? '¡Misión Cumplida!' : 'Tiempo Finalizado'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {isAllCompleted
              ? '¡Excelente trabajo! Has alcanzado los objetivos comunicativos de este diálogo en chino mandarín.'
              : 'Se ha agotado el tiempo programado para esta situación de conversación.'}
          </p>
        </div>

        {/* Stats Pill Row */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Objetivos logrados</span>
              <span className="text-sm font-bold text-slate-100 font-mono">
                {completedCount} de {totalCount}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">Tiempo empleado</span>
              <span className="text-sm font-bold text-slate-100 font-mono">
                {formatElapsed(elapsedSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Objectives Checklist Summary */}
        <div className="mb-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Resumen de Objetivos:
          </span>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {objectives.map((obj, idx) => (
              <div 
                key={obj.id || idx}
                className={`p-2 rounded-xl text-xs flex items-start gap-2 border ${
                  obj.completed
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400'
                }`}
              >
                {obj.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                )}
                <span className="flex-1">{obj.description}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Li Ming's Final Feedback if present */}
        {finalFeedback && (
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-rose-950/30 to-amber-950/30 border border-rose-800/40 text-xs text-amber-200 leading-relaxed">
            <span className="font-bold text-amber-300 block mb-1">
              Evaluación de Li Ming (Tutor):
            </span>
            <p>{finalFeedback}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRestart}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Repetir situación</span>
            </button>

            <button
              type="button"
              onClick={onNewScenario}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Nueva situación</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer underline"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Revisar mensajes y correcciones</span>
            </button>

            <button
              type="button"
              onClick={onGoToMenu}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Menu className="w-3.5 h-3.5" />
              <span>Menú principal</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

