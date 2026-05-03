import React, { useState, lazy, Suspense, useRef, useCallback, useMemo } from 'react';
import { UserType } from './types';
import { AppProvider, useAppContext } from './context/AppContext';
import { LoginPhase } from './components/LoginPhase';
import { TransitionPhase } from './components/TransitionPhase';
import { MainPhase } from './components/MainPhase';
import { Header } from './components/Header';
import { ClickStarOverlay, dispatchStarPop } from './components/ClickStarOverlay';
import { PresenceIndicator } from './components/PresenceIndicator';
import { AppBackground } from './components/AppBackground';
import { NoticeModal } from './components/NoticeModal';
import { UpdateModal } from './components/UpdateModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2 } from 'lucide-react';
import { START_DATE_STR } from './config/constants';
import { useMemoriesData } from './hooks/useMemoriesData';
import { isTauriRuntime, useTauriComposerShortcut } from './hooks/useTauriComposerShortcut';
import { useEasterEggs } from './hooks/useEasterEggs';
import { exportMemoriesAsJson } from './services/exportService';
import { APP_UPDATE } from './types';

const Composer = lazy(() => import('./components/Composer').then(m => ({ default: m.Composer })));
const PiggyBank = lazy(() => import('./components/PiggyBank').then(m => ({ default: m.PiggyBank })));
const GravityMode = lazy(() => import('./components/GravityMode').then(m => ({ default: m.GravityMode })));
const Game2048 = lazy(() => import('./components/Game2048').then(m => ({ default: m.Game2048 })));
const MemoryHeatmap = lazy(() => import('./components/MemoryHeatmap').then(m => ({ default: m.MemoryHeatmap })));
const OnThisDayCard = lazy(() => import('./components/OnThisDayCard').then(m => ({ default: m.OnThisDayCard })));

const LazyLoadingFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      <span className="text-white/80 text-sm">加载中...</span>
    </div>
  </div>
);

const MemoizedLazyLoadingFallback = React.memo(LazyLoadingFallback);

type Phase = 'login' | 'transition' | 'main';
type NoticeStep = 'question' | 'yes' | 'no';

function AppContent() {
  const { currentUser, setCurrentUser, darkMode, playClickSound, showToast } = useAppContext();
  const { memories, setMemories, isLoading, addMemory } = useMemoriesData();
  const [phase, setPhase] = useState<Phase>('login');
  const [activeTab, setActiveTab] = useState<UserType>(UserType.HER);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [noticeStep, setNoticeStep] = useState<NoticeStep>('question');
  const [showStamp, setShowStamp] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [jumpToDateKey, setJumpToDateKey] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const easterEggs = useEasterEggs();

  const [daysTogether] = useState(() => {
    const startDate = new Date(START_DATE_STR);
    const today = new Date();
    return Math.floor(Math.abs(today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  });

  const openComposer = useCallback(() => setIsComposerOpen(true), []);
  useTauriComposerShortcut(Boolean(currentUser), openComposer);

  const specialEvent = useMemo(() => {
    const today = new Date();
    const startDate = new Date(START_DATE_STR);
    if (daysTogether === 520 || (daysTogether > 0 && daysTogether % 100 === 0)) return 'milestone';
    if (today.getMonth() === startDate.getMonth() && today.getDate() === startDate.getDate()) {
      return 'anniversary';
    }
    return null;
  }, [daysTogether]);

  const handleGlobalClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    dispatchStarPop(e.clientX, e.clientY);
  }, []);

  const handleChooseUser = useCallback((type: UserType) => {
    setCurrentUser(type);
    setActiveTab(type);
    setPhase('transition');
  }, [setCurrentUser]);

  const handleSave = useCallback(async (content: string, imageUrls?: string[], customDate?: number) => {
    if (easterEggs.tryConsumeAsEasterEgg(content)) {
      setIsComposerOpen(false);
      return;
    }

    if (!currentUser) return;
    const newMemory = await addMemory({ content, author: currentUser, imageUrls, customDate });
    if (newMemory) {
      setIsComposerOpen(false);
      setShowStamp(true);
      playClickSound('stamp');
      showToast({ tone: 'success', title: '记录好啦', description: '这份美好已经被收藏起来了。' });
      if (navigator.vibrate) navigator.vibrate(50);
      window.setTimeout(() => setShowStamp(false), 1500);
      return;
    }

    showToast({ tone: 'error', title: '保存失败了', description: '请检查网络或云端写入权限后再试。' });
  }, [addMemory, currentUser, easterEggs, playClickSound, showToast]);

  const handleOpenNotice = useCallback(() => {
    setIsNoticeOpen(prev => {
      if (prev) return false;
      setNoticeStep('question');
      return true;
    });
  }, []);

  const handleToggleUpdate = useCallback(() => setShowUpdate(prev => !prev), []);
  const handleToggleHeatmap = useCallback(() => setShowHeatmap(prev => !prev), []);
  const handleExportJson = useCallback(() => {
    if (memories.length === 0) {
      showToast({ tone: 'info', title: '暂时还没有可导出的回忆', description: '先写下第一条吧。' });
      return;
    }
    try {
      exportMemoriesAsJson(memories, APP_UPDATE.version);
      showToast({ tone: 'success', title: '已导出 JSON 备份', description: `共 ${memories.length} 条回忆，请妥善保存。` });
    } catch (error) {
      console.error('Export failed:', error);
      showToast({ tone: 'error', title: '导出失败', description: '浏览器可能拦截了下载，请重试。' });
    }
  }, [memories, showToast]);
  const handleSelectHeatmapDate = useCallback((dateKey: string) => {
    setJumpToDateKey(dateKey);
    setShowHeatmap(false);
  }, []);
  const handleJumpHandled = useCallback(() => setJumpToDateKey(null), []);
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
      ${isTauriRuntime()
        ? 'bg-transparent'
        : activeTab === UserType.HER
          ? 'bg-rose-50 dark:bg-slate-900 md:bg-gradient-to-br md:from-rose-100 md:via-purple-50 md:to-sky-100 md:dark:from-slate-900 md:dark:via-slate-800 md:dark:to-slate-900'
          : 'bg-sky-50 dark:bg-slate-900 md:bg-gradient-to-br md:from-rose-100 md:via-purple-50 md:to-sky-100 md:dark:from-slate-900 md:dark:via-slate-800 md:dark:to-slate-900'
      }
    `}
    >
      {isTauriRuntime() && (
        <div data-tauri-drag-region className="fixed top-0 left-0 right-0 h-8 z-[9999]" />
      )}
      <AppBackground />

      <Header
        ref={headerRef}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenComposer={openComposer}
        onOpenNotice={handleOpenNotice}
        onToggleUpdate={handleToggleUpdate}
        onToggleHeatmap={handleToggleHeatmap}
        onExportJson={handleExportJson}
        onLogout={handleLogout}
      />

      <MainPhase
        memories={memories}
        setMemories={setMemories}
        isLoading={isLoading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        headerRef={headerRef}
        phase={phase}
        onOpenComposer={openComposer}
        jumpToDateKey={jumpToDateKey}
        onJumpHandled={handleJumpHandled}
      />

      {phase === 'transition' && (
        <TransitionPhase
          currentUser={currentUser}
          isLoading={isLoading}
          onTransitionComplete={() => setPhase('main')}
        />
      )}

      {easterEggs.isGravityMode && (
        <Suspense fallback={<MemoizedLazyLoadingFallback />}>
          <GravityMode memories={memories} onClose={easterEggs.closeGravity} />
        </Suspense>
      )}

      {easterEggs.isGame2048Open && (
        <Suspense fallback={<MemoizedLazyLoadingFallback />}>
          <Game2048 onClose={easterEggs.closeGame2048} />
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

      {phase === 'main' && memories.length > 0 && (
        <Suspense fallback={null}>
          <OnThisDayCard memories={memories} onSelectDate={handleSelectHeatmapDate} />
        </Suspense>
      )}

      <NoticeModal
        isOpen={isNoticeOpen}
        specialEvent={specialEvent}
        daysTogether={daysTogether}
        noticeStep={noticeStep}
        onClose={() => setIsNoticeOpen(false)}
        onStepChange={setNoticeStep}
      />

      <UpdateModal isOpen={showUpdate} onClose={() => setShowUpdate(false)} />

      {isComposerOpen && (
        <Suspense fallback={<MemoizedLazyLoadingFallback />}>
          <Composer
            currentUser={currentUser}
            onSave={handleSave}
            onClose={() => setIsComposerOpen(false)}
          />
        </Suspense>
      )}

      <ClickStarOverlay />

      {showHeatmap && (
        <Suspense fallback={<MemoizedLazyLoadingFallback />}>
          <MemoryHeatmap
            memories={memories}
            open={showHeatmap}
            onClose={() => setShowHeatmap(false)}
            onSelectDate={handleSelectHeatmapDate}
          />
        </Suspense>
      )}

      {showStamp && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
          <div className="w-48 h-48 md:w-64 md:h-64 rounded-full border-8 border-rose-500/80 dark:border-rose-400/80 text-rose-500/80 dark:text-rose-400/80 flex items-center justify-center text-4xl md:text-5xl font-display transform -rotate-12 animate-stamp drop-shadow-2xl">
            <div className="absolute inset-0 rounded-full border-4 border-rose-500/40 dark:border-rose-400/40 m-2 border-dashed" />
            Recorded!
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
