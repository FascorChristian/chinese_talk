import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Dices, 
  Send, 
  Loader2, 
  Headphones, 
  Bot, 
  PenLine, 
  Utensils, 
  Train, 
  ShoppingBag, 
  Building, 
  Briefcase, 
  HeartPulse, 
  Coffee, 
  BookmarkCheck,
  ArrowRight,
  Check
} from 'lucide-react';
import { ShadowingDialogue } from '../../types/index.js';
import { generateShadowingContent } from '../../services/api.js';

interface ShadowingScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDialogue?: ShadowingDialogue | null;
  onDialogueGenerated: (dialogue: ShadowingDialogue) => void;
}

const SHADOWING_AI_CATEGORIES = [
  {
    id: 'surprise',
    label: 'Sorpresa Total',
    icon: Dices,
    description: 'La IA inventa libremente una situación cotidiana vibrante entre dos personas.',
    prompt: 'Una conversación espontánea y divertida entre dos hablantes en Pekín sobre planes o vida diaria.'
  },
  {
    id: 'food',
    label: 'Restaurante y Comida',
    icon: Utensils,
    description: 'Pedir platos típicos, comentar sabores y pagar la cuenta.',
    prompt: 'Dos amigos en un restaurante tradicional en Chengdu o Pekín decidiendo qué platos pedir y comentando la salsa.'
  },
  {
    id: 'travel',
    label: 'Viajes y Transporte',
    icon: Train,
    description: 'Tomar un taxi, metro o comprar boletos de tren bala.',
    prompt: 'Un diálogo entre un pasajero y un conductor de taxi o personal de estación de tren de alta velocidad en China.'
  },
  {
    id: 'market',
    label: 'Mercado y Compras',
    icon: ShoppingBag,
    description: 'Consultar precios, tallas y regatear amistosamente.',
    prompt: 'Un comprador y un vendedor amistoso en el mercado de seda de Pekín conversando sobre ropa y precios.'
  },
  {
    id: 'hotel',
    label: 'Hotel y Alojamiento',
    icon: Building,
    description: 'Check-in, pedir información sobre el desayuno y servicios.',
    prompt: 'Un huésped conversando cordialmente con el recepcionista de un hotel en Shanghai.'
  },
  {
    id: 'business',
    label: 'Trabajo y Negocios',
    icon: Briefcase,
    description: 'Charla profesional entre colegas sobre un proyecto.',
    prompt: 'Dos colegas de oficina en Shenzhen coordinando una presentación y una reunión de trabajo.'
  },
  {
    id: 'health',
    label: 'Farmacia y Bienestar',
    icon: HeartPulse,
    description: 'Explicar síntomas leves y pedir té o medicina.',
    prompt: 'Un cliente en una farmacia en Pekín explicando que tiene resfriado y pidiendo recomendaciones al farmacéutico.'
  },
  {
    id: 'friends',
    label: 'Café y Amistad',
    icon: Coffee,
    description: 'Charla distendida sobre planes de fin de semana y pasatiempos.',
    prompt: 'Dos amigos relajándose en una cafetería moderna en Shanghai hablando de sus aficiones y películas.'
  }
];

const CLASSIC_SHADOWING_SCENARIOS = [
  {
    id: 'classic_hotpot',
    title: 'Fin de semana: ¡Vamos por un caldero mongol!',
    chineseTitle: '周末我们去吃老北京涮羊肉',
    badge: 'HSK 2-3 • Amistad y Comida',
    prompt: 'Dos amigos, Xiao Wang y Li Ming, se encuentran el viernes por la tarde y planean cenar caldero mongol juntos para combatir el frío de Pekín.'
  },
  {
    id: 'classic_taxi',
    title: 'Llegada al Aeropuerto y Taxi a la Ciudad',
    chineseTitle: '首都机场打车到市区',
    badge: 'HSK 2 • Viajes y Transporte',
    prompt: 'Un pasajero llega al Aeropuerto Capital de Pekín y toma un taxi para dirigirse a su hotel en Wangfujing pidiendo taxímetro.'
  },
  {
    id: 'classic_silk_market',
    title: 'Comprar ropa en el Mercado de Seda',
    chineseTitle: '在秀水街买衣服',
    badge: 'HSK 3 • Compras y Regateo',
    prompt: 'Un cliente en el mercado de seda de Pekín buscando una camisa de algodón tradicional, preguntando tallas y acordando un descuento cordial.'
  },
  {
    id: 'classic_teahouse',
    title: 'Té Longjing en una Casa de Té Tradicional',
    chineseTitle: '在传统茶馆品尝龙井茶',
    badge: 'HSK 2-3 • Cultura del Té',
    prompt: 'Dos conocidos disfrutando de una degustación de té verde en una casa de té histórica en Hangzhou comentando el aroma.'
  }
];

export const ShadowingScenarioModal: React.FC<ShadowingScenarioModalProps> = ({
  isOpen,
  onClose,
  currentDialogue,
  onDialogueGenerated,
}) => {
  const [activeTab, setActiveTab] = useState<'ai_decides' | 'user_prompt' | 'classic'>('ai_decides');
  const [selectedCategory, setSelectedCategory] = useState<string>('surprise');
  const [promptText, setPromptText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (customPrompt?: string, categoryName?: string) => {
    let finalPrompt = '';

    if (activeTab === 'ai_decides') {
      const cat = SHADOWING_AI_CATEGORIES.find((c) => c.id === selectedCategory) || SHADOWING_AI_CATEGORIES[0];
      finalPrompt = customPrompt || cat.prompt;
    } else if (activeTab === 'user_prompt') {
      finalPrompt = (customPrompt ?? promptText).trim();
    } else {
      finalPrompt = customPrompt || 'Conversación práctica en chino mandarín';
    }

    if (!finalPrompt || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const dialogue = await generateShadowingContent({
        prompt: finalPrompt,
        category: categoryName || (activeTab === 'ai_decides' ? selectedCategory : undefined)
      });
      onDialogueGenerated(dialogue);
      onClose();
    } catch (err: any) {
      console.error('Error generating shadowing dialogue:', err);
      setErrorMessage('No se pudo generar la conversación con la IA. Inténtalo de nuevo o prueba otra opción.');
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
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40 flex-shrink-0">
              <Headphones className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Escenario de Shadowing e Imitación
              </h3>
              <p className="text-xs text-slate-400">
                La IA armará un diálogo entre dos personajes con estructura y objetivos claros
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

        {/* Current Dialogue Pill */}
        {currentDialogue && (
          <div className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
            <span className="flex items-center gap-1.5 truncate">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>Diálogo actual:</span>
              <strong className="text-slate-200">{currentDialogue.title}</strong>
            </span>
            {currentDialogue.chineseTitle && (
              <span className="text-[11px] text-slate-500 font-mono ml-2 hidden sm:inline">
                {currentDialogue.chineseTitle}
              </span>
            )}
          </div>
        )}

        {/* TAB SELECTOR */}
        <div className="mt-4 flex-shrink-0">
          <div className="text-xs font-semibold text-slate-300 mb-2">
            ¿Cómo deseas elegir la conversación?
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
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
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
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
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
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>Temas clásicos</span>
            </button>
          </div>
        </div>

        {/* TAB 1: AI DECIDES */}
        {activeTab === 'ai_decides' && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-3 min-h-[220px]">
            <div className="text-xs text-slate-400 font-medium">
              Elige una temática para que la IA arme una conversación completa con dos personajes y sus objetivos:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SHADOWING_AI_CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 text-left relative ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-500/50'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className={`p-2 rounded-xl flex-shrink-0 ${
                      isSelected 
                        ? 'bg-emerald-500 text-slate-950 font-bold' 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{cat.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
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
              Escribe libremente la situación, los personajes o el contexto que deseas practicar:
            </label>

            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Ejemplo: Dos amigos universitarios en Shanghai decidiendo qué película ver en el cine el domingo por la tarde..."
              rows={5}
              disabled={isGenerating}
              className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none shadow-inner"
            />

            <div className="mt-2 text-[11px] text-slate-400 leading-relaxed">
              💡 <strong>Consejo:</strong> La IA generará las réplicas en chino simplificado, pinyin, traducción y focos de ritmo y pausas.
            </div>
          </div>
        )}

        {/* TAB 3: CLASSIC TOPICS */}
        {activeTab === 'classic' && (
          <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-[220px]">
            <div className="text-xs text-slate-400 font-medium mb-1">
              Selecciona una conversación prediseñada para practicar de inmediato:
            </div>

            {CLASSIC_SHADOWING_SCENARIOS.map((scenario) => (
              <div
                key={scenario.id}
                onClick={() => handleGenerate(scenario.prompt, scenario.title)}
                className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/60 hover:bg-emerald-950/20 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {scenario.badge}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {scenario.chineseTitle}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-200 group-hover:text-emerald-300 transition-colors">
                    {scenario.title}
                  </h4>
                </div>

                <div className="p-2 rounded-xl bg-slate-800 group-hover:bg-emerald-500 group-hover:text-slate-950 text-slate-400 transition-all">
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

        {/* Bottom Actions (Only for ai_decides and user_prompt) */}
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>La IA está armando el diálogo y objetivos...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {activeTab === 'ai_decides' ? 'Crear conversación con IA' : 'Generar con mi prompt'}
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

