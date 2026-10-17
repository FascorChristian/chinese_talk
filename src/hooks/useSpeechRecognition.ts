import { useState, useRef, useEffect, useCallback } from 'react';
import { isSpeechRecognitionSupported, isMobileBrowser } from '../utils/speechUtils.js';

interface UseSpeechRecognitionOptions {
  lang?: string;
  onTranscriptFinalized?: (transcript: string) => void;
  onError?: (errorMsg: string) => void;
}

export function useSpeechRecognition({
  lang = 'zh-CN',
  onTranscriptFinalized,
  onError,
}: UseSpeechRecognitionOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const maxSafetyTimerRef = useRef<any>(null);
  const flushTimerRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const prevSessionTranscriptRef = useRef<string>('');
  const isStartingRef = useRef<boolean>(false);
  const isFinalizedRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const isRecordingRef = useRef<boolean>(false);

  const isSupported = isSpeechRecognitionSupported();

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxSafetyTimerRef.current) {
      clearTimeout(maxSafetyTimerRef.current);
      maxSafetyTimerRef.current = null;
    }
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  const deliverFinalTranscript = useCallback(() => {
    if (isFinalizedRef.current) return;
    isFinalizedRef.current = true;
    isStoppingRef.current = false;

    clearTimers();
    isRecordingRef.current = false;
    setIsRecording(false);
    isStartingRef.current = false;
    recognitionRef.current = null;

    const finalTranscript = transcriptRef.current.trim();
    onTranscriptFinalized?.(finalTranscript);
  }, [clearTimers, onTranscriptFinalized]);

  const stopRecording = useCallback(() => {
    if (isFinalizedRef.current || isStoppingRef.current) return;
    isStoppingRef.current = true;
    isRecordingRef.current = false;
    setIsRecording(false);
    isStartingRef.current = false;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        // Use stop() rather than abort() so buffered mobile audio flushes its final onresult
        recognitionRef.current.stop();
      } catch {}
    }

    // Give mobile browsers ~260ms to fire the final onresult before reading transcriptRef
    flushTimerRef.current = setTimeout(() => {
      deliverFinalTranscript();
    }, 260);
  }, [deliverFinalTranscript]);

  const startRecording = useCallback(() => {
    if (isRecordingRef.current || isStartingRef.current) return;

    setError(null);
    transcriptRef.current = '';
    prevSessionTranscriptRef.current = '';
    setTranscript('');
    setRecordingSeconds(0);
    isFinalizedRef.current = false;
    isStoppingRef.current = false;
    clearTimers();

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      const msg = 'Tu navegador no soporta Speech Recognition nativo en zh-CN.';
      setError(msg);
      onError?.(msg);
      return;
    }

    try {
      isStartingRef.current = true;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      // On Android Chrome, continuous=true causes cumulative duplicate strings;
      // using auto-restart on onend works cleanly across both Android and Desktop.
      recognition.continuous = !isMobileBrowser();

      recognition.onstart = () => {
        isStartingRef.current = false;
        isRecordingRef.current = true;
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let currentSessionTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          const seg = (event.results[i][0]?.transcript || '').trim();
          if (!seg) continue;
          // Guard against Android Chrome cumulative overlap where results[i] starts with results[i-1]
          if (currentSessionTranscript && seg.startsWith(currentSessionTranscript)) {
            currentSessionTranscript = seg;
          } else if (currentSessionTranscript && currentSessionTranscript.endsWith(seg)) {
            // Already included
          } else {
            currentSessionTranscript += seg;
          }
        }

        const prefix = prevSessionTranscriptRef.current;
        let full = currentSessionTranscript.trim();
        if (prefix) {
          if (full.startsWith(prefix)) {
            // Already includes prefix
          } else {
            full = `${prefix} ${full}`.trim();
          }
        }

        transcriptRef.current = full;
        setTranscript(full);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          isStartingRef.current = false;
          isRecordingRef.current = false;
          isStoppingRef.current = false;
          clearTimers();
          setIsRecording(false);
          const msg = 'Permiso de micrófono denegado. Habilita el acceso en tu navegador.';
          setError(msg);
          onError?.(msg);
        } else if (event.error === 'no-speech' || event.error === 'aborted') {
          // Normal during thinking pauses or manual stop; ignore
        } else {
          const msg = `Aviso de voz: ${event.error}`;
          setError(msg);
          onError?.(msg);
        }
      };

      recognition.onend = () => {
        // If user clicked stop, flush right after onend settles
        if (isStoppingRef.current && !isFinalizedRef.current) {
          if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
          flushTimerRef.current = setTimeout(() => {
            deliverFinalTranscript();
          }, 60);
          return;
        }

        // If the browser prematurely fires onend while user is still recording,
        // seamlessly auto-restart so the user remains in complete control.
        if (isRecordingRef.current && !isFinalizedRef.current && !isStoppingRef.current) {
          prevSessionTranscriptRef.current = transcriptRef.current;
          try {
            recognition.start();
            return;
          } catch (restartErr) {
            console.warn('Could not auto-restart recognition session:', restartErr);
          }
        }

        if (!isRecordingRef.current && !isStoppingRef.current) {
          setIsRecording(false);
          isStartingRef.current = false;
          clearTimers();
        }
      };

      recognition.start();

      timerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);

      maxSafetyTimerRef.current = setTimeout(() => {
        stopRecording();
      }, 90000);
    } catch (err: any) {
      isStartingRef.current = false;
      isRecordingRef.current = false;
      clearTimers();
      setIsRecording(false);
      console.warn('SpeechRecognition startup exception:', err);
      const msg = 'No se pudo iniciar el reconocimiento de voz.';
      setError(msg);
      onError?.(msg);
    }
  }, [lang, clearTimers, deliverFinalTranscript, stopRecording, onError]);

  useEffect(() => {
    return () => {
      clearTimers();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [clearTimers]);

  return {
    isSupported,
    isRecording,
    recordingSeconds,
    transcript,
    error,
    startRecording,
    stopRecording,
    clearError: () => setError(null),
  };
}
