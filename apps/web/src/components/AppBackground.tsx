import React, { useMemo } from 'react';
import { INITIAL_AMBIENT_STARS } from '../config/constants';

const NOISE_OVERLAY_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
};

const PAW_OVERLAY_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2364748b' fill-opacity='1'%3E%3Cg transform='translate(10 10) scale(0.4) rotate(-10)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3Cg transform='translate(60 60) scale(0.3) rotate(20)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
};

export const AppBackground: React.FC = React.memo(() => {
  const ambientStarElements = useMemo(() => INITIAL_AMBIENT_STARS().map(star => (
    <span
      key={star.id}
      className="absolute rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.35)] twinkle-star"
      style={{
        top: star.top,
        left: star.left,
        right: star.right,
        bottom: star.bottom,
        width: `${star.size}px`,
        height: `${star.size}px`,
        opacity: star.opacity,
        animationDelay: `${star.delay}s`,
        animationDuration: `${star.duration}s`,
      }}
    />
  )), []);

  return (
    <>
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-0 pointer-events-none z-0" style={NOISE_OVERLAY_STYLE} />
      <div className="absolute -inset-[260px] opacity-[0.08] pointer-events-none z-0 md:animate-moveBackground" style={PAW_OVERLAY_STYLE} />
      <div className="corner-stars absolute inset-0 pointer-events-none z-10 mix-blend-screen">
        {ambientStarElements}
      </div>
    </>
  );
});

AppBackground.displayName = 'AppBackground';
