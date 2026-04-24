import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastHostProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✗',
  info: '💬',
  warning: '⚠',
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-white/95 dark:bg-slate-800/95 border-emerald-200 dark:border-emerald-800',
  error: 'bg-white/95 dark:bg-slate-800/95 border-rose-200 dark:border-rose-800',
  info: 'bg-white/95 dark:bg-slate-800/95 border-purple-200 dark:border-purple-800',
  warning: 'bg-white/95 dark:bg-slate-800/95 border-amber-200 dark:border-amber-800',
};

const TOAST_ICON_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
  error: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400',
  info: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
  warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
};

export const ToastHost: React.FC<ToastHostProps> = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl
            border shadow-lg backdrop-blur-md
            min-w-[200px] max-w-[min(360px,calc(100vw-2rem))]
            animate-in fade-in slide-in-from-bottom-3 duration-300
            ${TOAST_STYLES[toast.type]}
          `}
        >
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${TOAST_ICON_STYLES[toast.type]}`}>
            {TOAST_ICONS[toast.type]}
          </span>
          <span className="text-sm text-slate-700 dark:text-slate-200 leading-snug flex-1">
            {toast.message}
          </span>
          <button
            onClick={() => onRemove(toast.id)}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
};
