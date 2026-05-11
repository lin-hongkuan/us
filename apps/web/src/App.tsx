import React, { lazy, Suspense, useCallback, useState } from 'react';
import { UserType } from './types';
import { AppProvider, useAppContext } from './context/AppContext';
import { LoginPhase } from './components/LoginPhase';
import { ErrorBoundary } from './components/ErrorBoundary';
import { type DefaultLandingTab } from './context/preferencesContext';

const loadJournalApp = () => import('./JournalApp');
const JournalApp = lazy(loadJournalApp);

const LazyLoadingFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-slate-950/80">
    <div className="flex flex-col items-center gap-3 text-rose-400">
      <span className="h-8 w-8 rounded-full border-2 border-rose-200 border-t-rose-500 animate-spin" />
      <span className="text-sm text-slate-500 dark:text-slate-300">加载中...</span>
    </div>
  </div>
);

const MemoizedLazyLoadingFallback = React.memo(LazyLoadingFallback);

const LAST_ACTIVE_TAB_KEY = 'last_active_tab';

const readLastActiveTab = (): UserType | null => {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(LAST_ACTIVE_TAB_KEY);
  if (stored === UserType.HER || stored === UserType.HIM) return stored;
  return null;
};

/**
 * 根据「默认视角」偏好和（可选的）当前身份决定登录后落地的视角。
 * - 'her' / 'him'：固定落在对应视角
 * - 'last'：回到上次查看的视角；没有记录时回落到 ownIdentity 或 HER
 */
const resolveLandingTab = (pref: DefaultLandingTab, ownIdentity?: UserType): UserType => {
  if (pref === 'her') return UserType.HER;
  if (pref === 'him') return UserType.HIM;
  const stored = readLastActiveTab();
  if (stored) return stored;
  return ownIdentity ?? UserType.HER;
};

function AppContent() {
  const {
    currentUser,
    setCurrentUser,
    defaultLandingTab,
  } = useAppContext();
  const [initialActiveTab, setInitialActiveTab] = useState<UserType>(() => resolveLandingTab(defaultLandingTab));

  const handleChooseUser = useCallback((type: UserType) => {
    const landingTab = resolveLandingTab(defaultLandingTab, type);
    setInitialActiveTab(landingTab);
    setCurrentUser(type);
    void loadJournalApp();
  }, [defaultLandingTab, setCurrentUser]);

  if (!currentUser) {
    return <LoginPhase onChooseUser={handleChooseUser} onPreloadJournal={() => void loadJournalApp()} />;
  }

  return (
    <Suspense fallback={<MemoizedLazyLoadingFallback />}>
      <JournalApp initialActiveTab={initialActiveTab} />
    </Suspense>
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
