/**
 * 在线状态指示器组件 (Presence Indicator)
 *
 * 当两个用户同时在线时，显示温馨双头像卡片。
 * 带有旋转渐变边框、粒子动效、爱心连接等视觉效果。
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Heart, X, Sparkles } from 'lucide-react';
import { UserType, getAvatar } from '../types';
import {
  initPresence,
  subscribeToPresence,
  cleanupPresence,
  isPresenceAvailable
} from '../services/presenceService';

interface PresenceIndicatorProps {
  currentUser: UserType | null;
  darkMode?: boolean;
}

const SWEET_MESSAGES = [
  '对方也正在想你噢',
  'TA 也在看呢~',
  '你们同时在线啦',
  '心有灵犀一点通',
  '思念是双向的哦',
  '不约而同地想起了对方',
  '此刻你们在一起',
  '两颗心在同一个频率',
];

const GOODBYE_MESSAGES = [
  'TA 暂时离开了',
  '对方去忙了，记得想 TA 哦',
  'TA 下线了，但心还在',
  '暂别片刻，思念不减',
];

interface BurstItem {
  angle: number;
  dist: number;
  delay: number;
  size: number;
  type: number;
  spin: number;
}

const createBurstItems = (): BurstItem[] => {
  return Array.from({ length: 48 }, (_, i) => {
    const isInner = i < 16;
    const angle = (i * (360 / 48)) + (Math.random() * 20 - 10);
    const dist = isInner ? 50 + Math.random() * 50 : 120 + Math.random() * 140;
    const delay = Math.random() * 300;
    const size = isInner ? 0.4 + Math.random() * 0.4 : 0.7 + Math.random() * 0.7;
    const type = Math.floor(Math.random() * 6);
    const spin = type <= 1
      ? (Math.random() * 60 - 30)
      : (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360);

    return { angle, dist, delay, size, type, spin };
  });
};

const PRESENCE_ANIMATION_STYLES = `
        /* --- 上线爆发 --- */
        .pr-burst-glow-1 {
          animation: _prGlow1 1.6s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
        }
        @keyframes _prGlow1 {
          0%   { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(4.5); opacity: 0; }
        }

        .pr-burst-glow-2 {
          animation: _prGlow2 1.3s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
        }
        @keyframes _prGlow2 {
          0%   { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(3.5); opacity: 0; }
        }

        .pr-burst-glow-3 {
          animation: _prGlow3 0.9s cubic-bezier(0.1, 0.8, 0.2, 1) forwards;
        }
        @keyframes _prGlow3 {
          0%   { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        .pr-burst-particle {
          /* 动画时长 2.2s，使用 both 保持 0% 状态直到 delay 结束 */
          animation: _prBurst 2.2s cubic-bezier(0.15, 0.85, 0.3, 1) both;
        }
        @keyframes _prBurst {
          0% {
            opacity: 0;
            transform: rotate(var(--pr-angle,0deg)) translateY(0) scale(0) rotate(0deg);
          }
          10% {
            opacity: 1;
            transform: rotate(var(--pr-angle,0deg)) translateY(calc(var(--pr-dist,100px)*-0.3)) scale(calc(var(--pr-size,1)*1.2)) rotate(calc(var(--pr-spin,0deg)*0.3));
          }
          75% {
            opacity: 0.9;
            transform: rotate(var(--pr-angle,0deg)) translateY(calc(var(--pr-dist,100px)*-0.9)) scale(var(--pr-size,1)) rotate(calc(var(--pr-spin,0deg)*0.8));
          }
          100% {
            opacity: 0;
            transform: rotate(var(--pr-angle,0deg)) translateY(calc(var(--pr-dist,100px)*-1)) scale(0) rotate(var(--pr-spin,0deg));
          }
        }

        /* --- 卡片外光晕 --- */
        .pr-glow-pulse {
          animation: _prGlowPulse 3s ease-in-out infinite;
        }
        @keyframes _prGlowPulse {
          0%,100% { opacity: 0.45; transform: scale(1); }
          50%     { opacity: 0.75; transform: scale(1.06); }
        }

        /* --- 旋转渐变边框 --- */
        .pr-border-spin {
          animation: _prBorderSpin 4s linear infinite;
        }
        @keyframes _prBorderSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* --- 卡片浮动 --- */
        .pr-card-float {
          animation: _prFloat 4s ease-in-out infinite;
        }
        @keyframes _prFloat {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-4px); }
        }

        /* --- 头像向内轻靠 --- */
        .pr-nudge-left {
          animation: _prNudgeL 2.8s ease-in-out infinite;
        }
        @keyframes _prNudgeL {
          0%,100% { transform: translateX(0); }
          50%     { transform: translateX(2px); }
        }

        .pr-nudge-right {
          animation: _prNudgeR 2.8s ease-in-out infinite;
        }
        @keyframes _prNudgeR {
          0%,100% { transform: translateX(0); }
          50%     { transform: translateX(-2px); }
        }

        /* --- 连接爱心心跳 --- */
        .pr-heart-beat {
          animation: _prHeartBeat 1.2s ease-in-out infinite;
        }
        @keyframes _prHeartBeat {
          0%,100% { transform: scale(1); }
          15%     { transform: scale(1.3); }
          30%     { transform: scale(0.95); }
          45%     { transform: scale(1.25); }
          60%     { transform: scale(1); }
        }

        /* --- 头像光环脉冲 --- */
        .pr-ring-pulse {
          animation: _prRingPulse 2.6s ease-in-out infinite;
        }
        @keyframes _prRingPulse {
          0%,100% { opacity: 0.25; transform: scale(1); }
          50%     { opacity: 0.55; transform: scale(1.18); }
        }

        /* --- Sparkles 闪烁 --- */
        .pr-twinkle {
          animation: _prTwinkle 2s ease-in-out infinite;
        }
        @keyframes _prTwinkle {
          0%,100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50%     { opacity: 0.45; transform: scale(0.75) rotate(180deg); }
        }

        /* --- 微粒子上浮 --- */
        .pr-particle {
          animation: _prParticle 3s ease-in-out infinite;
        }
        @keyframes _prParticle {
          0%   { transform: translateY(0) scale(0); opacity: 0; }
          15%  { opacity: 0.8; transform: translateY(-8px) scale(1); }
          100% { transform: translateY(-55px) scale(0); opacity: 0; }
        }
      `;

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = React.memo(({
  currentUser,
  darkMode = false,
}) => {
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerUser, setPartnerUser] = useState<UserType | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [message, setMessage] = useState(SWEET_MESSAGES[0]);
  const [showBurst, setShowBurst] = useState(false);
  const [isGoodbye, setIsGoodbye] = useState(false);
  const dismissTimeoutRef = useRef<number | null>(null);
  const goodbyeTimeoutRef = useRef<number | null>(null);
  const burstTimeoutRef = useRef<number | null>(null);
  const heartAudioCtxRef = useRef<AudioContext | null>(null);
  const hasPlayedSound = useRef(false);
  const wasOnlineRef = useRef(false);

  const playHeartSound = useCallback(() => {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;

    try {
      if (!heartAudioCtxRef.current || heartAudioCtxRef.current.state === 'closed') {
        heartAudioCtxRef.current = new Ctx();
      }

      const ctx = heartAudioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const now = ctx.currentTime;
      const note = (freq: number, t: number, dur: number) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.1, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.01, t + dur);
        o.start(t);
        o.stop(t + dur);
      };
      note(523, now, 0.15);
      note(659, now + 0.12, 0.2);
      note(784, now + 0.25, 0.3);
    } catch (_) {}
  }, []);

  // --- Presence lifecycle ---
  useEffect(() => {
    if (!currentUser || !isPresenceAvailable()) return;

    initPresence(currentUser).catch(() => {});

    const unsubscribe = subscribeToPresence((online, user) => {
      setPartnerOnline(online);
      setPartnerUser(user);

      if (online && !hasPlayedSound.current) {
        setMessage(SWEET_MESSAGES[Math.floor(Math.random() * SWEET_MESSAGES.length)]);
        setIsGoodbye(false);
        playHeartSound();
        hasPlayedSound.current = true;
        setShowBurst(true);
        if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
        burstTimeoutRef.current = window.setTimeout(() => setShowBurst(false), 2800);
        setIsDismissed(false);
        wasOnlineRef.current = true;
      }

      if (!online && wasOnlineRef.current) {
        setMessage(GOODBYE_MESSAGES[Math.floor(Math.random() * GOODBYE_MESSAGES.length)]);
        setIsGoodbye(true);
        setIsDismissed(false);
        hasPlayedSound.current = false;
        wasOnlineRef.current = false;
        if (goodbyeTimeoutRef.current) clearTimeout(goodbyeTimeoutRef.current);
        goodbyeTimeoutRef.current = window.setTimeout(() => setIsDismissed(true), 3500);
      }
    });

    return () => {
      unsubscribe();
      cleanupPresence();
      if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
      if (goodbyeTimeoutRef.current) clearTimeout(goodbyeTimeoutRef.current);
    };
  }, [currentUser, playHeartSound]);

  useEffect(() => {
    if ((partnerOnline || isGoodbye) && !isDismissed) {
      const t = setTimeout(() => setIsVisible(true), 120);
      return () => clearTimeout(t);
    }
    setIsVisible(false);
  }, [partnerOnline, isDismissed, isGoodbye]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    dismissTimeoutRef.current = window.setTimeout(() => setIsDismissed(true), 500);
  };

  useEffect(() => () => {
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    if (goodbyeTimeoutRef.current) clearTimeout(goodbyeTimeoutRef.current);
    if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
    const audioCtx = heartAudioCtxRef.current;
    if (audioCtx && audioCtx.state !== 'closed') {
      void audioCtx.close();
    }
  }, []);

  if (!isPresenceAvailable() || !currentUser) return null;

  const myAvatar = getAvatar(currentUser);
  const partnerAvatar = partnerUser ? getAvatar(partnerUser) : '💕';
  const dm = darkMode;

  const burstItems = useMemo(() => (showBurst ? createBurstItems() : []), [showBurst]);

  return (
    <>
      {/* ====== 上线爆发特效 ====== */}
      {showBurst && (
        <div className="fixed inset-0 pointer-events-none z-[9998] flex items-center justify-center overflow-hidden">
          {/* 中心多层光波扩散 */}
          <div className="absolute w-32 h-32 rounded-full bg-gradient-to-tr from-rose-400/40 to-fuchsia-400/40 blur-md pr-burst-glow-1" />
          <div className="absolute w-24 h-24 rounded-full bg-pink-300/50 blur-sm pr-burst-glow-2" />
          <div className="absolute w-12 h-12 rounded-full bg-white/90 shadow-[0_0_30px_rgba(255,255,255,1)] pr-burst-glow-3" />
          
          {/* 粒子组容器 */}
          <div className="absolute">
            {burstItems.map((item, i) => (
              <div
                key={i}
                className="absolute pr-burst-particle flex items-center justify-center"
                style={{
                  '--pr-angle': `${item.angle}deg`,
                  '--pr-dist': `${item.dist}px`,
                  '--pr-size': item.size,
                  '--pr-spin': `${item.spin}deg`,
                  animationDelay: `${item.delay}ms`,
                  marginLeft: '-12px', // 抵消自身一半宽高，保证从中心发射
                  marginTop: '-12px',
                  width: '24px',
                  height: '24px',
                } as React.CSSProperties}
              >
                {item.type === 0 && (
                  <Heart className="w-6 h-6 text-rose-500 fill-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
                )}
                {item.type === 1 && (
                  <Heart className="w-4 h-4 text-pink-400 fill-pink-400 drop-shadow-[0_0_6px_rgba(244,114,182,0.6)]" />
                )}
                {item.type === 2 && (
                  <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.7)]" />
                )}
                {item.type === 3 && (
                  <span className="text-xl text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.7)] font-bold">✦</span>
                )}
                {item.type === 4 && (
                  <div className="w-2.5 h-2.5 rounded-full bg-sky-300 drop-shadow-[0_0_8px_rgba(125,211,252,0.7)]" />
                )}
                {item.type === 5 && (
                  <div className="w-2 h-2 rounded-full bg-white drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== 主卡片 ====== */}
      <div
        className={`
          fixed bottom-20 right-4 z-[9999] w-[13rem]
          transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-6 scale-90 pointer-events-none'}
        `}
      >
        {/* 外发光 */}
        {!isGoodbye && (
          <div className="absolute -inset-4 rounded-3xl blur-2xl pr-glow-pulse bg-gradient-to-br from-rose-400/15 via-purple-400/10 to-sky-400/15" />
        )}

        <div className="relative rounded-2xl overflow-hidden">
          {/* 旋转渐变边框 */}
          {!isGoodbye && (
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className="absolute inset-[-150%] pr-border-spin bg-[conic-gradient(from_0deg,transparent_0%,#fb7185_8%,#c084fc_16%,#38bdf8_24%,transparent_32%,transparent_100%)]" />
            </div>
          )}
          {isGoodbye && (
            <div className={`absolute inset-0 rounded-2xl border ${dm ? 'border-slate-700' : 'border-slate-200/80'}`} />
          )}

          {/* 内容 */}
          <div
            className={`
              relative m-[1.5px] rounded-[14.5px] px-4 pt-3.5 pb-3 backdrop-blur-xl
              ${dm ? 'bg-slate-900/95' : 'bg-white/95'}
              ${isGoodbye ? '' : 'pr-card-float'}
            `}
          >
            {/* 关闭 */}
            <button
              onClick={handleDismiss}
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

            {/* 双头像 */}
            <div className="flex items-center justify-center gap-0 mb-2">
              {/* 我 */}
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

              {/* 连接爱心 */}
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

              {/* 对方 */}
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

            {/* 文字 */}
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
                  ? `${partnerUser === UserType.HER ? '她' : '他'}刚刚离开 👋`
                  : `${partnerUser === UserType.HER ? '她' : '他'}正在浏览 💫`}
              </p>
            </div>

            {/* 微粒子 */}
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

      {/* ====== 动画关键帧 ====== */}
      <style>{PRESENCE_ANIMATION_STYLES}</style>
    </>
  );
});

PresenceIndicator.displayName = 'PresenceIndicator';

export default PresenceIndicator;
