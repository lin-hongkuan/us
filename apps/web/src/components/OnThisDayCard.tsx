import React, { useEffect, useMemo, useState } from 'react';
import { CalendarHeart, ChevronRight, X } from 'lucide-react';
import { Memory } from '../types';

interface OnThisDayCardProps {
  memories: Memory[];
  onSelectDate: (dateKey: string) => void;
}

const toLocalDateKey = (value: number | Date): string => {
  const date = typeof value === 'number' ? new Date(value) : value;
  return [
    date.getFullYear(),
    `${date.getMonth() + 1}`.padStart(2, '0'),
    `${date.getDate()}`.padStart(2, '0'),
  ].join('-');
};

const dismissKeyOfToday = () => `on_this_day_dismissed_${toLocalDateKey(new Date())}`;

const readDismissed = (): boolean => {
  try {
    return window.localStorage.getItem(dismissKeyOfToday()) === '1';
  } catch {
    return false;
  }
};

const writeDismissed = () => {
  try {
    window.localStorage.setItem(dismissKeyOfToday(), '1');
  } catch {
    /* ignore */
  }
};

interface PastEntry {
  yearsAgo: number;
  dateKey: string;
  count: number;
  preview: string;
}

const buildPastEntries = (memories: Memory[]): PastEntry[] => {
  const today = new Date();
  const m = today.getMonth();
  const d = today.getDate();
  const thisYear = today.getFullYear();

  const groups = new Map<number, Memory[]>();
  for (const memory of memories) {
    const created = new Date(memory.createdAt);
    if (created.getMonth() !== m || created.getDate() !== d) continue;
    const year = created.getFullYear();
    if (year >= thisYear) continue; // 只看过去的
    const list = groups.get(year) ?? [];
    list.push(memory);
    groups.set(year, list);
  }

  const entries: PastEntry[] = [];
  for (const [year, list] of groups) {
    const sample = [...list].sort((a, b) => a.createdAt - b.createdAt)[0];
    const preview = (sample?.content ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
    entries.push({
      yearsAgo: thisYear - year,
      dateKey: toLocalDateKey(new Date(year, m, d)),
      count: list.length,
      preview,
    });
  }

  return entries.sort((a, b) => a.yearsAgo - b.yearsAgo);
};

export const OnThisDayCard: React.FC<OnThisDayCardProps> = ({ memories, onSelectDate }) => {
  const entries = useMemo(() => buildPastEntries(memories), [memories]);
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());
  const [visible, setVisible] = useState(false);

  // 入场轻微延迟，避免抢首屏注意力
  useEffect(() => {
    if (dismissed || entries.length === 0) return;
    const timer = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(timer);
  }, [dismissed, entries.length]);

  if (dismissed || entries.length === 0) return null;

  const featured = entries[0];

  const handleDismiss = () => {
    setVisible(false);
    writeDismissed();
    window.setTimeout(() => setDismissed(true), 220);
  };

  const handleOpen = () => {
    onSelectDate(featured.dateKey);
    setVisible(false);
    writeDismissed();
    window.setTimeout(() => setDismissed(true), 220);
  };

  return (
    <div
      role="dialog"
      aria-label="N 年前的今天"
      className={`fixed right-3 top-[5.5rem] md:top-28 z-30 w-[15rem] md:w-[17rem] origin-top-right rounded-2xl border border-white/70 bg-white/95 dark:border-slate-700/70 dark:bg-slate-900/95 shadow-[0_20px_60px_-25px_rgba(168,85,247,0.45)] backdrop-blur-xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 pointer-events-none'
      }`}
    >
      <div className="absolute -top-px left-3 right-3 h-px bg-gradient-to-r from-transparent via-rose-300/70 to-transparent dark:via-rose-500/40" />
      <button
        type="button"
        aria-label="关闭"
        onClick={handleDismiss}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <X size={14} />
      </button>

      <div className="px-4 pt-4 pb-3">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-100 via-violet-100 to-sky-100 dark:from-rose-900/30 dark:via-violet-900/30 dark:to-sky-900/30 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-500 dark:text-violet-300">
          <CalendarHeart size={11} />
          On This Day
        </div>
        <h4 className="mt-2 text-base font-semibold text-slate-800 dark:text-slate-100">
          {featured.yearsAgo} 年前的今天
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          一起记下了 <span className="font-semibold text-slate-700 dark:text-slate-200">{featured.count}</span> 条回忆
          {entries.length > 1 && (
            <>
              ，往前还有 <span className="font-semibold text-slate-700 dark:text-slate-200">{entries.length - 1}</span> 年
            </>
          )}
        </p>
        {featured.preview && (
          <p className="mt-2 line-clamp-2 rounded-lg bg-slate-50/80 dark:bg-slate-800/60 px-2.5 py-1.5 text-xs italic text-slate-500 dark:text-slate-300">
            「{featured.preview}{featured.preview.length >= 40 ? '…' : ''}」
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleOpen}
        data-sound="action"
        className="group flex w-full items-center justify-between gap-2 border-t border-slate-100/70 dark:border-slate-700/70 px-4 py-2.5 text-sm font-medium text-violet-500 dark:text-violet-300 hover:bg-violet-50/70 dark:hover:bg-violet-900/20 transition-colors rounded-b-2xl"
      >
        <span>跳到那一天</span>
        <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  );
};

export default OnThisDayCard;
