import React from 'react';
import { Download } from 'lucide-react';

interface ExportFooterButtonProps {
  onExport: () => void;
  count: number;
}

/**
 * 页面底部的「导出回忆」浮动小按钮。
 * - 位置 fixed bottom-center，避开 PiggyBank（bottom-left）和 PresenceCard（bottom-right）
 * - 默认低对比度（避免抢主操作的视觉），hover/focus 时变得清晰
 * - 没有回忆时不渲染，避免空状态下出现「导出空集」的误导
 */
export const ExportFooterButton: React.FC<ExportFooterButtonProps> = ({ onExport, count }) => {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <button
        type="button"
        onClick={onExport}
        data-sound="action"
        aria-label={`导出全部 ${count} 条回忆为 JSON 备份`}
        title="导出回忆备份（JSON）"
        className="pointer-events-auto group inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-500 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.25)] backdrop-blur-md transition-all duration-300 hover:bg-white hover:text-emerald-600 hover:-translate-y-0.5 active:scale-95 dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-300 opacity-60 hover:opacity-100 focus:opacity-100"
      >
        <Download size={12} className="transition-transform duration-300 group-hover:translate-y-0.5" />
        <span>导出 {count} 条回忆</span>
      </button>
    </div>
  );
};

export default ExportFooterButton;
