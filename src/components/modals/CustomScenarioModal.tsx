import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Dices, 
  Send, 
  Loader2, 
  MessageSquareQuote,
  Bot,
  PenLine,
  Utensils,
  Train,
  ShoppingBag,
  Building,
  Briefcase,
  HeartPulse,
  Coffee,
  ArrowRight,
  Check
} from 'lucide-react';
import { Scenario } from '../../types/index.js';
import { generateCustomScenario } from '../../services/api.js';

interface CustomScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentScenario?: Scenario;
  onScenarioGenerated: (scenario: Scenario) => void;
  onUseDefaultScenario?: () => void;
}

const AI_THEME_CATEGORIES = [
  {
    id: 'surprise',
    label: 'Sorpresa Total',
    icon: Dices,
    description: 'La IA inventa libremente una situación entretenida y cotidiana.',
    prompt: 'Inventa una situación hipotética fascinante, espontánea y realista en China para practicar conversación oral en Chino Mandarín estándar.'
  },
  {
    id: 'food',
    label: 'Restaurante y Comida',
    icon: Utensils,
    description: 'Pedir platos típicos, consultar por picante o ingredientes.',
    prompt: 'Una situación en un restaurante tradicional en Sichuan o Beijing pidiendo platos locales, preguntando por ingredientes y picante.'
  },
  {
    id: 'travel',
    label: 'Viajes y Transporte',
    icon: Train,
    description: 'Estación de tren de alta velocidad, metro o taxi.',
    prompt: 'Una situación en la estación de tren bala o aeropuerto en China comprando billetes o resolviendo una consulta de viaje.'
  },
  {
    id: 'market',
    label: 'Mercado y Compras',
    icon: ShoppingBag,
    description: 'Regateo amistoso por artesanías, ropa de seda o té.',
    prompt: 'Una situación regateando amistosamente o comprando ropa de seda, té o souvenirs en un mercado tradicional chino.'
  },
  {
    id: 'hotel',
    label: 'Hotel y Alojamiento',
    icon: Building,
    description: 'Check-in, preguntar por servicios o pedir indicaciones.',
    prompt: 'Una situación en la recepción de un hotel en Beijing haciendo el check-in o pidiendo información sobre servicios y comodidades.'
  },
  {
    id: 'business',
    label: 'Trabajo y Negocios',
    icon: Briefcase,
    description: 'Reunión profesional o presentación ante colegas chinos.',
    prompt: 'Una situación profesional o reunión casual de negocios con un colega chino en Shenzhen hablando de proyectos.'
  },
  {
    id: 'health',
    label: 'Farmacia y Salud',
    icon: HeartPulse,
    description: 'Explicar síntomas leves y pedir té o medicina tradicional.',
    prompt: 'Una situación en una farmacia en China explicando síntomas leves como dolor de garganta o resfriado y pidiendo remedios tradicionales.'
  },
  {
    id: 'cafe',
    label: 'Café y Nuevos Amigos',
    icon: Coffee,
    description: 'Charla informal sobre gustos, viajes y vida diaria.',
    prompt: 'Una situación conociendo a un nuevo amigo en una cafetería moderna en Shanghai charlando sobre hobbies y vida cotidiana.'
  }
];

const SURPRISE_PROMPTS = [
  'Degustación de té en una prestigiosa casa de té en Beijing. Li Ming es el maestro de té experto y te recibe para probar té Longjing fresco.',
  'En un restaurante tradicional de pato laqueado en Beijing. Li Ming es el mesero que te da la bienvenida y te recomienda especialidades de la casa.',
  'En el mercado de antigüedades y artesanías Panjiayuan en Beijing. Li Ming es un vendedor amistoso ofreciéndote un juego de té de porcelana.',
  'En la estación de tren de alta velocidad de Beijing. Li Ming es el taquillero ayudándote a comprar boletos de segunda clase a Shanghai.',
  'En la recepción de un hotel boutique tradicional cerca de la Ciudad Prohibida. Li Ming es la recepcionista haciendo tu check-in.',
  'En una cafetería moderna en el distrito de Sanlitun en Beijing. Li Ming es un amigo local que te invita un café y te conversa sobre la ciudad.'
];

export const CustomScenarioModal: React.FC<CustomScenarioModalProps> = ({
  isOpen,
  onClose,
  currentScenario,
  onScenarioGenerated,
  onUseDefaultScenario,
}) => {
  // Selector between: 'user_prompt' (usuario escribe) vs 'ai_decides' (la IA decide)
  const [activeTab, setActiveTab] = useState<'user_prompt' | 'ai_decides'>('ai_decides');
  const [promptText, setPromptText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('surprise');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (customPrompt?: string) => {
    let finalPrompt = '';

    if (activeTab === 'ai_decides') {
      if (selectedCategory === 'surprise') {
        const randomSurprise = SURPRISE_PROMPTS[Math.floor(Math.random() * SURPRISE_PROMPTS.length)];
        finalPrompt = `${randomSurprise} La situación ya fue decidida y está ocurriendo. Li Ming debe hablar de inmediato dentro del personaje en mandarín sin hacer preguntas meta.`;
      } else {
        const cat = AI_THEME_CATEGORIES.find((c) => c.id === selectedCategory) || AI_THEME_CATEGORIES[0];
        finalPrompt = customPrompt || `${cat.prompt}. La situación ya fue decidida y está ocurriendo. Li Ming debe hablar de inmediato dentro del personaje sin hacer preguntas meta.`;
      }
    } else {
      finalPrompt = (customPrompt ?? promptText).trim();
    }

    if (!finalPrompt || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const scenario = await generateCustomScenario(finalPrompt);
      onScenarioGenerated(scenario);
      onClose();
    } catch (err: any) {
      console.error('Error generating custom scenario:', err);
      setErrorMessage('No se pudo generar la situación con la IA. Inténtalo de nuevo o prueba otra opción.');
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
        {/* Top ambient glowing strip */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-950/40 flex-shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Situación Hipotética de Conversación
              </h3>
              <p className="text-xs text-slate-400">
                Define el contexto y el rol de Li Ming para tu práctica oral
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

        {/* Current Scenario pill if active */}
        {currentScenario && (
          <div className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400 flex-shrink-0">
            <span className="flex items-center gap-1.5 truncate">
              <MessageSquareQuote className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              <span>Tema previo:</span>
              <strong className="text-slate-200">{currentScenario.title}</strong>
            </span>
            <span className="text-[11px] text-slate-500 font-mono ml-2 hidden sm:inline">
              {currentScenario.chineseTitle}
            </span>
          </div>
        )}

        {/* SELECTOR DE OPCIONES (TABS) */}
        <div className="mt-4 flex-shrink-0">
          <div className="text-xs font-semibold text-slate-300 mb-2">
            ¿Cómo deseas definir la situación?
          </div>
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
            
            {/* Opción 1: Que la IA lo decida */}
            <button
              type="button"
              onClick={() => setActiveTab('ai_decides')}
              disabled={isGenerating}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'ai_decides'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Que la IA lo decida</span>
            </button>

            {/* Opción 2: Yo escribo el Prompt */}
            <button
              type="button"
              onClick={() => setActiveTab('user_prompt')}
              disabled={isGenerating}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'user_prompt'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <PenLine className="w-4 h-4" />
              <span>Yo escribo el prompt</span>
            </button>

          </div>
        </div>

        {/* Error Banner if any */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 animate-shake flex-shrink-0">
            {errorMessage}
          </div>
        )}

        {/* TAB 1 CONTENT: QUE LA IA LO DECIDA */}
        {activeTab === 'ai_decides' && (
          <div className="mt-4 overflow-y-auto pr-1 flex-1 space-y-3">
            <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Dices className="w-4 h-4 animate-bounce" />
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                <p className="font-semibold text-amber-300 mb-0.5">Generación 100% asistida por Inteligencia Artificial</p>
                La IA inventará un escenario inmersivo, el rol de Li Ming y tu primera frase en Chino Mandarín. Puedes elegir un ambiente preferido o dejarlo en sorpresa total.
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Elige el ambiente o temática:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AI_THEME_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <div
                      key={cat.id}
                      onClick={() => !isGenerating && setSelectedCategory(cat.id)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                        isSelected
                          ? 'bg-rose-950/30 border-rose-500 ring-1 ring-rose-500/50 text-white'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-rose-500 text-white shadow-md shadow-rose-900' : 'bg-slate-900 text-slate-400'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate">{cat.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                          {cat.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2 CONTENT: YO ESCRIBO EL PROMPT */}
        {activeTab === 'user_prompt' && (
          <div className="mt-4 overflow-y-auto pr-1 flex-1 space-y-3">
            <div>
              <label 
                htmlFor="custom-user-prompt" 
                className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-2"
              >
                <span>Describe la situación que deseas practicar:</span>
                <span className="text-[10px] text-rose-400 font-normal lowercase">(en español o chino)</span>
              </label>

              <textarea
                id="custom-user-prompt"
                rows={5}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Escribe libremente lo que quieres vivir. Por ejemplo:&#10;• Estoy en el mercado de la seda regateando una tetera de té de porcelana...&#10;• Acabo de llegar al aeropuerto de Beijing y necesito tomar un taxi a mi hotel...&#10;• Estoy en una farmacia tradicional pidiendo medicina para el dolor de cabeza..."
                disabled={isGenerating}
                className="w-full bg-slate-950/90 border border-slate-700/80 rounded-2xl p-3.5 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all resize-none shadow-inner leading-relaxed"
              />
            </div>

            <p className="text-xs text-slate-400">
              Li Ming asumirá de inmediato el rol correspondiente y armará la estructura y objetivos del diálogo para tu práctica.
            </p>
          </div>
        )}

        {/* Modal Footer / Action Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          
          {/* Subtle link to jump to default/current conversation without regenerating */}
          {onUseDefaultScenario ? (
            <button
              type="button"
              onClick={onUseDefaultScenario}
              disabled={isGenerating}
              className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer disabled:opacity-50 text-center sm:text-left"
            >
              Continuar con situación actual
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
          )}

          {/* Primary CTA button */}
          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={
              isGenerating || 
              (activeTab === 'user_prompt' && !promptText.trim())
            }
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 disabled:opacity-40 disabled:hover:from-rose-600 disabled:hover:to-amber-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Li Ming está creando la situación...</span>
              </>
            ) : (
              <>
                <span>
                  {activeTab === 'ai_decides' 
                    ? 'Que la IA genere la situación y empezar' 
                    : 'Generar Situación y Conversar'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </div>

      </div>
    </div>
  );
};
