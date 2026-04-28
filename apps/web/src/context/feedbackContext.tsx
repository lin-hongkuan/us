import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ToastHost, type ConfirmDialogState, type ToastMessage } from '../components/ToastHost';

interface FeedbackContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  requestConfirm: (dialog: Omit<ConfirmDialogState, 'id'>) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

const createFeedbackId = (prefix: string): string => {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const confirmResolverRef = useRef<((confirmed: boolean) => void) | null>(null);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = createFeedbackId('toast');
    const duration = toast.duration ?? 3600;
    const nextToast: ToastMessage = { ...toast, id, duration };

    setToasts(prev => [...prev.slice(-3), nextToast]);

    if (duration > 0) {
      const timer = setTimeout(() => dismissToast(id), duration);
      toastTimersRef.current.set(id, timer);
    }
  }, [dismissToast]);

  const resolveConfirm = useCallback((confirmed: boolean) => {
    confirmResolverRef.current?.(confirmed);
    confirmResolverRef.current = null;
    setConfirmDialog(null);
  }, []);

  const requestConfirm = useCallback((dialog: Omit<ConfirmDialogState, 'id'>): Promise<boolean> => {
    return new Promise((resolve) => {
      if (confirmResolverRef.current) {
        confirmResolverRef.current(false);
      }

      confirmResolverRef.current = resolve;
      setConfirmDialog({ ...dialog, id: createFeedbackId('confirm') });
    });
  }, []);

  useEffect(() => {
    const toastTimers = toastTimersRef.current;
    return () => {
      toastTimers.forEach(timer => clearTimeout(timer));
      toastTimers.clear();
      confirmResolverRef.current?.(false);
      confirmResolverRef.current = null;
    };
  }, []);

  const value = useMemo(() => ({ showToast, requestConfirm }), [showToast, requestConfirm]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onDismissToast={dismissToast} confirmDialog={confirmDialog} onResolveConfirm={resolveConfirm} />
    </FeedbackContext.Provider>
  );
};

export const useFeedbackContext = () => {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error('useFeedbackContext must be used within a FeedbackProvider');
  return context;
};
