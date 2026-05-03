import { CreateMemoryDTO, Memory, UserType } from '../types';

/**
 * 离线写入的本地排队 outbox。
 * - 当网络不可用 / 云端写失败时，把待提交的 DTO 序列化到 localStorage
 * - 提供创建乐观 Memory（用于立即上屏）+ 重连后批量重放的能力
 *
 * 设计：每个条目有一个本地 localId（同时也作为乐观 Memory.id），
 * 重放成功后用云端返回的 Memory 替换掉这条，匹配键就是 localId。
 */

const OUTBOX_KEY = 'us_outbox_v1';

export interface OutboxEntry {
  localId: string;
  enqueuedAt: number;
  dto: CreateMemoryDTO;
}

const safeRead = (): OutboxEntry[] => {
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const safeWrite = (entries: OutboxEntry[]) => {
  try {
    if (entries.length === 0) {
      window.localStorage.removeItem(OUTBOX_KEY);
    } else {
      window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
    }
  } catch {
    /* ignore quota / private mode */
  }
};

export const getOutbox = (): OutboxEntry[] => safeRead();

export const getOutboxCount = (): number => safeRead().length;

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

  const next = [...safeRead(), entry];
  safeWrite(next);

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
  const next = safeRead().filter((entry) => entry.localId !== localId);
  safeWrite(next);
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
  const entries = safeRead();
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

  // 重新计算 outbox：保留所有失败的条目，按原顺序
  const flushedSet = new Set(flushed.map((f) => f.localId));
  const remaining = entries.filter((entry) => !flushedSet.has(entry.localId));
  safeWrite(remaining);

  return { flushed, failed };
};
