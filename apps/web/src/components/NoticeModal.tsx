import React, { useEffect } from 'react';
import { Heart, X } from 'lucide-react';

interface NoticeModalProps {
  isOpen: boolean;
  specialEvent: 'milestone' | 'anniversary' | null;
  daysTogether: number;
  noticeStep: 'question' | 'yes' | 'no';
  onClose: () => void;
  onStepChange: (step: 'question' | 'yes' | 'no') => void;
}

export const NoticeModal: React.FC<NoticeModalProps> = React.memo(({ isOpen, specialEvent, daysTogether, noticeStep, onClose, onStepChange }) => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notice-modal-title"
        className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm max-h-[82vh] overflow-hidden mx-auto shadow-2xl animate-popIn border border-white/50 dark:border-slate-700/50 text-center"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors z-10"
          aria-label="关闭公告"
        >
          <X size={20} />
        </button>

        <div className="max-h-[66vh] overflow-y-auto px-1 pb-1">
          <div className="flex flex-col items-center pt-2">
            {specialEvent === 'milestone' ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative w-full">
                <div className="text-4xl mb-4">🎉</div>
                <h3 id="notice-modal-title" className="text-lg text-slate-700 dark:text-slate-200 font-bold mb-2">哇！我们已经一起走过{daysTogether}天啦！</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">又攒下一枚闪闪发光的纪念日碎片。</p>
                <FloatingHearts />
              </div>
            ) : specialEvent === 'anniversary' ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative w-full">
                <div className="text-4xl mb-4">🎂</div>
                <h3 id="notice-modal-title" className="text-lg text-slate-700 dark:text-slate-200 font-bold mb-2">今天是我们的纪念日哦！</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">相爱{daysTogether}天啦，要一直开开心心！</p>
                <FloatingHearts />
              </div>
            ) : noticeStep === 'question' ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="text-4xl mb-4">🤔</div>
                <h3 id="notice-modal-title" className="text-lg text-slate-700 dark:text-slate-200 font-bold mb-2">你今天想我了吗？</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">偷偷说也可以，反正这里会替你保密。</p>
                <div className="flex gap-4 justify-center">
                  <button type="button" onClick={() => onStepChange('yes')} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-400 to-rose-500 text-white font-medium hover:opacity-90 active:scale-95 transition-all">想了！</button>
                  <button type="button" onClick={() => onStepChange('no')} className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all">没想...</button>
                </div>
              </div>
            ) : noticeStep === 'yes' ? (
              <div className="animate-in zoom-in-95 duration-300 relative">
                <div className="text-5xl mb-4 animate-bounce">🥰</div>
                <h3 id="notice-modal-title" className="text-lg text-rose-500 dark:text-rose-400 font-bold">我也超级超级想你！！</h3>
                <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">这句话已经被悄悄存进今天的空气里了。</p>
                <div className="absolute -inset-4 bg-rose-100/50 dark:bg-rose-500/20 rounded-full blur-xl -z-10 animate-pulse" />
              </div>
            ) : (
              <div className="animate-shake relative">
                <div className="text-5xl mb-4">🥺</div>
                <h3 id="notice-modal-title" className="text-lg text-sky-500 dark:text-sky-400 font-bold">哼！我不信！<br/>你一定是想我了！</h3>
                <button type="button" onClick={() => onStepChange('yes')} className="mt-6 px-6 py-2 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300 font-medium hover:bg-sky-200 dark:hover:bg-sky-800/50 active:scale-95 transition-all text-sm">好吧，其实想了</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const FloatingHearts = () => (
  <div className="absolute -top-12 left-0 right-0 flex justify-center gap-4 pointer-events-none">
    <Heart className="text-rose-500 fill-rose-500 animate-float-up" size={24} style={{ animationDelay: '0s' }} />
    <Heart className="text-rose-400 fill-rose-400 animate-float-up" size={16} style={{ animationDelay: '0.2s' }} />
    <Heart className="text-rose-500 fill-rose-500 animate-float-up" size={32} style={{ animationDelay: '0.4s' }} />
  </div>
);

NoticeModal.displayName = 'NoticeModal';
