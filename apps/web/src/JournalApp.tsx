import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { UserType } from './types';
import { useAppContext } from './context/AppContext';
import { Header } from './components/Header';
import { MainPhase } from './components/MainPhase';
import { TransitionPhase } from './components/TransitionPhase';
import { ClickStarOverlay, dispatchStarPop } from './components/ClickStarOverlay';
import { PresenceIndicator } from './components/PresenceIndicator';
import { AppBackground } from './components/AppBackground';
import { NoticeModal } from './components/NoticeModal';
import { UpdateModal } from './components/UpdateModal';
import { OfflineBanner } from './components/OfflineBanner';
import { START_DATE_STR } from './config/constants';
import { useMemoriesData } from './hooks/useMemoriesData';
import { isTauriRuntime, useTauriComposerShortcut } from './hooks/useTauriComposerShortcut';
import { useEasterEggs } from './hooks/useEasterEggs';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { buildMemoriesJsonString, exportMemoriesAsJson } from './services/exportService';
import { clearIndexedDBCache, clearMemoryCache } from './services/cacheService';
import { clearOutbox } from './services/outboxService';
import { APP_UPDATE } from './types';

const Composer = lazy(() => import('./components/Composer').then(m => ({ default: m.Composer })));
const PiggyBank = lazy(() => import('./components/PiggyBank').then(m => ({ default: m.PiggyBank })));
const GravityMode = lazy(() => import('./components/GravityMode').then(m => ({ default: m.GravityMode })));
const Game2048 = lazy(() => import('./components/Game2048').then(m => ({ default: m.Game2048 })));
const MemoryHeatmap = lazy(() => import('./components/MemoryHeatmap').then(m => ({ default: m.MemoryHeatmap })));
const OnThisDayCard = lazy(() => import('./components/OnThisDayCard').then(m => ({ default: m.OnThisDayCard })));
const SettingsPanel = lazy(() => import('./components/SettingsPanel').then(m => ({ default: m.SettingsPanel })));

const LAST_ACTIVE_TAB_KEY = 'last_active_tab';

type Phase = 'transition' | 'main';
type NoticeStep = 'question' | 'yes' | 'no';

interface JournalAppProps {
  initialActiveTab: UserType;
}

const LazyLoadingFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      <span className="text-white/80 text-sm">加载中...</span>
    </div>
  </div>
);

const MemoizedLazyLoadingFallback = React.memo(LazyLoadingFallback);

export const JournalApp: React.FC<JournalAppProps> = ({ initialActiveTab }) => {
  const {
    currentUser,
    setCurrentUser,
    darkMode,
    playClickSound,
    showToast,
    requestConfirm,
    soundEnabled,
    starEffectsEnabled,
    presenceEnabled,
  } = useAppContext();
  const { memories, setMemories, isLoading, addMemory, pendingOutboxCount } = useMemoriesData();
  const isOnline = useOnlineStatus();
  const [phase, setPhase] = useState<Phase>('transition');
  const [activeTab, setActiveTab] = useState<UserType>(initialActiveTab);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [noticeStep, setNoticeStep] = useState<NoticeStep>('question');
  const [showStamp, setShowStamp] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
    if (!starEffectsEnabled) return;
    dispatchStarPop(e.clientX, e.clientY);
  }, [starEffectsEnabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LAST_ACTIVE_TAB_KEY, activeTab);
  }, [activeTab]);

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
      const offlineNote = !isOnline ? '离线状态下已暂存，回到网络会自动同步。' : '这份美好已经被收藏起来了。';
      showToast({ tone: 'success', title: '记录好啦', description: offlineNote });
      if (navigator.vibrate) navigator.vibrate(50);
      window.setTimeout(() => setShowStamp(false), 1500);
      return;
    }

    showToast({ tone: 'error', title: '保存失败了', description: '请检查网络或云端写入权限后再试。' });
  }, [addMemory, currentUser, easterEggs, isOnline, playClickSound, showToast]);

  const handleOpenNotice = useCallback(() => {
    setIsNoticeOpen(prev => {
      if (prev) return false;
      setNoticeStep('question');
      return true;
    });
  }, []);

  const handleToggleUpdate = useCallback(() => setShowUpdate(prev => !prev), []);
  const handleOpenUpdate = useCallback(() => setShowUpdate(true), []);
  const handleToggleHeatmap = useCallback(() => setShowHeatmap(prev => !prev), []);
  const handleOpenHeatmap = useCallback(() => setShowHeatmap(true), []);
  const handleOpenSettings = useCallback(() => setShowSettings(true), []);
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

  const handleCopyBackup = useCallback(async () => {
    if (memories.length === 0) {
      showToast({ tone: 'info', title: '暂时还没有可复制的回忆', description: '先写下第一条吧。' });
      return;
    }
    if (!navigator.clipboard?.writeText) {
      showToast({ tone: 'error', title: '当前环境不支持剪贴板', description: '改用「导出 JSON」下载文件吧。' });
      return;
    }
    try {
      const json = buildMemoriesJsonString(memories, APP_UPDATE.version);
      await navigator.clipboard.writeText(json);
      showToast({
        tone: 'success',
        title: '已复制到剪贴板',
        description: `包含 ${memories.length} 条回忆的 JSON 备份。`,
      });
    } catch (error) {
      console.error('Copy backup failed:', error);
      showToast({ tone: 'error', title: '复制失败', description: '浏览器可能禁止了剪贴板写入。' });
    }
  }, [memories, showToast]);

  const handleClearCache = useCallback(async () => {
    const confirmed = await requestConfirm({
      title: '清除本地缓存？',
      description: '会清空本地缓存的回忆、离线队列和同步记录，然后刷新页面。\n云端数据不会被删除。',
      confirmText: '清除并刷新',
      cancelText: '再想想',
      tone: 'warning',
    });
    if (!confirmed) return;
    try {
      clearMemoryCache();
      await clearIndexedDBCache();
      await clearOutbox();
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('us_app_memories');
        window.sessionStorage.clear();
      }
      showToast({ tone: 'success', title: '本地缓存已清除', description: '马上为你重新加载…' });
      window.setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      console.error('Clear cache failed:', error);
      showToast({ tone: 'error', title: '清除缓存失败', description: '请稍后再试。' });
    }
  }, [requestConfirm, showToast]);

  const handleSelectHeatmapDate = useCallback((dateKey: string) => {
    setJumpToDateKey(dateKey);
    setShowHeatmap(false);
  }, []);
  const handleJumpHandled = useCallback(() => setJumpToDateKey(null), []);
  const handleLogout = useCallback(() => {
    setShowSettings(false);
    setCurrentUser(null);
  }, [setCurrentUser]);

  if (!currentUser) return null;

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
        onOpenSettings={handleOpenSettings}
        onLogout={handleLogout}
      />

      <OfflineBanner isOnline={isOnline} pendingCount={pendingOutboxCount} />

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

      {phase === 'main' && presenceEnabled && (
        <PresenceIndicator currentUser={currentUser} darkMode={darkMode} soundEnabled={soundEnabled} />
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

      {showSettings && currentUser && (
        <Suspense fallback={<MemoizedLazyLoadingFallback />}>
          <SettingsPanel
            isOpen={showSettings}
            memories={memories}
            onClose={() => setShowSettings(false)}
            onExport={handleExportJson}
            onCopyBackup={handleCopyBackup}
            onClearCache={handleClearCache}
            onOpenHeatmap={handleOpenHeatmap}
            onOpenUpdate={handleOpenUpdate}
            onLogout={handleLogout}
          />
        </Suspense>
      )}

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
};

export default JournalApp;
