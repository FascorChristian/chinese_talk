import { useState, useRef, useEffect, useCallback } from 'react';
import { isSpeechRecognitionSupported } from '../utils/speechUtils.js';

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
  const transcriptRef = useRef<string>('');
  const prevSessionTranscriptRef = useRef<string>('');
  const isStartingRef = useRef<boolean>(false);
  const isFinalizedRef = useRef<boolean>(false);
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
  }, []);

  const finalizeAndDeliver = useCallback(() => {
    if (isFinalizedRef.current) return;
    isFinalizedRef.current = true;

    clearTimers();
    isRecordingRef.current = false;
    setIsRecording(false);
    isStartingRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    const finalTranscript = transcriptRef.current.trim();
    onTranscriptFinalized?.(finalTranscript);
  }, [clearTimers, onTranscriptFinalized]);

  const stopRecording = useCallback(() => {
    // Explicit user-driven stop: called by button click or touch release
    finalizeAndDeliver();
  }, [finalizeAndDeliver]);

  const startRecording = useCallback(() => {
    if (isRecordingRef.current || isStartingRef.current) return;

    setError(null);
    transcriptRef.current = '';
    prevSessionTranscriptRef.current = '';
    setTranscript('');
    setRecordingSeconds(0);
    isFinalizedRef.current = false;
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
      // Continuous mode so the microphone does NOT shut off at small pauses
      recognition.continuous = true;

      recognition.onstart = () => {
        isStartingRef.current = false;
        isRecordingRef.current = true;
        setIsRecording(true);
      };

      // Accumulate recognized segments smoothly without automatic cutoff
      recognition.onresult = (event: any) => {
        let currentSessionTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentSessionTranscript += event.results[i][0].transcript;
        }

        const prefix = prevSessionTranscriptRef.current;
        const full = prefix 
          ? `${prefix} ${currentSessionTranscript}`.trim() 
          : currentSessionTranscript.trim();

        transcriptRef.current = full;
        setTranscript(full);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        if (event.error === 'not-allowed') {
          isStartingRef.current = false;
          isRecordingRef.current = false;
          clearTimers();
          setIsRecording(false);
          const msg = 'Permiso de micrófono denegado. Habilita el acceso en tu navegador.';
          setError(msg);
          onError?.(msg);
        } else if (event.error === 'no-speech') {
          // Normal during thinking pauses; keep recording!
        } else {
          const msg = `Aviso de voz: ${event.error}`;
          setError(msg);
          onError?.(msg);
        }
      };

      recognition.onend = () => {
        // If the browser prematurely fires onend while user is still recording,
        // seamlessly auto-restart so the user remains in complete control.
        if (isRecordingRef.current && !isFinalizedRef.current) {
          prevSessionTranscriptRef.current = transcriptRef.current;
          try {
            recognition.start();
            return;
          } catch (restartErr) {
            console.warn('Could not auto-restart recognition session:', restartErr);
          }
        }

        if (!isRecordingRef.current) {
          setIsRecording(false);
          isStartingRef.current = false;
          clearTimers();
        }
      };

      recognition.start();

      // Seconds counter
      timerRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);

      // Max safety timeout (90s) in case the user forgets to stop
      maxSafetyTimerRef.current = setTimeout(() => {
        finalizeAndDeliver();
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
  }, [
    lang, 
    clearTimers, 
    finalizeAndDeliver, 
    onError
  ]);

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
