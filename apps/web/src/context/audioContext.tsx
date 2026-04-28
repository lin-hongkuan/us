import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

export type ClickSoundType = 'default' | 'her' | 'him' | 'action' | 'stamp';

interface AudioContextValue {
  playClickSound: (type?: ClickSoundType) => void;
  playRefreshSound: (progress: number) => void;
  playLoadCompleteSound: () => void;
  playSuccessSound: () => void;
}

const SoundContext = createContext<AudioContextValue | undefined>(undefined);

const isClickSoundType = (value: string | null): value is ClickSoundType => {
  return value === 'default' || value === 'her' || value === 'him' || value === 'action' || value === 'stamp';
};

interface AudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

const getAudioContext = (audioCtxRef: React.MutableRefObject<AudioContext | null>): AudioContext | null => {
  const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
    audioCtxRef.current = new AudioContextClass();
  }
  const audioCtx = audioCtxRef.current;
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
};

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playClickSound = useCallback((type: ClickSoundType = 'default') => {
    const audioCtx = getAudioContext(audioCtxRef);
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'her') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } else if (type === 'him') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(300, now);
      oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } else if (type === 'action') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(500, now);
      oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } else if (type === 'stamp') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(150, now);
      oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } else {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const soundElement = target.closest('[data-sound]');
      const type = soundElement ? soundElement.getAttribute('data-sound') : 'default';
      playClickSound(isClickSoundType(type) ? type : 'default');
    };
    window.addEventListener('mousedown', handleClick, { passive: true });
    return () => window.removeEventListener('mousedown', handleClick);
  }, [playClickSound]);

  const playRefreshSound = useCallback((progress: number) => {
    const audioCtx = getAudioContext(audioCtxRef);
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    const freq = 300 + progress * 500;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    oscillator.start(now);
    oscillator.stop(now + 0.08);
  }, []);

  const playLoadCompleteSound = useCallback(() => {
    const audioCtx = getAudioContext(audioCtxRef);
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.06, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.008, now + 0.22);

    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.connect(gainNode);
      osc.start(start);
      osc.stop(start + duration);
    };
    playNote(392, now, 0.1);
    playNote(523.25, now + 0.1, 0.12);
  }, []);

  const playSuccessSound = useCallback(() => {
    const audioCtx = getAudioContext(audioCtxRef);
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523, now);
    oscillator.frequency.setValueAtTime(659, now + 0.1);
    oscillator.frequency.setValueAtTime(784, now + 0.2);
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    oscillator.start(now);
    oscillator.stop(now + 0.4);
  }, []);

  const value = useMemo(() => ({ playClickSound, playRefreshSound, playLoadCompleteSound, playSuccessSound }), [
    playClickSound,
    playRefreshSound,
    playLoadCompleteSound,
    playSuccessSound,
  ]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
};

export const useSoundContext = () => {
  const context = useContext(SoundContext);
  if (!context) throw new Error('useSoundContext must be used within a SoundProvider');
  return context;
};
