import { Memory } from '../types';

export interface MemoryExportPayload {
  /** 备份格式版本号，未来 schema 变更时用得上 */
  version: 1;
  /** 导出时间戳（毫秒） */
  exportedAt: number;
  /** 备份的应用版本，方便定位 */
  appVersion?: string;
  /** 全部回忆 */
  memories: Memory[];
}

const pad2 = (n: number) => `${n}`.padStart(2, '0');

const buildFilename = (now: Date) =>
  `us-memories-${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}.json`;

/**
 * 把所有回忆打成一份 JSON，浏览器触发下载。
 * - 不依赖任何第三方库，仅使用 Blob + URL.createObjectURL
 * - 文件名带日期，方便用户多次备份
 * - 失败时抛错，调用方负责 toast / 上报
 */
export const exportMemoriesAsJson = (memories: Memory[], appVersion?: string): void => {
  const payload: MemoryExportPayload = {
    version: 1,
    exportedAt: Date.now(),
    appVersion,
    memories: [...memories].sort((a, b) => a.createdAt - b.createdAt),
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = buildFilename(new Date());
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // 让浏览器用完再回收
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
