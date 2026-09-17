import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Dices, 
  Loader2, 
  BookOpen, 
  Bot, 
  PenLine, 
  Utensils, 
  Compass, 
  Landmark, 
  Home, 
  Scroll, 
  BookmarkCheck,
  ArrowRight,
  Check
} from 'lucide-react';
import { ReadingContent } from '../../types/index.js';
import { generateReadingContent } from '../../services/api.js';

interface ReadingScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentReading?: ReadingContent | null;
  onReadingGenerated: (reading: ReadingContent) => void;
}

const READING_AI_CATEGORIES = [
  {
    id: 'fable',
    label: 'Fábulas e Historias Antiguas',
    icon: Scroll,
    description: 'Relatos y fábulas tradicionales chinas con moraleja y sabiduría.',
    prompt: 'Una fábula tradicional china corta y amena (como 守株待兔 o 塞翁失马) con una enseñanza valiosa.'
  },
  {
    id: 'culture',
    label: 'Cultura y Tradición Milenaria',
    icon: Landmark,
    description: 'El arte del té, la caligrafía, festivales folclóricos y leyendas.',
    prompt: 'Un texto cultural sobre una tradición china auténtica como la Fiesta de la Primavera o la ceremonia del té.'
  },
  {
    id: 'daily',
    label: 'Vida Cotidiana y Costumbres',
    icon: Home,
    description: 'Paseos por los barrios, mercados matutinos y hábitos de bienestar.',
    prompt: 'Un texto descriptivo sobre la vida matutina en Pekín o Shanghai, los puestos callejeros y los parques.'
  },
  {
    id: 'travel',
    label: 'Viajes y Geografía de China',
    icon: Compass,
    description: 'La Gran Muralla, ciudades milenarias, paisajes de Guilin y el tren bala.',
    prompt: 'Un texto corto de viajes describiendo un rincón fascinante de China, sus paisajes o monumentos históricos.'
  },
  {
    id: 'food',
    label: 'Gastronomía y Sabores',
    icon: Utensils,
    description: 'El pato laqueado, los dumplings, sabores picantes y la comida callejera.',
    prompt: 'Un texto sobre la gastronomía china tradicional, cómo se preparan los platos típicos y la cultura culinaria.'
  },
  {
    id: 'curiosity',
    label: 'Curiosidades y Tecnología',
    icon: Sparkles,
    description: 'Trenes de alta velocidad, pagos móviles, los pandas gigantes o la vida moderna.',
    prompt: 'Un texto curioso e informativo sobre un aspecto moderno de China como los trenes de alta velocidad o los santuarios de pandas.'
  },
  {
    id: 'surprise',
    label: 'Sorpresa Total',
    icon: Dices,
    description: 'La IA elige un relato apasionante y educativo para sorprenderte.',
    prompt: 'Un texto corto fascinante, educativo y narrativo en chino mandarín sobre un tema sorprendente.'
  }
];

const CLASSIC_READINGS = [
  {
    id: 'classic_tea',
    title: 'La cultura del té chino y la hospitalidad',
    chineseTitle: '中国茶文化与客来敬茶',
    badge: 'HSK 2-3 • Cultura Milenaria',
    prompt: 'Un texto cultural sobre la tradición del té en China, la frase tradicional 客来敬茶 y cómo el té relaja el espíritu.'
  },
  {
    id: 'classic_hutong',
    title: 'Una mañana cotidiana en los callejones de Pekín',
    chineseTitle: '北京胡同里的烟火早晨',
    badge: 'HSK 2-3 • Vida Diaria',
    prompt: 'Un texto costumbrista sobre los hutongs de Pekín al amanecer, el desayuno de baozi y leche de soja y los ancianos haciendo tai chi en el parque.'
  },
  {
    id: 'classic_wall',
    title: 'La majestuosidad de la Gran Muralla China',
    chineseTitle: '雄伟的万里长城',
    badge: 'HSK 2-3 • Historia y Viajes',
    prompt: 'Un texto descriptivo sobre la Gran Muralla China, el dicho famoso 不到长城非好汉 y la historia de su construcción.'
  }
];

export const ReadingScenarioModal: React.FC<ReadingScenarioModalProps> = ({
  isOpen,
  onClose,
  currentReading,
  onReadingGenerated,
}) => {
  const [activeTab, setActiveTab] = useState<'ai_decides' | 'user_prompt' | 'classic'>('ai_decides');
  const [selectedCategory, setSelectedCategory] = useState<string>('fable');
  const [promptText, setPromptText] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('HSK 2-3');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (customPrompt?: string, genreName?: string) => {
    let finalPrompt = '';

    if (activeTab === 'ai_decides') {
      const cat = READING_AI_CATEGORIES.find((c) => c.id === selectedCategory) || READING_AI_CATEGORIES[0];
      finalPrompt = customPrompt || cat.prompt;
    } else if (activeTab === 'user_prompt') {
      finalPrompt = (customPrompt ?? promptText).trim();
    } else {
      finalPrompt = customPrompt || 'Cultura y relatos de China';
    }

    if (!finalPrompt || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const reading = await generateReadingContent({
        prompt: finalPrompt,
        level: selectedLevel,
        genre: genreName || (activeTab === 'ai_decides' ? selectedCategory : undefined)
      });
      onReadingGenerated(reading);
      onClose();
    } catch (err: any) {
      console.error('Error generating reading:', err);
      setErrorMessage('No se pudo generar el texto con la IA. Inténtalo de nuevo o prueba otra opción.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl p-5 sm:p-7 overflow-hidden animate-scaleUp text-slate-100 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-teal-950/40 flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Escenario de Lectura y Comprensión
              </h3>
              <p className="text-xs text-slate-400">
                Textos cortos de diversa índole con evaluación oral y preguntas de comprensión
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Reading Pill */}
        {currentReading && (
          <div className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
            <span className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
              <span>Lectura actual:</span>
              <strong className="text-slate-200">{currentReading.title_translation}</strong>
            </span>
            <span className="text-[11px] text-slate-500 font-mono ml-2 hidden sm:inline">
              {currentReading.title_hanzi}
            </span>
          </div>
        )}

        {/* TAB SELECTOR */}
        <div className="mt-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">
              ¿Cómo deseas elegir la lectura?
            </span>
            {/* Level selector */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[11px]">
              {['HSK 1-2', 'HSK 2-3', 'HSK 4+'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    selectedLevel === lvl ? 'bg-teal-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('ai_decides');
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ai_decides'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Que la IA decida</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('user_prompt');
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'user_prompt'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <PenLine className="w-4 h-4" />
              <span>Yo escribo el prompt</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('classic');
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'classic'
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>Textos clásicos</span>
            </button>
          </div>
        </div>

        {/* TAB 1: AI DECIDES */}
        {activeTab === 'ai_decides' && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[220px]">
            <div className="text-xs text-slate-400 font-medium">
              Elige el género o índole del texto corto que deseas que la IA cree con preguntas de comprensión:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {READING_AI_CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 text-left relative ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500 text-teal-200 shadow-md ring-1 ring-teal-500/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-xl flex-shrink-0 ${
                      isSelected 
                        ? 'bg-teal-500 text-slate-950 font-bold' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{cat.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight mt-1 line-clamp-2">
                        {cat.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: USER PROMPT */}
        {activeTab === 'user_prompt' && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1 flex flex-col min-h-[220px]">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Escribe libremente la temática, relato o asunto que deseas leer y comprender:
            </label>

            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Ejemplo: Una leyenda tradicional sobre el Festival de Medio Otoño y la diosa Chang'e en la Luna..."
              rows={5}
              disabled={isGenerating}
              className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all resize-none shadow-inner"
            />

            <div className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              💡 <strong>Nota:</strong> La IA generará un texto narrativo coherente (no un diálogo), con pinyin, vocabulario y preguntas de comprensión para responder por voz.
            </div>
          </div>
        )}

        {/* TAB 3: CLASSIC TEXTS */}
        {activeTab === 'classic' && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[220px]">
            <div className="text-xs text-slate-400 font-medium mb-1">
              Selecciona un texto clásico prediseñado con preguntas de comprensión listas:
            </div>

            {CLASSIC_READINGS.map((reading) => (
              <div
                key={reading.id}
                onClick={() => handleGenerate(reading.prompt, reading.title)}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-teal-500/60 hover:bg-teal-950/20 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      {reading.badge}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {reading.chineseTitle}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-teal-300 transition-colors">
                    {reading.title}
                  </h4>
                </div>

                <div className="p-2 rounded-xl bg-slate-800 group-hover:bg-teal-500 group-hover:text-slate-950 text-slate-400 transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex-shrink-0 animate-fadeIn">
            {errorMessage}
          </div>
        )}

        {/* Bottom Actions */}
        {activeTab !== 'classic' && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || (activeTab === 'user_prompt' && !promptText.trim())}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-950/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>La IA está creando el texto y preguntas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {activeTab === 'ai_decides' ? 'Crear texto con IA' : 'Generar con mi prompt'}
                  </span>
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

