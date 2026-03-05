import React, { useState, useEffect, useRef } from 'react';
import { UserType, getAvatar } from '../types';
import { useAppContext } from '../context/AppContext';

interface TransitionPhaseProps {
  currentUser: UserType | null;
  isLoading: boolean;
  onTransitionComplete: () => void;
}

export const TransitionPhase: React.FC<TransitionPhaseProps> = ({ 
  currentUser, 
  isLoading, 
  onTransitionComplete 
}) => {
  const [transitionRetracting, setTransitionRetracting] = useState(false);
  const [transitionRingProgress, setTransitionRingProgress] = useState(0);
  const retractScheduledRef = useRef(false);
  const retractTimeoutRef = useRef<number | null>(null);
  const transitionProgressRafRef = useRef<number | null>(null);
  const transitionEnteredAtRef = useRef<number>(Date.now());
  const { playLoadCompleteSound } = useAppContext();

  const LOAD_COMPLETE_SOUND_MIN_MS = 500;

  useEffect(() => {
    transitionEnteredAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const elapsed = Date.now() - transitionEnteredAtRef.current;
      if (elapsed >= LOAD_COMPLETE_SOUND_MIN_MS) playLoadCompleteSound();
      setTransitionRingProgress(100);
      return;
    }
    setTransitionRingProgress(0);
    const duration = 1600;
    const maxProgress = 90;
    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);
      const p = maxProgress * eased;
      setTransitionRingProgress(p);
      if (t < 1) {
        transitionProgressRafRef.current = requestAnimationFrame(tick);
      }
    };
    transitionProgressRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (transitionProgressRafRef.current != null) {
        cancelAnimationFrame(transitionProgressRafRef.current);
        transitionProgressRafRef.current = null;
      }
    };
  }, [isLoading, playLoadCompleteSound]);

  useEffect(() => {
    if (isLoading || transitionRetracting) return;
    if (retractScheduledRef.current) return;
    retractScheduledRef.current = true;
    const minStayMs = 800;
    retractTimeoutRef.current = window.setTimeout(() => {
      retractTimeoutRef.current = null;
      setTransitionRetracting(true);
    }, minStayMs);
    return () => {
      if (retractTimeoutRef.current) {
        clearTimeout(retractTimeoutRef.current);
        retractTimeoutRef.current = null;
      }
      retractScheduledRef.current = false;
    };
  }, [isLoading, transitionRetracting]);

  if (!currentUser) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden flex items-center justify-center">
      <div
        className={`absolute inset-0 overlay-bloom bg-gradient-to-br ${
          currentUser === UserType.HER
            ? 'from-rose-200/80 via-purple-200/70 to-sky-200/80'
            : 'from-sky-200/80 via-purple-200/70 to-rose-200/80'
        } ${transitionRetracting ? 'overlay-bg-fade-out' : ''}`}
      />
      <div
        className={`relative z-10 flex flex-col items-center gap-4 overlay-emoji ${transitionRetracting ? 'overlay-retract' : ''}`}
        onAnimationEnd={(e) => {
          if (String(e.animationName).includes('overlay-retract')) {
            onTransitionComplete();
          }
        }}
      >
        <div className="relative flex items-center justify-center overflow-visible">
          <div className="absolute -inset-2 overlay-ring">
            <svg className="w-full h-full drop-shadow-[0_0_8px_rgba(168,85,247,0.2)]" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="overlay-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fb7185" />
                  <stop offset="50%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="3"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="url(#overlay-ring-gradient)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={282.74}
                strokeDashoffset={282.74 * (1 - transitionRingProgress / 100)}
                transform="rotate(-90 50 50)"
                className={`transition-[stroke-dashoffset] ease-out ${transitionRingProgress >= 100 ? 'duration-500 overlay-ring-complete' : 'duration-150'}`}
              />
            </svg>
          </div>
          <div className={`relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/80 backdrop-blur-xl border border-white/70 shadow-[0_18px_45px_rgba(15,23,42,0.18)] flex items-center justify-center text-5xl md:text-6xl ${!transitionRetracting ? 'overlay-breathe' : ''}`}>
            {getAvatar(currentUser)}
          </div>
        </div>
        <span className="font-display text-5xl md:text-6xl tracking-tight text-slate-800/90">
          Us.
        </span>
      </div>
    </div>
  );
};
