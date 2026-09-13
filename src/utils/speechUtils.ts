// Speech Synthesis & Recognition Utilities for Mandarin (zh-CN)

let activeUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Find the best available Chinese voice on the device
 */
export function getMandarinVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  
  // Prioritize zh-CN standard Putonghua voices
  const zhCNVoice = voices.find(
    (v) => v.lang === 'zh-CN' || v.lang === 'zh_CN' || v.lang.startsWith('zh-CN')
  );
  if (zhCNVoice) return zhCNVoice;

  // Fallback to any Chinese voice
  const anyZhVoice = voices.find((v) => v.lang.toLowerCase().startsWith('zh'));
  if (anyZhVoice) return anyZhVoice;

  return null;
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
    // Fallback timeout in case event doesn't fire
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 500);
  });
}

/**
 * Speak Mandarin text using Web Speech Synthesis API
 */
export function playMandarinTTS(
  text: string,
  rate: number = 1.0,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: any) => void
): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.(new Error('SpeechSynthesis no soportado en este navegador.'));
    return () => {};
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  // Strip both ASCII and Chinese fullwidth parentheses and notes
  const cleanText = text.replace(/[（\(].*?[）\)]/g, '').trim();
  if (!cleanText) {
    onEnd?.();
    return () => {};
  }

  const utterance = new SpeechSynthesisUtterance(cleanText);
  activeUtterance = utterance;

  utterance.lang = 'zh-CN';
  utterance.rate = Math.max(0.5, Math.min(2.0, rate));
  utterance.pitch = 1.0;

  const voice = getMandarinVoice();
  if (voice) {
    utterance.voice = voice;
  }

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

  // Chrome bug prevention: resume if paused
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }

  window.speechSynthesis.speak(utterance);

  // Return cancel function
  return () => {
    if (activeUtterance === utterance) {
      window.speechSynthesis.cancel();
      activeUtterance = null;
    }
  };
}

/**
 * Stop any ongoing TTS playback
 */
export function stopMandarinTTS(): void {
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

    // If stop() was called while awaiting getUserMedia, release tracks immediately
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
      const normalized = Math.min(1, average / 80); // Scaled 0 to 1
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
