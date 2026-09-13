import React from 'react';
import { 
  MessageSquare, 
  BookOpen, 
  Headphones, 
  Sparkles, 
  Volume2, 
  ArrowRight,
  CheckCircle2,
  Globe2,
  Mic
} from 'lucide-react';
import { AppMode } from '../../types/index.js';

interface MainMenuViewProps {
  onSelectMode: (mode: AppMode) => void;
  isLoadingContent?: boolean;
}

export const MainMenuView: React.FC<MainMenuViewProps> = ({
  onSelectMode,
  isLoadingContent = false,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-4 py-8 sm:py-12 animate-fadeIn select-none">
      
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Praktika Mandarín • Plataforma Oral con IA</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-3">
          ¿Qué deseas practicar hoy?
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
          Selecciona un método de entrenamiento oral. La Inteligencia Artificial generará el contenido pedagógico en Chino Mandarín en tiempo real.
        </p>
      </div>

      {/* 3 Main Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 w-full mb-10">
        
        {/* Mode 1: Conversación Oral */}
        <div
          onClick={() => !isLoadingContent && onSelectMode('conversation')}
          className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 hover:border-rose-500/60 shadow-xl shadow-black/40 hover:shadow-rose-950/20 transition-all duration-300 cursor-pointer hover:-translate-y-1"
        >
          <div className="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-950/50 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Interactivo
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-100 group-hover:text-rose-300 transition-colors mb-2">
              Conversación Oral con IA
            </h3>
            <div className="text-xs text-rose-400/90 font-mono mb-3">
              情境角色扮演 • Li Ming
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
              Crea cualquier <strong>situación hipotética libre con un prompt</strong>. Li Ming adoptará el rol en tiempo real para una inmersión conversacional con modo 1-Clic, correcciones y pistas.
            </p>

            <ul className="space-y-1.5 text-xs text-slate-400 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span>Generación libre de situaciones con prompts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span>Modo 1-Clic continuo (sin cortes)</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            <span className="text-xs font-bold text-slate-300 group-hover:text-rose-300 transition-colors">
              Iniciar conversación
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-rose-600 text-slate-300 group-hover:text-white flex items-center justify-center transition-colors shadow-md">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Mode 2: Lectura en Voz Alta */}
        <div
          onClick={() => !isLoadingContent && onSelectMode('reading')}
          className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 hover:border-amber-500/60 shadow-xl shadow-black/40 hover:shadow-amber-950/20 transition-all duration-300 cursor-pointer hover:-translate-y-1"
        >
          <div className="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-950/50 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Lectura & Fonética
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-100 group-hover:text-amber-300 transition-colors mb-2">
              Lectura en Voz Alta
            </h3>
            <div className="text-xs text-amber-400/90 font-mono mb-3">
              大声朗读 • Textos con IA
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
              La IA genera textos culturales y cotidianos. Activa o desactiva los <strong>caracteres Hanzi</strong>, <strong>Pinyin</strong> o <strong>Traducción</strong> según tu nivel, y escúchalos leídos en voz alta.
            </p>

            <ul className="space-y-1.5 text-xs text-slate-400 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Ocultar/Mostrar Hanzi (prueba a ciegas)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <span>Lectura auditiva fluida frase por frase</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            <span className="text-xs font-bold text-slate-300 group-hover:text-amber-300 transition-colors">
              Generar texto y leer
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-amber-600 text-slate-300 group-hover:text-white flex items-center justify-center transition-colors shadow-md">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

        {/* Mode 3: Shadowing */}
        <div
          onClick={() => !isLoadingContent && onSelectMode('shadowing')}
          className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 hover:border-emerald-500/60 shadow-xl shadow-black/40 hover:shadow-emerald-950/20 transition-all duration-300 cursor-pointer hover:-translate-y-1"
        >
          <div className="absolute top-0 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50 group-hover:scale-110 transition-transform">
                <Headphones className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Imitación Nativa
              </span>
            </div>

            <h3 className="text-xl font-bold text-slate-100 group-hover:text-emerald-300 transition-colors mb-2">
              Shadowing (Imitación IA)
            </h3>
            <div className="text-xs text-emerald-400/90 font-mono mb-3">
              影子跟读法 • Conversación IA
            </div>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">
              Sigue una conversación realista inventada por la IA entre hablantes nativos. Escucha la frase modelo y <strong>repite inmediatamente</strong> para calcar la cadencia y los tonos auténticos.
            </p>

            <ul className="space-y-1.5 text-xs text-slate-400 mb-6">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Conversación natural entre dos personajes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>Consejos fonéticos y ritmo paso a paso</span>
              </li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
            <span className="text-xs font-bold text-slate-300 group-hover:text-emerald-300 transition-colors">
              Iniciar Shadowing
            </span>
            <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-emerald-600 text-slate-300 group-hover:text-white flex items-center justify-center transition-colors shadow-md">
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>

      </div>

      {/* Pedagogical info banner */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 py-3 px-6 rounded-2xl bg-slate-900/50 border border-slate-800">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-rose-400" />
          <span>Pronunciación de Pekín (普通话)</span>
        </div>
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-amber-400" />
          <span>Síntesis de voz con control de velocidad</span>
        </div>
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-emerald-400" />
          <span>Reconocimiento por voz con feedback</span>
        </div>
      </div>

    </div>
  );
};

