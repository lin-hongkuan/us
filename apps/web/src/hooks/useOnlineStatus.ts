import { useEffect, useState } from 'react';

const readInitial = (): boolean => {
  if (typeof navigator === 'undefined') return true;
  // navigator.onLine 在某些环境（Tauri/SSR）下不可靠，缺省按在线处理
  return typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
};

/**
 * 监听 navigator.onLine + window 的 online/offline 事件。
 * 注意：navigator.onLine 在桌面/移动浏览器上有时会误报（如 captive portal），
 * 所以这只是一个"乐观"判断，主要用来给用户一个提示和触发 outbox 重试。
 */
export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState<boolean>(readInitial);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
