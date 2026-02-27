import React, { useState, useEffect, lazy, Suspense, useRef, useCallback, useMemo } from 'react';
import { UserType, Memory, APP_UPDATE } from './types';
import { getMemories, saveMemory, seedDataIfEmpty, subscribeToMemoryChanges, unsubscribeFromMemoryChanges } from './services/storageService';
import { subscribeToCacheUpdates } from './services/cacheService';
import { AppProvider, useAppContext } from './context/AppContext';
import { LoginPhase } from './components/LoginPhase';
import { TransitionPhase } from './components/TransitionPhase';
import { MainPhase } from './components/MainPhase';
import { Header } from './components/Header';
import { ClickStarOverlay, dispatchStarPop } from './components/ClickStarOverlay';
import { PresenceIndicator } from './components/PresenceIndicator';
import { Heart, X, Loader2 } from 'lucide-react';
import { START_DATE_STR, INITIAL_AMBIENT_STARS } from './config/constants';

const Composer = lazy(() => import('./components/Composer').then(m => ({ default: m.Composer })));
const PiggyBank = lazy(() => import('./components/PiggyBank').then(m => ({ default: m.PiggyBank })));
const GravityMode = lazy(() => import('./components/GravityMode').then(m => ({ default: m.GravityMode })));
const Game2048 = lazy(() => import('./components/Game2048').then(m => ({ default: m.Game2048 })));

const LazyLoadingFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      <span className="text-white/80 text-sm">加载中...</span>
    </div>
  </div>
);

const NOISE_OVERLAY_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
};

const PAW_OVERLAY_STYLE: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2364748b' fill-opacity='1'%3E%3Cg transform='translate(10 10) scale(0.4) rotate(-10)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3Cg transform='translate(60 60) scale(0.3) rotate(20)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
};

function AppContent() {
  const { currentUser, setCurrentUser, darkMode, playClickSound } = useAppContext();
  
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<'login' | 'transition' | 'main'>('login');
  const [activeTab, setActiveTab] = useState<UserType>(UserType.HER);

  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [noticeStep, setNoticeStep] = useState<'question' | 'yes' | 'no'>('question');
  const [showStamp, setShowStamp] = useState(false);
  const [isGravityMode, setIsGravityMode] = useState(false);
  const [isGame2048Open, setIsGame2048Open] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  const [daysTogether] = useState(() => {
    const startDate = new Date(START_DATE_STR);
    const today = new Date();
    return Math.floor(Math.abs(today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  });

  const [ambientStars] = useState(INITIAL_AMBIENT_STARS);

  const specialEvent = useMemo(() => {
    const today = new Date();
    const startDate = new Date(START_DATE_STR);
    if (daysTogether === 520 || (daysTogether > 0 && daysTogether % 100 === 0)) return 'milestone';
    if (today.getMonth() === startDate.getMonth() && today.getDate() === startDate.getDate()) {
      return 'anniversary';
    }
    return null;
  }, [daysTogether]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await seedDataIfEmpty();
      const data = await getMemories();
      setMemories(data);
      setIsLoading(false);
      subscribeToMemoryChanges();
    };
    fetchData();
    
    const unsubscribe = subscribeToCacheUpdates((updatedMemories) => {
      setMemories(updatedMemories);
    });
    
    return () => {
      unsubscribe();
      unsubscribeFromMemoryChanges();
    };
  }, []);

  useEffect(() => {
    if (!currentUser && phase !== 'login') {
      setPhase('login');
    }
  }, [currentUser, phase]);

  const handleGlobalClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    dispatchStarPop(e.clientX, e.clientY);
  }, []);

  const handleChooseUser = useCallback((type: UserType) => {
    setCurrentUser(type);
    setActiveTab(type);
    setPhase('transition');
  }, [setCurrentUser]);

  const handleSave = useCallback(async (content: string, imageUrls?: string[]) => {
    const trimmed = content.trim();
    if (trimmed === '1104') {
      setIsGravityMode(true);
      setIsComposerOpen(false);
      return;
    }
    if (trimmed === '2005') {
      setIsGame2048Open(true);
      setIsComposerOpen(false);
      return;
    }

    if (!currentUser) return;
    const newMem = await saveMemory({ content, author: currentUser, imageUrls });
    if (newMem) {
      setMemories((prev) => [newMem, ...prev]);
      setIsComposerOpen(false);
      
      setShowStamp(true);
      playClickSound('stamp');
      if (navigator.vibrate) navigator.vibrate(50);
      window.setTimeout(() => setShowStamp(false), 1500);
    }
  }, [currentUser, playClickSound]);

  const headerRef = useRef<HTMLElement>(null);

  const handleOpenComposer = useCallback(() => setIsComposerOpen(true), []);
  const handleOpenNotice = useCallback(() => {
    setIsNoticeOpen(prev => {
      if (prev) return false;
      setNoticeStep('question');
      return true;
    });
  }, []);
  const handleToggleUpdate = useCallback(() => setShowUpdate(prev => !prev), []);
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setPhase('login');
  }, [setCurrentUser]);

  if (phase === 'login' || !currentUser) {
    return <LoginPhase onChooseUser={handleChooseUser} />;
  }

  return (
    <div 
      onClick={handleGlobalClick}
      className={`min-h-screen relative overflow-hidden font-sans text-slate-600 dark:text-slate-300 selection:bg-rose-100 dark:selection:bg-rose-900/50 selection:text-rose-900 dark:selection:text-rose-200 transition-colors duration-1000
      md:animate-gradient
      ${activeTab === UserType.HER 
        ? 'bg-rose-50 dark:bg-slate-900 md:bg-gradient-to-br md:from-rose-100 md:via-purple-50 md:to-sky-100 md:dark:from-slate-900 md:dark:via-slate-800 md:dark:to-slate-900' 
        : 'bg-sky-50 dark:bg-slate-900 md:bg-gradient-to-br md:from-rose-100 md:via-purple-50 md:to-sky-100 md:dark:from-slate-900 md:dark:via-slate-800 md:dark:to-slate-900'
      }
    `}
    >
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-0 pointer-events-none z-0" style={NOISE_OVERLAY_STYLE}></div>

      <div className="absolute -inset-[100px] opacity-[0.08] pointer-events-none z-0 md:animate-moveBackground" 
           style={PAW_OVERLAY_STYLE}
      ></div>

      <div className="corner-stars absolute inset-0 pointer-events-none z-10 mix-blend-screen">
        {ambientStars.map(star => (
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
              animationDuration: `${star.duration}s`
            }}
          />
        ))}
      </div>

      <Header 
        ref={headerRef}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenComposer={handleOpenComposer}
        onOpenNotice={handleOpenNotice}
        onToggleUpdate={handleToggleUpdate}
        onLogout={handleLogout}
      />

      {phase !== 'login' && (
        <MainPhase 
          memories={memories} 
          setMemories={setMemories} 
          isLoading={isLoading} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab}
          headerRef={headerRef}
          phase={phase}
        />
      )}

      {phase === 'transition' && (
        <TransitionPhase 
          currentUser={currentUser}
          isLoading={isLoading}
          onTransitionComplete={() => setPhase('main')}
        />
      )}

      {isGravityMode && (
        <Suspense fallback={<LazyLoadingFallback />}>
          <GravityMode memories={memories} onClose={() => setIsGravityMode(false)} />
        </Suspense>
      )}

      {isGame2048Open && (
        <Suspense fallback={<LazyLoadingFallback />}>
          <Game2048 onClose={() => setIsGame2048Open(false)} />
        </Suspense>
      )}

      {phase === 'main' && (
        <Suspense fallback={null}>
          <PiggyBank count={memories.length} />
        </Suspense>
      )}

      {phase === 'main' && (
        <PresenceIndicator currentUser={currentUser} darkMode={darkMode} />
      )}

      {isNoticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsNoticeOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm mx-auto shadow-2xl animate-popIn border border-white/50 dark:border-slate-700/50 text-center">
            <button 
              onClick={() => setIsNoticeOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center pt-2">
              {specialEvent === 'milestone' ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative w-full">
                  <div className="text-4xl mb-4">🎉</div>
                  <p className="text-lg text-slate-700 dark:text-slate-200 font-bold mb-2">
                    哇！我们已经一起走过{daysTogether}天啦！
                  </p>
                  <div className="absolute -top-12 left-0 right-0 flex justify-center gap-4 pointer-events-none">
                    <Heart className="text-rose-500 fill-rose-500 animate-float-up" size={24} style={{ animationDelay: '0s' }} />
                    <Heart className="text-rose-400 fill-rose-400 animate-float-up" size={16} style={{ animationDelay: '0.2s' }} />
                    <Heart className="text-rose-500 fill-rose-500 animate-float-up" size={32} style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              ) : specialEvent === 'anniversary' ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative w-full">
                  <div className="text-4xl mb-4">🎂</div>
                  <p className="text-lg text-slate-700 dark:text-slate-200 font-bold mb-2">
                    今天是我们的纪念日哦！
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    相爱{daysTogether}天啦，要一直开开心心！
                  </p>
                  <div className="absolute -top-12 left-0 right-0 flex justify-center gap-4 pointer-events-none">
                    <Heart className="text-rose-500 fill-rose-500 animate-float-up" size={24} style={{ animationDelay: '0s' }} />
                    <Heart className="text-rose-400 fill-rose-400 animate-float-up" size={16} style={{ animationDelay: '0.2s' }} />
                    <Heart className="text-rose-500 fill-rose-500 animate-float-up" size={32} style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              ) : noticeStep === 'question' ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="text-4xl mb-4">🤔</div>
                  <p className="text-lg text-slate-700 dark:text-slate-200 font-bold mb-6">
                    你今天想我了吗？
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => setNoticeStep('yes')}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-400 to-rose-500 text-white font-medium hover:opacity-90 transition-opacity"
                    >
                      想了！
                    </button>
                    <button
                      onClick={() => setNoticeStep('no')}
                      className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      没想...
                    </button>
                  </div>
                </div>
              ) : noticeStep === 'yes' ? (
                <div className="animate-in zoom-in-95 duration-300 relative">
                  <div className="text-5xl mb-4 animate-bounce">🥰</div>
                  <p className="text-lg text-rose-500 dark:text-rose-400 font-bold">
                    我也超级超级想你！！
                  </p>
                  <div className="absolute -inset-4 bg-rose-100/50 dark:bg-rose-500/20 rounded-full blur-xl -z-10 animate-pulse" />
                </div>
              ) : (
                <div className="animate-in shake duration-500 relative">
                  <div className="text-5xl mb-4">🥺</div>
                  <p className="text-lg text-sky-500 dark:text-sky-400 font-bold">
                    哼！我不信！<br/>你一定是想我了！
                  </p>
                  <button
                    onClick={() => setNoticeStep('yes')}
                    className="mt-6 px-6 py-2 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300 font-medium hover:bg-sky-200 dark:hover:bg-sky-800/50 transition-colors text-sm"
                  >
                    好吧，其实想了
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowUpdate(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm mx-auto shadow-2xl animate-popIn border border-white/50 dark:border-slate-700/50">
            <button 
              onClick={() => setShowUpdate(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">✨</span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 tracking-wide">
                Update {APP_UPDATE.version}
              </h3>
            </div>
            
            <div className="space-y-4 text-left">
              {APP_UPDATE.content.map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-rose-400 mt-0.5 w-4 text-right tabular-nums">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {line}
                  </p>
                </div>
              ))}
              <div className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wider uppercase text-right">
                {APP_UPDATE.date}
              </div>
            </div>
          </div>
        </div>
      )}

      {isComposerOpen && (
        <Suspense fallback={<LazyLoadingFallback />}>
          <Composer 
            currentUser={currentUser!} 
            onSave={handleSave} 
            onClose={() => setIsComposerOpen(false)} 
          />
        </Suspense>
      )}

      <ClickStarOverlay />

      {showStamp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-full border-8 border-rose-500/80 dark:border-rose-400/80 text-rose-500/80 dark:text-rose-400/80 flex items-center justify-center text-4xl md:text-5xl font-display transform -rotate-12 animate-stamp drop-shadow-2xl">
             <div className="absolute inset-0 rounded-full border-4 border-rose-500/40 dark:border-rose-400/40 m-2 border-dashed"></div>
             Recorded!
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
