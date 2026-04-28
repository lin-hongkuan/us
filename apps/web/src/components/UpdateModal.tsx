import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { APP_UPDATE } from '../types';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = React.memo(({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const updateContentItems = useMemo(() => APP_UPDATE.content.map((line, i) => (
    <div key={i} className="flex items-start gap-2">
      <span className="text-xs font-semibold text-rose-400 mt-0.5 w-4 text-right tabular-nums">{i + 1}</span>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{line}</p>
    </div>
  )), []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm max-h-[82vh] overflow-hidden mx-auto shadow-2xl animate-popIn border border-white/50 dark:border-slate-700/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-modal-title"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          aria-label="关闭更新公告"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">✨</span>
          <h3 id="update-modal-title" className="text-lg font-bold text-slate-800 dark:text-slate-200 tracking-wide">Update {APP_UPDATE.version}</h3>
        </div>

        <div className="space-y-4 text-left max-h-[62vh] overflow-y-auto pr-1">
          {updateContentItems}
          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wider uppercase text-right">{APP_UPDATE.date}</div>
        </div>
      </div>
    </div>
  );
});

UpdateModal.displayName = 'UpdateModal';
