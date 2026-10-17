import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  BookOpen, 
  Headphones, 
  Sparkles, 
  Volume2, 
  ArrowRight,
  CheckCircle2,
  Globe2,
  Mic,
  Target,
  Trophy,
  Award
} from 'lucide-react';
import { AppMode, UserProfile } from '../../types/index.js';
import { getUserProfile, subscribeToProfileChanges } from '../../services/userProfileService.js';

interface MainMenuViewProps {
  onSelectMode: (mode: AppMode) => void;
  isLoadingContent?: boolean;
}

export const MainMenuView: React.FC<MainMenuViewProps> = ({
  onSelectMode,
  isLoadingContent = false,
}) => {
  const [userProfile, setUserProfile] = useState<UserProfile>(getUserProfile());

  useEffect(() => {
    return subscribeToProfileChanges((updated) => setUserProfile(updated));
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-4 py-8 sm:py-12 animate-fadeIn select-none">
      
      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5 text-rose-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Praktika Mandarín • Plataforma Oral con IA</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-3">
          ¿Qué deseas practicar hoy?
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
          Selecciona un método de entrenamiento oral. La Inteligencia Artificial adapta la dificultad y vocabulario a tu nivel de HSK.
        </p>
      </div>

      {/* Level & Diagnostic Card Banner */}
      <div className="w-full mb-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900/95 to-amber-950/30 border border-amber-500/30 shadow-xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Evaluación HSK / HSKK
            </span>
            <span className="text-xs text-slate-300">
              Nivel Oficial: <strong className="text-amber-400 font-bold">{userProfile.hskLevel}</strong> • <strong className="text-teal-300 font-semibold">{userProfile.hskkLevel}</strong>
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-100 flex items-center gap-2">
            <span>Diagnóstico Integral & Desafío de Nivel</span>
          </h3>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Evalúa tus 3 habilidades (conversación, shadowing y lectura). La IA identifica tus fortalezas y debilidades, adapta dinámicamente los prompts internos y te permite desbloquear nuevos niveles de HSK.
          </p>
        </div>

        <button
          onClick={() => !isLoadingContent && onSelectMode('diagnostic')}
          className="flex-shrink-0 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-950/40 cursor-pointer flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
        >
          <Target className="w-4 h-4" />
          <span>Realizar Diagnóstico / Desafío</span>
          <ArrowRight className="w-4 h-4" />
        </button>
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

      {/* Notebook Banner */}
      <div
        onClick={() => !isLoadingContent && onSelectMode('notebook')}
        className="w-full mb-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950/30 to-slate-900 border border-sky-500/30 hover:border-sky-400/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all hover:-translate-y-0.5"
      >
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
              Cuaderno Personal
            </span>
            <span className="text-xs text-emerald-300 font-semibold">
              • Reutiliza ejercicios con 0 llamadas a la IA
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white">
            Mi Cuaderno de Estudio: Ejercicios, Vocabulario y Evaluaciones
          </h3>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Accede a tus escenarios, diálogos de shadowing y lecturas guardadas, repasa tu vocabulario con audio y guarda tu progreso de forma automática.
          </p>
        </div>

        <button
          type="button"
          className="flex-shrink-0 px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Abrir Mi Cuaderno</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Pedagogical info banner */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-400 py-3 px-4 sm:px-6 rounded-2xl bg-slate-900/50 border border-slate-800">
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-rose-400" />
          <span>Pronunciación de Pekín (普通话)</span>
        </div>
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-amber-400" />
          <span>Control de velocidad real (0.75x / 1.0x / 1.25x)</span>
        </div>
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-emerald-400" />
          <span>Tolerancia inteligente a homófonos Pinyin</span>
        </div>
      </div>

    </div>
  );
};


