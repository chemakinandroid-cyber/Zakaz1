import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEYS } from "@/lib/storage";

export function useSound() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED) === "true";
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/order-ready.mp3");
    audioRef.current.preload = "auto";
  }, []);

  const unlock = useCallback(async () => {
    try {
      if (!audioRef.current) return false;
      audioRef.current.muted = true;
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.muted = false;
      setEnabled(true);
      window.localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, "true");
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      unlock();
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("keydown", handler);
    };

    window.addEventListener("click", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });

    return () => {
      window.removeEventListener("click", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("keydown", handler);
    };
  }, [unlock]);

  const playReadySound = useCallback(async () => {
    try {
      if (!audioRef.current || !enabled) return;
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
    } catch {
      // silence
    }
  }, [enabled]);

  return {
    soundEnabled: enabled,
    unlock,
    playReadySound,
  };
}
