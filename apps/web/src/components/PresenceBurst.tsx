import React, { useMemo } from 'react';
import { Heart, Sparkles } from 'lucide-react';

interface BurstItem {
  angle: number;
  dist: number;
  delay: number;
  size: number;
  type: number;
  spin: number;
}

const createBurstItems = (): BurstItem[] => {
  return Array.from({ length: 48 }, (_, i) => {
    const isInner = i < 16;
    const angle = (i * (360 / 48)) + (Math.random() * 20 - 10);
    const dist = isInner ? 50 + Math.random() * 50 : 120 + Math.random() * 140;
    const delay = Math.random() * 300;
    const size = isInner ? 0.4 + Math.random() * 0.4 : 0.7 + Math.random() * 0.7;
    const type = Math.floor(Math.random() * 6);
    const spin = type <= 1
      ? (Math.random() * 60 - 30)
      : (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360);

    return { angle, dist, delay, size, type, spin };
  });
};

export const PresenceBurst: React.FC = React.memo(() => {
  const burstItems = useMemo(() => createBurstItems(), []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] flex items-center justify-center overflow-hidden">
      <div className="absolute w-32 h-32 rounded-full bg-gradient-to-tr from-rose-400/40 to-fuchsia-400/40 blur-md pr-burst-glow-1" />
      <div className="absolute w-24 h-24 rounded-full bg-pink-300/50 blur-sm pr-burst-glow-2" />
      <div className="absolute w-12 h-12 rounded-full bg-white/90 shadow-[0_0_30px_rgba(255,255,255,1)] pr-burst-glow-3" />

      <div className="absolute">
        {burstItems.map((item, i) => (
          <div
            key={i}
            className="absolute pr-burst-particle flex items-center justify-center"
            style={{
              '--pr-angle': `${item.angle}deg`,
              '--pr-dist': `${item.dist}px`,
              '--pr-size': item.size,
              '--pr-spin': `${item.spin}deg`,
              animationDelay: `${item.delay}ms`,
              marginLeft: '-12px',
              marginTop: '-12px',
              width: '24px',
              height: '24px',
            } as React.CSSProperties}
          >
            {item.type === 0 && (
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
            )}
            {item.type === 1 && (
              <Heart className="w-4 h-4 text-pink-400 fill-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.6)]" />
            )}
            {item.type === 2 && (
              <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.7)]" />
            )}
            {item.type === 3 && (
              <span className="text-xl text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.7)] font-bold">✦</span>
            )}
            {item.type === 4 && (
              <div className="w-2.5 h-2.5 rounded-full bg-sky-300 drop-shadow-[0_0_8px_rgba(125,211,252,0.7)]" />
            )}
            {item.type === 5 && (
              <div className="w-2 h-2 rounded-full bg-white drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

PresenceBurst.displayName = 'PresenceBurst';
