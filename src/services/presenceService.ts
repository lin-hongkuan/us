/**
 * 在线状态服务 (Presence Service)
 *
 * 利用 Supabase Realtime Presence 功能，
 * 检测两个用户是否同时在线。
 * 当双方同时浏览网站时，显示甜蜜提示。
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { UserType } from '../types';

const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY ?? '';

const isConfigured = !!SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_URL.startsWith('http');

const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
}) : null;

const PRESENCE_CHANNEL = 'us-presence-room';

let channel: RealtimeChannel | null = null;
let instanceId: string | null = null;

type PresenceCallback = (partnerOnline: boolean, partnerUser: UserType | null) => void;

let subscribers: PresenceCallback[] = [];

let currentPresenceState: {
  myUser: UserType | null;
  partnerOnline: boolean;
  partnerUser: UserType | null;
} = {
  myUser: null,
  partnerOnline: false,
  partnerUser: null
};

// 重连 & 心跳
let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 2000;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
const HEARTBEAT_INTERVAL = 25_000;

let listenersBound = false;

const getInstanceId = (): string => {
  if (!instanceId) {
    instanceId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 5)}`;
  }
  return instanceId;
};

const notifySubscribers = (): void => {
  subscribers.forEach(cb => cb(currentPresenceState.partnerOnline, currentPresenceState.partnerUser));
};

/**
 * 检查伴侣是否在线
 */
const checkPartnerPresence = (
  presenceState: Record<string, any[]>,
  myInstanceId: string
): void => {
  const myUser = currentPresenceState.myUser;
  if (!myUser) return;

  const allPresences = Object.values(presenceState).flat();

  const partner = allPresences.find(p => {
    return p.instance_id !== myInstanceId && p.user_type !== myUser;
  });

  const partnerOnline = !!partner;
  const partnerUser = partner ? (partner.user_type as UserType) : null;

  if (
    currentPresenceState.partnerOnline !== partnerOnline ||
    currentPresenceState.partnerUser !== partnerUser
  ) {
    currentPresenceState.partnerOnline = partnerOnline;
    currentPresenceState.partnerUser = partnerUser;
    notifySubscribers();
  }
};

/**
 * 发送 track 给 Supabase Presence
 */
const trackPresence = async (): Promise<void> => {
  if (!channel || !currentPresenceState.myUser) return;
  try {
    await channel.track({
      user_type: currentPresenceState.myUser,
      online_at: new Date().toISOString(),
      instance_id: getInstanceId()
    });
  } catch (e) {
    console.warn('[Presence] track failed:', e);
  }
};

const startHeartbeat = (): void => {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => trackPresence(), HEARTBEAT_INTERVAL);
};

const stopHeartbeat = (): void => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

const clearRetryTimer = (): void => {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
};

/**
 * 重连逻辑：指数退避
 */
const scheduleRetry = (): void => {
  const userType = currentPresenceState.myUser;
  if (!userType || retryCount >= MAX_RETRIES) return;

  retryCount++;
  const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount - 1);
  console.warn(`[Presence] will retry in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);

  clearRetryTimer();
  retryTimer = setTimeout(() => {
    if (currentPresenceState.myUser) {
      initPresence(currentPresenceState.myUser).catch(() => {});
    }
  }, delay);
};

const handleBeforeUnload = (): void => {
  try {
    channel?.untrack();
  } catch (_) { /* best-effort */ }
};

const handleVisibilityChange = (): void => {
  if (document.visibilityState === 'visible' && channel && currentPresenceState.myUser) {
    trackPresence();
  }
};

const bindGlobalListeners = (): void => {
  if (listenersBound) return;
  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  listenersBound = true;
};

const unbindGlobalListeners = (): void => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  listenersBound = false;
};

/**
 * 初始化 Presence 频道
 */
export const initPresence = async (userType: UserType): Promise<void> => {
  if (!supabase) {
    console.warn('[Presence] Supabase 未配置，跳过在线状态');
    return;
  }

  // 清理旧频道
  if (channel) {
    const oldChannel = channel;
    channel = null;
    stopHeartbeat();
    clearRetryTimer();
    try { await oldChannel.unsubscribe(); } catch (_) {}
  }

  currentPresenceState.myUser = userType;
  const myInstanceId = getInstanceId();

  channel = supabase.channel(PRESENCE_CHANNEL, {
    config: {
      presence: {
        key: myInstanceId
      }
    }
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      if (!channel) return;
      checkPartnerPresence(channel.presenceState(), myInstanceId);
    })
    .on('presence', { event: 'join' }, () => {
      if (!channel) return;
      checkPartnerPresence(channel.presenceState(), myInstanceId);
    })
    .on('presence', { event: 'leave' }, () => {
      if (!channel) return;
      checkPartnerPresence(channel.presenceState(), myInstanceId);
    });

  channel.subscribe((status: string, err?: Error) => {
    if (status === 'SUBSCRIBED') {
      retryCount = 0;
      trackPresence();
      startHeartbeat();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn('[Presence] subscription error:', status, err?.message);
      stopHeartbeat();
      scheduleRetry();
    } else if (status === 'CLOSED') {
      stopHeartbeat();
    }
  });

  bindGlobalListeners();
};

/**
 * 订阅在线状态变化
 */
export const subscribeToPresence = (callback: PresenceCallback): (() => void) => {
  subscribers.push(callback);
  callback(currentPresenceState.partnerOnline, currentPresenceState.partnerUser);
  return () => {
    subscribers = subscribers.filter(cb => cb !== callback);
  };
};

/**
 * 获取当前 Presence 状态
 */
export const getPresenceState = () => ({
  ...currentPresenceState
});

/**
 * 清理 Presence 连接
 */
export const cleanupPresence = async (): Promise<void> => {
  stopHeartbeat();
  clearRetryTimer();
  unbindGlobalListeners();

  if (channel && supabase) {
    try { await channel.untrack(); } catch (_) {}
    try { await supabase.removeChannel(channel); } catch (_) {}
    channel = null;
  }

  currentPresenceState = {
    myUser: null,
    partnerOnline: false,
    partnerUser: null
  };
  retryCount = 0;
};

/**
 * 检查 Supabase Realtime 是否可用
 */
export const isPresenceAvailable = (): boolean => {
  return !!supabase;
};
