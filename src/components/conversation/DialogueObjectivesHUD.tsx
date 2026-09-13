import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  Milestone, 
  AlertCircle 
} from 'lucide-react';
import { DialogueObjective } from '../../types/index.js';

interface DialogueObjectivesHUDProps {
  objectives: DialogueObjective[];
  dialogueStructure?: string[];
  timeRemainingSeconds: number;
  totalTimeSeconds: number;
  isCompleted?: boolean;
  onOpenStructureModal?: () => void;
}

export const DialogueObjectivesHUD: React.FC<DialogueObjectivesHUDProps> = ({
  objectives,
  dialogueStructure = [],
  timeRemainingSeconds,
  totalTimeSeconds,
  isCompleted = false,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showStructure, setShowStructure] = useState<boolean>(false);

  const completedCount = objectives.filter((o) => o.completed).length;
  const totalCount = objectives.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Format MM:SS
  const formatTime = (secs: number) => {
    const safeSecs = Math.max(0, secs);
    const m = Math.floor(safeSecs / 60);
    const s = safeSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timeRatio = totalTimeSeconds > 0 ? (timeRemainingSeconds / totalTimeSeconds) * 100 : 0;
  const isUrgent = timeRemainingSeconds <= 30 && timeRemainingSeconds > 0;
  const isTimeUp = timeRemainingSeconds <= 0;

  return (
    <div className="w-full bg-slate-900/95 border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden mb-3 transition-all">
      {/* Top Main Progress Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-950/70 border-b border-slate-800/80">
        
        {/* Objectives Progress Header */}
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
            completedCount === totalCount && totalCount > 0
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
          }`}>
            <Target className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <span>Objetivos de la Conversación</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                completedCount === totalCount && totalCount > 0
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-300'
              }`}>
                {completedCount} / {totalCount} cumplidos
              </span>
            </div>
          </div>
        </div>

        {/* Live Timer Indicator */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-xs font-bold border transition-colors ${
            isTimeUp
              ? 'bg-rose-950/60 text-rose-300 border-rose-800 animate-pulse'
              : isUrgent
              ? 'bg-amber-950/60 text-amber-300 border-amber-800 animate-pulse'
              : 'bg-slate-950 text-slate-300 border-slate-800'
          }`}>
            <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-amber-400 animate-spin' : 'text-slate-400'}`} />
            <span>{formatTime(timeRemainingSeconds)}</span>
          </div>

          {/* Dialogue Structure Toggle Button */}
          {dialogueStructure.length > 0 && (
            <button
              type="button"
              onClick={() => setShowStructure(!showStructure)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border flex items-center gap-1 cursor-pointer transition-colors ${
                showStructure
                  ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/60'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
              title="Ver estructura y etapas del diálogo"
            >
              <Milestone className="w-3 h-3 text-indigo-400" />
              <span className="hidden sm:inline">Estructura</span>
            </button>
          )}

          {/* Minimize / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Plegar lista' : 'Desplegar objetivos'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

      </div>

      {/* Progress Line */}
      <div className="w-full h-1 bg-slate-950">
        <div 
          className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Structure Guide (Collapsible) */}
      {showStructure && dialogueStructure.length > 0 && (
        <div className="px-3.5 py-2.5 bg-indigo-950/20 border-b border-indigo-900/30 text-xs text-indigo-200 animate-fadeIn">
          <div className="font-bold flex items-center gap-1.5 mb-1 text-indigo-300">
            <Milestone className="w-3.5 h-3.5 text-indigo-400" />
            <span>Estructura sugerida del diálogo:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-1.5">
            {dialogueStructure.map((step, idx) => (
              <div 
                key={idx} 
                className="px-2.5 py-1.5 rounded-xl bg-slate-950/80 border border-indigo-900/40 text-[11px] text-slate-300 flex items-center gap-2"
              >
                <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <span className="truncate">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Objectives Checklist (Collapsible) */}
      {isExpanded && (
        <div className="p-3 sm:p-3.5 space-y-2 animate-fadeIn">
          {objectives.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No hay objetivos fijados para esta conversación.</p>
          ) : (
            objectives.map((obj, idx) => {
              const isDone = Boolean(obj.completed);
              return (
                <div
                  key={obj.id || idx}
                  className={`flex items-start gap-2.5 p-2 rounded-xl transition-all border ${
                    isDone
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-scaleUp" />
                    ) : (
                      <Circle className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-relaxed ${
                      isDone ? 'line-through text-emerald-300/80 font-medium' : 'text-slate-200'
                    }`}>
                      {obj.description}
                    </p>
                  </div>
                  {isDone && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md flex-shrink-0">
                      Cumplido
                    </span>
                  )}
                </div>
              );
            })
          )}

          {isCompleted && (
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-2 text-xs text-emerald-300 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>¡Excelente! Has completado todos los objetivos de este diálogo.</span>
            </div>
          )}

          {isTimeUp && !isCompleted && (
            <div className="mt-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center gap-2 text-xs text-rose-300 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>El tiempo límite ha terminado. Puedes continuar o reiniciar la conversación.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

