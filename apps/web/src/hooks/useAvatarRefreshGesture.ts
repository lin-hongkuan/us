import { useRef, useState } from 'react';
import { UserType } from '../types';
import { clearIndexedDBCache, clearMemoryCache } from '../services/cacheService';

interface UseAvatarRefreshGestureOptions {
  playRefreshSound: (progress: number) => void;
  playSuccessSound: () => void;
}

export const useAvatarRefreshGesture = ({ playRefreshSound, playSuccessSound }: UseAvatarRefreshGestureOptions) => {
  const [isAvatarShaking, setIsAvatarShaking] = useState<UserType | null>(null);
  const [avatarShakeIntensity, setAvatarShakeIntensity] = useState(0);
  const longPressTimer = useRef<number | null>(null);
  const isLongPress = useRef(false);

  const handleAvatarPressStart = (type: UserType) => {
    isLongPress.current = false;
    setIsAvatarShaking(type);
    setAvatarShakeIntensity(0);

    const startTime = Date.now();
    let lastSoundTime = 0;

    const vibrateLoop = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 3000, 1);
      setAvatarShakeIntensity(progress);

      if (elapsed >= 3000) {
        isLongPress.current = true;
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
        playSuccessSound();
        setIsAvatarShaking(null);
        setAvatarShakeIntensity(0);

        setTimeout(async () => {
          clearMemoryCache();
          await clearIndexedDBCache();
          localStorage.removeItem('us_app_memories');
          sessionStorage.clear();
          window.location.reload();
        }, 500);
        return;
      }

      const delay = 400 - (progress * 320);
      if (navigator.vibrate) {
        navigator.vibrate(20 + Math.floor(progress * 30));
      }

      if (elapsed - lastSoundTime > 150) {
        playRefreshSound(progress);
        lastSoundTime = elapsed;
      }

      longPressTimer.current = window.setTimeout(vibrateLoop, delay);
    };

    vibrateLoop();
  };

  const handleAvatarPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsAvatarShaking(null);
    setAvatarShakeIntensity(0);
    if (!isLongPress.current && navigator.vibrate) {
      navigator.vibrate(0);
    }
  };

  return {
    isAvatarShaking,
    avatarShakeIntensity,
    handleAvatarPressStart,
    handleAvatarPressEnd,
  };
};
