import React, { useEffect, useRef } from 'react';
import { Mic, Loader2, Volume2 } from 'lucide-react';
import { TutorState } from '../../types/index.js';

interface AvatarVisualizerProps {
  state: TutorState;
  audioLevel: number; // 0 to 1
  onClickAvatar?: () => void;
  scenarioTitle: string;
}

export const AvatarVisualizer: React.FC<AvatarVisualizerProps> = ({
  state,
  audioLevel,
  onClickAvatar,
  scenarioTitle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Audio wave canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      phase += 0.08;

      const numBars = 24;
      const barWidth = 3;
      const gap = (width - numBars * barWidth) / (numBars + 1);

      for (let i = 0; i < numBars; i++) {
        const x = gap + i * (barWidth + gap);
        let barHeight = 4; // base height

        if (state === 'listening') {
          const sinOffset = Math.sin(phase + i * 0.3);
          barHeight = 6 + (audioLevel * 45 * Math.abs(sinOffset)) + (Math.sin(phase * 2 + i) * 6);
        } else if (state === 'speaking') {
          const wave = Math.sin(phase * 1.5 + i * 0.4) * Math.cos(phase * 0.8 + i * 0.2);
          barHeight = 8 + Math.abs(wave) * 38;
        } else if (state === 'thinking') {
          const shimmer = Math.sin(phase + (i / numBars) * Math.PI * 2);
          barHeight = 6 + Math.abs(shimmer) * 16;
        } else {
          const breathe = Math.sin(phase * 0.4 + i * 0.15);
          barHeight = 4 + Math.abs(breathe) * 6;
        }

        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
        if (state === 'listening') {
          gradient.addColorStop(0, '#f43f5e'); // Rose
          gradient.addColorStop(1, '#fb7185');
        } else if (state === 'speaking') {
          gradient.addColorStop(0, '#10b981'); // Emerald
          gradient.addColorStop(1, '#34d399');
        } else if (state === 'thinking') {
          gradient.addColorStop(0, '#f59e0b'); // Amber
          gradient.addColorStop(1, '#8b5cf6'); // Violet
        } else {
          gradient.addColorStop(0, '#64748b'); // Slate
          gradient.addColorStop(1, '#94a3b8');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        const topY = centerY - barHeight / 2;
        ctx.roundRect(x, topY, barWidth, barHeight, 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [state, audioLevel]);

  // Badge configurations
  const getStatusBadge = () => {
    switch (state) {
      case 'listening':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold animate-pulse">
            <Mic className="w-3.5 h-3.5 text-rose-400" />
            <span>Escuchándote... (habla en chino)</span>
          </div>
        );
      case 'thinking':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold">
            <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Li Ming está pensando...</span>
          </div>
        );
      case 'speaking':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
            <span>Li Ming está hablando...</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
            <span>Li Ming • Listo para conversar</span>
          </div>
        );
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center pt-2 pb-1 px-4 select-none">
      
      {/* Outer Glow Halo according to state */}
      <div className="relative group cursor-pointer" onClick={onClickAvatar} title="Tutor Li Ming (Haz clic para escuchar o pausar)">
        
        {/* Ambient background blur */}
        <div
          className={`absolute -inset-4 rounded-full transition-all duration-700 blur-2xl opacity-60 ${
            state === 'listening'
              ? 'bg-rose-600/40 scale-110'
              : state === 'speaking'
              ? 'bg-emerald-600/40 scale-105'
              : state === 'thinking'
              ? 'bg-amber-500/40 rotate-180 scale-105'
              : 'bg-rose-950/20 scale-95'
          }`}
        />

        {/* Pulsing circular ripples when listening */}
        {state === 'listening' && (
          <>
            <span className="absolute -inset-3 rounded-full border-2 border-rose-500/40 animate-ping" />
            <span className="absolute -inset-6 rounded-full border border-rose-400/20 animate-pulse" />
          </>
        )}

        {/* Orbit ring when thinking */}
        {state === 'thinking' && (
          <div className="absolute -inset-2.5 rounded-full border-2 border-dashed border-amber-400/60 animate-spin" style={{ animationDuration: '4s' }} />
        )}

        {/* Main Circular Sphere / Avatar */}
        <div
          id="tutor-avatar-orb"
          className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center p-1 transition-all duration-500 ${
            state === 'listening'
              ? 'ring-4 ring-rose-500/50 shadow-lg shadow-rose-600/40'
              : state === 'speaking'
              ? 'ring-4 ring-emerald-500/50 shadow-lg shadow-emerald-600/40'
              : state === 'thinking'
              ? 'ring-4 ring-amber-500/50 shadow-lg shadow-amber-600/40'
              : 'ring-2 ring-slate-800 shadow-md shadow-slate-950'
          }`}
        >
          {/* Inner Gradient Core with Face / Character Silhouette */}
          <div className="w-full h-full rounded-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-700/50 flex flex-col items-center justify-center overflow-hidden relative">
            
            {/* Soft inner lighting */}
            <div className="absolute inset-0 bg-radial from-rose-500/10 via-transparent to-transparent opacity-80" />

            {/* Stylized Avatar Visual: Expressive Eyes & Stylized Character */}
            <div className="relative z-10 flex flex-col items-center">
              {/* Eyes */}
              <div className="flex items-center gap-4 mb-2">
                <div
                  className={`w-2 h-2.5 rounded-full transition-all duration-300 ${
                    state === 'listening'
                      ? 'bg-rose-400 scale-y-125'
                      : state === 'thinking'
                      ? 'bg-amber-300 translate-x-0.5'
                      : state === 'speaking'
                      ? 'bg-emerald-300 scale-110'
                      : 'bg-slate-300'
                  }`}
                />
                <div
                  className={`w-2 h-2.5 rounded-full transition-all duration-300 ${
                    state === 'listening'
                      ? 'bg-rose-400 scale-y-125'
                      : state === 'thinking'
                      ? 'bg-amber-300 translate-x-0.5'
                      : state === 'speaking'
                      ? 'bg-emerald-300 scale-110'
                      : 'bg-slate-300'
                  }`}
                />
              </div>

              {/* Chinese Name Stamp */}
              <div className="flex items-center justify-center px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700/70 text-[11px] font-bold text-slate-200 tracking-wider">
                <span className="text-rose-400 mr-1">李明</span>
                <span className="text-[10px] text-slate-400 font-normal">Li Ming</span>
              </div>
            </div>

            {/* Speaking reactive sound glow inside */}
            {state === 'speaking' && (
              <div className="absolute bottom-1 w-8 h-1 rounded-full bg-emerald-400/80 blur-[1px] animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Voice Visualizer Spectrum Bar */}
      <div className="w-48 sm:w-56 h-8 flex items-center justify-center mt-2.5">
        <canvas
          ref={canvasRef}
          width={220}
          height={32}
          className="w-full h-full block"
        />
      </div>

      {/* Status Badge */}
      <div className="mt-1 flex items-center justify-center">
        {getStatusBadge()}
      </div>

      {/* Context Scenario Pill */}
      <div className="mt-1 text-[11px] text-slate-500 font-medium flex items-center gap-1">
        <span>Escenario:</span>
        <span className="text-slate-300 font-semibold">{scenarioTitle}</span>
      </div>

    </div>
  );
};

