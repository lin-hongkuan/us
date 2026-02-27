import React, { forwardRef, useState, useEffect } from 'react';
import { UserType } from '../types';
import { useAppContext } from '../context/AppContext';
import { Sun, Moon, Star as StarIcon, PenTool, User } from 'lucide-react';

interface HeaderProps {
  activeTab: UserType;
  setActiveTab: (tab: UserType) => void;
  onOpenComposer: () => void;
  onOpenNotice: () => void;
  onToggleUpdate: () => void;
  onLogout: () => void;
}

const BRAND_TITLE_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(135deg, #fb7185 0%, #a855f7 50%, #38bdf8 100%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  backgroundBlendMode: 'hard-light',
  backgroundSize: 'cover, 100px 100px',
  '--shadow-rgb': '168, 85, 247'
} as React.CSSProperties;

export const Header = React.memo(forwardRef<HTMLElement, HeaderProps>(({
  activeTab,
  setActiveTab,
  onOpenComposer,
  onOpenNotice,
  onToggleUpdate,
  onLogout
}, ref) => {
  const { darkMode, toggleDarkMode } = useAppContext();
  const [isLateNight, setIsLateNight] = useState(false);
  const [showSleepMessage, setShowSleepMessage] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 1 && hour < 6) setIsLateNight(true);
  }, []);

  return (
    <header 
      ref={ref}
      className="header-visibility fixed top-0 left-0 right-0 h-20 md:h-24 z-40 px-2 md:px-16 flex items-center justify-between pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] translate-y-0 opacity-100"
    >
      <div className="pointer-events-auto flex items-center gap-2 md:gap-4">
        <a 
          href="https://github.com/lin-hongkuan/us"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center group cursor-pointer select-none mr-2"
        >
           <h1 
             className="font-display text-2xl md:text-3xl font-normal tracking-tight relative transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 origin-center text-transparent bg-clip-text bg-cover texture-text"
             style={BRAND_TITLE_STYLE}
           >
             Us.
           </h1>
        </a>

        {isLateNight && (
          <div className="relative">
              <button
                  onClick={() => setShowSleepMessage(!showSleepMessage)}
                  className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all duration-500 animate-pulse-soft"
                  title="深夜模式"
              >
                  <span className="text-xs md:text-lg">🦉</span>
              </button>
              {showSleepMessage && (
                  <div className="absolute top-full left-0 mt-4 w-48 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 text-center z-50 animate-fadeInUp">
                      <div className="text-2xl mb-2">🌙</div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                          还没睡吗？<br/>要注意身体哦。
                      </p>
                      <div className="absolute -top-2 left-4 w-4 h-4 bg-white dark:bg-slate-800 transform rotate-45 border-t border-l border-slate-100 dark:border-slate-700"></div>
                  </div>
              )}
          </div>
        )}

        <div className="relative">
          <button
            onClick={onOpenNotice}
            data-sound="action"
            className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/95 md:bg-white/80 dark:bg-slate-800/95 md:dark:bg-slate-800/80 md:backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-yellow-400 hover:text-yellow-500 hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200"
            title="公告"
          >
            <StarIcon size={12} className="md:w-[18px] md:h-[18px] fill-current" />
          </button>
        </div>

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleUpdate();
            }}
            className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/95 md:bg-white/80 dark:bg-slate-800/95 md:dark:bg-slate-800/80 md:backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-indigo-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200"
            title="更新公告"
          >
            <span className="text-xs md:text-lg">🔔</span>
          </button>
        </div>
      </div>

      <div className="pointer-events-auto md:hidden bg-white/95 dark:bg-slate-800/95 p-1 rounded-full border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] absolute left-1/2 -translate-x-1/2 z-50">
         <button 
           onClick={() => setActiveTab(UserType.HER)}
           data-sound="her"
           className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-colors duration-200 ${activeTab === UserType.HER ? 'bg-rose-50 dark:bg-rose-900/50 text-rose-500 dark:text-rose-300 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
         >
           她
         </button>
         <button 
           onClick={() => setActiveTab(UserType.HIM)}
           data-sound="him"
           className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-colors duration-200 ${activeTab === UserType.HIM ? 'bg-sky-50 dark:bg-sky-900/50 text-sky-500 dark:text-sky-300 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
         >
           他
         </button>
      </div>

      <div className="pointer-events-auto flex items-center gap-1 md:gap-4">
        <button 
          onClick={onOpenComposer}
          data-sound="action"
          className="group flex items-center gap-2 md:gap-3 bg-gradient-to-r from-rose-400 via-purple-400 to-sky-400 text-white w-9 h-9 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full shadow-[0_10px_30px_-10px_rgba(168,85,247,0.4)] hover:shadow-[0_20px_40px_-12px_rgba(168,85,247,0.6)] hover:-translate-y-1 active:scale-95 transition-all duration-500 justify-center bg-[length:200%_auto] hover:bg-right"
        >
          <PenTool size={12} className="md:w-4 md:h-4 group-hover:-rotate-12 transition-transform duration-500" />
          <span className="text-sm font-medium tracking-widest uppercase hidden md:inline">Record</span>
        </button>

        <button
          onClick={toggleDarkMode}
          data-sound="action"
          className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/95 md:bg-white/80 dark:bg-slate-800/95 md:dark:bg-slate-800/80 md:backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200"
          title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
        >
          {darkMode ? <Sun size={12} className="md:w-[18px] md:h-[18px]" /> : <Moon size={12} className="md:w-[18px] md:h-[18px]" />}
        </button>
        
        <button 
          onClick={onLogout}
           data-sound="action"
           className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/95 md:bg-white/80 dark:bg-slate-800/95 md:dark:bg-slate-800/80 md:backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200 md:hover:rotate-180 md:transition-all md:duration-500"
           title="切换用户"
        >
          <User size={12} className="md:w-[18px] md:h-[18px]" />
        </button>
      </div>
    </header>
  );
}));

Header.displayName = 'Header';
