'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { STORAGE_KEYS } from '../lib/storage';

export function useSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSoundEnabled(window.localStorage.getItem(STORAGE_KEYS.soundEnabled) === 'true');
    audioRef.current = new Audio('/sounds/order-ready.mp3');
    audioRef.current.preload = 'auto';
  }, []);

  const unlock = useCallback(async () => {
    try {
      if (audioRef.current) {
        audioRef.current.muted = true;
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.muted = false;
      }
      window.localStorage.setItem(STORAGE_KEYS.soundEnabled, 'true');
      setSoundEnabled(true);
      return true;
    } catch {
      window.localStorage.setItem(STORAGE_KEYS.soundEnabled, 'true');
      setSoundEnabled(true);
      return false;
    }
  }, []);

  const beepFallback = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gain.gain.value = 0.04;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        void ctx.close();
      }, 180);
    } catch {
      // ignore
    }
  }, []);

  const playReadySound = useCallback(async () => {
    if (!soundEnabled) return;

    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        return;
      }
    } catch {
      // fallback below
    }

    beepFallback();
  }, [beepFallback, soundEnabled]);

  return { soundEnabled, unlock, playReadySound };
}
