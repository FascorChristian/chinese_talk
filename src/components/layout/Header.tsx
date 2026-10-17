import React, { useState } from 'react';
import { 
  Languages, 
  Volume2, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  ChevronDown, 
  Sparkles, 
  Coffee, 
  ShoppingBag, 
  UtensilsCrossed, 
  Car, 
  LayoutGrid,
  BookmarkPlus,
  BookMarked,
  Check
} from 'lucide-react';
import { Scenario, AppMode } from '../../types/index.js';

interface HeaderProps {
  currentScenario: Scenario;
  onSelectScenario: () => void;
  speechRate: number;
  onChangeSpeed: (speed: number) => void;
  showPinyin: boolean;
  onTogglePinyin: () => void;
  showTranslation: boolean;
  onToggleTranslation: () => void;
  onResetChat: () => void;
  currentMode: AppMode;
  onGoToMenu: () => void;
  onOpenNotebook?: () => void;
  onSaveCurrentScenario?: () => void;
}

const SPEED_OPTIONS = [0.75, 1.0, 1.25];

export const Header: React.FC<HeaderProps> = ({
  currentScenario,
  onSelectScenario,
  speechRate,
  onChangeSpeed,
  showPinyin,
  onTogglePinyin,
  showTranslation,
  onToggleTranslation,
  onResetChat,
  currentMode,
  onGoToMenu,
  onOpenNotebook,
  onSaveCurrentScenario,
}) => {
  const [savedFeedback, setSavedFeedback] = useState(false);

  const getScenarioIcon = (iconName: string) => {
    switch (iconName) {
      case 'Coffee':
        return <Coffee className="w-4 h-4 text-amber-400" />;
      case 'ShoppingBag':
        return <ShoppingBag className="w-4 h-4 text-emerald-400" />;
      case 'UtensilsCrossed':
        return <UtensilsCrossed className="w-4 h-4 text-rose-400" />;
      case 'Car':
        return <Car className="w-4 h-4 text-blue-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-violet-400" />;
    }
  };

  const handleSaveClick = () => {
    if (!onSaveCurrentScenario) return;
    onSaveCurrentScenario();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-6 py-2 sm:py-3 transition-colors">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
        
        {/* Brand & Mode / Scenario Selector */}
        <div className="flex items-center gap-2 min-w-0">
          <div 
            onClick={onGoToMenu}
            className="relative flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 shadow-md shadow-rose-900/30 text-white font-bold text-sm sm:text-lg cursor-pointer hover:scale-105 transition-transform"
            title="Ir al Menú Principal"
          >
            <span>李</span>
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
          </div>

          <div className="min-w-0">
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">Praktika Mandarín</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 font-medium">zh-CN</span>
            </div>

            {currentMode === 'conversation' ? (
              <button
                id="scenario-selector-trigger"
                onClick={onSelectScenario}
                className="group flex items-center gap-1 text-left text-xs sm:text-base font-semibold text-slate-100 hover:text-rose-300 transition-colors cursor-pointer max-w-[160px] sm:max-w-[260px]"
                title="Cambiar escenario de conversación"
              >
                <span className="truncate flex items-center gap-1">
                  {getScenarioIcon(currentScenario.icon)}
                  <span className="truncate">{currentScenario.title}</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 group-hover:text-rose-400" />
              </button>
            ) : currentMode === 'reading' ? (
              <span className="text-xs sm:text-base font-semibold text-amber-300 truncate block">
                Lectura (朗读)
              </span>
            ) : currentMode === 'shadowing' ? (
              <span className="text-xs sm:text-base font-semibold text-emerald-300 truncate block">
                Shadowing (跟读)
              </span>
            ) : currentMode === 'diagnostic' ? (
              <span className="text-xs sm:text-base font-semibold text-teal-300 truncate block">
                Diagnóstico HSK
              </span>
            ) : currentMode === 'notebook' ? (
              <span className="text-xs sm:text-base font-semibold text-sky-300 truncate block">
                Mi Cuaderno
              </span>
            ) : (
              <span className="text-xs sm:text-base font-semibold text-slate-200 truncate block">
                Entrenamiento Oral
              </span>
            )}
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          
          {/* Main Menu Switcher Button */}
          <button
            onClick={onGoToMenu}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
              currentMode === 'menu'
                ? 'bg-rose-600 text-white border-rose-500 shadow-rose-950/40'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
            }`}
            title="Ver todos los métodos de práctica (Menú)"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden xs:inline sm:inline">Menú</span>
          </button>

          {/* Notebook Button */}
          {onOpenNotebook && (
            <button
              onClick={onOpenNotebook}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                currentMode === 'notebook'
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-slate-900/90 hover:bg-slate-800 text-sky-300 border-slate-800'
              }`}
              title="Abrir Mi Cuaderno de Estudio"
            >
              <BookMarked className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Cuaderno</span>
            </button>
          )}

          {/* Global Voice Speed Selector (Available across ALL modes!) */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
            <span className="hidden lg:flex items-center pl-2 pr-1 text-[11px] text-slate-400 font-medium">
              <Volume2 className="w-3.5 h-3.5 mr-1 text-slate-400" /> Velocidad:
            </span>
            {SPEED_OPTIONS.map((rate) => (
              <button
                key={rate}
                id={`speed-btn-${rate}`}
                onClick={() => onChangeSpeed(rate)}
                className={`px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  Math.abs(speechRate - rate) < 0.02
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
                title={`Velocidad de audio ${rate}x`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Conversation-specific controls */}
          {currentMode === 'conversation' && (
            <>
              {onSaveCurrentScenario && (
                <button
                  onClick={handleSaveClick}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border bg-sky-500/15 border-sky-500/40 text-sky-300 hover:bg-sky-500/25 transition-all cursor-pointer"
                  title="Guardar este escenario de conversación en Cuaderno / Google Drive"
                >
                  {savedFeedback ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <BookmarkPlus className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span className="hidden md:inline">
                    {savedFeedback ? '¡Guardado!' : 'Guardar'}
                  </span>
                </button>
              )}

              {/* Toggle Pinyin */}
              <button
                id="toggle-pinyin-btn"
                onClick={onTogglePinyin}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                  showPinyin
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400'
                }`}
                title={showPinyin ? 'Ocultar Pinyin' : 'Mostrar Pinyin'}
              >
                <Languages className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden md:inline">Pinyin</span>
              </button>

              {/* Toggle Translation */}
              <button
                id="toggle-translation-btn"
                onClick={onToggleTranslation}
                className={`flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                  showTranslation
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400'
                }`}
                title={showTranslation ? 'Ocultar traducción' : 'Mostrar traducción'}
              >
                {showTranslation ? (
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="hidden md:inline">ES</span>
              </button>

              {/* Reset Chat Button */}
              <button
                id="reset-chat-btn"
                onClick={onResetChat}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-slate-800/80 rounded-lg transition-colors cursor-pointer"
                title="Reiniciar conversación actual"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}

        </div>

      </div>
    </header>
  );
};
