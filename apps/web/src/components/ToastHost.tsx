import React from 'react';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  duration?: number;
}

export type ConfirmTone = 'default' | 'danger' | 'warning';

export interface ConfirmDialogState {
  id: string;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
}

interface ToastHostProps {
  toasts: ToastMessage[];
  onDismissToast: (id: string) => void;
  confirmDialog: ConfirmDialogState | null;
  onResolveConfirm: (confirmed: boolean) => void;
}

const toastStyles: Record<ToastTone, { icon: string; ring: string; text: string; glow: string }> = {
  success: {
    icon: '💗',
    ring: 'border-emerald-200/70 dark:border-emerald-700/50',
    text: 'text-emerald-600 dark:text-emerald-300',
    glow: 'bg-emerald-400/15',
  },
  error: {
    icon: '🥺',
    ring: 'border-rose-200/80 dark:border-rose-700/60',
    text: 'text-rose-600 dark:text-rose-300',
    glow: 'bg-rose-400/15',
  },
  info: {
    icon: '✨',
    ring: 'border-sky-200/80 dark:border-sky-700/60',
    text: 'text-sky-600 dark:text-sky-300',
    glow: 'bg-sky-400/15',
  },
  warning: {
    icon: '🌙',
    ring: 'border-amber-200/80 dark:border-amber-700/60',
    text: 'text-amber-600 dark:text-amber-300',
    glow: 'bg-amber-400/15',
  },
};

const confirmButtonStyles: Record<ConfirmTone, string> = {
  default: 'from-rose-400 via-purple-400 to-sky-400 shadow-rose-200/50 dark:shadow-none',
  danger: 'from-rose-500 to-rose-600 shadow-rose-200/50 dark:shadow-none',
  warning: 'from-amber-400 to-rose-500 shadow-amber-200/50 dark:shadow-none',
};

export const ToastHost: React.FC<ToastHostProps> = ({
  toasts,
  onDismissToast,
  confirmDialog,
  onResolveConfirm,
}) => {
  return (
    <>
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed right-3 top-24 z-[120] flex w-[calc(100vw-1.5rem)] max-w-sm flex-col gap-3 pointer-events-none md:right-6 md:top-28"
      >
        {toasts.map((toast) => {
          const style = toastStyles[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto relative overflow-hidden rounded-3xl border ${style.ring} bg-white/95 dark:bg-slate-900/95 p-4 shadow-[0_18px_50px_-18px_rgba(15,23,42,0.35)] backdrop-blur-xl animate-in fade-in slide-in-from-right-3 duration-300`}
            >
              <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl ${style.glow}`} />
              <div className="relative flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-lg shadow-inner">
                  {style.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold tracking-wide ${style.text}`}>{toast.title}</p>
                  {toast.description && (
                    <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onDismissToast(toast.id)}
                  className="rounded-full px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                  aria-label="关闭提示"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {confirmDialog && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={() => onResolveConfirm(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`confirm-title-${confirmDialog.id}`}
            className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/50 bg-white/95 p-6 text-center shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300 dark:border-slate-700/60 dark:bg-slate-900/95"
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-rose-300 via-purple-300 to-sky-300" />
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-2xl shadow-inner dark:bg-rose-900/30">
              {confirmDialog.tone === 'danger' ? '🗑️' : confirmDialog.tone === 'warning' ? '🌙' : '💌'}
            </div>
            <h3 id={`confirm-title-${confirmDialog.id}`} className="text-lg font-bold tracking-wide text-slate-800 dark:text-slate-100">
              {confirmDialog.title}
            </h3>
            {confirmDialog.description && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {confirmDialog.description}
              </p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => onResolveConfirm(false)}
                className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                {confirmDialog.cancelText || '再想想'}
              </button>
              <button
                type="button"
                onClick={() => onResolveConfirm(true)}
                className={`rounded-full bg-gradient-to-r ${confirmButtonStyles[confirmDialog.tone || 'default']} px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:-translate-y-0.5 active:scale-95`}
              >
                {confirmDialog.confirmText || '确定'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ToastHost;
