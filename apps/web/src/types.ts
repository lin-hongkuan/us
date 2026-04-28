// --- Us - A Shared Memory Journal: Enhanced Types ---

export enum UserType {
  HER = 'HER',
  HIM = 'HIM'
}

// 1. 定义更精致的头像配置接口
export interface AvatarConfig {
  her: string;
  him: string;
  theme: string;      // 主题色（用于边框或背景）
  bg: string;         // 浅色背景（用于气泡）
  desc: string;       // 这一组头像的小寓意
}

// 2. 精选 32 组更有故事感的对偶
export const AVATAR_PAIRS: AvatarConfig[] = [
  { her: '🐱', him: '🐶', theme: '#f43f5e', bg: '#fff1f2', desc: '猫猫狗狗，吵吵闹闹' },
  { her: '🐰', him: '🥕', theme: '#fb923c', bg: '#fff7ed', desc: '你是我的专属营养' },
  { her: '🍓', him: '🍰', theme: '#ec4899', bg: '#fdf2f8', desc: '草莓点缀了蛋糕的甜' },
  { her: '🌸', him: '🐝', theme: '#d946ef', bg: '#fdf4ff', desc: '你在哪，我就飞向哪' },
  { her: '🌙', him: '☀️', theme: '#6366f1', bg: '#eef2ff', desc: '昼夜交替，思念不息' },
  
  { her: '🎈', him: '🏠', theme: '#3b82f6', bg: '#eff6ff', desc: '想和你一起飞向远方' },
  { her: '🦊', him: '🌹', theme: '#be123c', bg: '#fff1f2', desc: '我被你驯服了' },
  { her: '☁️', him: '🌈', theme: '#0ea5e9', bg: '#f0f9ff', desc: '你让我的阴天变灿烂' },
  { her: '🦢', him: '🌊', theme: '#06b6d4', bg: '#ecfeff', desc: '平静湖面上的相拥' },
  { her: '🧸', him: '🎁', theme: '#a855f7', bg: '#f3e8ff', desc: '你是我最珍贵的礼物' },
  { her: '🍩', him: '☕', theme: '#92400e', bg: '#fffaf3', desc: '绝配的下午茶时光' },
  { her: '🔭', him: '✨', theme: '#4338ca', bg: '#eef2ff', desc: '你是我的满目星河' },
  { her: '🎨', him: '🖌️', theme: '#8b5cf6', bg: '#f5f3ff', desc: '一起描绘我们的未来' },
  { her: '🎼', him: '🎹', theme: '#1e293b', bg: '#f8fafc', desc: '琴键与乐章' },
  { her: '🍿', him: '🎬', theme: '#eab308', bg: '#fefce8', desc: '电影没你好看' },
  { her: '🍦', him: '🍧', theme: '#fb7185', bg: '#fff1f2', desc: '和你在一起，心都化了' },
  
  { her: '🍁', him: '🍂', theme: '#c2410c', bg: '#fff7ed', desc: '秋叶飘落时也在想你' },
  { her: '❄️', him: '☃️', theme: '#0ea5e9', bg: '#f0f9ff', desc: '想和你一起白了头' },
  
  { her: '🦋', him: '🍀', theme: '#22c55e', bg: '#f0fdf4', desc: '停留在那片幸运草上' },
  { her: '⚓', him: '🚢', theme: '#0369a1', bg: '#f0f9ff', desc: '你是我的避风港' },
  { her: '🏹', him: '💘', theme: '#ef4444', bg: '#fef2f2', desc: '这一箭，正中红心' },
  { her: '🍫', him: '🍬', theme: '#78350f', bg: '#fffaf3', desc: '生活有点苦，还好你够甜' },
  
  
  { her: '💍', him: '💎', theme: '#0d9488', bg: '#f0fdfa', desc: '你是余生唯一的璀璨' },
  { her: '💌', him: '📮', theme: '#e11d48', bg: '#fff1f2', desc: '寄给婷婷的第N封情书' },
  { her: '🧶', him: '🧤', theme: '#db2777', bg: '#fdf2f8', desc: '编织属于我们的温暖' },
  { her: '🪄', him: '📖', theme: '#8b5cf6', bg: '#f5f3ff', desc: '我们的故事正在展开' },
  { her: '🧭', him: '🗺️', theme: '#0f766e', bg: '#f0fdfa', desc: '不管走到哪，我们都不迷路' },
  { her: '🎮', him: '🕹️', theme: '#22c55e', bg: '#f0fdf4', desc: '这一局，想一直和你组队' },
  { her: '📷', him: '🙂', theme: '#0ea5e9', bg: '#f0f9ff', desc: '想把你的每个瞬间收藏' },
  { her: '📚', him: '☕', theme: '#6b7280', bg: '#f9fafb', desc: '与你共度的静谧时光' },
  { her: '🌧️', him: '☂️', theme: '#475569', bg: '#f1f5f9', desc: '下雨的时候，也有人等我' },
  { her: '🪴', him: '💧', theme: '#22c55e', bg: '#f0fdf4', desc: '慢慢长大，一起照顾' },
  { her: '🧸', him: '🌙', theme: '#8b5cf6', bg: '#f5f3ff', desc: '夜再深，也有人陪我睡' },
  { her: '🔔', him: '🏠', theme: '#0f766e', bg: '#f0fdfa', desc: '晚一点没关系，我在家' },
  { her: '🌱', him: '☀️', theme: '#22c55e', bg: '#f0fdf4', desc: '你在的时候，我就生长' }
  
];

const AVATAR_ROTATE_INTERVAL_MS = 1000 * 60 * 10;
const FALLBACK_AVATAR_PAIR: AvatarConfig = {
  her: '💗',
  him: '💗',
  theme: '#f43f5e',
  bg: '#fff1f2',
  desc: '你在，就很甜'
};

let cachedAvatarInterval = -1;
let cachedAvatarPair: AvatarConfig | null = null;

export const getDailyAvatars = (): AvatarConfig => {
  const now = Date.now();
  const intervalIndex = Math.floor(now / AVATAR_ROTATE_INTERVAL_MS);

  if (cachedAvatarPair && cachedAvatarInterval === intervalIndex) {
    return cachedAvatarPair;
  }

  const index = intervalIndex % AVATAR_PAIRS.length;
  const pair = AVATAR_PAIRS[index] ?? FALLBACK_AVATAR_PAIR;

  // 纪念日检测
  const startDate = new Date('2024-08-20').getTime();
  const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 500) {
    cachedAvatarPair = { her: '🐧', him: '🐧', theme: '#0ea5e9', bg: '#f0f9ff', desc: '第500天，还是选你' };
    cachedAvatarInterval = intervalIndex;
    return cachedAvatarPair;
  }

  cachedAvatarPair = pair;
  cachedAvatarInterval = intervalIndex;
  return cachedAvatarPair;
};

export const getAvatar = (author: UserType) => {
  const config = getDailyAvatars();
  return author === UserType.HER ? config.her : config.him;
};

// 记忆数据接口：定义单个记忆条目的结构
export interface Memory {
  id: string;           // 记忆的唯一标识符
  content: string;      // 记忆的内容文本
  createdAt: number;    // 创建时间戳（毫秒）
  author: UserType;     // 作者身份（她或他）
  tags?: string[];      // 可选的标签数组，用于分类
  imageUrl?: string;    // 可选的图片URL或Base64数据 (Deprecated)
  imageUrls?: string[]; // 可选的多张图片URL
}

// 创建记忆的数据传输对象：用于新建记忆时的参数
export interface CreateMemoryDTO {
  content: string;      // 记忆内容
  author: UserType;     // 作者身份
  imageUrl?: string;    // 可选的图片 (Deprecated)
  imageUrls?: string[]; // 可选的多张图片
  customDate?: number;  // 可选的自定义时间戳（毫秒），用于记录过去的事
}

// 更新公告配置
export interface UpdateInfo {
  version: string;
  date: string;
  content: string[];
}

export const APP_UPDATE: UpdateInfo = {
  version: 'v5.3.2',
  date: '2026-04-28',
  content: [
    'UI 细节打磨：空日记不再只是冷冰冰的一行文字，新增温柔空状态、头像装饰、写第一条回忆的引导按钮和小提示 💌',
    '移动端列表优化：每个视角顶部加入轻量状态条，展示当前是谁的日记、回忆数量和左右滑动提示，刷起来更有方向感 📱',
    '公告弹窗优化：支持 Esc 关闭、打开时锁定背景滚动，补齐可访问性标识，小屏内容过长也会在弹窗内滚动 ✨',
    '图片查看增强：全屏看图支持键盘左右切换、Esc 关闭、移动端左右滑动切换，并加入更清晰的计数与操作提示 🖼️',
    '图片卡片按钮更适合触屏：全屏、下载、删除等操作在移动端常驻显示，手指不用再“悬浮”才能找到入口 🌙'
  ]
};