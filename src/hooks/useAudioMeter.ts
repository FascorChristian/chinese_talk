import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioMeter } from '../utils/speechUtils.js';

export function useAudioMeter() {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const meterRef = useRef<AudioMeter | null>(null);

  const start = useCallback(async () => {
    // Stop any existing instance
    if (meterRef.current) {
      meterRef.current.stop();
      meterRef.current = null;
    }

    try {
      const meter = new AudioMeter((volume) => {
        setAudioLevel(volume);
      });
      meterRef.current = meter;
      await meter.start();
    } catch (err) {
      console.warn('AudioMeter initialization notice:', err);
      setAudioLevel(0);
    }
  }, []);

  const stop = useCallback(() => {
    if (meterRef.current) {
      meterRef.current.stop();
      meterRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    audioLevel,
    start,
    stop,
  };
}

