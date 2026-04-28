import React from 'react';
import { Check, Edit2, Loader2, Trash2, X } from 'lucide-react';

interface MemoryCardFooterProps {
  isHer: boolean;
  dateStr: string;
  canModify: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}

export const MemoryCardFooter: React.FC<MemoryCardFooterProps> = React.memo(({
  isHer,
  dateStr,
  canModify,
  isEditing,
  isSaving,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}) => {
  return (
    <div className="flex justify-between items-end mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
      <div className="flex flex-col gap-1">
        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isHer ? 'text-rose-400 dark:text-rose-300' : 'text-sky-400 dark:text-sky-300'}`}>
          {isHer ? 'Her Memory' : 'His Memory'}
        </span>
        <span className="font-sans text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-[0.15em] mt-1">
          {dateStr}
        </span>
      </div>

      {canModify && (
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelEdit();
                }}
                disabled={isSaving}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors disabled:opacity-50"
                title="取消"
              >
                <X size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveEdit();
                }}
                disabled={isSaving}
                className={`p-2 rounded-full transition-colors ${isHer ? 'hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-400 dark:text-rose-300 hover:text-rose-600 dark:hover:text-rose-400' : 'hover:bg-sky-50 dark:hover:bg-sky-900/30 text-sky-400 dark:text-sky-300 hover:text-sky-600 dark:hover:text-sky-400'} disabled:opacity-50`}
                title="保存"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit();
                }}
                data-sound="action"
                className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 transform hover:scale-110"
                title="编辑回忆"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                data-sound="action"
                className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/30 text-slate-300 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transform hover:scale-110"
                title="删除回忆"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

MemoryCardFooter.displayName = 'MemoryCardFooter';
