import React, { useEffect, useMemo, useState } from 'react';
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
  subDays,
} from 'date-fns';
import { CalendarDays, Flame, Sparkles, X } from 'lucide-react';
import { Memory, UserType } from '../types';

type AuthorFilter = 'all' | 'her' | 'him';

interface MemoryHeatmapProps {
  memories: Memory[];
  open: boolean;
  onClose: () => void;
  onSelectDate: (dateKey: string) => void;
}

interface DayBucket {
  key: string;
  date: Date;
  count: number;
  herCount: number;
  himCount: number;
  displayCount: number;
  inRange: boolean;
}

const DISPLAY_DAYS = 365;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ['一', '', '三', '', '五', '', '日'];

const toLocalDateKey = (value: number | Date): string => {
  const date = typeof value === 'number' ? new Date(value) : value;
  return [
    date.getFullYear(),
    `${date.getMonth() + 1}`.padStart(2, '0'),
    `${date.getDate()}`.padStart(2, '0'),
  ].join('-');
};

const parseDateKey = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getLongestStreak = (keys: string[]): number => {
  if (keys.length === 0) return 0;
  let longest = 1;
  let current = 1;

  for (let index = 1; index < keys.length; index += 1) {
    const previous = parseDateKey(keys[index - 1]).getTime();
    const next = parseDateKey(keys[index]).getTime();
    if (Math.round((next - previous) / MS_PER_DAY) === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
};

const getCurrentStreak = (keys: Set<string>): number => {
  let streak = 0;
  let cursor = startOfDay(new Date());

  while (keys.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
};

const getIntensityLevel = (count: number, maxCount: number): 0 | 1 | 2 | 3 | 4 => {
  if (count <= 0) return 0;
  if (maxCount <= 1) return 2;
  const ratio = count / maxCount;
  if (ratio >= 0.8 || count >= 8) return 4;
  if (ratio >= 0.55 || count >= 5) return 3;
  if (ratio >= 0.3 || count >= 3) return 2;
  return 1;
};

const getCellClassName = (day: DayBucket, maxCount: number, isToday: boolean, filter: AuthorFilter): string => {
  const level = getIntensityLevel(day.displayCount, maxCount);
  const useBoth = filter === 'all' && day.herCount > 0 && day.himCount > 0;
  const useHer = filter === 'her' || (filter === 'all' && day.herCount > 0 && day.himCount === 0);
  const useHim = filter === 'him' || (filter === 'all' && day.himCount > 0 && day.herCount === 0);
  const empty = 'bg-white/70 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80';
  const palettes = {
    empty: [empty, empty, empty, empty, empty],
    her: [
      empty,
      'bg-rose-100 dark:bg-rose-900/30 border-rose-200/80 dark:border-rose-700/40',
      'bg-rose-200 dark:bg-rose-800/50 border-rose-300/80 dark:border-rose-600/50',
      'bg-rose-300 dark:bg-rose-700/70 border-rose-400/80 dark:border-rose-500/60',
      'bg-rose-500 dark:bg-rose-500 border-rose-500 dark:border-rose-400',
    ],
    him: [
      empty,
      'bg-sky-100 dark:bg-sky-900/30 border-sky-200/80 dark:border-sky-700/40',
      'bg-sky-200 dark:bg-sky-800/50 border-sky-300/80 dark:border-sky-600/50',
      'bg-sky-300 dark:bg-sky-700/70 border-sky-400/80 dark:border-sky-500/60',
      'bg-sky-500 dark:bg-sky-500 border-sky-500 dark:border-sky-400',
    ],
    both: [
      empty,
      'bg-violet-100 dark:bg-violet-900/30 border-violet-200/80 dark:border-violet-700/40',
      'bg-violet-200 dark:bg-violet-800/50 border-violet-300/80 dark:border-violet-600/50',
      'bg-violet-300 dark:bg-violet-700/70 border-violet-400/80 dark:border-violet-500/60',
      'bg-violet-500 dark:bg-violet-500 border-violet-500 dark:border-violet-400',
    ],
  };
  const palette = useBoth ? palettes.both : useHer ? palettes.her : useHim ? palettes.him : palettes.empty;

  return [
    'h-2.5 w-2.5 rounded-[3px] border transition-all duration-300 sm:h-3 sm:w-3 md:h-4 md:w-4 md:rounded-[4px]',
    day.displayCount > 0 ? 'cursor-pointer hover:scale-125 hover:shadow-md' : 'cursor-default opacity-70',
    isToday ? 'ring-2 ring-violet-300 ring-offset-2 ring-offset-white/80 dark:ring-violet-500 dark:ring-offset-slate-900/80' : '',
    palette[level],
  ].join(' ');
};

const getDisplayCount = (bucket: Pick<DayBucket, 'herCount' | 'himCount'>, filter: AuthorFilter): number => {
  if (filter === 'her') return bucket.herCount;
  if (filter === 'him') return bucket.himCount;
  return bucket.herCount + bucket.himCount;
};

export const MemoryHeatmap: React.FC<MemoryHeatmapProps> = ({ memories, open, onClose, onSelectDate }) => {
  const [filter, setFilter] = useState<AuthorFilter>('all');

  useEffect(() => {
    if (!open) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  const stats = useMemo(() => {
    const allDayMap = new Map<string, Omit<DayBucket, 'date' | 'displayCount' | 'inRange'>>();

    memories.forEach((memory) => {
      const key = toLocalDateKey(memory.createdAt);
      const bucket = allDayMap.get(key) ?? { key, count: 0, herCount: 0, himCount: 0 };
      bucket.count += 1;
      if (memory.author === UserType.HER) bucket.herCount += 1;
      if (memory.author === UserType.HIM) bucket.himCount += 1;
      allDayMap.set(key, bucket);
    });

    const today = startOfDay(new Date());
    const rangeStart = subDays(today, DISPLAY_DAYS - 1);
    const gridStart = startOfWeek(rangeStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(today, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => {
      const key = toLocalDateKey(date);
      const bucket = allDayMap.get(key);
      const herCount = bucket?.herCount ?? 0;
      const himCount = bucket?.himCount ?? 0;
      const displayCount = getDisplayCount({ herCount, himCount }, filter);
      return {
        key,
        date,
        count: bucket?.count ?? 0,
        herCount,
        himCount,
        displayCount,
        inRange: date >= rangeStart && date <= today,
      };
    });

    const weeks: DayBucket[][] = [];
    for (let index = 0; index < days.length; index += 7) weeks.push(days.slice(index, index + 7));

    const filteredMemories = filter === 'all'
      ? memories
      : memories.filter((memory) => memory.author === (filter === 'her' ? UserType.HER : UserType.HIM));
    const allActiveKeys = [...allDayMap.values()]
      .filter((bucket) => getDisplayCount(bucket, filter) > 0)
      .map((bucket) => bucket.key)
      .sort();
    const recentDays = days.filter((day) => day.inRange);
    const monthLabels = weeks.map((week) => {
      const monthStart = week.find((day) => day.inRange && day.date.getDate() === 1);
      return monthStart ? format(monthStart.date, 'M月') : '';
    });

    return {
      allActiveDays: allActiveKeys.length,
      currentStreak: getCurrentStreak(new Set(allActiveKeys)),
      longestStreak: getLongestStreak(allActiveKeys),
      maxCount: Math.max(...recentDays.map((day) => day.displayCount), 0),
      monthLabels,
      recentActiveDays: recentDays.filter((day) => day.displayCount > 0).length,
      recentMemoryCount: recentDays.reduce((sum, day) => sum + day.displayCount, 0),
      today,
      totalMemories: filteredMemories.length,
      weeks,
    };
  }, [filter, memories]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-2 py-2 sm:px-3 sm:py-4 md:px-6">
      <button type="button" aria-label="关闭记忆日历" className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />

      <section role="dialog" aria-modal="true" aria-labelledby="memory-heatmap-title" data-testid="memory-heatmap-dialog" className="relative flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-[1.25rem] border border-white/60 bg-white/95 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/95 sm:max-h-[94vh] sm:rounded-[1.5rem] md:max-h-[92vh] md:rounded-[2rem]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100/80 px-4 py-4 dark:border-slate-800/80 sm:px-5 sm:py-5 md:px-8 md:py-7">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/70 bg-violet-50/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-500 dark:border-violet-800/70 dark:bg-violet-900/20 dark:text-violet-300 sm:gap-2 sm:px-3 sm:text-xs sm:tracking-[0.22em]">
              <CalendarDays size={13} />
              Memory Calendar
            </div>
            <h3 id="memory-heatmap-title" className="mt-2 text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100 sm:mt-3 md:text-3xl">记忆日历热力图</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400 sm:mt-2 md:text-base">最近一年里，哪一天写得最多，一眼就能看见。</p>
          </div>
          <button type="button" onClick={onClose} data-sound="action" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-400 transition-colors hover:text-slate-700 dark:border-slate-700/80 dark:bg-slate-800/90 dark:hover:text-slate-100 sm:h-11 sm:w-11" title="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 md:px-8 md:py-7">
          <div className="mb-4 grid grid-cols-2 gap-2.5 sm:mb-6 sm:gap-3 md:grid-cols-4 md:gap-4">
            <div className="rounded-2xl border border-rose-100/80 bg-gradient-to-br from-rose-50 to-white px-3 py-3 dark:border-rose-900/50 dark:from-rose-950/30 dark:to-slate-900 sm:rounded-3xl sm:px-4 sm:py-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-rose-400 dark:text-rose-300 sm:text-xs sm:tracking-[0.2em]">一起记录</div>
              <div className="mt-1.5 text-xl font-semibold text-slate-800 dark:text-slate-100 sm:mt-2 sm:text-2xl">{stats.allActiveDays}</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-sm">天被认真写下</div>
            </div>
            <div className="rounded-2xl border border-violet-100/80 bg-gradient-to-br from-violet-50 to-white px-3 py-3 dark:border-violet-900/50 dark:from-violet-950/30 dark:to-slate-900 sm:rounded-3xl sm:px-4 sm:py-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-violet-400 dark:text-violet-300 sm:text-xs sm:tracking-[0.2em]">最近一年</div>
              <div className="mt-1.5 text-xl font-semibold text-slate-800 dark:text-slate-100 sm:mt-2 sm:text-2xl">{stats.recentActiveDays}</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-sm">天里有新记忆</div>
            </div>
            <div className="rounded-2xl border border-amber-100/80 bg-gradient-to-br from-amber-50 to-white px-3 py-3 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-slate-900 sm:rounded-3xl sm:px-4 sm:py-4">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-amber-500 dark:text-amber-300 sm:gap-2 sm:text-xs sm:tracking-[0.2em]"><Flame size={14} />连续记录</div>
              <div className="mt-1.5 text-xl font-semibold text-slate-800 dark:text-slate-100 sm:mt-2 sm:text-2xl">{stats.currentStreak}</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-sm">最长 {stats.longestStreak} 天</div>
            </div>
            <div className="rounded-2xl border border-sky-100/80 bg-gradient-to-br from-sky-50 to-white px-3 py-3 dark:border-sky-900/50 dark:from-sky-950/30 dark:to-slate-900 sm:rounded-3xl sm:px-4 sm:py-4">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-sky-500 dark:text-sky-300 sm:gap-2 sm:text-xs sm:tracking-[0.2em]"><Sparkles size={14} />记忆总数</div>
              <div className="mt-1.5 text-xl font-semibold text-slate-800 dark:text-slate-100 sm:mt-2 sm:text-2xl">{stats.totalMemories}</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:mt-1 sm:text-sm">近一年 {stats.recentMemoryCount} 条</div>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-white/70 bg-gradient-to-br from-white via-white to-violet-50/60 p-3 shadow-[0_20px_60px_-30px_rgba(168,85,247,0.35)] dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/20 sm:rounded-[1.75rem] sm:p-4 md:p-5 lg:p-6">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">最近 365 天的共同轨迹</p>
                <div className="inline-flex items-center gap-0.5 rounded-full border border-slate-200/80 bg-white/80 p-0.5 dark:border-slate-700/80 dark:bg-slate-800/80">
                  {[
                    { key: 'all' as const, label: '全部' },
                    { key: 'her' as const, label: '她的' },
                    { key: 'him' as const, label: '他的' },
                  ].map((tab) => (
                    <button key={tab.key} type="button" onClick={() => setFilter(tab.key)} className={[
                      'rounded-full px-3 py-1 text-xs font-medium transition-all duration-200',
                      filter === tab.key
                        ? tab.key === 'her'
                          ? 'bg-rose-100 text-rose-600 shadow-sm dark:bg-rose-900/40 dark:text-rose-300'
                          : tab.key === 'him'
                            ? 'bg-sky-100 text-sky-600 shadow-sm dark:bg-sky-900/40 dark:text-sky-300'
                            : 'bg-violet-100 text-violet-600 shadow-sm dark:bg-violet-900/40 dark:text-violet-300'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
                    ].join(' ')}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                <p className="w-full text-xs text-slate-500 dark:text-slate-400">点击有颜色的日期，就会跳到那天的记忆。</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>少</span>
                <div className="flex items-center gap-1">
                  {[
                    'bg-white/70 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80',
                    'bg-rose-100 dark:bg-rose-900/30 border-rose-200/80 dark:border-rose-700/40',
                    'bg-violet-200 dark:bg-violet-800/50 border-violet-300/80 dark:border-violet-600/50',
                    'bg-sky-300 dark:bg-sky-700/70 border-sky-400/80 dark:border-sky-500/60',
                    'bg-violet-500 dark:bg-violet-500 border-violet-500 dark:border-violet-400',
                  ].map((className, index) => <span key={index} className={`h-3 w-3 rounded-[4px] border sm:h-3.5 sm:w-3.5 ${className}`} />)}
                </div>
                <span>多</span>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-10 bg-gradient-to-l from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 md:hidden" />
              <div className="no-scrollbar overflow-x-auto pb-1">
              <div className="w-max min-w-[560px] sm:min-w-[680px] md:min-w-full">
                <div className="mb-2.5 flex gap-1 pl-6 sm:gap-1.5 sm:pl-7 md:gap-2 md:pl-8">
                  {stats.monthLabels.map((label, index) => <div key={`${label}-${index}`} className="w-2.5 whitespace-nowrap text-[10px] leading-none text-slate-400 dark:text-slate-500 sm:w-3 sm:text-[11px] md:w-4 md:overflow-visible">{label}</div>)}
                </div>
                <div className="flex gap-1.5 md:gap-2">
                  <div className="flex flex-col gap-1 pr-1 pt-0.5 sm:gap-1.5">
                    {WEEKDAY_LABELS.map((label, index) => <div key={`${label}-${index}`} className="flex h-2.5 items-center justify-end text-[10px] leading-none text-slate-400 dark:text-slate-500 sm:h-3 sm:text-[11px] md:h-4">{label}</div>)}
                  </div>
                  <div className="flex gap-1 sm:gap-1.5">
                    {stats.weeks.map((week, weekIndex) => (
                      <div key={`week-${weekIndex}`} className="flex flex-col gap-1 sm:gap-1.5">
                        {week.map((day) => {
                          if (!day.inRange) return <div key={day.key} className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4" />;
                          const summary = day.count === 0
                            ? `${format(day.date, 'yyyy年M月d日')}：这天还没有记忆`
                            : `${format(day.date, 'yyyy年M月d日')}：共 ${day.count} 条（她 ${day.herCount} / 他 ${day.himCount}）`;
                          return (
                            <button
                              key={day.key}
                              type="button"
                              data-sound={day.displayCount > 0 ? 'action' : undefined}
                              title={summary}
                              data-testid={day.displayCount > 0 ? 'memory-heatmap-active-day' : undefined}
                              data-date-key={day.key}
                              data-memory-count={day.displayCount}
                              disabled={day.displayCount === 0}
                              onClick={() => onSelectDate(day.key)}
                              className={getCellClassName(day, stats.maxCount, isSameDay(day.date, stats.today), filter)}
                              aria-label={summary}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:mt-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 dark:bg-rose-900/20"><span className="h-2 w-2 rounded-full bg-rose-400" />她的记忆</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 dark:bg-sky-900/20"><span className="h-2 w-2 rounded-full bg-sky-400" />他的记忆</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 dark:bg-violet-900/20"><span className="h-2 w-2 rounded-full bg-violet-400" />同一天一起记录</span>
            </div>
          </div>

          {stats.totalMemories === 0 && <div className="mt-6 rounded-3xl border border-dashed border-slate-200 px-6 py-10 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">这个筛选下还没有记忆可以点亮日历，先写下第一条吧</div>}
        </div>
      </section>
    </div>
  );
};
