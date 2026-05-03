import React, { forwardRef, useState, useEffect, useCallback, useRef } from 'react';
import { UserType } from '../types';
import { useAppContext } from '../context/AppContext';
import { Sun, Moon, Star as StarIcon, PenTool, User, Minus, Square, X, Copy, CalendarDays, MoreHorizontal } from 'lucide-react';

const isTauri = !!(window as any).__TAURI_INTERNALS__;

const WindowControls: React.FC = () => {
  const [maximized, setMaximized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleMinimize = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    getCurrentWindow().minimize();
  }, []);

  const handleToggleMaximize = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    const win = getCurrentWindow();
    await win.toggleMaximize();
    setMaximized(await win.isMaximized());
  }, []);

  const handleClose = useCallback(async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    // 对于主窗口，点击关闭时隐藏到托盘，而不是退出程序
    getCurrentWindow().hide();
  }, []);

  useEffect(() => {
    if (!isTauri) return;
    let cleanup: (() => void) | undefined;
    (async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();
      setMaximized(await win.isMaximized());
      const unlisten = await win.onResized(async () => {
        setMaximized(await win.isMaximized());
      });
      cleanup = unlisten;
    })();
    return () => { cleanup?.(); };
  }, []);

  if (!isTauri) return null;

  return (
    <div 
      className="pointer-events-auto flex items-center relative z-50 h-9 md:h-12"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 灵动岛外壳 */}
      <div 
        className={`bg-white/95 md:bg-white/80 dark:bg-slate-800/95 md:dark:bg-slate-800/80 md:backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isHovered 
            ? 'w-24 md:w-32 h-9 md:h-12 rounded-full px-2' 
            : 'w-9 md:w-12 h-9 md:h-12 rounded-full'
        }`}
      >
        {/* 未悬浮状态：三个小圆点 */}
        <div 
          className={`absolute flex gap-1 items-center transition-all duration-200 ${isHovered ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}
        >
          <div className="w-[3px] h-[3px] md:w-1 md:h-1 rounded-full bg-slate-400 dark:bg-slate-500"></div>
          <div className="w-[3px] h-[3px] md:w-1 md:h-1 rounded-full bg-slate-400 dark:bg-slate-500"></div>
          <div className="w-[3px] h-[3px] md:w-1 md:h-1 rounded-full bg-slate-400 dark:bg-slate-500"></div>
        </div>

        {/* 悬浮状态：真实的控制按钮 */}
        <div 
          className={`flex items-center justify-between w-full h-full transition-all duration-300 delay-75 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none absolute'}`}
        >
          <button 
            onClick={handleMinimize} 
            className="flex-1 h-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors duration-200 group rounded-l-full" 
            title="最小化"
          >
            <div className="group-hover:bg-slate-100 dark:group-hover:bg-slate-700 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-colors">
              <Minus size={12} className="md:w-3.5 md:h-3.5" strokeWidth={2.5} />
            </div>
          </button>
          
          <button 
            onClick={handleToggleMaximize} 
            className="flex-1 h-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors duration-200 group" 
            title={maximized ? '向下还原' : '最大化'}
          >
            <div className="group-hover:bg-slate-100 dark:group-hover:bg-slate-700 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-colors">
              {maximized ? (
                <Copy size={10} className="md:w-3 md:h-3 rotate-180" strokeWidth={2.5} />
              ) : (
                <Square size={10} className="md:w-3 md:h-3" strokeWidth={2.5} />
              )}
            </div>
          </button>
          
          <button 
            onClick={handleClose} 
            className="flex-1 h-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors duration-200 group rounded-r-full" 
            title="关闭"
          >
            <div className="group-hover:bg-rose-50 dark:group-hover:bg-rose-900/30 w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-colors">
              <X size={12} className="md:w-3.5 md:h-3.5" strokeWidth={2.5} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

interface HeaderProps {
  activeTab: UserType;
  setActiveTab: (tab: UserType) => void;
  onOpenComposer: () => void;
  onOpenNotice: () => void;
  onToggleUpdate: () => void;
  onToggleHeatmap: () => void;
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
  onToggleHeatmap,
  onLogout
}, ref) => {
  const { darkMode, toggleDarkMode } = useAppContext();
  const [isLateNight, setIsLateNight] = useState(false);
  const [showSleepMessage, setShowSleepMessage] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 1 && hour < 6) setIsLateNight(true);
  }, []);

  useEffect(() => {
    if (!isMoreMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMoreMenuOpen(false);
    };
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!moreMenuRef.current) return;
      const target = event.target as Node | null;
      if (target && !moreMenuRef.current.contains(target)) {
        setIsMoreMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isMoreMenuOpen]);

  const handleMoreItem = useCallback((handler: () => void) => {
    setIsMoreMenuOpen(false);
    handler();
  }, []);

  return (
    <header 
      ref={ref}
      className="header-visibility fixed top-0 left-0 right-0 h-20 md:h-24 z-40 px-2 md:px-16 flex items-center justify-between pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] translate-y-0 opacity-100"
    >
      {isTauri && (
        <div data-tauri-drag-region className="absolute inset-0 pointer-events-auto" style={{ zIndex: -1 }} />
      )}
      <div className="pointer-events-auto flex items-center gap-2 md:gap-4">
        <a
          href="https://github.com/lin-hongkuan/us"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="访问 Us 项目仓库"
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
                  aria-label="深夜模式提示"
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

        <div className="hidden md:flex items-center gap-2 md:gap-4">
          <div className="relative">
            <button
              onClick={onOpenNotice}
              data-sound="action"
              aria-label="公告"
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
              aria-label="更新公告"
              className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/95 md:bg-white/80 dark:bg-slate-800/95 md:dark:bg-slate-800/80 md:backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-indigo-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200"
              title="更新公告"
            >
              <span className="text-xs md:text-lg">🔔</span>
            </button>
          </div>

          <div className="relative">
            <button
              onClick={onToggleHeatmap}
              data-sound="action"
              aria-label="打开记忆日历"
              className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/95 md:bg-white/80 dark:bg-slate-800/95 md:dark:bg-slate-800/80 md:backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-violet-400 hover:text-violet-500 hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200"
              title="记忆日历"
            >
              <CalendarDays size={12} className="md:w-[18px] md:h-[18px]" />
            </button>
          </div>
        </div>

        <div ref={moreMenuRef} className="relative md:hidden">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMoreMenuOpen((prev) => !prev);
            }}
            data-sound="action"
            aria-label="更多"
            aria-haspopup="menu"
            aria-expanded={isMoreMenuOpen}
            className="w-9 h-9 rounded-full bg-white/95 dark:bg-slate-800/95 border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200"
            title="更多"
          >
            <MoreHorizontal size={14} />
          </button>
          {isMoreMenuOpen && (
            <div
              role="menu"
              className="absolute top-full left-0 mt-3 w-44 p-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 animate-fadeInUp"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMoreItem(onOpenNotice)}
                data-sound="action"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 hover:text-yellow-500 transition-colors duration-150"
              >
                <span className="w-7 h-7 rounded-full bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center text-yellow-400">
                  <StarIcon size={14} className="fill-current" />
                </span>
                公告
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMoreItem(onToggleUpdate)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-500 transition-colors duration-150"
              >
                <span className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-base">
                  🔔
                </span>
                更新公告
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMoreItem(onToggleHeatmap)}
                data-sound="action"
                aria-label="打开记忆日历"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-500 transition-colors duration-150"
              >
                <span className="w-7 h-7 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center text-violet-400">
                  <CalendarDays size={14} />
                </span>
                记忆日历
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        role="tablist"
        aria-label="切换查看者"
        className="pointer-events-auto md:hidden bg-white/95 dark:bg-slate-800/95 p-1 rounded-full border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] absolute left-1/2 -translate-x-1/2 z-50"
      >
         <button
           onClick={() => setActiveTab(UserType.HER)}
           data-sound="her"
           role="tab"
           aria-selected={activeTab === UserType.HER}
           aria-label="查看她的日记"
           className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-colors duration-200 ${activeTab === UserType.HER ? 'bg-rose-50 dark:bg-rose-900/50 text-rose-500 dark:text-rose-300 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
         >
           她
         </button>
         <button
           onClick={() => setActiveTab(UserType.HIM)}
           data-sound="him"
           role="tab"
           aria-selected={activeTab === UserType.HIM}
           aria-label="查看他的日记"
           className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-colors duration-200 ${activeTab === UserType.HIM ? 'bg-sky-50 dark:bg-sky-900/50 text-sky-500 dark:text-sky-300 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
         >
           他
         </button>
      </div>

      <div className="pointer-events-auto flex items-center gap-1 md:gap-4">
        <button
          onClick={onOpenComposer}
          data-sound="action"
          aria-label="记录新回忆"
          className="group flex items-center gap-2 md:gap-3 bg-gradient-to-r from-rose-400 via-purple-400 to-sky-400 text-white w-9 h-9 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full shadow-[0_10px_30px_-10px_rgba(168,85,247,0.4)] hover:shadow-[0_20px_40px_-12px_rgba(168,85,247,0.6)] hover:-translate-y-1 active:scale-95 transition-all duration-500 justify-center bg-[length:200%_auto] hover:bg-right"
        >
          <PenTool size={12} className="md:w-4 md:h-4 group-hover:-rotate-12 transition-transform duration-500" />
          <span className="text-sm font-medium tracking-widest uppercase hidden md:inline">Record</span>
        </button>

        <button
          onClick={toggleDarkMode}
          data-sound="action"
          aria-label={darkMode ? '切换到浅色模式' : '切换到深色模式'}
          className="group w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/95 md:bg-white/80 dark:bg-slate-800/95 md:dark:bg-slate-800/80 md:backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200"
          title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
        >
          {darkMode ? (
            <Sun size={12} className="md:w-[18px] md:h-[18px] transition-transform duration-700 ease-out group-hover:rotate-[360deg]" />
          ) : (
            <Moon size={12} className="md:w-[18px] md:h-[18px] transition-transform duration-700 ease-out group-hover:rotate-[360deg]" />
          )}
        </button>
        
        <button
          onClick={onLogout}
           data-sound="action"
           aria-label="切换用户"
           className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/95 md:bg-white/80 dark:bg-slate-800/95 md:dark:bg-slate-800/80 md:backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200 md:hover:rotate-180 md:transition-all md:duration-500"
           title="切换用户"
        >
          <User size={12} className="md:w-[18px] md:h-[18px]" />
        </button>
        <WindowControls />
      </div>
    </header>
  );
}));

Header.displayName = 'Header';
