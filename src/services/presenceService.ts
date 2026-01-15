/**
 * ==========================================
 * 在线状态服务 (Presence Service)
 * ==========================================
 *
 * 利用 Supabase Realtime Presence 功能，
 * 检测两个用户是否同时在线。
 * 当双方同时浏览网站时，显示甜蜜提示。
 */

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { UserType } from '../types';

// Supabase 配置（与 storageService 保持一致）
const SUPABASE_URL: string = 'https://uiczraluplwdupdigkar.supabase.co';
const SUPABASE_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pyYWx1cGx3ZHVwZGlna2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjQzNDMsImV4cCI6MjA4MDg0MDM0M30.xS-mEzW1i1sPrhfAOgQNb6pux7bZjqKQiVe3LU0TbVo';

const isConfigured = SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_URL.startsWith('http');

// 为 Presence 创建单独的 Supabase 客户端
const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 2
    }
  }
}) : null;

// Presence 频道名称
const PRESENCE_CHANNEL = 'us-presence-room';

// 存储当前频道引用
let channel: RealtimeChannel | null = null;

// 当前实例的唯一 ID（每次页面加载都生成新的，不使用 sessionStorage）
let instanceId: string | null = null;

// 回调函数类型
type PresenceCallback = (partnerOnline: boolean, partnerUser: UserType | null) => void;

// 订阅者列表
let subscribers: PresenceCallback[] = [];

// 当前在线用户状态
let currentPresenceState: {
  myUser: UserType | null;
  partnerOnline: boolean;
  partnerUser: UserType | null;
} = {
  myUser: null,
  partnerOnline: false,
  partnerUser: null
};

/**
 * 生成唯一的实例 ID
 * 每次页面加载都生成新的，确保同一浏览器的多个标签页有不同的 ID
 */
const getInstanceId = (): string => {
  if (!instanceId) {
    instanceId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 5)}`;
  }
  return instanceId;
};

/**
 * 初始化 Presence 频道
 * @param userType - 当前用户类型 (HER/HIM)
 */
export const initPresence = async (userType: UserType): Promise<void> => {
  if (!supabase) {
    console.warn('Supabase 未配置，无法使用在线状态功能');
    return;
  }

  // 如果已有频道，先清理（但不等待，避免阻塞）
  if (channel) {
    const oldChannel = channel;
    channel = null;
    try {
      await oldChannel.unsubscribe();
    } catch (e) {
      // 忽略清理错误
    }
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

  // 监听 Presence 同步事件
  channel
    .on('presence', { event: 'sync' }, () => {
      if (!channel) return;
      
      const presenceState = channel.presenceState();
      console.log('📡 Presence 同步:', presenceState);
      checkPartnerPresence(presenceState, myInstanceId);
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('✅ 用户加入:', key, newPresences);
      if (!channel) return;
      
      const presenceState = channel.presenceState();
      checkPartnerPresence(presenceState, myInstanceId);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('👋 用户离开:', key, leftPresences);
      if (!channel) return;
      
      const presenceState = channel.presenceState();
      checkPartnerPresence(presenceState, myInstanceId);
    });

  // 订阅频道并追踪 Presence
  await channel.subscribe(async (status) => {
    console.log('🔗 频道状态:', status);
    if (status === 'SUBSCRIBED') {
      console.log('✨ 正在追踪用户:', userType, myInstanceId);
      await channel?.track({
        user_type: userType,
        online_at: new Date().toISOString(),
        instance_id: myInstanceId
      });
      console.log('✅ 追踪成功');
    }
  });
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

  // 获取所有在线用户
  const allPresences = Object.values(presenceState).flat();
  console.log('👥 所有在线用户:', allPresences);
  console.log('🙋 我是:', myUser, '实例ID:', myInstanceId);
  
  // 查找不同身份的用户（不是同一个实例，且是不同角色）
  const partner = allPresences.find(p => {
    const isNotMe = p.instance_id !== myInstanceId;
    const isDifferentRole = p.user_type !== myUser;
    console.log('  检查用户:', p.user_type, p.instance_id, '| 不是我:', isNotMe, '不同角色:', isDifferentRole);
    return isNotMe && isDifferentRole;
  });
  
  console.log('💕 找到伴侣:', partner);

  const partnerOnline = !!partner;
  const partnerUser = partner ? (partner.user_type as UserType) : null;

  // 状态变化时通知订阅者
  if (
    currentPresenceState.partnerOnline !== partnerOnline ||
    currentPresenceState.partnerUser !== partnerUser
  ) {
    currentPresenceState.partnerOnline = partnerOnline;
    currentPresenceState.partnerUser = partnerUser;
    
    // 通知所有订阅者
    subscribers.forEach(callback => callback(partnerOnline, partnerUser));
  }
};

/**
 * 订阅在线状态变化
 * @param callback - 回调函数
 * @returns 取消订阅函数
 */
export const subscribeToPresence = (callback: PresenceCallback): (() => void) => {
  subscribers.push(callback);
  
  // 立即通知当前状态
  callback(currentPresenceState.partnerOnline, currentPresenceState.partnerUser);
  
  // 返回取消订阅函数
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
  if (channel && supabase) {
    try {
      // 先取消追踪
      await channel.untrack();
    } catch (e) {
      console.warn('Untrack failed:', e);
    }
    
    try {
      // 然后移除频道
      await supabase.removeChannel(channel);
    } catch (e) {
      console.warn('Remove channel failed:', e);
    }
    
    channel = null;
  }
  
  currentPresenceState = {
    myUser: null,
    partnerOnline: false,
    partnerUser: null
  };
};

/**
 * 检查 Supabase Realtime 是否可用
 */
export const isPresenceAvailable = (): boolean => {
  return !!supabase;
};
