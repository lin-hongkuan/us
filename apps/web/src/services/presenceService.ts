/**
 * 在线状态服务 (Presence Service)
 *
 * 利用 Supabase Realtime Presence 功能，
 * 检测两个用户是否同时在线。
 * 当双方同时浏览网站时，显示甜蜜提示。
 */

import type { RealtimeChannel } from '@supabase/supabase-js';
import { UserType } from '../types';
import { supabase } from './supabaseClient';

const PRESENCE_CHANNEL = 'us-presence-room';

interface PresencePayload {
  user_type?: unknown;
  online_at?: unknown;
  instance_id?: unknown;
}

type PresenceStateLike = Record<string, PresencePayload[] | PresencePayload | null | undefined>;

type PresenceCallback = (partnerOnline: boolean, partnerUser: UserType | null) => void;

interface PartnerPresence {
  partnerOnline: boolean;
  partnerUser: UserType | null;
}

let channel: RealtimeChannel | null = null;
let connectionGeneration = 0;
let instanceId: string | null = null;
const subscribers = new Set<PresenceCallback>();

let currentPresenceState: {
  myUser: UserType | null;
  partnerOnline: boolean;
  partnerUser: UserType | null;
} = {
  myUser: null,
  partnerOnline: false,
  partnerUser: null,
};

// 重连 & 心跳
let retryCount = 0;
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 2000;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
const HEARTBEAT_INTERVAL = 25_000;

let listenersBound = false;

const isUserType = (value: unknown): value is UserType => {
  return value === UserType.HER || value === UserType.HIM;
};

const getInstanceId = (): string => {
  if (!instanceId) {
    instanceId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 5)}`;
  }
  return instanceId;
};

const notifySubscribers = (): void => {
  const callbacks = Array.from(subscribers);
  callbacks.forEach(callback => {
    try {
      callback(currentPresenceState.partnerOnline, currentPresenceState.partnerUser);
    } catch (error) {
      console.warn('[Presence] subscriber callback failed:', error);
    }
  });
};

const setPartnerPresence = ({ partnerOnline, partnerUser }: PartnerPresence): void => {
  if (
    currentPresenceState.partnerOnline !== partnerOnline ||
    currentPresenceState.partnerUser !== partnerUser
  ) {
    currentPresenceState.partnerOnline = partnerOnline;
    currentPresenceState.partnerUser = partnerUser;
    notifySubscribers();
  }
};

const toPresenceList = (value: PresencePayload[] | PresencePayload | null | undefined): PresencePayload[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

/**
 * 从 Supabase Presence 原始状态中提取伴侣在线信息。
 * 同身份的其他标签页不算作伴侣；当前连接 key 与 instance_id 也会被忽略。
 */
export const resolvePartnerPresence = (
  presenceState: PresenceStateLike,
  myUser: UserType,
  myInstanceId: string
): PartnerPresence => {
  const partner = Object.entries(presenceState)
    .flatMap(([presenceKey, value]) => (
      toPresenceList(value).map(payload => ({ presenceKey, payload }))
    ))
    .find(({ presenceKey, payload }) => {
      if (presenceKey === myInstanceId || payload.instance_id === myInstanceId) return false;
      if (!isUserType(payload.user_type)) return false;
      return payload.user_type !== myUser;
    });

  if (!partner || !isUserType(partner.payload.user_type)) {
    return { partnerOnline: false, partnerUser: null };
  }

  return { partnerOnline: true, partnerUser: partner.payload.user_type };
};

/**
 * 检查伴侣是否在线
 */
const checkPartnerPresence = (
  presenceState: PresenceStateLike,
  myInstanceId: string
): void => {
  const myUser = currentPresenceState.myUser;
  if (!myUser) return;

  setPartnerPresence(resolvePartnerPresence(presenceState, myUser, myInstanceId));
};

/**
 * 发送 track 给 Supabase Presence
 */
const trackPresence = async (
  targetChannel: RealtimeChannel | null = channel,
  generation = connectionGeneration
): Promise<void> => {
  if (
    !targetChannel ||
    targetChannel !== channel ||
    generation !== connectionGeneration ||
    !currentPresenceState.myUser
  ) {
    return;
  }

  try {
    await targetChannel.track({
      user_type: currentPresenceState.myUser,
      online_at: new Date().toISOString(),
      instance_id: getInstanceId(),
    });
  } catch (error) {
    console.warn('[Presence] track failed:', error);
  }
};

const startHeartbeat = (targetChannel: RealtimeChannel, generation: number): void => {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    void trackPresence(targetChannel, generation);
  }, HEARTBEAT_INTERVAL);
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

const disposeChannel = async (targetChannel: RealtimeChannel): Promise<void> => {
  try {
    await targetChannel.untrack();
  } catch (error) {
    console.warn('[Presence] untrack failed:', error);
  }

  try {
    if (supabase) {
      await supabase.removeChannel(targetChannel);
    } else {
      await targetChannel.unsubscribe();
    }
  } catch (error) {
    console.warn('[Presence] remove channel failed:', error);
  }
};

/**
 * 重连逻辑：指数退避
 */
const scheduleRetry = (generation: number): void => {
  const userType = currentPresenceState.myUser;
  if (!userType || retryCount >= MAX_RETRIES || generation !== connectionGeneration) return;

  retryCount++;
  const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount - 1);
  console.warn(`[Presence] will retry in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);

  clearRetryTimer();
  retryTimer = setTimeout(() => {
    if (currentPresenceState.myUser && generation === connectionGeneration) {
      initPresence(currentPresenceState.myUser).catch(error => {
        console.warn('[Presence] retry failed:', error);
      });
    }
  }, delay);
};

const handleBeforeUnload = (): void => {
  try {
    void channel?.untrack();
  } catch (error) {
    console.warn('[Presence] beforeunload untrack failed:', error);
  }
};

const handleVisibilityChange = (): void => {
  if (document.visibilityState === 'visible' && channel && currentPresenceState.myUser) {
    void trackPresence(channel, connectionGeneration);
    checkPartnerPresence(channel.presenceState() as PresenceStateLike, getInstanceId());
  }
};

const bindGlobalListeners = (): void => {
  if (listenersBound) return;
  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  listenersBound = true;
};

const unbindGlobalListeners = (): void => {
  if (!listenersBound) return;
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

  const generation = connectionGeneration + 1;
  connectionGeneration = generation;

  // 先让旧连接失效，避免旧 channel 的异步回调污染新状态。
  const oldChannel = channel;
  channel = null;
  stopHeartbeat();
  clearRetryTimer();

  if (currentPresenceState.myUser !== userType) {
    currentPresenceState = {
      myUser: userType,
      partnerOnline: false,
      partnerUser: null,
    };
    notifySubscribers();
  } else {
    currentPresenceState.myUser = userType;
  }

  if (oldChannel) {
    await disposeChannel(oldChannel);
    if (generation !== connectionGeneration) return;
  }

  const myInstanceId = getInstanceId();
  const nextChannel = supabase.channel(PRESENCE_CHANNEL, {
    config: {
      presence: {
        key: myInstanceId,
      },
    },
  });

  channel = nextChannel;

  const readPresence = (): void => {
    if (channel !== nextChannel || generation !== connectionGeneration) return;
    checkPartnerPresence(nextChannel.presenceState() as PresenceStateLike, myInstanceId);
  };

  nextChannel
    .on('presence', { event: 'sync' }, readPresence)
    .on('presence', { event: 'join' }, readPresence)
    .on('presence', { event: 'leave' }, readPresence);

  nextChannel.subscribe((status: string, err?: Error) => {
    if (channel !== nextChannel || generation !== connectionGeneration) return;

    if (status === 'SUBSCRIBED') {
      retryCount = 0;
      void trackPresence(nextChannel, generation);
      startHeartbeat(nextChannel, generation);
      readPresence();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn('[Presence] subscription error:', status, err?.message);
      stopHeartbeat();
      scheduleRetry(generation);
    } else if (status === 'CLOSED') {
      stopHeartbeat();
      scheduleRetry(generation);
    }
  });

  bindGlobalListeners();
};

/**
 * 订阅在线状态变化
 */
export const subscribeToPresence = (callback: PresenceCallback): (() => void) => {
  subscribers.add(callback);
  callback(currentPresenceState.partnerOnline, currentPresenceState.partnerUser);
  return () => {
    subscribers.delete(callback);
  };
};

/**
 * 获取当前 Presence 状态
 */
export const getPresenceState = () => ({
  ...currentPresenceState,
});

/**
 * 清理 Presence 连接
 */
export const cleanupPresence = async (): Promise<void> => {
  connectionGeneration++;
  stopHeartbeat();
  clearRetryTimer();
  unbindGlobalListeners();

  const targetChannel = channel;
  channel = null;

  const shouldNotify = currentPresenceState.myUser !== null || currentPresenceState.partnerOnline || currentPresenceState.partnerUser !== null;
  currentPresenceState = {
    myUser: null,
    partnerOnline: false,
    partnerUser: null,
  };
  retryCount = 0;

  if (shouldNotify) {
    notifySubscribers();
  }

  if (targetChannel) {
    await disposeChannel(targetChannel);
  }
};

/**
 * 检查 Supabase Realtime 是否可用
 */
export const isPresenceAvailable = (): boolean => {
  return !!supabase;
};
