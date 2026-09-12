import React from 'react';
import { 
  X, 
  Coffee, 
  ShoppingBag, 
  Sparkles, 
  UtensilsCrossed, 
  Car, 
  Check, 
  Languages 
} from 'lucide-react';
import { Scenario, ScenarioId } from '../types';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenarios: Scenario[];
  selectedScenarioId: ScenarioId;
  onSelectScenario: (scenario: Scenario) => void;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({
  isOpen,
  onClose,
  scenarios,
  selectedScenarioId,
  onSelectScenario,
}) => {
  if (!isOpen) return null;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Coffee':
        return <Coffee className="w-5 h-5 text-amber-400" />;
      case 'ShoppingBag':
        return <ShoppingBag className="w-5 h-5 text-emerald-400" />;
      case 'UtensilsCrossed':
        return <UtensilsCrossed className="w-5 h-5 text-rose-400" />;
      case 'Car':
        return <Car className="w-5 h-5 text-blue-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-violet-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-5 sm:p-6 overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top ambient highlight */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                Selecciona tu Escenario de Práctica
              </h3>
              <p className="text-xs text-slate-400">
                Li Ming asumirá el rol para recrear una conversación realista
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

        {/* Scenarios Grid / List */}
        <div className="mt-4 space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {scenarios.map((scenario) => {
            const isSelected = scenario.id === selectedScenarioId;
            return (
              <div
                key={scenario.id}
                onClick={() => {
                  onSelectScenario(scenario);
                  onClose();
                }}
                className={`group p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  isSelected
                    ? 'bg-rose-950/30 border-rose-500/50 shadow-md shadow-rose-950/30'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
                  isSelected 
                    ? 'bg-rose-600/20 border-rose-500/30' 
                    : 'bg-slate-800/80 border-slate-700/60 group-hover:bg-slate-800'
                }`}>
                  {getIcon(scenario.icon)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-rose-300 transition-colors">
                        {scenario.title}
                      </h4>
                      <span className="text-xs text-slate-400 font-mono">
                        ({scenario.chineseTitle})
                      </span>
                    </div>

                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60 font-semibold whitespace-nowrap">
                      {scenario.badge}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    {scenario.description}
                  </p>
                </div>

                {isSelected && (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center mt-1">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
