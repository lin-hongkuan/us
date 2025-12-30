import React, { useState, useEffect, useRef, useMemo } from 'react';
import { UserType, Memory, getAvatar, getDailyAvatars, APP_UPDATE } from './types';
import { getMemories, saveMemory, deleteMemory, updateMemory, seedDataIfEmpty } from './services/storageService';
import { MemoryCard } from './components/MemoryCard';
import { Composer } from './components/Composer';
import { TypewriterText } from './components/TypewriterText';
import { PiggyBank } from './components/PiggyBank';
import { GravityMode } from './components/GravityMode';
import { Game2048 } from './components/Game2048';
import { PenTool, User, Loader2, Moon, Sun, Bell, Star as StarIcon, X, Heart, Frown, Sparkles } from 'lucide-react';

// 定义点击星星的特效接口
interface Star {
  id: number;
  x: number;
  y: number;
}

// 定义角落星光闪烁的接口
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

// 登录页显示的浪漫情话数组
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

const START_DATE_STR = '2024-08-20';

// 主应用组件：共享记忆日记应用
function App() {
  // 纪念日计数：从 2024-08-20 开始计算在一起的天数，供首页计时器展示
  const [daysTogether] = useState(() => {
    const startDate = new Date(START_DATE_STR);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  });
  const [displayDays, setDisplayDays] = useState(0);
  // 深夜彩蛋状态：是否处于 1-6 点，以及提示气泡是否展示
  const [isLateNight, setIsLateNight] = useState(false);
  const [showSleepMessage, setShowSleepMessage] = useState(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [noticeStep, setNoticeStep] = useState<'question' | 'yes' | 'no'>('question');
  const [showStamp, setShowStamp] = useState(false);
  const [isGravityMode, setIsGravityMode] = useState(false);
  const [isGame2048Open, setIsGame2048Open] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);

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
    // 进入页面时检查本地时间：凌晨 1-6 点出现猫头鹰提示按钮
    const hour = new Date().getHours();
    if (hour >= 1 && hour < 6) {
      setIsLateNight(true);
    }
  }, []);

  useEffect(() => {
    let start = 0;
    const end = daysTogether;
    if (start === end) return;

    const duration = 2000; // 数字滚动时长 2s
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4); // 四次缓出，让数字滚动更柔和
      
      const current = Math.floor(start + (end - start) * ease);
      setDisplayDays(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [daysTogether]);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<UserType>(UserType.HER); // Mobile only
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<'login' | 'transition' | 'main'>('login');
  const [hoveredSide, setHoveredSide] = useState<UserType | null>(null);
  const [stars, setStars] = useState<Star[]>([]);
  // 主题状态：优先读本地存储，其次跟随系统；用于 Tailwind dark 模式
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem('dark_mode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  // 登陆页文案索引：用 localStorage 轮流展示情话
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
  const [showSecondLine, setShowSecondLine] = useState(false); // 控制第二句延迟出现
  const currentQuote = QUOTES[quoteIndex] || '我们共享的每一刻，都是故事里的一页。';
  // 角落星光：预生成一组星点参数，交给 CSS 做缓动闪烁
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
  const starIdRef = useRef(0);

  // Dark mode effect：在 <html> 注入/移除 dark class，并持久化到 localStorage
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    window.localStorage.setItem('dark_mode', String(darkMode));
  }, [darkMode]);

  // 切换深色/浅色主题
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  // 点击情话切换到下一条，并保存到localStorage
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

  // 可爱的点击音效：根据按钮类型（她/他/动作/默认）生成不同音高的合成器短音
  const playClickSound = (type: 'default' | 'her' | 'him' | 'action' | 'stamp' = 'default') => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const audioCtx = new AudioContext();
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
  };

  useEffect(() => {
    // 全局捕获带 data-sound 的元素，统一触发点击音效
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const soundElement = target.closest('[data-sound]');
      const type = soundElement ? soundElement.getAttribute('data-sound') : 'default';
      playClickSound(type as any);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, []);
  
  // Header visibility logic
  const [showHeader, setShowHeader] = useState(true);
  const scrollPositions = useRef({ [UserType.HER]: 0, [UserType.HIM]: 0 });

  // 头像长按逻辑：长按5秒显示随机情话气泡
  const [avatarQuote, setAvatarQuote] = useState<{ type: UserType, text: string } | null>(null);
  const [isQuoteVisible, setIsQuoteVisible] = useState(false);
  const longPressTimer = useRef<number | null>(null);
  const isLongPress = useRef(false);
  const pressStartTime = useRef<number>(0);

  // 开始长按头像：启动振动循环，5秒后显示随机情话
  const handleAvatarPressStart = (type: UserType) => {
    isLongPress.current = false;
    pressStartTime.current = Date.now();
    
    // 重置状态
    setAvatarQuote(null);
    setIsQuoteVisible(false);

    const startTime = Date.now();
    
    // 振动循环函数：随着时间推移振动间隔变短
    const vibrateLoop = () => {
      const elapsed = Date.now() - startTime;
      
      // 5秒阈值
      if (elapsed >= 5000) {
        isLongPress.current = true;
        if (navigator.vibrate) navigator.vibrate([200]); // 成功振动
        
        const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        setAvatarQuote({ type, text: randomQuote });
        
        // 平滑淡入
        requestAnimationFrame(() => setIsQuoteVisible(true));
        
        // 5秒后自动隐藏
        setTimeout(() => {
          setIsQuoteVisible(false);
          setTimeout(() => setAvatarQuote(null), 500); // 等待淡出
        }, 5000);
        
        return;
      }

      // 计算延迟：500ms -> 50ms
      const progress = elapsed / 5000;
      const delay = 500 - (progress * 450); 
      
      if (navigator.vibrate) navigator.vibrate(30);
      
      longPressTimer.current = window.setTimeout(vibrateLoop, delay);
    };

    vibrateLoop();
  };

  // 结束长按：清除定时器，停止振动
  const handleAvatarPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Stop vibration if released early
    if (!isLongPress.current) {
       // navigator.vibrate(0) cancels vibration on some devices
       if (navigator.vibrate) navigator.vibrate(0);
    }
  };

  const handleAvatarClickWrapper = (type: UserType, e: React.MouseEvent) => {
    const pressDuration = Date.now() - pressStartTime.current;
    
    // If it was a long press event, or held for > 500ms (but less than 5s), block the click
    if (isLongPress.current || pressDuration > 500) {
      e.preventDefault();
      e.stopPropagation();
      isLongPress.current = false;
      return;
    }
    handleChooseUser(type);
  };

  // Mouse movement effect for background
  const loginBackgroundRef = useRef<HTMLDivElement>(null);
  const mainBackgroundRef = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // 背景视差：桌面端监听鼠标，缓动平移登录/主背景，营造空间感
    const isDesktop = window.matchMedia('(pointer: fine)').matches;
    if (!isDesktop) return;

    const handleMouseMove = (e: MouseEvent) => {
      requestAnimationFrame(() => {
        mousePos.current = {
          x: (e.clientX / window.innerWidth) * 2 - 1,
          y: (e.clientY / window.innerHeight) * 2 - 1
        };
      });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    let frameId: number;
    const animate = () => {
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
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    // 初始化数据：若为空则种子数据填充，再读取本地存储
    const fetchData = async () => {
      setIsLoading(true);
      await seedDataIfEmpty();
      const data = await getMemories();
      setMemories(data);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // 滚动时隐藏/显示顶部 Header，避免占屏空间
  const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: UserType) => {
    const current = e.currentTarget.scrollTop;
    const last = scrollPositions.current[type];
    const diff = current - last;

    if (Math.abs(diff) < 10) return;

    if (current > last && current > 60) {
      setShowHeader(false);
    } else if (current < last) {
      setShowHeader(true);
    }
    
    scrollPositions.current[type] = current;
  };

  // 保存记忆：写入存储并更新列表，成功后关闭弹窗
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
      setMemories([newMem, ...memories]);
      setIsComposerOpen(false);
      
      // Trigger Stamp Effect
      setShowStamp(true);
      playClickSound('stamp');
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      setTimeout(() => setShowStamp(false), 1500);
    }
  };

  // 删除记忆：确认后删除存储并更新列表
  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这条记忆吗？')) {
      const success = await deleteMemory(id);
      if (success) {
        setMemories(memories.filter(m => m.id !== id));
      } else {
        alert("删除失败");
      }
    }
  };

  // 更新记忆：成功后替换列表项，并播放动作音效
  const handleUpdateMemory = async (id: string, content: string, imageUrls?: string[] | null) => {
    const updated = await updateMemory(id, content, imageUrls);
    if (updated) {
      setMemories(prev => prev.map(m => m.id === id ? updated : m));
      playClickSound('action');
      return true;
    }
    return false;
  };

  // 选择身份：先进入 transition 慢动画，再切换到主界面
  const handleChooseUser = (type: UserType) => {
    setCurrentUser(type);
    setActiveTab(type);
    setPhase('transition');
    window.setTimeout(() => {
      setPhase('main');
    }, 900);
  };

  // 全局点击生成小星星：用于登录页与主页面的点击反馈
  const handleGlobalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const id = starIdRef.current++;
    const x = e.clientX;
    const y = e.clientY;

    setStars(prev => [...prev, { id, x, y }]);

    // 700ms 后移除，避免内存累积
    window.setTimeout(() => {
      setStars(prev => prev.filter(star => star.id !== id));
    }, 700);
  };

  // 过滤两侧列表
  const herMemories = memories.filter(m => m.author === UserType.HER);
  const hisMemories = memories.filter(m => m.author === UserType.HIM);

  // 登录阶段：身份选择与欢迎界面
  if (phase === 'login' || !currentUser) {
    return (
      <div 
        onClick={handleGlobalClick}
        className="min-h-screen flex items-center justify-center p-6 font-sans relative overflow-hidden bg-gradient-to-br from-rose-100 via-purple-50 to-sky-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 animate-gradient"
      >
        {/* Dark Mode Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleDarkMode();
          }}
          className="fixed top-6 right-6 z-50 w-9 h-9 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all duration-500"
          title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* 底噪纹理遮罩 */}
        <div className="absolute inset-0 opacity-[0.02] dark:opacity-0 pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

        {/* ICON 图案遮罩 */}
        <div className="absolute -inset-[100px] opacity-[0.08] pointer-events-none z-0 animate-moveBackground" 
             style={{ 
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2364748b' fill-opacity='1'%3E%3Cg transform='translate(10 10) scale(0.4) rotate(-10)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3Cg transform='translate(60 60) scale(0.3) rotate(20)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
             }}
        ></div>

        {/* 抽象背景光团 */}
        <div ref={loginBackgroundRef} className="absolute -inset-[100px] overflow-hidden pointer-events-none transition-transform duration-100 ease-out">
           <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-rose-300/40 dark:bg-rose-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[60px] md:blur-[100px] opacity-80 animate-blob" />
           <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-sky-300/40 dark:bg-sky-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[60px] md:blur-[100px] opacity-80 animate-blob animation-delay-2000" />
           <div className="absolute top-[20%] left-[20%] w-[600px] h-[600px] bg-purple-200/40 dark:bg-purple-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[60px] md:blur-[100px] opacity-60 animate-blob animation-delay-4000" />
        </div>

        <div className="max-w-3xl w-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-md md:backdrop-blur-2xl rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-white/60 dark:border-slate-700/60 p-8 md:p-16 relative z-10 flex flex-col md:flex-row items-center gap-12 md:gap-20">
          
          {/* Left Side: Brand */}
          <div className="flex-1 text-center md:text-left relative z-10 flex flex-col justify-center">
             <h1 
               className="font-display text-[8rem] md:text-[11rem] font-normal tracking-tighter leading-[0.8] select-none mb-8 md:mb-12 text-transparent bg-clip-text bg-cover texture-text"
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
                <div className="flex flex-col gap-1.5 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                   <div className="flex items-baseline gap-2 text-rose-500 dark:text-rose-400 mb-1 select-none group">
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 transition-opacity group-hover:opacity-100">在一起已经</span>
                      <span className="font-display text-4xl leading-none tabular-nums tracking-tight transition-all duration-700 ease-out group-hover:scale-110 group-hover:text-rose-600 dark:group-hover:text-rose-300" style={{ textShadow: '0 4px 12px rgba(244, 63, 94, 0.2)' }}>
                        {displayDays}
                      </span>
                      <span className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 transition-opacity group-hover:opacity-100">天了！</span>
                   </div>
                   <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold tracking-[0.4em] uppercase">婷and宽的</span>
                   <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold tracking-[0.4em] uppercase">恋爱日记</span>
                </div>

                <p
                  className="font-serif text-xl text-slate-600 dark:text-slate-300 italic leading-relaxed opacity-80 cursor-pointer select-none"
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

        {/* 点击星星特效 */}
        <div className="pointer-events-none fixed inset-0 z-50">
          {stars.map(star => (
            <div
              key={star.id}
              className="pointer-events-none absolute text-yellow-300 text-xl select-none star-pop drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]"
              style={{ left: star.x, top: star.y }}
            >
              ★
            </div>
          ))}
        </div>
      </div>
    );
  }

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

      {/* ICON 遮罩层 */}
      <div className="absolute -inset-[100px] opacity-[0.08] pointer-events-none z-0 animate-moveBackground" 
           style={{ 
           backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2364748b' fill-opacity='1'%3E%3Cg transform='translate(10 10) scale(0.4) rotate(-10)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3Cg transform='translate(60 60) scale(0.3) rotate(20)'%3E%3Cellipse cx='50' cy='65' rx='18' ry='14'/%3E%3Ccircle cx='25' cy='45' r='7'/%3E%3Ccircle cx='40' cy='30' r='7'/%3E%3Ccircle cx='60' cy='30' r='7'/%3E%3Ccircle cx='75' cy='45' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
           }}
      ></div>

      {/* 角落星光常亮 */}
      <div className="absolute inset-0 pointer-events-none z-10 mix-blend-screen">
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

      {/* 顶部 Header：悬浮渐隐 左右边距*/}
      <header 
        className={`
          fixed top-0 left-0 right-0 h-20 md:h-24 z-40 px-2 md:px-16 
          flex items-center justify-between pointer-events-none
          transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${showHeader ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}
        `}
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
              className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-yellow-400 hover:text-yellow-500 hover:bg-white dark:hover:bg-slate-700 transition-all duration-500"
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
              className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-indigo-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-700 transition-all duration-500"
              title="更新公告"
            >
              <span className="text-xs md:text-lg">🔔</span>
            </button>
          </div>
        </div>

        {/* Mobile Toggle (Pill) - Floating Island */}
        <div className="pointer-events-auto md:hidden bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-1 rounded-full border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] absolute left-1/2 -translate-x-1/2 z-50">
           <button 
             onClick={() => setActiveTab(UserType.HER)}
             data-sound="her"
             className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-all duration-500 ${activeTab === UserType.HER ? 'bg-rose-50 dark:bg-rose-900/50 text-rose-500 dark:text-rose-300 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
           >
             她
           </button>
           <button 
             onClick={() => setActiveTab(UserType.HIM)}
             data-sound="him"
             className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-all duration-500 ${activeTab === UserType.HIM ? 'bg-sky-50 dark:bg-sky-900/50 text-sky-500 dark:text-sky-300 shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
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
            className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all duration-500"
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
             className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-white/60 dark:border-slate-700/60 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center text-slate-400 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-all duration-500 hover:rotate-180"
             title="切换用户"
          >
            <User size={12} className="md:w-[18px] md:h-[18px]" />
          </button>
        </div>
      </header>

      {/* 主体：左右分栏记忆流 */}
      <main className="h-screen flex relative overflow-hidden">
        {/* 主屏背景光团 */}
        <div ref={mainBackgroundRef} className="absolute -inset-[100px] pointer-events-none transition-transform duration-100 ease-out">
          <div className={`absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-rose-300/40 dark:bg-rose-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[60px] md:blur-[100px] animate-blob pointer-events-none transition-opacity duration-1000 ${activeTab === UserType.HER ? 'opacity-80' : 'opacity-0 md:opacity-80'}`}></div>
          <div className={`absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-sky-300/40 dark:bg-sky-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[60px] md:blur-[100px] animate-blob animation-delay-2000 pointer-events-none transition-opacity duration-1000 ${activeTab === UserType.HIM ? 'opacity-80' : 'opacity-0 md:opacity-80'}`}></div>
          <div className="absolute top-[20%] left-[20%] w-[600px] h-[600px] bg-purple-200/40 dark:bg-purple-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[60px] md:blur-[100px] opacity-60 animate-blob animation-delay-4000 pointer-events-none hidden md:block"></div>
        </div>
        
        {/* 加载遮罩 */}
        {isLoading && (
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
            flex-1 h-full overflow-y-auto no-scrollbar relative z-10
            transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-x-0
            bg-gradient-to-r from-rose-100/30 dark:from-rose-900/10 via-rose-50/10 dark:via-transparent to-transparent md:bg-none
            ${activeTab === UserType.HER ? 'translate-x-0 block' : '-translate-x-full hidden md:block'}
          `}
        >
          {/* Spacer */}
          <div className="h-48 md:h-32 w-full" />
          
          <div className="max-w-xl mx-auto px-8 pb-32">
            <div className="text-center mb-20 animate-fadeInUp relative">
              {avatarQuote?.type === UserType.HER && (
                 <div 
                   className={`absolute -top-24 left-1/2 -translate-x-1/2 w-40 bg-white/90 dark:bg-slate-800/90 backdrop-blur p-4 rounded-2xl shadow-xl border border-rose-100 dark:border-slate-600 z-50 origin-bottom transition-all duration-500 ease-in-out ${isQuoteVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'}`}
                 >
                   <p className="text-xs text-slate-600 dark:text-slate-300 font-serif text-center leading-relaxed whitespace-pre-wrap">
                     {avatarQuote.text}
                   </p>
                   <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/90 dark:bg-slate-800/90 rotate-45 border-b border-r border-rose-100 dark:border-slate-600"></div>
                 </div>
              )}
              <div 
                onMouseDown={() => handleAvatarPressStart(UserType.HER)}
                onMouseUp={handleAvatarPressEnd}
                onMouseLeave={handleAvatarPressEnd}
                onTouchStart={() => handleAvatarPressStart(UserType.HER)}
                onTouchEnd={handleAvatarPressEnd}
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/30 mb-6 text-3xl shadow-inner transition-transform duration-500 cursor-pointer select-none ${avatarQuote?.type === UserType.HER ? 'scale-125 animate-bounce' : 'hover:scale-110'}`}
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
                herMemories.map((m, i) => (
                  <div 
                    key={m.id} 
                    className="md:pl-20 relative group animate-fadeInUp"
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
                ))
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
            flex-1 h-full overflow-y-auto no-scrollbar relative z-10
            transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] md:translate-x-0
            bg-gradient-to-l from-sky-100/30 dark:from-sky-900/10 via-sky-50/10 dark:via-transparent to-transparent md:bg-none
            ${activeTab === UserType.HIM ? 'translate-x-0 block' : 'translate-x-full hidden md:block'}
          `}
        >
           {/* Spacer */}
           <div className="h-48 md:h-32 w-full" />

           <div className="max-w-xl mx-auto px-8 pb-32">
            <div className="text-center mb-20 animate-fadeInUp relative">
              {avatarQuote?.type === UserType.HIM && (
                 <div 
                   className={`absolute -top-24 left-1/2 -translate-x-1/2 w-40 bg-white/90 dark:bg-slate-800/90 backdrop-blur p-4 rounded-2xl shadow-xl border border-sky-100 dark:border-slate-600 z-50 origin-bottom transition-all duration-500 ease-in-out ${isQuoteVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'}`}
                 >
                   <p className="text-xs text-slate-600 dark:text-slate-300 font-serif text-center leading-relaxed whitespace-pre-wrap">
                     {avatarQuote.text}
                   </p>
                   <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/90 dark:bg-slate-800/90 rotate-45 border-b border-r border-sky-100 dark:border-slate-600"></div>
                 </div>
              )}
              <div 
                onMouseDown={() => handleAvatarPressStart(UserType.HIM)}
                onMouseUp={handleAvatarPressEnd}
                onMouseLeave={handleAvatarPressEnd}
                onTouchStart={() => handleAvatarPressStart(UserType.HIM)}
                onTouchEnd={handleAvatarPressEnd}
                className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-50 dark:bg-sky-900/30 mb-6 text-3xl shadow-inner transition-transform duration-500 cursor-pointer select-none ${avatarQuote?.type === UserType.HIM ? 'scale-125 animate-bounce' : 'hover:scale-110'}`}
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

            <div className="space-y-12 relative">
              {/* 时间轴线条 */}
              <div className="absolute left-8 top-4 bottom-0 w-px bg-gradient-to-b from-sky-200/50 dark:from-sky-500/30 via-sky-200/30 dark:via-sky-500/15 to-transparent hidden md:block"></div>

              {!isLoading && hisMemories.length === 0 ? (
                <div className="text-center text-slate-300 dark:text-slate-600 py-20 italic font-serif text-xl animate-fadeInUp">
                   Waiting for his story...
                </div>
              ) : (
                hisMemories.map((m, i) => (
                  <div 
                    key={m.id} 
                    className="md:pl-20 relative group animate-fadeInUp"
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
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Composer Modal */}
      {isComposerOpen && (
        <Composer 
          currentUser={currentUser} 
          onSave={handleSave} 
          onClose={() => setIsComposerOpen(false)} 
        />
      )}

      {/* Click Stars Effect */}
      <div className="pointer-events-none fixed inset-0 z-50">
        {stars.map(star => (
          <div
            key={star.id}
            className="pointer-events-none absolute text-yellow-300 text-xl select-none star-pop drop-shadow-[0_0_6px_rgba(250,204,21,0.8)]"
            style={{ left: star.x, top: star.y }}
          >
            ★
          </div>
        ))}
      </div>

      {/* Login -> Main Transition Overlay */}
      {phase === 'transition' && currentUser && (
        <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden flex items-center justify-center">
          <div
            className={`absolute inset-0 overlay-bloom bg-gradient-to-br ${
              currentUser === UserType.HER
                ? 'from-rose-200/80 via-purple-200/70 to-sky-200/80'
                : 'from-sky-200/80 via-purple-200/70 to-rose-200/80'
            }`}
          />
          <div className="relative z-10 flex flex-col items-center gap-4 overlay-emoji">
            <div className="relative">
              <div className="absolute inset-0 rounded-full border border-white/80 overlay-ring" />

              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/80 backdrop-blur-xl border border-white/70 shadow-[0_18px_45px_rgba(15,23,42,0.18)] flex items-center justify-center text-5xl md:text-6xl relative z-10">
                {getAvatar(currentUser)}
              </div>
            </div>
            <span className="font-display text-5xl md:text-6xl tracking-tight text-slate-800/90">
              Us.
            </span>
          </div>
        </div>
      )}

      {/* Gravity Mode */}
      {isGravityMode && (
        <GravityMode memories={memories} onClose={() => setIsGravityMode(false)} />
      )}

      {/* 2048 Game */}
      {isGame2048Open && (
        <Game2048 onClose={() => setIsGame2048Open(false)} />
      )}

      {/* Piggy Bank Feature */}
      {phase === 'main' && (
        <PiggyBank count={memories.length} />
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
