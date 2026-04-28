import React, { useState, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { UserType, Memory } from '../types';
import { useAppContext } from '../context/AppContext';
import { deleteMemory, updateMemory } from '../services/storageService';
import { JournalColumn } from './JournalColumn';
import { useAvatarRefreshGesture } from '../hooks/useAvatarRefreshGesture';
import { useHideHeaderOnScroll } from '../hooks/useHideHeaderOnScroll';
import { useParallaxBackground } from '../hooks/useParallaxBackground';
import { useSwipeTabs } from '../hooks/useSwipeTabs';

interface MainPhaseProps {
  memories: Memory[];
  setMemories: React.Dispatch<React.SetStateAction<Memory[]>>;
  isLoading: boolean;
  activeTab: UserType;
  setActiveTab: (tab: UserType) => void;
  headerRef: React.RefObject<HTMLElement | null>;
  phase: string;
  onOpenComposer: () => void;
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
  phase,
  onOpenComposer,
}) => {
  const { currentUser, playClickSound, playRefreshSound, playSuccessSound, requestConfirm, showToast } = useAppContext();
  const [hoveredSide, setHoveredSide] = useState<UserType | null>(null);
  const mainBackgroundRef = useParallaxBackground();
  const handleScroll = useHideHeaderOnScroll(headerRef);
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useSwipeTabs({
    activeTab,
    setActiveTab,
    playClickSound,
  });
  const {
    isAvatarShaking,
    avatarShakeIntensity,
    handleAvatarPressStart,
    handleAvatarPressEnd,
  } = useAvatarRefreshGesture({ playRefreshSound, playSuccessSound });

  const handleDelete = useCallback(async (id: string) => {
    const confirmed = await requestConfirm({
      tone: 'danger',
      title: '要删除这条记忆吗？',
      description: '删除后云端和本地缓存都会同步移除，暂时不能撤回。',
      confirmText: '删除',
      cancelText: '留下它',
    });

    if (!confirmed) return;

    const success = await deleteMemory(id);
    if (success) {
      setMemories((prev) => prev.filter(m => m.id !== id));
      showToast({ tone: 'success', title: '已经轻轻删掉啦' });
    } else {
      showToast({ tone: 'error', title: '删除失败了', description: '网络或云端权限可能暂时不可用。' });
    }
  }, [requestConfirm, setMemories, showToast]);

  const handleUpdateMemory = useCallback(async (id: string, content: string, imageUrls?: string[] | null) => {
    const updated = await updateMemory(id, content, imageUrls);
    if (updated) {
      setMemories(prev => prev.map(m => m.id === id ? updated : m));
      playClickSound('action');
      showToast({ tone: 'success', title: '这条回忆更新好啦' });
      return true;
    }
    showToast({ tone: 'error', title: '更新失败了', description: '请检查网络或云端写入权限后再试。' });
    return false;
  }, [setMemories, playClickSound, showToast]);

  const herMemories = useMemo(() => memories.filter(m => m.author === UserType.HER), [memories]);
  const hisMemories = useMemo(() => memories.filter(m => m.author === UserType.HIM), [memories]);

  if (!currentUser) return null;

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

      <JournalColumn
        type={UserType.HER}
        activeTab={activeTab}
        memories={herMemories}
        isLoading={isLoading}
        currentUser={currentUser}
        title="Ting's Journal"
        subtitle="&quot;正在同步... 婷婷的心情坐标&quot;"
        titleStyle={HER_JOURNAL_TITLE_STYLE}
        accent="rose"
        isAvatarShaking={isAvatarShaking === UserType.HER}
        avatarShakeIntensity={avatarShakeIntensity}
        onScroll={handleScroll}
        onHover={setHoveredSide}
        onAvatarPressStart={handleAvatarPressStart}
        onAvatarPressEnd={handleAvatarPressEnd}
        onDelete={handleDelete}
        onUpdate={handleUpdateMemory}
        onOpenComposer={onOpenComposer}
      />

      <JournalColumn
        type={UserType.HIM}
        activeTab={activeTab}
        memories={hisMemories}
        isLoading={isLoading}
        currentUser={currentUser}
        title="Kuan's Journal"
        subtitle="&quot;独家索引：宽宽的每一份喜欢&quot;"
        titleStyle={HIM_JOURNAL_TITLE_STYLE}
        accent="sky"
        isAvatarShaking={isAvatarShaking === UserType.HIM}
        avatarShakeIntensity={avatarShakeIntensity}
        onScroll={handleScroll}
        onHover={setHoveredSide}
        onAvatarPressStart={handleAvatarPressStart}
        onAvatarPressEnd={handleAvatarPressEnd}
        onDelete={handleDelete}
        onUpdate={handleUpdateMemory}
        onOpenComposer={onOpenComposer}
      />
    </main>
  );
});

MainPhase.displayName = 'MainPhase';
