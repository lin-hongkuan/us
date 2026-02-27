/**
 * App.tsx - 共享记忆日记主应用
 *
 * 结构说明：
 * - 三阶段：login（选身份）→ transition（过渡动画）→ main（双栏时间轴）
 * - 登录页：纪念日计数、情话轮播、她/他选择；主界面：左右分栏记忆流、Header、弹窗与彩蛋
 * - 性能：Header 显隐用 ref 不触发重渲染；记忆列表项 content-visibility；彩蛋/弹窗懒加载
 */

import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { UserType, Memory, getAvatar, getDailyAvatars, APP_UPDATE } from './types';
import { getMemories, saveMemory, deleteMemory, updateMemory, seedDataIfEmpty, subscribeToMemoryChanges, unsubscribeFromMemoryChanges } from './services/storageService';
import { subscribeToCacheUpdates, clearMemoryCache, clearIndexedDBCache } from './services/cacheService';
import { MemoryCard } from './components/MemoryCard';
import { TypewriterText } from './components/TypewriterText';
import { PresenceIndicator } from './components/PresenceIndicator';
import { ClickStarOverlay, dispatchStarPop } from './components/ClickStarOverlay';
import { PenTool, User, Loader2, Moon, Sun, Star as StarIcon, X, Heart, Frown } from 'lucide-react';

// ---------- 懒加载组件（按需加载，减轻首包） ----------
const Composer = lazy(() => import('./components/Composer').then(m => ({ default: m.Composer })));
const PiggyBank = lazy(() => import('./components/PiggyBank').then(m => ({ default: m.PiggyBank })));
const GravityMode = lazy(() => import('./components/GravityMode').then(m => ({ default: m.GravityMode })));
const Game2048 = lazy(() => import('./components/Game2048').then(m => ({ default: m.Game2048 })));

/** 弹窗/彩蛋加载中的占位 UI */
const LazyLoadingFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-rose-400" />
      <span className="text-white/80 text-sm">加载中...</span>
    </div>
  </div>
);

/** 角落常驻星光：位置 + 尺寸/延迟/时长，由 CSS 做闪烁 */
interface AmbientStar {
  id: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

/** 登录页情话池，点击可切换并持久化到 localStorage */
const QUOTES: string[] = [
  '“我们共享的每一刻，\n都是故事里的一页。”',
  '“人生中最好的事情\n就是彼此拥有。”',
  '“你知道墙壁，眼睛，膝盖，的英文怎么说吗？”',
  "“我有超能力，\n超喜欢你。”",
  "“不要抱怨，\n抱我。”",
  "“你能不能帮我洗个东西？\n喜欢我。”",
  "“你可以帮我指一下路吗？\n去你心里的路。”",
  '“你猜我想吃什么？\n我想痴痴地望着你。”',
  "“你会变魔术吗？\n变着法地让我开心。”",
  "“我们可以交换礼物吗？\n我是你的，你是我的。”",
  "“你一定是碳酸饮料，\n不然我怎么一见到你就开心得冒泡？”",
  "“我想买一块地，\n你的死心塌地。”",
  "“你属什么？\n我属于你。”",
  "“你会游泳吗？\n不会的话你要坠入爱河了。”",
  "“我觉得你今天有点怪，\n怪可爱的。”",
  "“你为什么要害我？\n害我那么喜欢你。”",
  '“你累不累啊？\n你在我脑子里跑了一整天了。”',
  "“我想送你一只口红，\n然后每天还我一点点。”",
  "“你闻到空气中有什么味道吗？\n是你出现后，空气都变甜了。”",
  "“这世界上的风景很多，\n但我眼里只有你这一处。”",
  "“我没什么特长，\n就是喜欢你的时间特长。”",
  "“你是最好的，\n如果有人比你好，我就装作没看见。”",
  "“你平时是不是很宅？\n不然你怎么一直住在我心里不出去？”",
  "“你以后走路能不能看着点？\n你都撞到我心尖上了。”",
  "“你不要总是冷冰冰的，\n来我怀里，我给你捂暖。”",
  "“苦海无边，\n回头是我。”",
  "“最近手头有点紧，\n能不能借你的手牵一下？”",
  '“你闻到烧焦的味道了吗？\n那是我的心在为你燃烧。”',
  '“我有两个心愿：\n你在身边，在你身边。”',
  "“你知不知道你适合穿什么衣服？\n被我收服。”",
  "“你最近是不是胖了？\n不然你在我心里的分量怎么变重了？”",
  "“你知道你和冰淇淋的区别吗？\n它会化在嘴里，你会化在我心里。”",
  '“我可以跟你借个吻吗？\n我保证会还给你的。”',
  "“你的眼睛里有海，\n而我刚好是那个想溺水的船长。”",
  "“我数到三，\n我们就一起掉进爱河好不好？”",
  "“你知道你适合什么季节吗？\n适合跟我过每一个季节。”",
  '“你猜我的心在哪边？\n左边？不，在你那边。”',
  "“我想和你打个赌，\n输了你就当我女朋友，赢了我就当你男朋友。”"

];

/** 纪念日起算日，用于“在一起 X 天”计算 */
const START_DATE_STR = '2024-08-20';

function App() {
  // ---------- 纪念日与登录页 ----------
  const [daysTogether] = useState(() => {
    const startDate = new Date(START_DATE_STR);
    const today = new Date();
    return Math.floor(Math.abs(today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  });
  const [displayDays, setDisplayDays] = useState(0);
  const [isLateNight, setIsLateNight] = useState(false);
  const [showSleepMessage, setShowSleepMessage] = useState(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [noticeStep, setNoticeStep] = useState<'question' | 'yes' | 'no'>('question');
  const [showStamp, setShowStamp] = useState(false);
  const [isGravityMode, setIsGravityMode] = useState(false);
  const [isGame2048Open, setIsGame2048Open] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

  /** 今日是否为里程碑(100/520天)或纪念日(同月同日) */
  const specialEvent = useMemo(() => {
    const today = new Date();
    const startDate = new Date(START_DATE_STR);
    
    if (daysTogether===520||daysTogether > 0 && daysTogether % 100 === 0) return 'milestone';
    
    if (today.getMonth() === startDate.getMonth() && today.getDate() === startDate.getDate()) {
      return 'anniversary';
    }
    
    return null;
  }, [daysTogether]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 1 && hour < 6) setIsLateNight(true);
  }, []);

  useEffect(() => {
    if (daysTogether === 0) return;
    const duration = 2000;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setDisplayDays(Math.floor(daysTogether * ease));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [daysTogether]);

  // ---------- 主界面状态 ----------
  const [memories, setMemories] = useState<Memory[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<UserType>(UserType.HER);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<'login' | 'transition' | 'main'>('login');
  const [transitionRetracting, setTransitionRetracting] = useState(false);
  const [transitionRingProgress, setTransitionRingProgress] = useState(0);
  const [hoveredSide, setHoveredSide] = useState<UserType | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem('dark_mode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [quoteIndex, setQuoteIndex] = useState<number>(() => {
    if (typeof window === 'undefined' || QUOTES.length === 0) return 0;
    try {
      const stored = window.localStorage.getItem('login_quote_index');
      const lastIndex = stored != null ? parseInt(stored, 10) : -1;
      const nextIndex = Number.isNaN(lastIndex) ? 0 : (lastIndex + 1) % QUOTES.length;
      window.localStorage.setItem('login_quote_index', String(nextIndex));
      return nextIndex;
    } catch {
      return 0;
    }
  });
  const [showSecondLine, setShowSecondLine] = useState(false);
  const currentQuote = QUOTES[quoteIndex] ?? QUOTES[0];
  const [ambientStars] = useState<AmbientStar[]>(() => {
    const spots = [
      { top: '4%', left: '6%' },
      { top: '12%', right: '8%' },
      { bottom: '10%', left: '8%' },
      { bottom: '6%', right: '6%' },
      { top: '48%', left: '3%' },
      { bottom: '46%', right: '4%' }
    ];

    return spots.map((spot, idx) => ({
      id: idx,
      size: 5 + Math.random() * 6,
      delay: Math.random() * 18,
      duration: 14 + Math.random() * 8,
      opacity: 0.18 + Math.random() * 0.18,
      ...spot
    }));
  });
  // ---------- 主题与音效 ----------
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.localStorage.setItem('dark_mode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => setDarkMode(prev => !prev), []);

  const handleQuoteClick = (e: React.MouseEvent<HTMLParagraphElement>) => {
    e.stopPropagation();
    if (!QUOTES.length) return;
    setQuoteIndex(prev => {
      const next = (prev + 1) % QUOTES.length;
      try {
        window.localStorage.setItem('login_quote_index', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // 当文案切换时，第二句延迟 1s 出现，制造“反转”感
  useEffect(() => {
    setShowSecondLine(false);
    const timer = window.setTimeout(() => setShowSecondLine(true), 1000);
    return () => window.clearTimeout(timer);
  }, [currentQuote, quoteIndex]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const playClickSound = useCallback((type: 'default' | 'her' | 'him' | 'action' | 'stamp' = 'default') => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    // 复用或创建 AudioContext 单例
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContextClass();
    }
    const audioCtx = audioCtxRef.current;
    
    // 如果 AudioContext 被暂停（浏览器策略），恢复它
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'her') {
      // High pitched, sparkly (Her)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, now);
      oscillator.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } else if (type === 'him') {
      // Lower pitched, solid (Him)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(300, now);
      oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } else if (type === 'action') {
      // Quick swipe/switch (Action)
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(500, now);
      oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    } else if (type === 'stamp') {
      // Heavy thud (Stamp)
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(150, now);
      oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
    } else {
      // Default Bubble
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator.start(now);
      oscillator.stop(now + 0.15);
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const soundElement = target.closest('[data-sound]');
      const type = soundElement ? soundElement.getAttribute('data-sound') : 'default';
      playClickSound(type as any);
    };
    window.addEventListener('mousedown', handleClick, { passive: true });
    return () => window.removeEventListener('mousedown', handleClick);
  }, [playClickSound]);

  // ---------- 滚动与 Header（ref 控制显隐，不触发重渲染） ----------
  const headerRef = useRef<HTMLElement>(null);
  const scrollPositions = useRef({ [UserType.HER]: 0, [UserType.HIM]: 0 });

  // ---------- 头像长按刷新（3 秒振动 + 版本更新重载） ----------
  const [isAvatarShaking, setIsAvatarShaking] = useState<UserType | null>(null);
  const [avatarShakeIntensity, setAvatarShakeIntensity] = useState(0);
  const longPressTimer = useRef<number | null>(null);
  const isLongPress = useRef(false);
  const pressStartTime = useRef<number>(0);
  const shakeAnimationRef = useRef<number | null>(null);

  // 播放刷新音效（递增频率）
  const playRefreshSound = (progress: number) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContextClass();
    }
    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    // 频率从300Hz升到800Hz
    const freq = 300 + progress * 500;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, now);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
    oscillator.start(now);
    oscillator.stop(now + 0.08);
  };

  // 播放加载完成音效：柔和两音上升（G4→C5），像「好了」的轻提示
  const transitionEnteredAtRef = useRef<number>(0);
  const playLoadCompleteSound = () => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContextClass();
    }
    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;
    const gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.06, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.008, now + 0.22);

    const playNote = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.connect(gainNode);
      osc.start(start);
      osc.stop(start + duration);
    };
    playNote(392, now, 0.1);           // G4
    playNote(523.25, now + 0.1, 0.12); // C5
  };

  // 播放成功音效
  const playSuccessSound = () => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContextClass();
    }
    const audioCtx = audioCtxRef.current;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    oscillator.type = 'sine';
    // 成功音：上升音阶
    oscillator.frequency.setValueAtTime(523, now); // C5
    oscillator.frequency.setValueAtTime(659, now + 0.1); // E5
    oscillator.frequency.setValueAtTime(784, now + 0.2); // G5
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    oscillator.start(now);
    oscillator.stop(now + 0.4);
  };

  // 开始长按头像：启动振动循环，3秒后触发刷新
  const handleAvatarPressStart = (type: UserType) => {
    isLongPress.current = false;
    pressStartTime.current = Date.now();
    setIsAvatarShaking(type);
    setAvatarShakeIntensity(0);

    const startTime = Date.now();
    let lastSoundTime = 0;
    
    // 振动循环函数：随着时间推移振动间隔变短，强度增加
    const vibrateLoop = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / 3000, 1); // 3秒阈值
      
      // 更新振动强度（用于CSS动画）
      setAvatarShakeIntensity(progress);
      
      // 3秒阈值达成
      if (elapsed >= 3000) {
        isLongPress.current = true;
        if (navigator.vibrate) navigator.vibrate([300, 100, 300]); // 成功振动模式
        playSuccessSound();
        
        // 清除缓存并重新加载
        setIsAvatarShaking(null);
        setAvatarShakeIntensity(0);
        
        // 显示提示后刷新
        setTimeout(async () => {
          // 清除所有缓存层
          clearMemoryCache(); // 内存缓存
          await clearIndexedDBCache(); // IndexedDB 缓存
          localStorage.removeItem('us_app_memories'); // localStorage
          sessionStorage.clear();
          // 强制重新加载（绕过缓存）
          window.location.reload();
        }, 500);
        
        return;
      }

      // 计算延迟：400ms -> 80ms（更快的反馈）
      const delay = 400 - (progress * 320);
      
      // 手机震动
      if (navigator.vibrate) {
        const vibrateDuration = 20 + Math.floor(progress * 30); // 20ms -> 50ms
        navigator.vibrate(vibrateDuration);
      }
      
      // 音效（每150ms播放一次）
      if (elapsed - lastSoundTime > 150) {
        playRefreshSound(progress);
        lastSoundTime = elapsed;
      }
      
      longPressTimer.current = window.setTimeout(vibrateLoop, delay);
    };

    vibrateLoop();
  };

  // 结束长按：清除定时器，停止振动和动画
  const handleAvatarPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (shakeAnimationRef.current) {
      cancelAnimationFrame(shakeAnimationRef.current);
      shakeAnimationRef.current = null;
    }
    // 重置状态
    setIsAvatarShaking(null);
    setAvatarShakeIntensity(0);
    // 停止振动
    if (!isLongPress.current && navigator.vibrate) {
      navigator.vibrate(0);
    }
  };

  const handleAvatarClickWrapper = (type: UserType, e: React.MouseEvent) => {
    if (isLongPress.current || Date.now() - pressStartTime.current > 500) {
      e.preventDefault();
      e.stopPropagation();
      isLongPress.current = false;
      return;
    }
    handleChooseUser(type);
  };

  // ---------- 背景视差（仅桌面 ≥768px，移动端不跑 RAF） ----------
  const loginBackgroundRef = useRef<HTMLDivElement>(null);
  const mainBackgroundRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const isDesktopPointer = window.matchMedia('(pointer: fine)').matches;
    const isWideEnough = window.matchMedia('(min-width: 768px)').matches;
    if (!isDesktopPointer || !isWideEnough) return;

    // 使用 passive 监听器提升滚动性能
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1
      };
    };
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    let frameId: number;
    let isRunning = true;
    
    const animate = () => {
      if (!isRunning) return;
      
      // 页面不可见时跳过计算，节省 CPU
      if (document.hidden) {
        frameId = requestAnimationFrame(animate);
        return;
      }
      
      const ease = 0.015; // 小步长 Lerp，慢速跟随
      currentPos.current.x += (mousePos.current.x - currentPos.current.x) * ease;
      currentPos.current.y += (mousePos.current.y - currentPos.current.y) * ease;
      
      const xOffset = currentPos.current.x * 60; 
      const yOffset = currentPos.current.y * 60;
      
      if (loginBackgroundRef.current) {
        loginBackgroundRef.current.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
      }
      if (mainBackgroundRef.current) {
        mainBackgroundRef.current.style.transform = `translate3d(${xOffset}px, ${yOffset}px, 0)`;
      }
      
      frameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      isRunning = false;
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  // ---------- 数据加载与缓存订阅 ----------
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await seedDataIfEmpty();
      const data = await getMemories();
      setMemories(data);
      setIsLoading(false);
      
      // 【新增】启动实时订阅，监听云端数据变化
      subscribeToMemoryChanges();
    };
    fetchData();
    
    // 【优化】订阅缓存更新事件，后台同步数据时自动更新 UI
    const unsubscribe = subscribeToCacheUpdates((updatedMemories) => {
      setMemories(updatedMemories);
    });
    
    return () => {
      unsubscribe();
      // 【新增】组件卸载时取消实时订阅
      unsubscribeFromMemoryChanges();
    };
  }, []);

  // 离开过渡层时重置「已调度收回」与圆环进度
  useEffect(() => {
    if (phase !== 'transition') {
      retractScheduledRef.current = false;
      setTransitionRingProgress(0);
    }
  }, [phase]);

  // 进入过渡层时记录时间，用于判断是否「真正有过加载」再播加载完成音
  useEffect(() => {
    if (phase === 'transition') transitionEnteredAtRef.current = Date.now();
  }, [phase]);

  // 过渡层圆环进度：进入时 0→90% 用 RAF + ease-out 模拟，加载完成时平滑到 100%
  const transitionProgressRafRef = useRef<number | null>(null);
  const LOAD_COMPLETE_SOUND_MIN_MS = 500; // 至少经历约 500ms 才播加载完成音，避免与选她/他的点击音重叠
  useEffect(() => {
    if (phase !== 'transition') return;
    if (!isLoading) {
      const elapsed = Date.now() - transitionEnteredAtRef.current;
      if (elapsed >= LOAD_COMPLETE_SOUND_MIN_MS) playLoadCompleteSound();
      setTransitionRingProgress(100);
      return;
    }
    setTransitionRingProgress(0);
    const duration = 1600;
    const maxProgress = 90;
    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);
      const p = maxProgress * eased;
      setTransitionRingProgress(p);
      if (t < 1) {
        transitionProgressRafRef.current = requestAnimationFrame(tick);
      }
    };
    transitionProgressRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (transitionProgressRafRef.current != null) {
        cancelAnimationFrame(transitionProgressRafRef.current);
        transitionProgressRafRef.current = null;
      }
    };
  }, [phase, isLoading]);

  // 加载完成且处于过渡层时，仅一次延迟后触发收回（避免 effect 重跑反复重置计时）
  const retractTimeoutRef = useRef<number | null>(null);
  const retractScheduledRef = useRef(false);
  useEffect(() => {
    if (phase !== 'transition' || isLoading || transitionRetracting) return;
    if (retractScheduledRef.current) return;
    retractScheduledRef.current = true;
    const minStayMs = 800;
    retractTimeoutRef.current = window.setTimeout(() => {
      retractTimeoutRef.current = null;
      setTransitionRetracting(true);
    }, minStayMs);
    return () => {
      if (retractTimeoutRef.current) {
        clearTimeout(retractTimeoutRef.current);
        retractTimeoutRef.current = null;
      }
    };
  }, [phase, isLoading, transitionRetracting]);

  const scrollRafRef = useRef<number | null>(null);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: UserType) => {
    const scrollTop = e.currentTarget.scrollTop;
    
    // RAF 节流：避免高频滚动导致性能问题
    if (scrollRafRef.current !== null) return;
    
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      
      const last = scrollPositions.current[type];
      const diff = scrollTop - last;

      if (Math.abs(diff) < 10) return;

      const hide = scrollTop > last && scrollTop > 60;
      headerRef.current?.classList.toggle('header-hidden', hide);
      
      scrollPositions.current[type] = scrollTop;
    });
  };

  // ---------- 记忆 CRUD 与彩蛋暗号 ----------
  const handleSave = async (content: string, imageUrls?: string[]) => {
    const trimmed = content.trim();
    if (trimmed === '1104') {
      setIsGravityMode(true);
      setIsComposerOpen(false);
      return;
    }
    if (trimmed === '2005') {
      setIsGame2048Open(true);
      setIsComposerOpen(false);
      return;
    }

    if (!currentUser) return;
    const newMem = await saveMemory({ content, author: currentUser, imageUrls });
    if (newMem) {
      setMemories((prev) => [newMem, ...prev]);
      setIsComposerOpen(false);
      
      // Trigger Stamp Effect
      setShowStamp(true);
      playClickSound('stamp');
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      window.setTimeout(() => setShowStamp(false), 1500);
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('确定要删除这条记忆吗？')) {
      const success = await deleteMemory(id);
      if (success) {
        setMemories((prev) => prev.filter(m => m.id !== id));
      } else {
        alert("删除失败");
      }
    }
  }, []);

  const handleUpdateMemory = useCallback(async (id: string, content: string, imageUrls?: string[] | null) => {
    const updated = await updateMemory(id, content, imageUrls);
    if (updated) {
      setMemories(prev => prev.map(m => m.id === id ? updated : m));
      playClickSound('action');
      return true;
    }
    return false;
  }, [playClickSound]);

  const handleChooseUser = useCallback((type: UserType) => {
    setCurrentUser(type);
    setActiveTab(type);
    setPhase('transition');
  }, []);

  const handleGlobalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    dispatchStarPop(e.clientX, e.clientY);
  };

  // ---------- 移动端左右滑切换她/他 ----------
  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null;
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    };
  };

  const handleTouchEnd = () => {
    const touchStart = touchStartRef.current;
    const touchEnd = touchEndRef.current;
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const isLeftSwipe = distanceX > 50;
    const isRightSwipe = distanceX < -50;
    const isMainlyHorizontal = Math.abs(distanceX) > Math.abs(distanceY);

    // 只在水平滑动距离足够大且主要是水平方向时切换
    if (isMainlyHorizontal) {
      if (isLeftSwipe && activeTab === UserType.HER) {
        // 向左滑动，从HER切换到HIM
        setActiveTab(UserType.HIM);
        playClickSound('him');
      } else if (isRightSwipe && activeTab === UserType.HIM) {
        // 向右滑动，从HIM切换到HER
        setActiveTab(UserType.HER);
        playClickSound('her');
      }
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  const herMemories = useMemo(() => memories.filter(m => m.author === UserType.HER), [memories]);
  const hisMemories = useMemo(() => memories.filter(m => m.author === UserType.HIM), [memories]);
  const herMemoryCards = useMemo(() => herMemories.map((m, i) => (
    <div
      key={m.id}
      className="memory-card-wrapper md:pl-20 relative group animate-fadeInUp pt-6 pl-4 pr-4 overflow-visible"
      style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'both' }}
    >
      {/* 时间轴节点 */}
      <div className="absolute left-8 -translate-x-[3.5px] top-8 w-2 h-2 rounded-full bg-rose-300 dark:bg-rose-500 border-4 border-[#f8f8f8] dark:border-slate-800 hidden md:block group-hover:scale-150 transition-transform duration-500 shadow-[0_0_0_4px_rgba(253,164,175,0.2)] dark:shadow-[0_0_0_4px_rgba(244,63,94,0.2)]"></div>
      <MemoryCard
        memory={m}
        onDelete={handleDelete}
        onUpdate={handleUpdateMemory}
        currentUser={currentUser}
      />
    </div>
  )), [herMemories, currentUser, handleDelete, handleUpdateMemory]);
  const hisMemoryCards = useMemo(() => hisMemories.map((m, i) => (
    <div
      key={m.id}
      className="memory-card-wrapper md:pl-20 relative group animate-fadeInUp pt-6 pl-4 pr-4 overflow-visible"
      style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'both' }}
    >
      {/* 时间轴节点 */}
      <div className="absolute left-8 -translate-x-[3.5px] top-8 w-2 h-2 rounded-full bg-sky-300 dark:bg-sky-500 border-4 border-[#f8f8f8] dark:border-slate-800 hidden md:block group-hover:scale-150 transition-transform duration-500 shadow-[0_0_0_4px_rgba(186,230,253,0.2)] dark:shadow-[0_0_0_4px_rgba(56,189,248,0.2)]"></div>
      <MemoryCard
        memory={m}
        onDelete={handleDelete}
        onUpdate={handleUpdateMemory}
        currentUser={currentUser}
      />
    </div>
  )), [hisMemories, currentUser, handleDelete, handleUpdateMemory]);

  // ---------- 渲染：登录页 ----------
  if (phase === 'login' || !currentUser) {
    return (
      <div 
        onClick={handleGlobalClick}
        className="min-h-screen flex items-center justify-center p-6 font-sans relative overflow-hidden bg-gradient-to-br from-rose-100 via-purple-50 to-sky-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 animate-gradient"
      >
        {/* Dark Mode Toggle - Hidden on Login Page */}
        {/* <button
          onClick={(e) => {
            e.stopPropagation();
            toggleDarkMode();
          }}
          className="fixed top-6 right-6 z-50 w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all duration-500"
          title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button> */}

        {/* 底噪纹理遮罩 */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-0 pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

        {/* ICON 图案遮罩 - 移动端禁用动画 */}
        <div className="absolute -inset-[100px] opacity-[0.08] pointer-events-none z-0 md:animate-moveBackground" 
             style={{ 
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2364748b' fill-opacity='1'%3E%3Cg transform='translate(10 10) scale(0.4) rotate(-10)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3Cg transform='translate(60 60) scale(0.3) rotate(20)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
             }}
        ></div>

        {/* 抽象背景光团 - 移动端简化版 */}
        <div ref={loginBackgroundRef} className="absolute -inset-[100px] overflow-hidden pointer-events-none md:transition-transform md:duration-100 md:ease-out">
           <div className="absolute top-[-20%] left-[-10%] w-[500px] md:w-[700px] h-[500px] md:h-[700px] bg-rose-300/30 dark:bg-rose-500/15 rounded-full md:mix-blend-multiply dark:md:mix-blend-screen filter blur-[40px] md:blur-[100px] opacity-70 md:animate-blob" />
           <div className="absolute bottom-[-20%] right-[-10%] w-[500px] md:w-[700px] h-[500px] md:h-[700px] bg-sky-300/30 dark:bg-sky-500/15 rounded-full md:mix-blend-multiply dark:md:mix-blend-screen filter blur-[40px] md:blur-[100px] opacity-70 md:animate-blob md:animation-delay-2000" />
           <div className="absolute top-[20%] left-[20%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-purple-200/30 dark:bg-purple-500/15 rounded-full md:mix-blend-multiply dark:md:mix-blend-screen filter blur-[40px] md:blur-[100px] opacity-50 md:animate-blob md:animation-delay-4000 hidden md:block" />
        </div>

        <div className="max-w-3xl w-full transition-transform duration-500 hover:-translate-y-2">
          <div className="login-card w-full bg-white/90 md:bg-white/60 dark:bg-slate-800/90 md:dark:bg-slate-800/60 md:backdrop-blur-2xl rounded-[3rem] border border-white/60 dark:border-slate-700/60 p-8 md:p-16 relative z-10 flex flex-col md:flex-row items-center gap-12 md:gap-20 login-card-float overflow-hidden">
          {/* 卡片内部：光带扫过 + 噪点呼吸 */}
          <div className="login-card-texture" aria-hidden="true">
            <div className="login-card-shimmer" />
            <div className="login-card-noise" />
          </div>

          {/* Left Side: Brand */}
          <div className="flex-1 text-center md:text-left relative z-10 flex flex-col justify-center">
             <h1 
               className="font-display text-[8rem] md:text-[11rem] font-normal tracking-tighter leading-[0.8] select-none mb-8 md:mb-12 text-transparent bg-clip-text bg-cover texture-text logo-cute"
               style={{
                 backgroundImage: `linear-gradient(135deg, #fb7185 0%, #a855f7 50%, #38bdf8 100%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                 backgroundBlendMode: 'hard-light',
                 backgroundSize: 'cover, 100px 100px',
                 '--shadow-rgb': '168, 85, 247'
               } as React.CSSProperties}
             >
               Us.
             </h1>
             
             <div className="space-y-8 md:pl-4 border-l-0 md:border-l border-slate-200 dark:border-slate-600">
                <div className="flex flex-col gap-1.5 animate-fadeInUp items-center md:items-start" style={{ animationDelay: '0.2s' }}>
                   <div className="flex items-baseline justify-center md:justify-start gap-2 text-rose-500 dark:text-rose-400 mb-1 select-none group w-full md:w-auto">
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 transition-opacity group-hover:opacity-100 text-right">在一起已经</span>
                      <span className="font-display text-4xl leading-none tabular-nums tracking-tight transition-all duration-700 ease-out group-hover:scale-110 group-hover:text-rose-600 dark:group-hover:text-rose-300 min-w-[3ch] text-center days-number-cute" style={{ textShadow: '0 4px 12px rgba(244, 63, 94, 0.2)' }}>
                        {displayDays}
                      </span>
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 transition-opacity group-hover:opacity-100 text-left">天了！</span>
                   </div>
                   <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold tracking-[0.4em] uppercase">婷and宽的</span>
                   <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold tracking-[0.4em] uppercase">恋爱日记</span>
                </div>

                <p
                  className="font-serif text-xl text-slate-600 dark:text-slate-300 italic leading-relaxed opacity-80 cursor-pointer select-none text-center md:text-left"
                  onClick={handleQuoteClick}
                >
                  {currentQuote.split('\n').map((line, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <br />}
                      {idx === 1 ? (
                        <span
                          className={`inline-block transition-opacity duration-300 ${showSecondLine ? 'opacity-100' : 'opacity-0'}`}
                          style={{ visibility: showSecondLine ? 'visible' : 'hidden' }}
                          aria-hidden={!showSecondLine}
                        >
                          {line}
                        </span>
                      ) : (
                        line
                      )}
                    </React.Fragment>
                  ))}
                </p>
             </div>
          </div>

          {/* Right Side: Selection */}
          <div className="flex-1 w-full max-w-xs md:max-w-none">
            <div className="grid grid-cols-2 gap-6">
               {/* Her Button */}
               <button 
                 onClick={() => handleChooseUser(UserType.HER)}
                 data-sound="her"
                 className="group relative aspect-[3/4] rounded-3xl bg-white dark:bg-slate-700 border border-white dark:border-slate-600 shadow-sm hover:shadow-[0_20px_40px_-12px_rgba(251,113,133,0.3)] dark:hover:shadow-[0_20px_40px_-12px_rgba(251,113,133,0.2)] hover:-translate-y-2 transition-all duration-500 flex flex-col items-center justify-center gap-4 overflow-hidden"
               >
                 <div className="absolute inset-0 bg-gradient-to-b from-rose-50/80 dark:from-rose-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 
                 {/* Decorative Corner Lines */}
                 <div className="absolute top-3 left-3 w-2 h-2 border-t border-l border-rose-200 dark:border-rose-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                 <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-rose-200 dark:border-rose-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                 <div className="absolute bottom-3 left-3 w-2 h-2 border-b border-l border-rose-200 dark:border-rose-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                 <div className="absolute bottom-3 right-3 w-2 h-2 border-b border-r border-rose-200 dark:border-rose-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

                 <div className="relative z-10 w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-900/30 border-4 border-white dark:border-slate-600 shadow-inner flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500">
                    {getAvatar(UserType.HER)}
                 </div>
                 <span className="relative z-10 font-serif font-bold text-lg text-rose-900/60 dark:text-rose-300 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">可爱婷</span>
               </button>

               {/* Him Button */}
               <button 
                 onClick={() => handleChooseUser(UserType.HIM)}
                 data-sound="him"
                 className="group relative aspect-[3/4] rounded-3xl bg-white dark:bg-slate-700 border border-white dark:border-slate-600 shadow-sm hover:shadow-[0_20px_40px_-12px_rgba(56,189,248,0.3)] dark:hover:shadow-[0_20px_40px_-12px_rgba(56,189,248,0.2)] hover:-translate-y-2 transition-all duration-500 flex flex-col items-center justify-center gap-4 overflow-hidden"
               >
                 <div className="absolute inset-0 bg-gradient-to-b from-sky-50/80 dark:from-sky-900/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 
                 {/* Decorative Corner Lines */}
                 <div className="absolute top-3 left-3 w-2 h-2 border-t border-l border-sky-200 dark:border-sky-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                 <div className="absolute top-3 right-3 w-2 h-2 border-t border-r border-sky-200 dark:border-sky-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                 <div className="absolute bottom-3 left-3 w-2 h-2 border-b border-l border-sky-200 dark:border-sky-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                 <div className="absolute bottom-3 right-3 w-2 h-2 border-b border-r border-sky-200 dark:border-sky-400/50 opacity-0 group-hover:opacity-100 transition-all duration-500"></div>

                 <div className="relative z-10 w-20 h-20 rounded-full bg-sky-50 dark:bg-sky-900/30 border-4 border-white dark:border-slate-600 shadow-inner flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500">
                    {getAvatar(UserType.HIM)}
                 </div>
                 <span className="relative z-10 font-serif font-bold text-lg text-sky-900/60 dark:text-sky-300 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">小男奴</span>
               </button>
            </div>
            <p className="text-center text-slate-300 dark:text-slate-500 text-[10px] mt-4 font-bold tracking-[0.3em] uppercase">
              {getDailyAvatars().desc}
            </p>
            <p className="text-center text-slate-300 dark:text-slate-500 text-[10px] mt-4 font-bold tracking-[0.3em] uppercase">请问你是？</p>
          </div>

          </div>
        </div>

        <ClickStarOverlay />
      </div>
    );
  }

  // ---------- 渲染：主界面（双栏时间轴 + Header + 弹窗/彩蛋） ----------
  return (
    <div 
      onClick={handleGlobalClick}
      className={`min-h-screen relative overflow-hidden font-sans text-slate-600 dark:text-slate-300 selection:bg-rose-100 dark:selection:bg-rose-900/50 selection:text-rose-900 dark:selection:text-rose-200 transition-colors duration-1000
      md:animate-gradient
      ${activeTab === UserType.HER 
        ? 'bg-rose-50 dark:bg-slate-900 md:bg-gradient-to-br md:from-rose-100 md:via-purple-50 md:to-sky-100 md:dark:from-slate-900 md:dark:via-slate-800 md:dark:to-slate-900' 
        : 'bg-sky-50 dark:bg-slate-900 md:bg-gradient-to-br md:from-rose-100 md:via-purple-50 md:to-sky-100 md:dark:from-slate-900 md:dark:via-slate-800 md:dark:to-slate-900'
      }
    `}>
      
      {/* 主界面噪点遮罩 */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-0 pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* ICON 遮罩层 - 移动端禁用动画 */}
      <div className="absolute -inset-[100px] opacity-[0.08] pointer-events-none z-0 md:animate-moveBackground" 
           style={{ 
           backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2364748b' fill-opacity='1'%3E%3Cg transform='translate(10 10) scale(0.4) rotate(-10)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3Cg transform='translate(60 60) scale(0.3) rotate(20)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
           }}
      ></div>

      {/* 角落星光常亮（移动端 CSS 只显示前 3 颗以提升帧率） */}
      <div className="corner-stars absolute inset-0 pointer-events-none z-10 mix-blend-screen">
        {ambientStars.map(star => (
          <span
            key={star.id}
            className="absolute rounded-full bg-white/80 shadow-[0_0_18px_rgba(255,255,255,0.35)] twinkle-star"
            style={{
              top: star.top,
              left: star.left,
              right: star.right,
              bottom: star.bottom,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`
            }}
          />
        ))}
      </div>

      {/* 顶部 Header：显隐由 ref + .header-hidden 控制，滚动不触发 setState */}
      <header 
        ref={headerRef}
        className="header-visibility fixed top-0 left-0 right-0 h-20 md:h-24 z-40 px-2 md:px-16 flex items-center justify-between pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] translate-y-0 opacity-100"
      >
        {/* Left Area: Logo + Left Actions */}
        <div className="pointer-events-auto flex items-center gap-2 md:gap-4">
          <a 
            href="https://github.com/lin-hongkuan/us"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center group cursor-pointer select-none mr-2"
          >
             <h1 
               className="font-display text-2xl md:text-3xl font-normal tracking-tight relative transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 origin-center text-transparent bg-clip-text bg-cover texture-text"
               style={{
                 backgroundImage: `linear-gradient(135deg, #fb7185 0%, #a855f7 50%, #38bdf8 100%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                 backgroundBlendMode: 'hard-light',
                 backgroundSize: 'cover, 100px 100px',
                 '--shadow-rgb': '168, 85, 247'
               } as React.CSSProperties}
             >
               Us.
             </h1>
          </a>

          {/* 深夜彩蛋：凌晨 1-6 点出现猫头鹰，点击弹出提示 */}
          {isLateNight && (
            <div className="relative">
                <button
                    onClick={() => setShowSleepMessage(!showSleepMessage)}
                    className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all duration-500 animate-pulse-soft"
                    title="深夜模式"
                >
                    <span className="text-xs md:text-lg">🦉</span>
                </button>
                {showSleepMessage && (
                    <div className="absolute top-full left-0 mt-4 w-48 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 text-center z-50 animate-fadeInUp">
                        <div className="text-2xl mb-2">🌙</div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                            还没睡吗？<br/>要注意身体哦。
                        </p>
                        {/* Speech bubble triangle */}
                        <div className="absolute -top-2 left-4 w-4 h-4 bg-white dark:bg-slate-800 transform rotate-45 border-t border-l border-slate-100 dark:border-slate-700"></div>
                    </div>
                )}
            </div>
          )}

          {/* Notice Button */}
          <div className="relative">
            <button
              onClick={() => {
                if (isNoticeOpen) {
                  setIsNoticeOpen(false);
                } else {
                  setNoticeStep('question');
                  setIsNoticeOpen(true);
                }
              }}
              data-sound="action"
              className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/95 md:bg-white/80 dark:bg-slate-800/95 md:dark:bg-slate-800/80 md:backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-yellow-400 hover:text-yellow-500 hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200"
              title="公告"
            >
              <StarIcon size={12} className="md:w-[18px] md:h-[18px] fill-current" />
            </button>
          </div>

          {/* Update Notification Button 更新公告*/}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUpdate(!showUpdate);
              }}
              className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/95 md:bg-white/80 dark:bg-slate-800/95 md:dark:bg-slate-800/80 md:backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-indigo-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200"
              title="更新公告"
            >
              <span className="text-xs md:text-lg">🔔</span>
            </button>
          </div>
        </div>

        {/* Mobile Toggle (Pill) - Floating Island */}
        <div className="pointer-events-auto md:hidden bg-white/95 dark:bg-slate-800/95 p-1 rounded-full border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] absolute left-1/2 -translate-x-1/2 z-50">
           <button 
             onClick={() => setActiveTab(UserType.HER)}
             data-sound="her"
             className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-colors duration-200 ${activeTab === UserType.HER ? 'bg-rose-50 dark:bg-rose-900/50 text-rose-500 dark:text-rose-300 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
           >
             她
           </button>
           <button 
             onClick={() => setActiveTab(UserType.HIM)}
             data-sound="him"
             className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-colors duration-200 ${activeTab === UserType.HIM ? 'bg-sky-50 dark:bg-sky-900/50 text-sky-500 dark:text-sky-300 shadow-sm' : 'text-slate-400 dark:text-slate-500'}`}
           >
             他
           </button>
        </div>

        {/* Right Actions */}
        <div className="pointer-events-auto flex items-center gap-1 md:gap-4">
          <button 
            onClick={() => setIsComposerOpen(true)}
            data-sound="action"
            className="group flex items-center gap-2 md:gap-3 bg-gradient-to-r from-rose-400 via-purple-400 to-sky-400 text-white w-9 h-9 md:w-auto md:h-auto md:px-6 md:py-3 rounded-full shadow-[0_10px_30px_-10px_rgba(168,85,247,0.4)] hover:shadow-[0_20px_40px_-12px_rgba(168,85,247,0.6)] hover:-translate-y-1 active:scale-95 transition-all duration-500 justify-center bg-[length:200%_auto] hover:bg-right"
          >
            <PenTool size={12} className="md:w-4 md:h-4 group-hover:-rotate-12 transition-transform duration-500" />
            <span className="text-sm font-medium tracking-widest uppercase hidden md:inline">Record</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            data-sound="action"
            className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/95 md:bg-white/80 dark:bg-slate-800/95 md:dark:bg-slate-800/80 md:backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200"
            title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
          >
            {darkMode ? <Sun size={12} className="md:w-[18px] md:h-[18px]" /> : <Moon size={12} className="md:w-[18px] md:h-[18px]" />}
          </button>
          
          {/* User Switch */}
          <button 
            onClick={() => {
              setCurrentUser(null);
              setPhase('login');
            }}
             data-sound="action"
             className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/95 md:bg-white/80 dark:bg-slate-800/95 md:dark:bg-slate-800/80 md:backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors duration-200 md:hover:rotate-180 md:transition-all md:duration-500"
             title="切换用户"
          >
            <User size={12} className="md:w-[18px] md:h-[18px]" />
          </button>
        </div>
      </header>

      {/* 主体：左右分栏记忆流 */}
      <main 
        className="h-screen flex relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 主屏背景光团 - 移动端优化：禁用动画和混合模式 */}
        <div ref={mainBackgroundRef} className="absolute -inset-[100px] pointer-events-none md:transition-transform md:duration-100 md:ease-out">
          <div className={`absolute top-[-20%] left-[-10%] w-[500px] md:w-[700px] h-[500px] md:h-[700px] bg-rose-300/25 md:bg-rose-300/40 dark:bg-rose-500/15 rounded-full md:mix-blend-multiply dark:md:mix-blend-screen filter blur-[25px] md:blur-[100px] md:animate-blob pointer-events-none md:transition-opacity md:duration-1000 ${activeTab === UserType.HER ? 'opacity-50 md:opacity-80' : 'opacity-0 md:opacity-80'}`}></div>
          <div className={`absolute bottom-[-20%] right-[-10%] w-[500px] md:w-[700px] h-[500px] md:h-[700px] bg-sky-300/25 md:bg-sky-300/40 dark:bg-sky-500/15 rounded-full md:mix-blend-multiply dark:md:mix-blend-screen filter blur-[25px] md:blur-[100px] md:animate-blob md:animation-delay-2000 pointer-events-none md:transition-opacity md:duration-1000 ${activeTab === UserType.HIM ? 'opacity-50 md:opacity-80' : 'opacity-0 md:opacity-80'}`}></div>
          <div className="absolute top-[20%] left-[20%] w-[600px] h-[600px] bg-purple-200/40 dark:bg-purple-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[60px] md:blur-[100px] opacity-60 animate-blob animation-delay-4000 pointer-events-none hidden md:block"></div>
        </div>
        
        {/* 加载遮罩 */}
        {phase === 'main' && isLoading && (
          <div className="absolute inset-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="animate-spin text-slate-800 dark:text-slate-200" size={32} />
          </div>
        )}

        {/* 交互背景：桌面端 hover 淡出 */}
        <div className="absolute inset-0 pointer-events-none z-0 hidden md:flex">
          {/* Left Background */}
          <div className={`flex-1 relative transition-opacity duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${hoveredSide === UserType.HIM ? 'opacity-40' : 'opacity-100'}`}>
             <div className="absolute inset-0 bg-gradient-to-r from-rose-100/30 dark:from-rose-900/20 via-rose-50/10 dark:via-rose-900/5 to-transparent" />
             <div className={`absolute inset-0 bg-gradient-to-r from-rose-200/50 dark:from-rose-800/30 via-rose-100/30 dark:via-rose-900/15 to-transparent transition-opacity duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${hoveredSide === UserType.HER ? 'opacity-100' : 'opacity-0'}`} />
          </div>
          
          {/* Right Background */}
          <div className={`flex-1 relative transition-opacity duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${hoveredSide === UserType.HER ? 'opacity-40' : 'opacity-100'}`}>
             <div className="absolute inset-0 bg-gradient-to-l from-sky-100/30 dark:from-sky-900/20 via-sky-50/10 dark:via-sky-900/5 to-transparent" />
             <div className={`absolute inset-0 bg-gradient-to-l from-sky-200/50 dark:from-sky-800/30 via-sky-100/30 dark:via-sky-900/15 to-transparent transition-opacity duration-[3000ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${hoveredSide === UserType.HIM ? 'opacity-100' : 'opacity-0'}`} />
          </div>
        </div>

        {/* 左侧：她的时间轴 */}
        <div 
          onScroll={(e) => handleScroll(e, UserType.HER)}
          onMouseEnter={() => setHoveredSide(UserType.HER)}
          onMouseLeave={() => setHoveredSide(null)}
          className={`
            flex-1 h-full overflow-y-auto overflow-x-visible no-scrollbar relative z-10
            transform-gpu overscroll-contain
            transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-x-0
            bg-gradient-to-r from-rose-100/30 dark:from-rose-900/10 via-rose-50/10 dark:via-transparent to-transparent md:bg-none
            ${activeTab === UserType.HER ? 'translate-x-0 block' : '-translate-x-full hidden md:block'}
          `}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Spacer */}
          <div className="h-48 md:h-32 w-full" />
          
          <div className="max-w-xl mx-auto px-4 md:px-8 pb-32">
            <div className="text-center mb-20 animate-fadeInUp relative">
              {/* 长按刷新提示 */}
              {isAvatarShaking === UserType.HER && (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-rose-200 dark:border-slate-600 z-50 whitespace-nowrap">
                  <p className="text-xs text-rose-500 dark:text-rose-400 font-medium flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {avatarShakeIntensity < 1 ? `刷新中... ${Math.floor(avatarShakeIntensity * 100)}%` : '正在重载...'}
                  </p>
                </div>
              )}
              <div 
                onMouseDown={() => handleAvatarPressStart(UserType.HER)}
                onMouseUp={handleAvatarPressEnd}
                onMouseLeave={handleAvatarPressEnd}
                onTouchStart={() => handleAvatarPressStart(UserType.HER)}
                onTouchEnd={handleAvatarPressEnd}
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/30 mb-6 text-3xl shadow-inner transition-transform cursor-pointer select-none hover:scale-110`}
                style={{
                  animation: isAvatarShaking === UserType.HER 
                    ? `avatarShake ${0.1 - avatarShakeIntensity * 0.06}s ease-in-out infinite` 
                    : 'none',
                  transform: isAvatarShaking === UserType.HER 
                    ? `scale(${1 + avatarShakeIntensity * 0.2})` 
                    : undefined
                }}
              >
                {getAvatar(UserType.HER)}
              </div>
              <h2 
                className="font-display font-normal text-5xl md:text-6xl mb-4 tracking-tight text-transparent bg-clip-text bg-cover texture-text cursor-default"
                style={{
                  backgroundImage: `linear-gradient(180deg, #fb7185 0%, #e11d48 45%, #881337 100%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  backgroundBlendMode: 'hard-light',
                  backgroundSize: 'cover, 100px 100px',
                  '--shadow-rgb': '136, 19, 55'
                } as React.CSSProperties}
              >
                Ting's Journal
              </h2>
              <TypewriterText 
                text="&quot;正在同步... 婷婷的心情坐标&quot;" 
                className="font-serif text-rose-400 italic text-lg" 
                delay={150}
                startDelay={500}
              />
            </div>

            <div className="space-y-12 relative">
              {/* 时间轴线条 */}
              <div className="absolute left-8 top-4 bottom-0 w-px bg-gradient-to-b from-rose-200/50 dark:from-rose-500/30 via-rose-200/30 dark:via-rose-500/15 to-transparent hidden md:block"></div>

              {!isLoading && herMemories.length === 0 ? (
                <div className="text-center text-slate-300 dark:text-slate-600 py-20 italic font-serif text-xl animate-fadeInUp">
                   Waiting for her story...
                </div>
              ) : (
                herMemoryCards
              )}
            </div>
          </div>
        </div>



        {/* Right: His Side */}
        <div 
           onScroll={(e) => handleScroll(e, UserType.HIM)}
           onMouseEnter={() => setHoveredSide(UserType.HIM)}
           onMouseLeave={() => setHoveredSide(null)}
           className={`
            flex-1 h-full overflow-y-auto overflow-x-visible no-scrollbar relative z-10
            transform-gpu overscroll-contain
            transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-x-0
            bg-gradient-to-l from-sky-100/30 dark:from-sky-900/10 via-sky-50/10 dark:via-transparent to-transparent md:bg-none
            ${activeTab === UserType.HIM ? 'translate-x-0 block' : 'translate-x-full hidden md:block'}
          `}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
           {/* Spacer */}
           <div className="h-48 md:h-32 w-full" />

           <div className="max-w-xl mx-auto px-4 md:px-8 pb-32">
            <div className="text-center mb-20 animate-fadeInUp relative">
              {/* 长按刷新提示 */}
              {isAvatarShaking === UserType.HIM && (
                <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-800/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-sky-200 dark:border-slate-600 z-50 whitespace-nowrap">
                  <p className="text-xs text-sky-500 dark:text-sky-400 font-medium flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {avatarShakeIntensity < 1 ? `刷新中... ${Math.floor(avatarShakeIntensity * 100)}%` : '正在重载...'}
                  </p>
                </div>
              )}
              <div 
                onMouseDown={() => handleAvatarPressStart(UserType.HIM)}
                onMouseUp={handleAvatarPressEnd}
                onMouseLeave={handleAvatarPressEnd}
                onTouchStart={() => handleAvatarPressStart(UserType.HIM)}
                onTouchEnd={handleAvatarPressEnd}
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-50 dark:bg-sky-900/30 mb-6 text-3xl shadow-inner transition-transform cursor-pointer select-none hover:scale-110`}
                style={{
                  animation: isAvatarShaking === UserType.HIM 
                    ? `avatarShake ${0.1 - avatarShakeIntensity * 0.06}s ease-in-out infinite` 
                    : 'none',
                  transform: isAvatarShaking === UserType.HIM 
                    ? `scale(${1 + avatarShakeIntensity * 0.2})` 
                    : undefined
                }}
              >
                {getAvatar(UserType.HIM)}
              </div>
              <h2 
                className="font-display font-normal text-5xl md:text-6xl mb-4 tracking-tight text-transparent bg-clip-text bg-cover texture-text cursor-default"
                style={{
                  backgroundImage: `linear-gradient(180deg, #38bdf8 0%, #0284c7 45%, #0c4a6e 100%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  backgroundBlendMode: 'hard-light',
                  backgroundSize: 'cover, 100px 100px',
                  '--shadow-rgb': '3, 105, 161'
                } as React.CSSProperties}
              >
                Kuan's Journal
              </h2>
              <TypewriterText 
                text="&quot;独家索引：宽宽的每一份喜欢&quot;" 
                className="font-serif text-sky-400 italic text-lg" 
                delay={150}
                startDelay={1500}
              />
            </div>

            <div className="space-y-6 md:space-y-12 relative">
              {/* 时间轴线条 */}
              <div className="absolute left-8 top-4 bottom-0 w-px bg-gradient-to-b from-sky-200/50 dark:from-sky-500/30 via-sky-200/30 dark:via-sky-500/15 to-transparent hidden md:block"></div>

              {!isLoading && hisMemories.length === 0 ? (
                <div className="text-center text-slate-300 dark:text-slate-600 py-20 italic font-serif text-xl animate-fadeInUp">
                   Waiting for his story...
                </div>
              ) : (
                hisMemoryCards
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Composer Modal - 懒加载 */}
      {isComposerOpen && (
        <Suspense fallback={<LazyLoadingFallback />}>
          <Composer 
            currentUser={currentUser} 
            onSave={handleSave} 
            onClose={() => setIsComposerOpen(false)} 
          />
        </Suspense>
      )}

      <ClickStarOverlay />

      {/* Login -> Main Transition Overlay */}
      {phase === 'transition' && currentUser && (
        <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden flex items-center justify-center">
          <div
            className={`absolute inset-0 overlay-bloom bg-gradient-to-br ${
              currentUser === UserType.HER
                ? 'from-rose-200/80 via-purple-200/70 to-sky-200/80'
                : 'from-sky-200/80 via-purple-200/70 to-rose-200/80'
            } ${transitionRetracting ? 'overlay-bg-fade-out' : ''}`}
          />
          <div
            className={`relative z-10 flex flex-col items-center gap-4 overlay-emoji ${transitionRetracting ? 'overlay-retract' : ''}`}
            onAnimationEnd={(e) => {
              if (String(e.animationName).includes('overlay-retract')) {
                retractScheduledRef.current = false;
                setPhase('main');
                setTransitionRetracting(false);
              }
            }}
          >
            <div className="relative flex items-center justify-center overflow-visible">
              <div className="absolute -inset-2 overlay-ring">
                <svg className="w-full h-full drop-shadow-[0_0_8px_rgba(168,85,247,0.2)]" viewBox="0 0 100 100">
                  <defs>
                    <linearGradient id="overlay-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fb7185" />
                      <stop offset="50%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#38bdf8" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#overlay-ring-gradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={282.74}
                    strokeDashoffset={282.74 * (1 - transitionRingProgress / 100)}
                    transform="rotate(-90 50 50)"
                    className={`transition-[stroke-dashoffset] ease-out ${transitionRingProgress >= 100 ? 'duration-500 overlay-ring-complete' : 'duration-150'}`}
                  />
                </svg>
              </div>
              <div className={`relative z-10 w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/80 backdrop-blur-xl border border-white/70 shadow-[0_18px_45px_rgba(15,23,42,0.18)] flex items-center justify-center text-5xl md:text-6xl ${!transitionRetracting ? 'overlay-breathe' : ''}`}>
                {getAvatar(currentUser)}
              </div>
            </div>
            <span className="font-display text-5xl md:text-6xl tracking-tight text-slate-800/90">
              Us.
            </span>
            {/* 加载文案暂时注释
            <span
              className={`font-serif text-sm md:text-base italic text-white/90 tracking-wide ${transitionRetracting ? 'overlay-loading-text-fade-out' : ''}`}
            >
              正在加载我们的回忆…
            </span>
            */}
          </div>
        </div>
      )}

      {/* Gravity Mode - 懒加载 */}
      {isGravityMode && (
        <Suspense fallback={<LazyLoadingFallback />}>
          <GravityMode memories={memories} onClose={() => setIsGravityMode(false)} />
        </Suspense>
      )}

      {/* 2048 Game - 懒加载 */}
      {isGame2048Open && (
        <Suspense fallback={<LazyLoadingFallback />}>
          <Game2048 onClose={() => setIsGame2048Open(false)} />
        </Suspense>
      )}

      {/* Piggy Bank Feature - 懒加载 */}
      {phase === 'main' && (
        <Suspense fallback={null}>
          <PiggyBank count={memories.length} />
        </Suspense>
      )}

      {/* 双人在线状态指示器 - 当对方也在线时显示甜蜜提示 */}
      {phase === 'main' && (
        <PresenceIndicator currentUser={currentUser} darkMode={darkMode} />
      )}

      {/* Notice Modal */}
      {isNoticeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsNoticeOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm mx-auto shadow-2xl animate-popIn border border-white/50 dark:border-slate-700/50 text-center">
            <button 
              onClick={() => setIsNoticeOpen(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center pt-2">
              {specialEvent === 'milestone' ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative w-full">
                  <div className="text-4xl mb-4">🎉</div>
                  <p className="text-lg text-slate-700 dark:text-slate-200 font-bold mb-2">
                    哇！我们已经一起走过{daysTogether}天啦！
                  </p>
                  <div className="absolute -top-12 left-0 right-0 flex justify-center gap-4 pointer-events-none">
                    <Heart className="text-rose-500 fill-rose-500 animate-float-up" size={24} style={{ animationDelay: '0s' }} />
                    <Heart className="text-rose-400 fill-rose-400 animate-float-up" size={16} style={{ animationDelay: '0.2s' }} />
                    <Heart className="text-rose-500 fill-rose-500 animate-float-up" size={32} style={{ animationDelay: '0.4s' }} />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    未来的每一天也要一起走下去哦 ❤️
                  </p>
                </div>
              ) : specialEvent === 'anniversary' ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative w-full">
                  <div className="text-4xl mb-4">🎂</div>
                  <p className="text-lg text-slate-700 dark:text-slate-200 font-bold mb-2">
                    今天是我们的纪念日！
                  </p>
                  <div className="absolute -top-12 left-0 right-0 flex justify-center gap-4 pointer-events-none">
                    <Heart className="text-rose-500 fill-rose-500 animate-float-up" size={24} style={{ animationDelay: '0s' }} />
                    <Heart className="text-rose-400 fill-rose-400 animate-float-up" size={16} style={{ animationDelay: '0.2s' }} />
                    <Heart className="text-rose-500 fill-rose-500 animate-float-up" size={32} style={{ animationDelay: '0.4s' }} />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    爱你的每一天 ❤️
                  </p>
                </div>
              ) : (
                <>
                  {noticeStep === 'question' && (
                    <>
                      <div className="text-4xl mb-4">✨</div>
                      <p className="text-lg text-slate-700 dark:text-slate-200 font-bold mb-6">
                        婷婷你今天想我了没
                      </p>
                      <div className="flex gap-3 w-full">
                        <button
                          onClick={() => setNoticeStep('yes')}
                          className="flex-1 py-3 px-4 bg-rose-500 hover:bg-rose-600 text-white text-sm rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-rose-500/30"
                        >
                          想你了
                        </button>
                        <button
                          onClick={() => setNoticeStep('no')}
                          className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm rounded-xl font-bold transition-all active:scale-95"
                        >
                          不想你
                        </button>
                      </div>
                    </>
                  )}

                  {noticeStep === 'yes' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative w-full">
                      <div className="absolute -top-16 left-0 right-0 flex justify-center gap-4 pointer-events-none">
                        <Heart className="text-rose-500 fill-rose-500 animate-float-up" size={24} style={{ animationDelay: '0s' }} />
                        <Heart className="text-rose-400 fill-rose-400 animate-float-up" size={16} style={{ animationDelay: '0.2s' }} />
                        <Heart className="text-rose-500 fill-rose-500 animate-float-up" size={32} style={{ animationDelay: '0.4s' }} />
                      </div>
                      <p className="text-xl text-rose-500 font-bold mb-2 animate-bounce">太好了 ❤️</p>
                      <p className="text-base text-slate-600 dark:text-slate-300">
                        我也想婷婷
                      </p>
                    </div>
                  )}

                  {noticeStep === 'no' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">
                      <div className="flex justify-center mb-4 animate-shake text-slate-400 dark:text-slate-500">
                        <Frown size={48} />
                      </div>
                      <p className="text-lg text-slate-500 font-bold mb-2">💔</p>
                      <p className="text-base text-slate-600 dark:text-slate-300">
                        呜呜呜婷婷你居然不想我
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Notification Modal */}
      {showUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowUpdate(false)} />
          <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl p-6 w-full max-w-sm mx-auto shadow-2xl animate-popIn border border-white/50 dark:border-slate-700/50 max-h-[80vh] overflow-y-auto">
            <button 
              onClick={() => setShowUpdate(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center justify-between mb-6 pr-8">
              <div className="flex items-baseline gap-2">
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">更新公告</h3>
                <span className="text-xs font-mono text-rose-500 bg-rose-100 dark:bg-rose-900/30 px-2 py-1 rounded-md font-bold">{APP_UPDATE.version}</span>
              </div>
              <span className="text-xs text-slate-400">{APP_UPDATE.date}</span>
            </div>
            
            <div className="space-y-4">
              {APP_UPDATE.content.map((item, index) => (
                <div key={index} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="text-rose-400 mt-1">•</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
              <p className="text-xs text-slate-400">
                超级无敌喜欢婷婷 ❤️
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Wax Seal Animation */}
      {showStamp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <div className="relative animate-stamp-in">
            {/* Wax Seal Body - Irregular Shape */}
            <div 
              className="w-56 h-56 bg-gradient-to-br from-red-700 via-red-800 to-red-950 rounded-full flex items-center justify-center shadow-2xl relative"
              style={{ 
                borderRadius: '48% 52% 45% 55% / 55% 45% 55% 45%',
                boxShadow: '0 10px 30px -5px rgba(0,0,0,0.6), inset 0 5px 20px rgba(255,255,255,0.15), inset 0 -10px 20px rgba(0,0,0,0.4)'
              }}
            >
               {/* Inner Ring */}
               <div 
                 className="w-40 h-40 border-[3px] border-red-950/20 rounded-full flex items-center justify-center relative"
                 style={{ borderRadius: '50% 48% 52% 50% / 52% 50% 48% 50%' }}
               >
                  {/* Text */}
                  <span 
                    className="text-red-100/80 font-serif text-7xl font-bold tracking-widest rotate-[-12deg] select-none"
                    style={{ 
                      textShadow: '2px 2px 4px rgba(0,0,0,0.4), -1px -1px 2px rgba(255,255,255,0.1)',
                      filter: 'contrast(0.9)'
                    }}
                  >
                    US
                  </span>
                  
                  {/* Decorative details */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-950/20 rounded-full"></div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-950/20 rounded-full"></div>
               </div>
               
               {/* Wax Drips (Visual details) */}
               <div className="absolute -bottom-2 right-12 w-8 h-8 bg-red-800 rounded-full -z-10" style={{ borderRadius: '40% 60% 30% 70% / 60% 30% 70% 40%' }}></div>
               <div className="absolute -top-1 left-8 w-6 h-5 bg-red-700 rounded-full -z-10" style={{ borderRadius: '50% 50% 50% 50% / 40% 40% 60% 60%' }}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
