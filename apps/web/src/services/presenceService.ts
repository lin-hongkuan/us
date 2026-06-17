import { UserType } from '../types';
import { clearPresence, heartbeatPresence, isApiAvailable } from './cloudflareClient';

/**
 * 在线状态服务：Cloudflare Worker polling heartbeat 版本。
 */

type PresenceCallback = (partnerOnline: boolean, partnerUser: UserType | null) => void;

interface PartnerPresence {
  partnerOnline: boolean;
  partnerUser: UserType | null;
}

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

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
const HEARTBEAT_INTERVAL = 25_000;
let listenersBound = false;
let apiAvailable = true;

const getInstanceId = (): string => {
  if (!instanceId) {
    instanceId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 5)}`;
  }
  return instanceId;
};

const notifySubscribers = (): void => {
  Array.from(subscribers).forEach(callback => {
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

const stopHeartbeat = (): void => {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
};

const sendHeartbeat = async (generation: number): Promise<void> => {
  const myUser = currentPresenceState.myUser;
  if (!myUser || generation !== connectionGeneration) return;

  try {
    const presence = await heartbeatPresence({ user_type: myUser, instance_id: getInstanceId() });
    if (generation === connectionGeneration) {
      apiAvailable = true;
      setPartnerPresence(presence);
    }
  } catch (error) {
    apiAvailable = false;
    console.warn('[Presence] heartbeat failed:', error);
  }
};

const startHeartbeat = (generation: number): void => {
  stopHeartbeat();
  void sendHeartbeat(generation);
  heartbeatTimer = setInterval(() => {
    void sendHeartbeat(generation);
  }, HEARTBEAT_INTERVAL);
};

const handleBeforeUnload = (): void => {
  const id = instanceId;
  if (!id) return;
  try {
    void clearPresence({ instance_id: id });
  } catch (error) {
    console.warn('[Presence] beforeunload clear failed:', error);
  }
};

const handleVisibilityChange = (): void => {
  if (document.visibilityState === 'visible' && currentPresenceState.myUser) {
    void sendHeartbeat(connectionGeneration);
  }
};

const bindGlobalListeners = (): void => {
  if (listenersBound) return;
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('pagehide', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  listenersBound = true;
};

const unbindGlobalListeners = (): void => {
  if (!listenersBound) return;
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('pagehide', handleBeforeUnload);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  listenersBound = false;
};

export const resolvePartnerPresence = (
  presenceState: Record<string, Array<{ user_type?: unknown; instance_id?: unknown }> | { user_type?: unknown; instance_id?: unknown } | null | undefined>,
  myUser: UserType,
  myInstanceId: string,
): PartnerPresence => {
  const values = Object.entries(presenceState).flatMap(([presenceKey, value]) => {
    const list = Array.isArray(value) ? value : value ? [value] : [];
    return list.map(payload => ({ presenceKey, payload }));
  });
  const partner = values.find(({ presenceKey, payload }) => {
    if (presenceKey === myInstanceId || payload.instance_id === myInstanceId) return false;
    return (payload.user_type === UserType.HER || payload.user_type === UserType.HIM) && payload.user_type !== myUser;
  });
  return partner && (partner.payload.user_type === UserType.HER || partner.payload.user_type === UserType.HIM)
    ? { partnerOnline: true, partnerUser: partner.payload.user_type }
    : { partnerOnline: false, partnerUser: null };
};

export const initPresence = async (userType: UserType): Promise<void> => {
  apiAvailable = await isApiAvailable();
  if (!apiAvailable) {
    console.warn('[Presence] Cloudflare API unavailable, skip init');
    return;
  }

  const generation = connectionGeneration + 1;
  connectionGeneration = generation;
  stopHeartbeat();

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

  bindGlobalListeners();
  startHeartbeat(generation);
};

export const subscribeToPresence = (callback: PresenceCallback): (() => void) => {
  subscribers.add(callback);
  callback(currentPresenceState.partnerOnline, currentPresenceState.partnerUser);
  return () => {
    subscribers.delete(callback);
  };
};

export const getPresenceState = () => ({
  ...currentPresenceState,
});

export const cleanupPresence = async (): Promise<void> => {
  connectionGeneration++;
  stopHeartbeat();
  unbindGlobalListeners();

  const id = instanceId;
  const shouldNotify = currentPresenceState.myUser !== null || currentPresenceState.partnerOnline || currentPresenceState.partnerUser !== null;
  currentPresenceState = {
    myUser: null,
    partnerOnline: false,
    partnerUser: null,
  };

  if (shouldNotify) {
    notifySubscribers();
  }

  if (id) {
    try {
      await clearPresence({ instance_id: id });
    } catch (error) {
      console.warn('[Presence] cleanup clear failed:', error);
    }
  }
};

export const isPresenceAvailable = (): boolean => apiAvailable;

export const refreshPresenceAvailability = async (): Promise<boolean> => {
  apiAvailable = await isApiAvailable();
  return apiAvailable;
};
