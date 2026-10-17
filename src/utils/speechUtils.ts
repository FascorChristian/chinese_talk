// Speech Synthesis & Recognition Utilities for Mandarin (zh-CN)
// Supports HTML5 Audio hardware playbackRate (0.75x, 1.0x, 1.25x) via /api/tts
// with seamless fallback to Web Speech Synthesis API.

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeAudio: HTMLAudioElement | null = null;
let activePlaybackCancelled = false;
let currentGlobalRate = 1.0;

/**
 * Find the best available Chinese voice on the device.
 * Prefers localService voices when rate != 1.0 because Chrome's remote Google voices ignore utterance.rate.
 */
export function getMandarinVoice(preferLocalForSpeed = false): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();

  const zhCNVoices = voices.filter(
    (v) => v.lang === 'zh-CN' || v.lang === 'zh_CN' || v.lang.startsWith('zh-CN')
  );

  if (preferLocalForSpeed) {
    const localZhCN = zhCNVoices.find((v) => v.localService);
    if (localZhCN) return localZhCN;
  }

  if (zhCNVoices.length > 0) return zhCNVoices[0];

  const anyZhVoice = voices.find((v) => v.lang.toLowerCase().startsWith('zh'));
  if (anyZhVoice) return anyZhVoice;

  return null;
}

/**
 * Dynamically update the playback speed of any currently playing audio
 */
export function setGlobalPlaybackRate(rate: number): void {
  const clamped = Math.max(0.5, Math.min(2.0, rate));
  currentGlobalRate = clamped;
  if (activeAudio) {
    try {
      activeAudio.playbackRate = clamped;
      activeAudio.defaultPlaybackRate = clamped;
    } catch {}
  }
}

/**
 * Preload voices on modern browsers
 */
export function initVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return resolve([]);
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      return resolve(voices);
    }
    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 500);
  });
}

/**
 * Fallback Web Speech Synthesis with fix for voice assignment resetting rate
 */
function playViaWebSpeechFallback(
  cleanText: string,
  rate: number,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.(new Error('SpeechSynthesis no soportado en este navegador.'));
    return () => {};
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  activeUtterance = utterance;

  const clampedRate = Math.max(0.5, Math.min(2.0, rate));
  const voice = getMandarinVoice(Math.abs(clampedRate - 1.0) > 0.05);
  if (voice) {
    utterance.voice = voice;
  }

  // IMPORTANT: Set lang, pitch, and rate AFTER setting utterance.voice
  // because assigning utterance.voice resets rate to 1.0 on WebKit/Blink.
  utterance.lang = 'zh-CN';
  utterance.pitch = 1.0;
  utterance.rate = clampedRate;

  utterance.onstart = () => {
    onStart?.();
  };

  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    onEnd?.();
  };

  utterance.onerror = (e) => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      console.warn('Speech synthesis error:', e);
      onError?.(e);
    } else {
      onEnd?.();
    }
  };

  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }

  window.speechSynthesis.speak(utterance);

  return () => {
    if (activeUtterance === utterance) {
      window.speechSynthesis.cancel();
      activeUtterance = null;
    }
  };
}

/**
 * Split long Mandarin text into chunks <= 160 chars at punctuation boundaries
 */
function splitMandarinChunks(text: string): string[] {
  if (text.length <= 160) return [text];
  const rawSentences = text.split(/(?<=[。！？；.!?\n])/);
  const chunks: string[] = [];
  let current = '';

  for (const part of rawSentences) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if ((current + trimmed).length <= 160) {
      current += trimmed;
    } else {
      if (current) chunks.push(current);
      if (trimmed.length <= 160) {
        current = trimmed;
      } else {
        for (let i = 0; i < trimmed.length; i += 150) {
          chunks.push(trimmed.slice(i, i + 150));
        }
        current = '';
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [text.slice(0, 160)];
}

/**
 * Speak Mandarin text using HTML5 Audio (/api/tts) for exact hardware speed control (0.75x, 1.0x, 1.25x)
 * with automatic fallback to Web Speech Synthesis API.
 */
export function playMandarinTTS(
  text: string,
  rate: number = 1.0,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): () => void {
  stopMandarinTTS();

  const cleanText = text.replace(/[（\(].*?[）\)]/g, '').trim();
  if (!cleanText) {
    onEnd?.();
    return () => {};
  }

  const clampedRate = Math.max(0.5, Math.min(2.0, rate));
  currentGlobalRate = clampedRate;
  activePlaybackCancelled = false;

  const chunks = splitMandarinChunks(cleanText);
  let chunkIndex = 0;
  let hasStarted = false;
  let fallbackCancel: (() => void) | null = null;

  const playNextChunk = () => {
    if (activePlaybackCancelled) return;
    if (chunkIndex >= chunks.length) {
      activeAudio = null;
      onEnd?.();
      return;
    }

    const chunk = chunks[chunkIndex++];
    const audio = new Audio(`/api/tts?text=${encodeURIComponent(chunk)}`);
    activeAudio = audio;

    // Enforce hardware playbackRate and pitch preservation
    audio.preload = 'auto';
    audio.defaultPlaybackRate = currentGlobalRate;
    audio.playbackRate = currentGlobalRate;
    if ('preservesPitch' in audio) {
      (audio as any).preservesPitch = true;
    } else if ('webkitPreservesPitch' in audio) {
      (audio as any).webkitPreservesPitch = true;
    }

    audio.onloadedmetadata = () => {
      audio.playbackRate = currentGlobalRate;
    };

    audio.onplay = () => {
      audio.playbackRate = currentGlobalRate;
      if (!hasStarted) {
        hasStarted = true;
        onStart?.();
      }
    };

    audio.onended = () => {
      if (activeAudio === audio) {
        activeAudio = null;
      }
      playNextChunk();
    };

    audio.onerror = () => {
      if (activePlaybackCancelled) return;
      activeAudio = null;
      // Fallback to browser SpeechSynthesis if backend /api/tts is unreachable
      fallbackCancel = playViaWebSpeechFallback(cleanText, currentGlobalRate, onStart, onEnd, onError);
    };

    audio.play().catch(() => {
      if (activePlaybackCancelled) return;
      activeAudio = null;
      fallbackCancel = playViaWebSpeechFallback(cleanText, currentGlobalRate, onStart, onEnd, onError);
    });
  };

  playNextChunk();

  return () => {
    activePlaybackCancelled = true;
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.src = '';
      } catch {}
      activeAudio = null;
    }
    if (fallbackCancel) {
      fallbackCancel();
      fallbackCancel = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      activeUtterance = null;
    }
  };
}

/**
 * Stop any ongoing TTS playback
 */
export function stopMandarinTTS(): void {
  activePlaybackCancelled = true;
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.src = '';
    } catch {}
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
}

/**
 * Detect Web Speech Recognition support
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Detect if running on a mobile device (Android / iOS) where getUserMedia locks the mic from SpeechRecognition
 */
export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Audio visualizer helper using MediaStream AudioContext
 */
export class AudioMeter {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private animFrame: number | null = null;
  private onVolumeChange: (volume: number) => void;
  private isStopped: boolean = false;

  constructor(onVolumeChange: (volume: number) => void) {
    this.onVolumeChange = onVolumeChange;
  }

  async start(): Promise<MediaStream | null> {
    // On mobile browsers, opening a parallel getUserMedia stream blocks SpeechRecognition
    // from accessing the hardware microphone. Simulate reactive volume instead.
    if (isMobileBrowser()) {
      this.isStopped = false;
      const tickMobile = () => {
        if (this.isStopped) return;
        const simulated = 0.25 + Math.random() * 0.45;
        this.onVolumeChange(simulated);
        this.animFrame = window.setTimeout(() => {
          requestAnimationFrame(tickMobile);
        }, 120) as unknown as number;
      };
      tickMobile();
      return null;
    }

    this.isStopped = false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      this.isStopped = true;
      throw err;
    }

    if (this.isStopped) {
      stream.getTracks().forEach((track) => track.stop());
      return null;
    }

    this.stream = stream;

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return stream;

    this.audioCtx = new AudioContextClass();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.5;

    this.microphone = this.audioCtx.createMediaStreamSource(stream);
    this.microphone.connect(this.analyser);

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const tick = () => {
      if (this.isStopped || !this.analyser || !this.audioCtx || this.audioCtx.state === 'closed') {
        return;
      }
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const normalized = Math.min(1, average / 80);
      this.onVolumeChange(normalized);
      this.animFrame = requestAnimationFrame(tick);
    };

    tick();
    return stream;
  }

  stop(): void {
    this.isStopped = true;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      clearTimeout(this.animFrame);
      this.animFrame = null;
    }
    if (this.microphone) {
      try {
        this.microphone.disconnect();
      } catch {}
      this.microphone = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.onVolumeChange(0);
  }
}
