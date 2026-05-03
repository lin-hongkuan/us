import { CreateMemoryDTO, Memory, OutboxEntry, UserType } from '../types';
import {
  clearOutboxStore,
  deleteOutboxEntry,
  getOutboxEntries,
  putOutboxEntry,
} from './cacheService';

/**
 * 离线写入的本地排队 outbox。
 * - 当网络不可用 / 云端写失败时，把待提交的 DTO 持久化到 IndexedDB（store: outbox）
 * - 内存里维护一份 cache 镜像，让 enqueueWrite/getOutboxCount 等 API 保持同步语义
 * - 持久化为 fire-and-forget：UI 即时上屏不被 IDB 写入阻塞
 *
 * 设计：每个条目有一个本地 localId（同时也作为乐观 Memory.id），
 * 重放成功后用云端返回的 Memory 替换掉这条，匹配键就是 localId。
 */

// ==========================================
// 内存镜像 + hydration
// ==========================================

let cache: OutboxEntry[] = [];
let hydrated = false;
let hydrationPromise: Promise<void> | null = null;

/**
 * 启动时一次性把 IDB 里的 outbox 灌入内存 cache。
 * 重复调用复用同一个 promise，幂等。
 */
export const whenOutboxReady = (): Promise<void> => {
  if (hydrated) return Promise.resolve();
  if (hydrationPromise) return hydrationPromise;

  hydrationPromise = (async () => {
    try {
      const entries = await getOutboxEntries();
      cache = entries;
    } catch (e) {
      // IDB 不可用时按空队列处理
      console.warn('Outbox hydration failed; treating as empty queue:', e);
      cache = [];
    } finally {
      hydrated = true;
    }
  })();

  return hydrationPromise;
};

// ==========================================
// 同步读 API（依赖内存 cache）
// ==========================================

export const getOutbox = (): OutboxEntry[] => cache.slice();

export const getOutboxCount = (): number => cache.length;

// ==========================================
// 写 API：同步更新 cache + fire-and-forget 持久化
// ==========================================

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export interface OptimisticEnqueueResult {
  entry: OutboxEntry;
  optimisticMemory: Memory;
}

/**
 * 把 DTO 入队，并立刻生成一条乐观 Memory（含 isPending 标记），
 * 调用方应该把这条 memory 直接塞进列表 state 让用户立即看到。
 */
export const enqueueWrite = (dto: CreateMemoryDTO): OptimisticEnqueueResult => {
  const localId = generateId();
  const enqueuedAt = Date.now();
  const entry: OutboxEntry = { localId, enqueuedAt, dto };

  // 同步更新内存镜像，保证后续 getOutboxCount 立刻能读到
  cache = [...cache, entry];

  // 异步持久化（失败不影响乐观上屏）
  void putOutboxEntry(entry).catch((e) => {
    console.error('Failed to persist outbox entry:', e);
  });

  const effectiveTimestamp = dto.customDate ?? enqueuedAt;
  const optimisticMemory: Memory = {
    id: localId,
    content: dto.content,
    createdAt: effectiveTimestamp,
    author: dto.author as UserType,
    imageUrl: dto.imageUrl || dto.imageUrls?.[0],
    imageUrls: dto.imageUrls || (dto.imageUrl ? [dto.imageUrl] : undefined),
  };

  return { entry, optimisticMemory };
};

/**
 * 通过 localId 移除 outbox 条目（重放成功时调用）。
 */
export const removeFromOutbox = (localId: string): void => {
  cache = cache.filter((entry) => entry.localId !== localId);
  void deleteOutboxEntry(localId).catch((e) => {
    console.error('Failed to delete outbox entry from IDB:', e);
  });
};

export interface DrainResult {
  flushed: Array<{ localId: string; saved: Memory }>;
  failed: Array<{ localId: string; reason: unknown }>;
}

/**
 * 重放 outbox。saver 通常就是 storageService.saveMemory；
 * 由调用方注入以避免循环依赖。
 *
 * 成功的条目从队列移除，失败的留在队列里下次再试（默认就地保留顺序）。
 */
export const drainOutbox = async (
  saver: (dto: CreateMemoryDTO) => Promise<Memory | null>,
): Promise<DrainResult> => {
  // 启动时第一次调用，cache 还可能没从 IDB 灌好，等一下
  await whenOutboxReady();

  const entries = cache.slice();
  if (entries.length === 0) {
    return { flushed: [], failed: [] };
  }

  const flushed: DrainResult['flushed'] = [];
  const failed: DrainResult['failed'] = [];

  // 顺序重放，避免对端按时间戳排序时乱序
  for (const entry of entries) {
    try {
      const saved = await saver(entry.dto);
      if (saved) {
        flushed.push({ localId: entry.localId, saved });
      } else {
        failed.push({ localId: entry.localId, reason: 'saver returned null' });
      }
    } catch (e) {
      failed.push({ localId: entry.localId, reason: e });
    }
  }

  // 同步移除成功的条目；IDB 删除 fire-and-forget
  const flushedSet = new Set(flushed.map((f) => f.localId));
  if (flushedSet.size > 0) {
    cache = cache.filter((entry) => !flushedSet.has(entry.localId));
    for (const { localId } of flushed) {
      void deleteOutboxEntry(localId).catch((e) => {
        console.error('Failed to delete flushed outbox entry from IDB:', e);
      });
    }
  }

  return { flushed, failed };
};

/**
 * 清空 outbox（内存 + IDB），avatar 长按手势用。
 */
export const clearOutbox = async (): Promise<void> => {
  cache = [];
  await clearOutboxStore();
};

// 仅供测试用：重置模块级状态。生产代码不要调用。
export const __resetOutboxForTests = (): void => {
  cache = [];
  hydrated = false;
  hydrationPromise = null;
};
