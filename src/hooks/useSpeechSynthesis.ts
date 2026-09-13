import { useState, useRef, useEffect, useCallback } from 'react';
import { playMandarinTTS, stopMandarinTTS } from '../utils/speechUtils.js';

interface UseSpeechSynthesisProps {
  speechRate?: number;
}

export function useSpeechSynthesis({ speechRate = 1.0 }: UseSpeechSynthesisProps = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentText, setCurrentText] = useState<string | null>(null);
  const cancelTtsRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    if (cancelTtsRef.current) {
      cancelTtsRef.current();
      cancelTtsRef.current = null;
    }
    stopMandarinTTS();
    setIsPlaying(false);
    setCurrentText(null);
  }, []);

  const speak = useCallback(
    (
      text: string,
      customRate?: number,
      onStart?: () => void,
      onEnd?: () => void,
      onError?: (err: any) => void
    ) => {
      stop();

      const rateToUse = customRate ?? speechRate;
      setCurrentText(text);
      setIsPlaying(true);

      cancelTtsRef.current = playMandarinTTS(
        text,
        rateToUse,
        () => {
          setIsPlaying(true);
          onStart?.();
        },
        () => {
          setIsPlaying(false);
          setCurrentText(null);
          onEnd?.();
        },
        (err) => {
          setIsPlaying(false);
          setCurrentText(null);
          onError?.(err);
        }
      );
    },
    [speechRate, stop]
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    isPlaying,
    currentText,
    speak,
    stop,
  };
}

