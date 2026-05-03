import React from 'react';
import { CloudOff } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
}

/**
 * 离线状态横幅。在线时不渲染。
 * - 离线：提示用户写下的回忆会先暂存本地
 * - 离线 + 有暂存：额外显示「N 条等待同步」
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOnline, pendingCount }) => {
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-20 md:top-24 z-30 flex justify-center px-3 animate-fadeInUp"
    >
      <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/95 px-4 py-1.5 text-xs font-medium text-amber-700 shadow-[0_8px_30px_-12px_rgba(217,119,6,0.35)] backdrop-blur-md dark:border-amber-700/60 dark:bg-amber-900/30 dark:text-amber-200">
        <CloudOff size={14} className="shrink-0" />
        <span>
          {pendingCount > 0
            ? `离线中：你写下的${pendingCount > 1 ? ` ${pendingCount} 条 ` : ''}回忆已暂存，回到网络会自动同步`
            : '当前离线，写下的回忆会先暂存在本地'}
        </span>
      </div>
    </div>
  );
};

export default OfflineBanner;
