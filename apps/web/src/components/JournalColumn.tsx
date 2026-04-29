import React from 'react';
import { Loader2, PenLine, Sparkles } from 'lucide-react';
import { Memory, UserType, getAvatar } from '../types';
import { MemoryCard } from './MemoryCard';
import { TypewriterText } from './TypewriterText';

interface JournalColumnProps {
  type: UserType;
  activeTab: UserType;
  memories: Memory[];
  isLoading: boolean;
  currentUser: UserType;
  title: string;
  subtitle: string;
  titleStyle: React.CSSProperties;
  accent: 'rose' | 'sky';
  isAvatarShaking: boolean;
  avatarShakeIntensity: number;
  onScroll: (e: React.UIEvent<HTMLDivElement>, type: UserType) => void;
  onHover: (type: UserType | null) => void;
  onAvatarPressStart: (type: UserType) => void;
  onAvatarPressEnd: () => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string, imageUrls?: string[] | null) => Promise<boolean>;
  onOpenComposer: () => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  memoryItemRefs?: React.RefObject<Record<string, HTMLDivElement | null>>;
}

const styles = {
  rose: {
    columnBg: 'bg-gradient-to-r from-rose-100/30 dark:from-rose-900/10 via-rose-50/10 dark:via-transparent to-transparent',
    avatarBg: 'bg-rose-50 dark:bg-rose-900/30',
    statusBorder: 'border-rose-200 dark:border-slate-600',
    statusText: 'text-rose-500 dark:text-rose-400',
    subtitleText: 'font-serif text-rose-400 italic text-lg',
    timeline: 'from-rose-200/50 dark:from-rose-500/30 via-rose-200/30 dark:via-rose-500/15',
    dot: 'bg-rose-300 dark:bg-rose-500 shadow-[0_0_0_4px_rgba(253,164,175,0.2)] dark:shadow-[0_0_0_4px_rgba(244,63,94,0.2)]',
    chip: 'bg-rose-50/90 text-rose-500 border-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50',
    emptyRing: 'from-rose-200 via-pink-200 to-rose-100 dark:from-rose-800/70 dark:via-pink-800/50 dark:to-rose-900/40',
    emptyButton: 'from-rose-400 to-rose-500 shadow-rose-200/70 hover:from-rose-500 hover:to-rose-600',
    emptyText: 'text-rose-500 dark:text-rose-300',
  },
  sky: {
    columnBg: 'bg-gradient-to-l from-sky-100/30 dark:from-sky-900/10 via-sky-50/10 dark:via-transparent to-transparent',
    avatarBg: 'bg-sky-50 dark:bg-sky-900/30',
    statusBorder: 'border-sky-200 dark:border-slate-600',
    statusText: 'text-sky-500 dark:text-sky-400',
    subtitleText: 'font-serif text-sky-400 italic text-lg',
    timeline: 'from-sky-200/50 dark:from-sky-500/30 via-sky-200/30 dark:via-sky-500/15',
    dot: 'bg-sky-300 dark:bg-sky-500 shadow-[0_0_0_4px_rgba(186,230,253,0.2)] dark:shadow-[0_0_0_4px_rgba(56,189,248,0.2)]',
    chip: 'bg-sky-50/90 text-sky-500 border-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/50',
    emptyRing: 'from-sky-200 via-cyan-200 to-blue-100 dark:from-sky-800/70 dark:via-cyan-800/50 dark:to-blue-900/40',
    emptyButton: 'from-sky-400 to-sky-500 shadow-sky-200/70 hover:from-sky-500 hover:to-sky-600',
    emptyText: 'text-sky-500 dark:text-sky-300',
  },
};

const EmptyJournalState: React.FC<{
  isHer: boolean;
  accent: 'rose' | 'sky';
  currentUser: UserType;
  onOpenComposer: () => void;
}> = React.memo(({ isHer, accent, currentUser, onOpenComposer }) => {
  const palette = styles[accent];
  const isOwnJournal = currentUser === (isHer ? UserType.HER : UserType.HIM);

  return (
    <div className="memory-card-wrapper animate-fadeInUp pt-4 pl-4 pr-4 md:pl-20 relative overflow-visible">
      <div className={`absolute left-8 -translate-x-[3.5px] top-10 w-2 h-2 rounded-full ${palette.dot} border-4 border-[#f8f8f8] dark:border-slate-800 hidden md:block`} />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-7 text-center shadow-[0_20px_70px_-35px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/75">
        <div className={`absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${palette.emptyRing} blur-2xl opacity-60`} />
        <div className={`absolute -left-16 bottom-0 h-32 w-32 rounded-full bg-gradient-to-br ${palette.emptyRing} blur-3xl opacity-30`} />

        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${palette.emptyRing} opacity-80 animate-pulse`} />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-3xl shadow-inner dark:bg-slate-800/90">
            {isHer ? getAvatar(UserType.HER) : getAvatar(UserType.HIM)}
          </div>
          <Sparkles className={`absolute -right-1 top-2 h-5 w-5 ${palette.emptyText}`} />
        </div>

        <h3 className="font-serif text-xl font-semibold text-slate-700 dark:text-slate-100">
          {isHer ? '她的第一页还在等风来' : '他的第一页还在等星光'}
        </h3>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {isOwnJournal
            ? '写下今天最想留下的小瞬间吧，哪怕只是一张照片、一句话，也会变成以后回头看的光。'
            : '这里还没有新的记录。等对方写下第一条时，它会像小纸条一样悄悄出现在这里。'}
        </p>

        {isOwnJournal && (
          <button
            type="button"
            onClick={onOpenComposer}
            data-sound="action"
            className={`mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${palette.emptyButton} px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-95 dark:shadow-none`}
          >
            <PenLine className="h-4 w-4" />
            写第一条回忆
          </button>
        )}
      </div>
    </div>
  );
});

EmptyJournalState.displayName = 'EmptyJournalState';

export const JournalColumn: React.FC<JournalColumnProps> = React.memo(({
  type,
  activeTab,
  memories,
  isLoading,
  currentUser,
  title,
  subtitle,
  titleStyle,
  accent,
  isAvatarShaking,
  avatarShakeIntensity,
  onScroll,
  onHover,
  onAvatarPressStart,
  onAvatarPressEnd,
  onDelete,
  onUpdate,
  onOpenComposer,
  scrollContainerRef,
  memoryItemRefs,
}) => {
  const palette = styles[accent];
  const isHer = type === UserType.HER;
  const mobilePosition = activeTab === type
    ? 'translate-x-0 block'
    : isHer ? '-translate-x-full hidden md:block' : 'translate-x-full hidden md:block';

  return (
    <div
      ref={scrollContainerRef}
      onScroll={(e) => onScroll(e, type)}
      onMouseEnter={() => onHover(type)}
      onMouseLeave={() => onHover(null)}
      className={`
        flex-1 h-full overflow-y-auto overflow-x-visible no-scrollbar relative z-10
        md:transform-gpu overscroll-contain scroll-pt-24
        transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-x-0
        ${palette.columnBg} md:bg-none
        ${mobilePosition}
      `}
      style={{ WebkitOverflowScrolling: 'touch', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
    >
      <div className="h-48 md:h-32 w-full" />
      <div className="max-w-xl mx-auto px-4 md:px-8 pb-32">
        <div className="text-center mb-12 md:mb-20 animate-fadeInUp relative">
          {isAvatarShaking && (
            <div className={`absolute -top-16 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border ${palette.statusBorder} z-50 whitespace-nowrap`}>
              <p className={`text-xs ${palette.statusText} font-medium flex items-center gap-2`}>
                <Loader2 className="w-3 h-3 animate-spin" />
                {avatarShakeIntensity < 1 ? `刷新中... ${Math.floor(avatarShakeIntensity * 100)}%` : '正在重载...'}
              </p>
            </div>
          )}
          <div
            onMouseDown={() => onAvatarPressStart(type)}
            onMouseUp={onAvatarPressEnd}
            onMouseLeave={onAvatarPressEnd}
            onTouchStart={() => onAvatarPressStart(type)}
            onTouchEnd={onAvatarPressEnd}
            className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${palette.avatarBg} mb-6 text-3xl shadow-inner transition-transform cursor-pointer select-none hover:scale-110`}
            style={{
              animation: isAvatarShaking ? `avatarShake ${0.1 - avatarShakeIntensity * 0.06}s ease-in-out infinite` : 'none',
              transform: isAvatarShaking ? `scale(${1 + avatarShakeIntensity * 0.2})` : undefined,
            }}
          >
            {getAvatar(type)}
          </div>
          <h2 className="font-display font-normal text-5xl md:text-6xl mb-4 tracking-tight text-transparent bg-clip-text bg-cover texture-text cursor-default" style={titleStyle}>
            {title}
          </h2>
          <TypewriterText text={subtitle} className={palette.subtitleText} delay={150} startDelay={isHer ? 500 : 1500} />

          <div className="mt-6 md:hidden">
            <div className={`mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium shadow-sm backdrop-blur-md ${palette.chip}`}>
              <span>{isHer ? '她的日记' : '他的日记'}</span>
              <span className="h-1 w-1 rounded-full bg-current opacity-40" />
              <span>{memories.length} 条回忆</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">左右轻滑，可以切换你们的两侧故事</p>
          </div>
        </div>

        <div className={`${isHer ? 'space-y-12' : 'space-y-6 md:space-y-12'} relative`}>
          <div className={`absolute left-8 top-4 bottom-0 w-px bg-gradient-to-b ${palette.timeline} to-transparent hidden md:block`} />
          {!isLoading && memories.length === 0 ? (
            <EmptyJournalState
              isHer={isHer}
              accent={accent}
              currentUser={currentUser}
              onOpenComposer={onOpenComposer}
            />
          ) : (
            memories.map((memory, i) => (
              <div
                key={memory.id}
                ref={(node) => {
                  if (memoryItemRefs?.current) {
                    memoryItemRefs.current[memory.id] = node;
                  }
                }}
                className="memory-card-wrapper md:pl-20 relative group animate-fadeInUp pt-6 pl-4 pr-4 overflow-visible"
                style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'both' }}
              >
                <div className={`absolute left-8 -translate-x-[3.5px] top-8 w-2 h-2 rounded-full ${palette.dot} border-4 border-[#f8f8f8] dark:border-slate-800 hidden md:block group-hover:scale-150 transition-transform duration-500`} />
                <MemoryCard memory={memory} onDelete={onDelete} onUpdate={onUpdate} currentUser={currentUser} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
});

JournalColumn.displayName = 'JournalColumn';
