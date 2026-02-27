/**
 * ==========================================
 * 在线状态指示器组件 (Presence Indicator)
 * ==========================================
 *
 * 当两个用户同时在线时，在角落显示温馨提示。
 * 带有可爱的动画效果和关闭按钮。
 */

import React, { useState, useEffect, useRef } from 'react';
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

// 甜蜜提示语数组 - 上线时
const SWEET_MESSAGES = [
  '对方也正在想你噢 💭',
  'TA 也在看呢~ 💕',
  '你们同时在线啦 🥰',
  '心有灵犀一点通 ✨',
  '思念是双向的哦 💗',
  '不约而同地想起了对方 🌙',
  '此刻你们在一起 💫',
  '两颗心在同一个频率 💓'
];

// 离线提示语数组 - 下线时
const GOODBYE_MESSAGES = [
  'TA 暂时离开了 👋',
  '对方去忙了，记得想 TA 哦 💫',
  'TA 下线了，但心还在 💗',
  '暂别片刻，思念不减 🌙'
];

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = React.memo(({
  currentUser,
  darkMode = false
}) => {
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerUser, setPartnerUser] = useState<UserType | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [message, setMessage] = useState(SWEET_MESSAGES[0]);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [isGoodbye, setIsGoodbye] = useState(false); // 是否是离线提示
  const dismissTimeoutRef = useRef<number | null>(null);
  const hasPlayedSound = useRef(false);
  const wasOnlineRef = useRef(false); // 记录上次是否在线

  // 可爱音效
  const playHeartSound = () => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      const audioCtx = new AudioContextClass();
      const now = audioCtx.currentTime;

      // 创建双音符效果
      const createNote = (freq: number, startTime: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      // 上升的双音符 - 像心跳声
      createNote(523, now, 0.15);        // C5
      createNote(659, now + 0.12, 0.2);  // E5
      createNote(784, now + 0.25, 0.3);  // G5

      // 清理
      setTimeout(() => audioCtx.close(), 1000);
    } catch (e) {
      console.warn('无法播放音效:', e);
    }
  };

  // 初始化 Presence
  useEffect(() => {
    if (!currentUser || !isPresenceAvailable()) return;

    initPresence(currentUser);

    const unsubscribe = subscribeToPresence((online, user) => {
      setPartnerOnline(online);
      setPartnerUser(user);
      
      if (online && !hasPlayedSound.current) {
        // 随机选择消息
        setMessage(SWEET_MESSAGES[Math.floor(Math.random() * SWEET_MESSAGES.length)]);
        setIsGoodbye(false);
        
        // 播放音效
        playHeartSound();
        hasPlayedSound.current = true;
        
        // 显示心形爆发动画
        setShowHeartBurst(true);
        setTimeout(() => setShowHeartBurst(false), 1500);
        
        // 重置 dismissed 状态
        setIsDismissed(false);
        wasOnlineRef.current = true;
      }
      
      // 如果对方下线了，且之前是在线的，显示离开提示
      if (!online && wasOnlineRef.current) {
        setMessage(GOODBYE_MESSAGES[Math.floor(Math.random() * GOODBYE_MESSAGES.length)]);
        setIsGoodbye(true);
        setIsDismissed(false);
        hasPlayedSound.current = false;
        wasOnlineRef.current = false;
        
        // 3秒后自动隐藏离线提示
        setTimeout(() => {
          setIsDismissed(true);
        }, 3000);
      }
    });

    return () => {
      unsubscribe();
      cleanupPresence();
    };
  }, [currentUser]);

  // 控制显示/隐藏动画
  useEffect(() => {
    // 在线时显示，或者是离开提示时也显示
    if ((partnerOnline || isGoodbye) && !isDismissed) {
      // 延迟显示，让动画更流畅
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [partnerOnline, isDismissed, isGoodbye]);

  // 关闭处理
  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    
    // 等待退出动画完成后设置 dismissed
    dismissTimeoutRef.current = window.setTimeout(() => {
      setIsDismissed(true);
    }, 300);
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  // 如果 Presence 不可用或没有用户，不渲染
  if (!isPresenceAvailable() || !currentUser) return null;

  // 获取对方头像
  const partnerAvatar = partnerUser ? getAvatar(partnerUser) : '💕';

  return (
    <>
      {/* 心形爆发动画 */}
      {showHeartBurst && (
        <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-heart-burst"
              style={{
                left: '50%',
                top: '50%',
                transform: `rotate(${i * 30}deg)`,
                animationDelay: `${i * 50}ms`
              }}
            >
              <Heart
                className="w-6 h-6 text-rose-400 fill-rose-400"
                style={{
                  filter: 'drop-shadow(0 0 8px rgba(251, 113, 133, 0.6))'
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* 在线状态指示器 */}
      <div
        className={`
          fixed bottom-20 right-4 z-[9999]
          transition-all duration-500 ease-out
          ${isVisible 
            ? 'opacity-100 translate-x-0 scale-100' 
            : 'opacity-0 translate-x-full scale-90 pointer-events-none'
          }
        `}
      >
        <div
          className={`
            relative flex items-center gap-3 px-4 py-3 rounded-2xl
            shadow-lg backdrop-blur-md
            border
            ${isGoodbye
              ? (darkMode 
                  ? 'bg-slate-800/90 border-slate-500/30 text-white' 
                  : 'bg-white/90 border-slate-200 text-slate-600')
              : (darkMode 
                  ? 'bg-slate-800/90 border-rose-500/30 text-white' 
                  : 'bg-white/90 border-rose-200 text-slate-700')
            }
            ${isGoodbye ? '' : 'animate-float'}
          `}
        >
          {/* 关闭按钮 */}
          <button
            onClick={handleDismiss}
            className={`
              absolute -top-2 -right-2 w-6 h-6 rounded-full
              flex items-center justify-center
              transition-all duration-200
              hover:scale-110 active:scale-95
              ${darkMode 
                ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
                : 'bg-rose-100 hover:bg-rose-200 text-rose-500'
              }
            `}
            aria-label="关闭"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* 头像区域 */}
          <div className="relative">
            {/* 脉冲光环 - 只在在线时显示 */}
            {!isGoodbye && (
              <div className="absolute inset-0 rounded-full animate-ping-slow opacity-30 bg-rose-400" />
            )}
            
            {/* 头像容器 */}
            <div
              className={`
                relative w-12 h-12 rounded-full
                flex items-center justify-center text-2xl
                border-2 ${isGoodbye ? 'border-slate-300' : 'border-rose-300'}
                ${darkMode ? 'bg-slate-700' : (isGoodbye ? 'bg-slate-50' : 'bg-rose-50')}
                ${isGoodbye ? '' : 'animate-bounce-gentle'}
              `}
            >
              {partnerAvatar}
              
              {/* 在线指示点 - 只在在线时显示 */}
              {!isGoodbye && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-white animate-pulse" />
              )}
            </div>
          </div>

          {/* 文字区域 */}
          <div className="flex flex-col">
            <span className="text-sm font-medium flex items-center gap-1">
              {!isGoodbye && <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />}
              {message}
            </span>
            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {isGoodbye 
                ? `${partnerUser === UserType.HER ? '她' : '他'}刚刚离开`
                : `${partnerUser === UserType.HER ? '她' : '他'}正在浏览`
              }
            </span>
          </div>

          {/* 装饰心形 */}
          <Heart 
            className={`w-5 h-5 ${isGoodbye ? 'text-slate-400' : 'text-rose-400 fill-rose-400 animate-heartbeat'}`}
          />
        </div>
      </div>

      {/* 自定义动画样式 */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 0.3; }
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }

        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          14% { transform: scale(1.2); }
          28% { transform: scale(1); }
          42% { transform: scale(1.2); }
          70% { transform: scale(1); }
        }
        .animate-heartbeat {
          animation: heartbeat 1.5s ease-in-out infinite;
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }

        @keyframes heart-burst {
          0% {
            opacity: 1;
            transform: rotate(var(--rotation, 0deg)) translateY(0);
          }
          100% {
            opacity: 0;
            transform: rotate(var(--rotation, 0deg)) translateY(-150px);
          }
        }
        .animate-heart-burst {
          animation: heart-burst 1.2s ease-out forwards;
        }
        .animate-heart-burst > * {
          transform: translateX(-50%) translateY(-50%);
        }
      `}</style>
    </>
  );
});

PresenceIndicator.displayName = 'PresenceIndicator';

export default PresenceIndicator;
