import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { UserType, Memory, getAvatar } from '../types';
import { MemoryCard } from './MemoryCard';
import { TypewriterText } from './TypewriterText';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { clearMemoryCache, clearIndexedDBCache } from '../services/cacheService';
import { deleteMemory, updateMemory } from '../services/storageService';

interface MainPhaseProps {
  memories: Memory[];
  setMemories: React.Dispatch<React.SetStateAction<Memory[]>>;
  isLoading: boolean;
  activeTab: UserType;
  setActiveTab: (tab: UserType) => void;
  headerRef: React.RefObject<HTMLElement | null>;
  phase: string;
}

const HER_JOURNAL_TITLE_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(180deg, #fb7185 0%, #e11d48 45%, #881337 100%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  backgroundBlendMode: 'hard-light',
  backgroundSize: 'cover, 100px 100px',
  '--shadow-rgb': '136, 19, 55'
} as React.CSSProperties;

const HIM_JOURNAL_TITLE_STYLE: React.CSSProperties = {
  backgroundImage: `linear-gradient(180deg, #38bdf8 0%, #0284c7 45%, #0c4a6e 100%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  backgroundBlendMode: 'hard-light',
  backgroundSize: 'cover, 100px 100px',
  '--shadow-rgb': '3, 105, 161'
} as React.CSSProperties;

export const MainPhase: React.FC<MainPhaseProps> = React.memo(({
  memories,
  setMemories,
  isLoading,
  activeTab,
  setActiveTab,
  headerRef,
  phase
}) => {
  const { currentUser, playClickSound, playRefreshSound, playSuccessSound } = useAppContext();
  
  const mainBackgroundRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const isDesktopPointer = window.matchMedia('(pointer: fine)').matches;
    const isWideEnough = window.matchMedia('(min-width: 768px)').matches;
    if (!isDesktopPointer || !isWideEnough) return;

    const target = mainBackgroundRef.current;
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
  
  const [hoveredSide, setHoveredSide] = useState<UserType | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  
  const [isAvatarShaking, setIsAvatarShaking] = useState<UserType | null>(null);
  const [avatarShakeIntensity, setAvatarShakeIntensity] = useState(0);
  const longPressTimer = useRef<number | null>(null);
  const isLongPress = useRef(false);
  const pressStartTime = useRef<number>(0);
  const shakeAnimationRef = useRef<number | null>(null);

  const scrollPositions = useRef({ [UserType.HER]: 0, [UserType.HIM]: 0 });
  const scrollRafRef = useRef<number | null>(null);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('确定要删除这条记忆吗？')) {
      const success = await deleteMemory(id);
      if (success) {
        setMemories((prev) => prev.filter(m => m.id !== id));
      } else {
        alert("删除失败");
      }
    }
  }, [setMemories]);

  const handleUpdateMemory = useCallback(async (id: string, content: string, imageUrls?: string[] | null) => {
    const updated = await updateMemory(id, content, imageUrls);
    if (updated) {
      setMemories(prev => prev.map(m => m.id === id ? updated : m));
      playClickSound('action');
      return true;
    }
    return false;
  }, [setMemories, playClickSound]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null;
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
  };

  const handleTouchEnd = () => {
    const touchStart = touchStartRef.current;
    const touchEnd = touchEndRef.current;
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > 50;
    const isRightSwipe = distanceX < -50;
    const isMainlyHorizontal = Math.abs(distanceX) > Math.abs(distanceY);

    if (isMainlyHorizontal) {
      if (isLeftSwipe && activeTab === UserType.HER) {
        setActiveTab(UserType.HIM);
        playClickSound('him');
      } else if (isRightSwipe && activeTab === UserType.HIM) {
        setActiveTab(UserType.HER);
        playClickSound('her');
      }
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: UserType) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollRafRef.current !== null) return;
    
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      
      const last = scrollPositions.current[type];
      const diff = scrollTop - last;

      if (Math.abs(diff) < 10) return;

      const hide = scrollTop > last && scrollTop > 60;
      if (headerRef.current) {
        headerRef.current.classList.toggle('header-hidden', hide);
      }
      
      scrollPositions.current[type] = scrollTop;
    });
  };

  const handleAvatarPressStart = (type: UserType) => {
    isLongPress.current = false;
    pressStartTime.current = Date.now();
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
        const vibrateDuration = 20 + Math.floor(progress * 30);
        navigator.vibrate(vibrateDuration);
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
    if (shakeAnimationRef.current) {
      cancelAnimationFrame(shakeAnimationRef.current);
      shakeAnimationRef.current = null;
    }
    setIsAvatarShaking(null);
    setAvatarShakeIntensity(0);
    if (!isLongPress.current && navigator.vibrate) {
      navigator.vibrate(0);
    }
  };

  const herMemories = useMemo(() => memories.filter(m => m.author === UserType.HER), [memories]);
  const hisMemories = useMemo(() => memories.filter(m => m.author === UserType.HIM), [memories]);

  const herMemoryCards = useMemo(() => herMemories.map((m, i) => (
    <div
      key={m.id}
      className="memory-card-wrapper md:pl-20 relative group animate-fadeInUp pt-6 pl-4 pr-4 overflow-visible"
      style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'both' }}
    >
      <div className="absolute left-8 -translate-x-[3.5px] top-8 w-2 h-2 rounded-full bg-rose-300 dark:bg-rose-500 border-4 border-[#f8f8f8] dark:border-slate-800 hidden md:block group-hover:scale-150 transition-transform duration-500 shadow-[0_0_0_4px_rgba(253,164,175,0.2)] dark:shadow-[0_0_0_4px_rgba(244,63,94,0.2)]"></div>
      <MemoryCard
        memory={m}
        onDelete={handleDelete}
        onUpdate={handleUpdateMemory}
        currentUser={currentUser!}
      />
    </div>
  )), [herMemories, currentUser, handleDelete, handleUpdateMemory]);

  const hisMemoryCards = useMemo(() => hisMemories.map((m, i) => (
    <div
      key={m.id}
      className="memory-card-wrapper md:pl-20 relative group animate-fadeInUp pt-6 pl-4 pr-4 overflow-visible"
      style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'both' }}
    >
      <div className="absolute left-8 -translate-x-[3.5px] top-8 w-2 h-2 rounded-full bg-sky-300 dark:bg-sky-500 border-4 border-[#f8f8f8] dark:border-slate-800 hidden md:block group-hover:scale-150 transition-transform duration-500 shadow-[0_0_0_4px_rgba(186,230,253,0.2)] dark:shadow-[0_0_0_4px_rgba(56,189,248,0.2)]"></div>
      <MemoryCard
        memory={m}
        onDelete={handleDelete}
        onUpdate={handleUpdateMemory}
        currentUser={currentUser!}
      />
    </div>
  )), [hisMemories, currentUser, handleDelete, handleUpdateMemory]);

  return (
    <main 
      className="h-screen flex relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div ref={mainBackgroundRef} className="absolute -inset-[100px] pointer-events-none md:transition-transform md:duration-100 md:ease-out">
        <div className={`absolute top-[-20%] left-[-10%] w-[500px] md:w-[700px] h-[500px] md:h-[700px] bg-rose-300/25 md:bg-rose-300/40 dark:bg-rose-500/15 rounded-full md:mix-blend-multiply dark:md:mix-blend-screen filter blur-[25px] md:blur-[100px] md:animate-blob pointer-events-none md:transition-opacity md:duration-1000 ${activeTab === UserType.HER ? 'opacity-50 md:opacity-80' : 'opacity-0 md:opacity-80'}`}></div>
        <div className={`absolute bottom-[-20%] right-[-10%] w-[500px] md:w-[700px] h-[500px] md:h-[700px] bg-sky-300/25 md:bg-sky-300/40 dark:bg-sky-500/15 rounded-full md:mix-blend-multiply dark:md:mix-blend-screen filter blur-[25px] md:blur-[100px] md:animate-blob md:animation-delay-2000 pointer-events-none md:transition-opacity md:duration-1000 ${activeTab === UserType.HIM ? 'opacity-50 md:opacity-80' : 'opacity-0 md:opacity-80'}`}></div>
        <div className="absolute top-[20%] left-[20%] w-[600px] h-[600px] bg-purple-200/40 dark:bg-purple-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[60px] md:blur-[100px] opacity-60 animate-blob animation-delay-4000 pointer-events-none hidden md:block"></div>
      </div>
      
      {phase === 'main' && isLoading && (
        <div className="absolute inset-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
          <Loader2 className="animate-spin text-slate-800 dark:text-slate-200" size={32} />
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none z-0 hidden md:flex">
        <div className={`flex-1 relative transition-opacity duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${hoveredSide === UserType.HIM ? 'opacity-40' : 'opacity-100'}`}>
           <div className="absolute inset-0 bg-gradient-to-r from-rose-100/30 dark:from-rose-900/20 via-rose-50/10 dark:via-rose-900/5 to-transparent" />
           <div className={`absolute inset-0 bg-gradient-to-r from-rose-200/50 dark:from-rose-800/30 via-rose-100/30 dark:via-rose-900/15 to-transparent transition-opacity duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${hoveredSide === UserType.HER ? 'opacity-100' : 'opacity-0'}`} />
        </div>
        
        <div className={`flex-1 relative transition-opacity duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${hoveredSide === UserType.HER ? 'opacity-40' : 'opacity-100'}`}>
           <div className="absolute inset-0 bg-gradient-to-l from-sky-100/30 dark:from-sky-900/20 via-sky-50/10 dark:via-sky-900/5 to-transparent" />
           <div className={`absolute inset-0 bg-gradient-to-l from-sky-200/50 dark:from-sky-800/30 via-sky-100/30 dark:via-sky-900/15 to-transparent transition-opacity duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${hoveredSide === UserType.HIM ? 'opacity-100' : 'opacity-0'}`} />
        </div>
      </div>

      <div 
        onScroll={(e) => handleScroll(e, UserType.HER)}
        onMouseEnter={() => setHoveredSide(UserType.HER)}
        onMouseLeave={() => setHoveredSide(null)}
        className={`
          flex-1 h-full overflow-y-auto overflow-x-visible no-scrollbar relative z-10
          transform-gpu overscroll-contain
          transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-x-0
          bg-gradient-to-r from-rose-100/30 dark:from-rose-900/10 via-rose-50/10 dark:via-transparent to-transparent md:bg-none
          ${activeTab === UserType.HER ? 'translate-x-0 block' : '-translate-x-full hidden md:block'}
        `}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="h-48 md:h-32 w-full" />
        
        <div className="max-w-xl mx-auto px-4 md:px-8 pb-32">
          <div className="text-center mb-20 animate-fadeInUp relative">
            {isAvatarShaking === UserType.HER && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-rose-200 dark:border-slate-600 z-50 whitespace-nowrap">
                <p className="text-xs text-rose-500 dark:text-rose-400 font-medium flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {avatarShakeIntensity < 1 ? `刷新中... ${Math.floor(avatarShakeIntensity * 100)}%` : '正在重载...'}
                </p>
              </div>
            )}
            <div 
              onMouseDown={() => handleAvatarPressStart(UserType.HER)}
              onMouseUp={handleAvatarPressEnd}
              onMouseLeave={handleAvatarPressEnd}
              onTouchStart={() => handleAvatarPressStart(UserType.HER)}
              onTouchEnd={handleAvatarPressEnd}
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/30 mb-6 text-3xl shadow-inner transition-transform cursor-pointer select-none hover:scale-110`}
              style={{
                animation: isAvatarShaking === UserType.HER 
                  ? `avatarShake ${0.1 - avatarShakeIntensity * 0.06}s ease-in-out infinite` 
                  : 'none',
                transform: isAvatarShaking === UserType.HER 
                  ? `scale(${1 + avatarShakeIntensity * 0.2})` 
                  : undefined
              }}
            >
              {getAvatar(UserType.HER)}
            </div>
            <h2 
              className="font-display font-normal text-5xl md:text-6xl mb-4 tracking-tight text-transparent bg-clip-text bg-cover texture-text cursor-default"
              style={HER_JOURNAL_TITLE_STYLE}
            >
              Ting's Journal
            </h2>
            <TypewriterText 
              text="&quot;正在同步... 婷婷的心情坐标&quot;" 
              className="font-serif text-rose-400 italic text-lg" 
              delay={150}
              startDelay={500}
            />
          </div>

          <div className="space-y-12 relative">
            <div className="absolute left-8 top-4 bottom-0 w-px bg-gradient-to-b from-rose-200/50 dark:from-rose-500/30 via-rose-200/30 dark:via-rose-500/15 to-transparent hidden md:block"></div>

            {!isLoading && herMemories.length === 0 ? (
              <div className="text-center text-slate-300 dark:text-slate-600 py-20 italic font-serif text-xl animate-fadeInUp">
                 Waiting for her story...
              </div>
            ) : (
              herMemoryCards
            )}
          </div>
        </div>
      </div>

      <div 
         onScroll={(e) => handleScroll(e, UserType.HIM)}
         onMouseEnter={() => setHoveredSide(UserType.HIM)}
         onMouseLeave={() => setHoveredSide(null)}
         className={`
          flex-1 h-full overflow-y-auto overflow-x-visible no-scrollbar relative z-10
          transform-gpu overscroll-contain
          transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-x-0
          bg-gradient-to-l from-sky-100/30 dark:from-sky-900/10 via-sky-50/10 dark:via-transparent to-transparent md:bg-none
          ${activeTab === UserType.HIM ? 'translate-x-0 block' : 'translate-x-full hidden md:block'}
        `}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
         <div className="h-48 md:h-32 w-full" />

         <div className="max-w-xl mx-auto px-4 md:px-8 pb-32">
          <div className="text-center mb-20 animate-fadeInUp relative">
            {isAvatarShaking === UserType.HIM && (
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-sky-200 dark:border-slate-600 z-50 whitespace-nowrap">
                <p className="text-xs text-sky-500 dark:text-sky-400 font-medium flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {avatarShakeIntensity < 1 ? `刷新中... ${Math.floor(avatarShakeIntensity * 100)}%` : '正在重载...'}
                </p>
              </div>
            )}
            <div 
              onMouseDown={() => handleAvatarPressStart(UserType.HIM)}
              onMouseUp={handleAvatarPressEnd}
              onMouseLeave={handleAvatarPressEnd}
              onTouchStart={() => handleAvatarPressStart(UserType.HIM)}
              onTouchEnd={handleAvatarPressEnd}
              className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-50 dark:bg-sky-900/30 mb-6 text-3xl shadow-inner transition-transform cursor-pointer select-none hover:scale-110`}
              style={{
                animation: isAvatarShaking === UserType.HIM 
                  ? `avatarShake ${0.1 - avatarShakeIntensity * 0.06}s ease-in-out infinite` 
                  : 'none',
                transform: isAvatarShaking === UserType.HIM 
                  ? `scale(${1 + avatarShakeIntensity * 0.2})` 
                  : undefined
              }}
            >
              {getAvatar(UserType.HIM)}
            </div>
            <h2 
              className="font-display font-normal text-5xl md:text-6xl mb-4 tracking-tight text-transparent bg-clip-text bg-cover texture-text cursor-default"
              style={HIM_JOURNAL_TITLE_STYLE}
            >
              Kuan's Journal
            </h2>
            <TypewriterText 
              text="&quot;独家索引：宽宽的每一份喜欢&quot;" 
              className="font-serif text-sky-400 italic text-lg" 
              delay={150}
              startDelay={1500}
            />
          </div>

          <div className="space-y-6 md:space-y-12 relative">
            <div className="absolute left-8 top-4 bottom-0 w-px bg-gradient-to-b from-sky-200/50 dark:from-sky-500/30 via-sky-200/30 dark:via-sky-500/15 to-transparent hidden md:block"></div>

            {!isLoading && hisMemories.length === 0 ? (
              <div className="text-center text-slate-300 dark:text-slate-600 py-20 italic font-serif text-xl animate-fadeInUp">
                 Waiting for his story...
              </div>
            ) : (
              hisMemoryCards
            )}
          </div>
        </div>
      </div>
    </main>
  );
});
