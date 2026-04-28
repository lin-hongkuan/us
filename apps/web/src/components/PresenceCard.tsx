import React from 'react';
import { Heart, Sparkles, X } from 'lucide-react';
import { UserType, getAvatar } from '../types';

interface PresenceCardProps {
  currentUser: UserType;
  partnerUser: UserType | null;
  darkMode: boolean;
  isVisible: boolean;
  isGoodbye: boolean;
  message: string;
  onDismiss: (e: React.MouseEvent) => void;
}

export const PresenceCard: React.FC<PresenceCardProps> = React.memo(({
  currentUser,
  partnerUser,
  darkMode,
  isVisible,
  isGoodbye,
  message,
  onDismiss,
}) => {
  const displayPartnerUser = partnerUser ?? (currentUser === UserType.HER ? UserType.HIM : UserType.HER);
  const myAvatar = getAvatar(currentUser);
  const partnerAvatar = getAvatar(displayPartnerUser);
  const partnerPronoun = displayPartnerUser === UserType.HER ? '她' : '他';
  const dm = darkMode;

  return (
    <div
      className={`
        fixed bottom-20 right-4 z-[9999] w-[13rem]
        transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-6 scale-90 pointer-events-none'}
      `}
      role="status"
      aria-live="polite"
      aria-hidden={!isVisible}
    >
      {!isGoodbye && (
        <div className="absolute -inset-4 rounded-3xl blur-2xl pr-glow-pulse bg-gradient-to-br from-rose-400/15 via-purple-400/10 to-sky-400/15" />
      )}

      <div className="relative rounded-2xl overflow-hidden">
        {!isGoodbye && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <div className="absolute inset-[-150%] pr-border-spin bg-[conic-gradient(from_0deg,transparent_0%,#fb7185_8%,#c084fc_16%,#38bdf8_24%,transparent_32%,transparent_100%)]" />
          </div>
        )}
        {isGoodbye && (
          <div className={`absolute inset-0 rounded-2xl border ${dm ? 'border-slate-700' : 'border-slate-200/80'}`} />
        )}

        <div
          className={`
            relative m-[1.5px] rounded-[14.5px] px-4 pt-3.5 pb-3 backdrop-blur-xl
            ${dm ? 'bg-slate-900/95' : 'bg-white/95'}
            ${isGoodbye ? '' : 'pr-card-float'}
          `}
        >
          <button
            onClick={onDismiss}
            className={`
              absolute top-2 right-2 w-5 h-5 rounded-full z-20
              flex items-center justify-center
              transition-all duration-200 hover:scale-125 active:scale-90
              opacity-40 hover:opacity-80
              ${dm ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}
            `}
            aria-label="关闭"
          >
            <X className="w-3 h-3" />
          </button>

          <div className="flex items-center justify-center gap-0 mb-2">
            <div
              className={`
                relative w-11 h-11 rounded-full flex items-center justify-center text-xl
                border-2 transition-colors duration-500
                ${isGoodbye
                  ? (dm ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-slate-50')
                  : (dm ? 'border-rose-500/50 bg-slate-800' : 'border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50')}
                ${isGoodbye ? '' : 'pr-nudge-left'}
              `}
            >
              {!isGoodbye && (
                <div className="absolute -inset-1 rounded-full bg-rose-400/10 pr-ring-pulse" />
              )}
              <span className="relative z-10">{myAvatar}</span>
            </div>

            <div className={`relative z-20 -mx-1.5 ${isGoodbye ? '' : 'pr-heart-beat'}`}>
              <Heart
                className={`w-[18px] h-[18px] transition-colors duration-500 ${
                  isGoodbye
                    ? (dm ? 'text-slate-600' : 'text-slate-300')
                    : 'text-rose-500 fill-rose-500'
                }`}
                style={isGoodbye ? {} : { filter: 'drop-shadow(0 0 8px rgba(244,63,94,0.45))' }}
              />
            </div>

            <div
              className={`
                relative w-11 h-11 rounded-full flex items-center justify-center text-xl
                border-2 transition-colors duration-500
                ${isGoodbye
                  ? (dm ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-slate-50')
                  : (dm ? 'border-sky-500/50 bg-slate-800' : 'border-sky-200 bg-gradient-to-br from-sky-50 to-indigo-50')}
                ${isGoodbye ? '' : 'pr-nudge-right'}
              `}
            >
              {!isGoodbye && (
                <div className="absolute -inset-1 rounded-full bg-sky-400/10 pr-ring-pulse" style={{ animationDelay: '0.3s' }} />
              )}
              <span className="relative z-10">{partnerAvatar}</span>
              {!isGoodbye && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-[1.5px] border-white dark:border-slate-900 animate-pulse z-20" />
              )}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              {!isGoodbye && (
                <Sparkles className="w-3 h-3 text-amber-400 pr-twinkle flex-shrink-0" />
              )}
              <span
                className={`text-[13px] font-semibold leading-snug tracking-wide ${
                  isGoodbye ? (dm ? 'text-slate-400' : 'text-slate-500') : ''
                }`}
                style={
                  isGoodbye
                    ? {}
                    : {
                        background: dm
                          ? 'linear-gradient(135deg, #fda4af, #c4b5fd, #7dd3fc)'
                          : 'linear-gradient(135deg, #e11d48, #9333ea, #0284c7)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }
                }
              >
                {message}
              </span>
            </div>
            <p className={`text-[10px] mt-1 font-medium ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
              {isGoodbye
                ? `${partnerPronoun}刚刚离开 👋`
                : `${partnerPronoun}正在浏览 💫`}
            </p>
          </div>

          {!isGoodbye && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[14.5px]">
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  className="absolute w-1 h-1 rounded-full pr-particle"
                  style={{
                    left: `${10 + i * 15}%`,
                    bottom: 0,
                    animationDelay: `${i * 0.5}s`,
                    background: i % 2 === 0 ? 'rgba(251,113,133,0.55)' : 'rgba(168,85,247,0.45)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

PresenceCard.displayName = 'PresenceCard';
