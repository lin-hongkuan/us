import React, { useMemo, useState } from 'react';
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfWeek,
  subDays
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
  inRange: boolean;
}

const DISPLAY_DAYS = 365;
const WEEKDAY_LABELS = ['一', '', '三', '', '五', '', '日'];

const getLocalDateKey = (value: number | Date): string => {
  const date = typeof value === 'number' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDayDiff = (left: string, right: string): number => {
  const [leftYear, leftMonth, leftDay] = left.split('-').map(Number);
  const [rightYear, rightMonth, rightDay] = right.split('-').map(Number);
  const leftDate = new Date(leftYear, leftMonth - 1, leftDay);
  const rightDate = new Date(rightYear, rightMonth - 1, rightDay);
  const diffMs = startOfDay(leftDate).getTime() - startOfDay(rightDate).getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

const getCurrentStreak = (dayKeys: Set<string>): number => {
  let streak = 0;
  let cursor = startOfDay(new Date());

  while (dayKeys.has(getLocalDateKey(cursor))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  return streak;
};

const getLongestStreak = (sortedKeys: string[]): number => {
  if (sortedKeys.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let index = 1; index < sortedKeys.length; index += 1) {
    const prev = sortedKeys[index - 1];
    const next = sortedKeys[index];

    if (getDayDiff(next, prev) === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
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

const getCellClassName = (count: number, herCount: number, himCount: number, maxCount: number, isToday: boolean, filter: AuthorFilter): string => {
  const level = getIntensityLevel(count, maxCount);

  const useHer = filter === 'her' || (filter === 'all' && herCount > 0 && himCount === 0);
  const useHim = filter === 'him' || (filter === 'all' && himCount > 0 && herCount === 0);
  const useBoth = filter === 'all' && herCount > 0 && himCount > 0;

  const palette = useBoth
    ? [
        'bg-white/60 dark:bg-slate-800/70 border-white/70 dark:border-slate-700/80',
        'bg-violet-100 dark:bg-violet-900/30 border-violet-200/80 dark:border-violet-700/40',
        'bg-violet-200 dark:bg-violet-800/50 border-violet-300/80 dark:border-violet-600/50',
        'bg-violet-300 dark:bg-violet-700/70 border-violet-400/80 dark:border-violet-500/60',
        'bg-violet-500 dark:bg-violet-500 border-violet-500 dark:border-violet-400'
      ]
    : useHer
      ? [
          'bg-white/60 dark:bg-slate-800/70 border-white/70 dark:border-slate-700/80',
          'bg-rose-100 dark:bg-rose-900/30 border-rose-200/80 dark:border-rose-700/40',
          'bg-rose-200 dark:bg-rose-800/50 border-rose-300/80 dark:border-rose-600/50',
          'bg-rose-300 dark:bg-rose-700/70 border-rose-400/80 dark:border-rose-500/60',
          'bg-rose-500 dark:bg-rose-500 border-rose-500 dark:border-rose-400'
        ]
      : [
          'bg-white/60 dark:bg-slate-800/70 border-white/70 dark:border-slate-700/80',
          'bg-sky-100 dark:bg-sky-900/30 border-sky-200/80 dark:border-sky-700/40',
          'bg-sky-200 dark:bg-sky-800/50 border-sky-300/80 dark:border-sky-600/50',
          'bg-sky-300 dark:bg-sky-700/70 border-sky-400/80 dark:border-sky-500/60',
          'bg-sky-500 dark:bg-sky-500 border-sky-500 dark:border-sky-400'
        ];

  return [
    'w-3.5 h-3.5 md:w-4 md:h-4 rounded-[4px] border transition-all duration-300',
    count > 0 ? 'hover:scale-125 hover:shadow-md cursor-pointer' : 'cursor-default opacity-70',
    isToday ? 'ring-2 ring-offset-2 ring-offset-white/80 dark:ring-offset-slate-900/80 ring-violet-300 dark:ring-violet-500' : '',
    palette[level]
  ].join(' ');
};

export const MemoryHeatmap: React.FC<MemoryHeatmapProps> = ({ memories, open, onClose, onSelectDate }) => {
  const [filter, setFilter] = useState<AuthorFilter>('all');

  const filteredMemories = useMemo(() => {
    if (filter === 'all') return memories;
    const author = filter === 'her' ? UserType.HER : UserType.HIM;
    return memories.filter((m) => m.author === author);
  }, [memories, filter]);

  const stats = useMemo(() => {
    const dayMap = new Map<string, Omit<DayBucket, 'date' | 'inRange'>>();

    filteredMemories.forEach((memory) => {
      const key = getLocalDateKey(memory.createdAt);
      const existing = dayMap.get(key) ?? { key, count: 0, herCount: 0, himCount: 0 };
      existing.count += 1;
      if (memory.author === UserType.HER) {
        existing.herCount += 1;
      } else {
        existing.himCount += 1;
      }
      dayMap.set(key, existing);
    });

    const today = startOfDay(new Date());
    const rangeStart = subDays(today, DISPLAY_DAYS - 1);
    const gridStart = startOfWeek(rangeStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(today, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const days: DayBucket[] = allDays.map((date) => {
      const key = getLocalDateKey(date);
      const bucket = dayMap.get(key);
      return {
        key,
        date,
        count: bucket?.count ?? 0,
        herCount: bucket?.herCount ?? 0,
        himCount: bucket?.himCount ?? 0,
        inRange: date >= rangeStart && date <= today
      };
    });

    const weeks: DayBucket[][] = [];
    for (let index = 0; index < days.length; index += 7) {
      weeks.push(days.slice(index, index + 7));
    }

    const allDayKeys = [...dayMap.keys()].sort();
    const allDayKeySet = new Set(allDayKeys);
    const recentDays = days.filter((day) => day.inRange);
    const maxCount = Math.max(...recentDays.map((day) => day.count), 0);
    const recentMemoryCount = recentDays.reduce((sum, day) => sum + day.count, 0);
    const recentActiveDays = recentDays.filter((day) => day.count > 0).length;
    const monthLabels = weeks.map((week, index) => {
      const inRangeDays = week.filter((day) => day.inRange);
      const firstInRange = inRangeDays[0] ?? null;
      if (!firstInRange) return '';
      if (index === 0) return format(firstInRange.date, 'M月');

      const previousWeek = weeks[index - 1];
      const previousInRange = previousWeek?.find((day) => day.inRange) ?? null;
      if (!previousInRange) return format(firstInRange.date, 'M月');

      return previousInRange.date.getMonth() !== firstInRange.date.getMonth()
        ? format(firstInRange.date, 'M月')
        : '';
    });

    return {
      today,
      maxCount,
      weeks,
      monthLabels,
      totalMemories: memories.length,
      allActiveDays: allDayKeys.length,
      recentActiveDays,
      recentMemoryCount,
      currentStreak: getCurrentStreak(allDayKeySet),
      longestStreak: getLongestStreak(allDayKeys)
    };
  }, [filteredMemories, memories]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[2rem] border border-white/60 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-4 px-5 py-5 md:px-8 md:py-7 border-b border-slate-100/80 dark:border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 dark:border-violet-800/70 bg-violet-50/80 dark:bg-violet-900/20 px-3 py-1 text-xs font-semibold tracking-[0.22em] text-violet-500 dark:text-violet-300 uppercase">
              <CalendarDays size={14} />
              Memory Calendar
            </div>
            <h3 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              记忆日历热力图 📅
            </h3>
            <p className="mt-2 text-sm md:text-base text-slate-500 dark:text-slate-400">
              最近一年里，哪一天写得最多，一眼就能看见。
            </p>
          </div>

          <button
            onClick={onClose}
            data-sound="action"
            className="shrink-0 w-10 h-10 rounded-full border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 transition-colors flex items-center justify-center"
            title="关闭"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-92px)] px-5 py-5 md:px-8 md:py-7">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
            <div className="rounded-3xl border border-rose-100/80 dark:border-rose-900/50 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-900 px-4 py-4">
              <div className="text-xs tracking-[0.2em] uppercase text-rose-400 dark:text-rose-300">一起记录</div>
              <div className="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">{stats.allActiveDays}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">天被认真写下</div>
            </div>

            <div className="rounded-3xl border border-violet-100/80 dark:border-violet-900/50 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-900 px-4 py-4">
              <div className="text-xs tracking-[0.2em] uppercase text-violet-400 dark:text-violet-300">最近一年</div>
              <div className="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">{stats.recentActiveDays}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">天里有新记忆</div>
            </div>

            <div className="rounded-3xl border border-amber-100/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900 px-4 py-4">
              <div className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-amber-500 dark:text-amber-300">
                <Flame size={14} />
                连续记录
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">{stats.currentStreak}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">最长 {stats.longestStreak} 天</div>
            </div>

            <div className="rounded-3xl border border-sky-100/80 dark:border-sky-900/50 bg-gradient-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-900 px-4 py-4">
              <div className="flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-sky-500 dark:text-sky-300">
                <Sparkles size={14} />
                记忆总数
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">{stats.totalMemories}</div>
              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">近一年 {stats.recentMemoryCount} 条</div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/70 dark:border-slate-700/70 bg-gradient-to-br from-white via-white to-violet-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/20 p-4 md:p-6 shadow-[0_20px_60px_-30px_rgba(168,85,247,0.35)]">
            <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">最近 365 天的共同轨迹</p>
                <div className="inline-flex items-center rounded-full border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 p-0.5 gap-0.5">
                  {[
                    { key: 'all' as AuthorFilter, label: '全部' },
                    { key: 'her' as AuthorFilter, label: '她的' },
                    { key: 'him' as AuthorFilter, label: '他的' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilter(tab.key)}
                      className={[
                        'px-3 py-1 text-xs font-medium rounded-full transition-all duration-200',
                        filter === tab.key
                          ? tab.key === 'her'
                            ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300 shadow-sm'
                            : tab.key === 'him'
                              ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300 shadow-sm'
                              : 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      ].join(' ')}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <p className="w-full text-xs text-slate-500 dark:text-slate-400">点击有颜色的日期，就会跳到那天的记忆。</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>少</span>
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={[
                        'w-3.5 h-3.5 rounded-[4px] border',
                        level === 0 ? 'bg-white/70 dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80' : '',
                        level === 1 ? 'bg-rose-100 dark:bg-rose-900/30 border-rose-200/80 dark:border-rose-700/40' : '',
                        level === 2 ? 'bg-violet-200 dark:bg-violet-800/50 border-violet-300/80 dark:border-violet-600/50' : '',
                        level === 3 ? 'bg-sky-300 dark:bg-sky-700/70 border-sky-400/80 dark:border-sky-500/60' : '',
                        level === 4 ? 'bg-violet-500 dark:bg-violet-500 border-violet-500 dark:border-violet-400' : ''
                      ].join(' ')}
                    />
                  ))}
                </div>
                <span>多</span>
              </div>
            </div>

            <div className="overflow-x-auto pb-2">
              <div className="min-w-[820px] w-max">
                <div className="flex gap-2 mb-2 pl-8">
                  {stats.monthLabels.map((label, index) => (
                    <div key={`${label}-${index}`} className="w-4 md:w-[18px] text-[11px] text-slate-400 dark:text-slate-500 leading-none">
                      {label}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <div className="flex flex-col gap-1.5 pt-0.5 pr-1">
                    {WEEKDAY_LABELS.map((label, index) => (
                      <div key={`${label}-${index}`} className="h-3.5 md:h-4 text-[11px] text-slate-400 dark:text-slate-500 leading-none flex items-center justify-end">
                        {label}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-1.5">
                    {stats.weeks.map((week, weekIndex) => (
                      <div key={`week-${weekIndex}`} className="flex flex-col gap-1.5">
                        {week.map((day) => {
                          if (!day.inRange) {
                            return <div key={day.key} className="w-3.5 h-3.5 md:w-4 md:h-4" />;
                          }

                          const summary = day.count === 0
                            ? `${format(day.date, 'yyyy年M月d日')}：这天还没有记忆`
                            : `${format(day.date, 'yyyy年M月d日')}：共 ${day.count} 条（她 ${day.herCount} / 他 ${day.himCount}）`;

                          return (
                            <button
                              key={day.key}
                              type="button"
                              data-sound={day.count > 0 ? 'action' : undefined}
                              title={summary}
                              disabled={day.count === 0}
                              onClick={() => onSelectDate(day.key)}
                              className={getCellClassName(day.count, day.herCount, day.himCount, stats.maxCount, isSameDay(day.date, stats.today), filter)}
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

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-900/20 px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                她的记忆
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 dark:bg-sky-900/20 px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                他的记忆
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 dark:bg-violet-900/20 px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-violet-400" />
                同一天一起记录
              </span>
            </div>
          </div>

          {memories.length === 0 && (
            <div className="mt-6 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 px-6 py-10 text-center text-slate-500 dark:text-slate-400">
              还没有记忆可以点亮日历，先写下第一条吧 ✨
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
