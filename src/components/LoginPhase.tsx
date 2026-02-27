import React, { useState, useEffect, useRef } from 'react';
import { UserType, getAvatar, getDailyAvatars } from '../types';
import { QUOTES, START_DATE_STR } from '../config/constants';
import { ClickStarOverlay, dispatchStarPop } from './ClickStarOverlay';

interface LoginPhaseProps {
  onChooseUser: (type: UserType) => void;
}

const NOISE_OVERLAY_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
};

const PAW_OVERLAY_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2364748b' fill-opacity='1'%3E%3Cg transform='translate(10 10) scale(0.4) rotate(-10)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3Cg transform='translate(60 60) scale(0.3) rotate(20)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
};

const LOGO_TEXTURE_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(135deg, #fb7185 0%, #a855f7 50%, #38bdf8 100%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  backgroundBlendMode: 'hard-light',
  backgroundSize: 'cover, 100px 100px',
  '--shadow-rgb': '168, 85, 247'
} as React.CSSProperties;

export const LoginPhase: React.FC<LoginPhaseProps> = ({ onChooseUser }) => {
  const [daysTogether] = useState(() => {
    const startDate = new Date(START_DATE_STR);
    const today = new Date();
    return Math.floor(Math.abs(today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  });
  const [displayDays, setDisplayDays] = useState(0);

  useEffect(() => {
    if (daysTogether === 0) return;
    const duration = 2000;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplayDays(Math.floor(daysTogether * ease));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [daysTogether]);

  const [quoteIndex, setQuoteIndex] = useState<number>(() => {
    if (typeof window === 'undefined' || QUOTES.length === 0) return 0;
    try {
      const stored = window.localStorage.getItem('login_quote_index');
      const lastIndex = stored != null ? parseInt(stored, 10) : -1;
      const nextIndex = Number.isNaN(lastIndex) ? 0 : (lastIndex + 1) % QUOTES.length;
      window.localStorage.setItem('login_quote_index', String(nextIndex));
      return nextIndex;
    } catch {
      return 0;
    }
  });

  const [showSecondLine, setShowSecondLine] = useState(false);
  const currentQuote = QUOTES[quoteIndex] ?? QUOTES[0];

  const handleQuoteClick = (e: React.MouseEvent<HTMLParagraphElement>) => {
    e.stopPropagation();
    if (!QUOTES.length) return;
    setQuoteIndex(prev => {
      const next = (prev + 1) % QUOTES.length;
      try {
        window.localStorage.setItem('login_quote_index', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    setShowSecondLine(false);
    const timer = window.setTimeout(() => setShowSecondLine(true), 1000);
    return () => window.clearTimeout(timer);
  }, [currentQuote, quoteIndex]);

  const loginBackgroundRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const isDesktopPointer = window.matchMedia('(pointer: fine)').matches;
    const isWideEnough = window.matchMedia('(min-width: 768px)').matches;
    if (!isDesktopPointer || !isWideEnough) return;

    const target = loginBackgroundRef.current;
    if (!target) return;

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1
      };
      requestTick();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    let frameId: number | null = null;
    let isRunning = true;
    const ease = 0.015;
    const epsilon = 0.001;

    const requestTick = () => {
      if (!isRunning || frameId !== null) return;
      frameId = requestAnimationFrame(animate);
    };

    const animate = () => {
      frameId = null;
      if (!isRunning) return;
      if (document.hidden) {
        return;
      }

      const deltaX = mousePos.current.x - currentPos.current.x;
      const deltaY = mousePos.current.y - currentPos.current.y;
      if (Math.abs(deltaX) < epsilon && Math.abs(deltaY) < epsilon) {
        return;
      }

      currentPos.current.x += (mousePos.current.x - currentPos.current.x) * ease;
      currentPos.current.y += (mousePos.current.y - currentPos.current.y) * ease;

      const xOffset = currentPos.current.x * 60; 
      const yOffset = currentPos.current.y * 60;

      target.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
      requestTick();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) requestTick();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    requestTick();
    
    return () => {
      isRunning = false;
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  const handleGlobalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    dispatchStarPop(e.clientX, e.clientY);
  };

  return (
    <div 
      onClick={handleGlobalClick}
      className="min-h-screen flex items-center justify-center p-6 font-sans relative overflow-hidden bg-gradient-to-br from-rose-100 via-purple-50 to-sky-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 animate-gradient"
    >
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-0 pointer-events-none z-0" style={NOISE_OVERLAY_STYLE}></div>

      <div className="absolute -inset-[100px] opacity-[0.08] pointer-events-none z-0 md:animate-moveBackground" 
           style={PAW_OVERLAY_STYLE}
      ></div>

      <div ref={loginBackgroundRef} className="absolute -inset-[100px] overflow-hidden pointer-events-none md:transition-transform md:duration-100 md:ease-out">
         <div className="absolute top-[-20%] left-[-10%] w-[500px] md:w-[700px] h-[500px] md:h-[700px] bg-rose-300/30 dark:bg-rose-500/15 rounded-full md:mix-blend-multiply dark:md:mix-blend-screen filter blur-[40px] md:blur-[100px] opacity-70 md:animate-blob" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[500px] md:w-[700px] h-[500px] md:h-[700px] bg-sky-300/30 dark:bg-sky-500/15 rounded-full md:mix-blend-multiply dark:md:mix-blend-screen filter blur-[40px] md:blur-[100px] opacity-70 md:animate-blob md:animation-delay-2000" />
         <div className="absolute top-[20%] left-[20%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-purple-200/30 dark:bg-purple-500/15 rounded-full md:mix-blend-multiply dark:md:mix-blend-screen filter blur-[40px] md:blur-[100px] opacity-50 md:animate-blob md:animation-delay-4000 hidden md:block" />
      </div>

      <div className="max-w-3xl w-full transition-transform duration-500 hover:-translate-y-2">
        <div className="login-card w-full bg-white/90 md:bg-white/60 dark:bg-slate-800/90 md:dark:bg-slate-800/60 md:backdrop-blur-2xl rounded-[3rem] border border-white/60 dark:border-slate-700/60 p-8 md:p-16 relative z-10 flex flex-col md:flex-row items-center gap-12 md:gap-20 login-card-float overflow-hidden">
        <div className="login-card-texture" aria-hidden="true">
          <div className="login-card-shimmer" />
          <div className="login-card-noise" />
        </div>

        <div className="flex-1 text-center md:text-left relative z-10 flex flex-col justify-center">
           <h1 
             className="font-display text-[8rem] md:text-[11rem] font-normal tracking-tighter leading-[0.8] select-none mb-8 md:mb-12 text-transparent bg-clip-text bg-cover texture-text logo-cute"
             style={LOGO_TEXTURE_STYLE}
           >
             Us.
           </h1>
           
           <div className="space-y-8 md:pl-4 border-l-0 md:border-l border-slate-200 dark:border-slate-600">
              <div className="flex flex-col gap-1.5 animate-fadeInUp items-center md:items-start" style={{ animationDelay: '0.2s' }}>
                 <div className="flex items-baseline justify-center md:justify-start gap-2 text-rose-500 dark:text-rose-400 mb-1 select-none group w-full md:w-auto">
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 transition-opacity group-hover:opacity-100 text-right">在一起已经</span>
                    <span className="font-display text-4xl leading-none tabular-nums tracking-tight transition-all duration-700 ease-out group-hover:scale-110 group-hover:text-rose-600 dark:group-hover:text-rose-300 min-w-[3ch] text-center days-number-cute" style={{ textShadow: '0 4px 12px rgba(244, 63, 94, 0.2)' }}>
                      {displayDays}
                    </span>
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 transition-opacity group-hover:opacity-100 text-left">天了！</span>
                 </div>
                 <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold tracking-[0.4em] uppercase">婷and宽的</span>
                 <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold tracking-[0.4em] uppercase">恋爱日记</span>
              </div>

              <p
                className="font-serif text-xl text-slate-600 dark:text-slate-300 italic leading-relaxed opacity-80 cursor-pointer select-none text-center md:text-left"
                onClick={handleQuoteClick}
              >
                {currentQuote.split('\n').map((line, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <br />}
                    {idx === 1 ? (
                      <span
                        className={`inline-block transition-opacity duration-300 ${showSecondLine ? 'opacity-100' : 'opacity-0'}`}
                        style={{ visibility: showSecondLine ? 'visible' : 'hidden' }}
                        aria-hidden={!showSecondLine}
                      >
                        {line}
                      </span>
                    ) : (
                      line
                    )}
                  </React.Fragment>
                ))}
              </p>
           </div>
        </div>

        <div className="flex-1 w-full max-w-xs md:max-w-none">
          <div className="grid grid-cols-2 gap-6">
             <button 
               onClick={() => onChooseUser(UserType.HER)}
               data-sound="her"
               className="group relative aspect-[3/4] rounded-3xl bg-white dark:bg-slate-700 border border-white dark:border-slate-600 shadow-sm hover:shadow-[0_20px_40px_-12px_rgba(251,113,133,0.3)] dark:hover:shadow-[0_20px_40px_-12px_rgba(251,113,133,0.2)] hover:-translate-y-2 transition-all duration-500 flex flex-col items-center justify-center gap-4 overflow-hidden"
             >
               <div className="absolute inset-0 bg-gradient-to-b from-rose-50/80 dark:from-rose-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               
               <div className="absolute top-3 left-3 w-2 h-2 border-t border-l border-rose-200 dark:border-rose-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
               <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-rose-200 dark:border-rose-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
               <div className="absolute bottom-3 left-3 w-2 h-2 border-b border-l border-rose-200 dark:border-rose-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
               <div className="absolute bottom-3 right-3 w-2 h-2 border-b border-r border-rose-200 dark:border-rose-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

               <div className="relative z-10 w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-900/30 border-4 border-white dark:border-slate-600 shadow-inner flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500">
                  {getAvatar(UserType.HER)}
               </div>
               <span className="relative z-10 font-serif font-bold text-lg text-rose-900/60 dark:text-rose-300 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">可爱婷</span>
             </button>

             <button 
               onClick={() => onChooseUser(UserType.HIM)}
               data-sound="him"
               className="group relative aspect-[3/4] rounded-3xl bg-white dark:bg-slate-700 border border-white dark:border-slate-600 shadow-sm hover:shadow-[0_20px_40px_-12px_rgba(56,189,248,0.3)] dark:hover:shadow-[0_20px_40px_-12px_rgba(56,189,248,0.2)] hover:-translate-y-2 transition-all duration-500 flex flex-col items-center justify-center gap-4 overflow-hidden"
             >
               <div className="absolute inset-0 bg-gradient-to-b from-sky-50/80 dark:from-sky-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               
               <div className="absolute top-3 left-3 w-2 h-2 border-t border-l border-sky-200 dark:border-sky-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
               <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-sky-200 dark:border-sky-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
               <div className="absolute bottom-3 left-3 w-2 h-2 border-b border-l border-sky-200 dark:border-sky-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
               <div className="absolute bottom-3 right-3 w-2 h-2 border-b border-r border-sky-200 dark:border-sky-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

               <div className="relative z-10 w-20 h-20 rounded-full bg-sky-50 dark:bg-sky-900/30 border-4 border-white dark:border-slate-600 shadow-inner flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500">
                  {getAvatar(UserType.HIM)}
               </div>
               <span className="relative z-10 font-serif font-bold text-lg text-sky-900/60 dark:text-sky-300 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">小男奴</span>
             </button>
          </div>
          <p className="text-center text-slate-300 dark:text-slate-500 text-[10px] mt-4 font-bold tracking-[0.3em] uppercase">
            {getDailyAvatars().desc}
          </p>
          <p className="text-center text-slate-300 dark:text-slate-500 text-[10px] mt-4 font-bold tracking-[0.3em] uppercase">请问你是？</p>
        </div>

        </div>
      </div>

      <ClickStarOverlay />
    </div>
  );
};
