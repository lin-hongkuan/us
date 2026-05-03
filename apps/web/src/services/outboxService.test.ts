import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Memory, OutboxEntry } from '../types';
import { UserType } from '../types';

// Mock cacheService 的 outbox 原语：用 Map 在内存里模拟 IndexedDB store
vi.mock('./cacheService', () => {
  const store = new Map<string, OutboxEntry>();
  return {
    getOutboxEntries: vi.fn(async () =>
      Array.from(store.values()).sort((a, b) => a.enqueuedAt - b.enqueuedAt),
    ),
    putOutboxEntry: vi.fn(async (entry: OutboxEntry) => {
      store.set(entry.localId, entry);
    }),
    deleteOutboxEntry: vi.fn(async (localId: string) => {
      store.delete(localId);
    }),
    clearOutboxStore: vi.fn(async () => {
      store.clear();
    }),
    __readStore: () => Array.from(store.values()),
    __seedStore: (entries: OutboxEntry[]) => {
      store.clear();
      for (const e of entries) store.set(e.localId, e);
    },
    __reset: () => {
      store.clear();
    },
  };
});

// 提供稳定的 randomUUID（jsdom 环境下可能没有）
const ensureRandomUUID = () => {
  if (!('randomUUID' in crypto)) {
    let counter = 0;
    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      value: () => `test-uuid-${++counter}`,
    });
  }
};

type CacheMock = {
  getOutboxEntries: ReturnType<typeof vi.fn>;
  putOutboxEntry: ReturnType<typeof vi.fn>;
  deleteOutboxEntry: ReturnType<typeof vi.fn>;
  clearOutboxStore: ReturnType<typeof vi.fn>;
  __readStore: () => OutboxEntry[];
  __seedStore: (entries: OutboxEntry[]) => void;
  __reset: () => void;
};

const flushMicrotasks = async () => {
  // 让 fire-and-forget 的 putOutboxEntry promise 有机会跑完
  await Promise.resolve();
  await Promise.resolve();
};

describe('outboxService', () => {
  let outbox: typeof import('./outboxService');
  let cacheMock: CacheMock;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    ensureRandomUUID();
    cacheMock = (await import('./cacheService')) as unknown as CacheMock;
    cacheMock.__reset();
    outbox = await import('./outboxService');
    outbox.__resetOutboxForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('whenOutboxReady', () => {
    it('hydration 完成后 cache 反映 IDB 中的条目', async () => {
      cacheMock.__seedStore([
        {
          localId: 'p1',
          enqueuedAt: 100,
          dto: { content: '一', author: UserType.HER },
        },
        {
          localId: 'p2',
          enqueuedAt: 200,
          dto: { content: '二', author: UserType.HIM },
        },
      ]);

      await outbox.whenOutboxReady();

      expect(outbox.getOutboxCount()).toBe(2);
      const list = outbox.getOutbox();
      expect(list.map((e) => e.localId)).toEqual(['p1', 'p2']);
    });

    it('幂等：多次调用不会重复读取 IDB', async () => {
      const p1 = outbox.whenOutboxReady();
      const p2 = outbox.whenOutboxReady();
      await Promise.all([p1, p2]);
      const p3 = outbox.whenOutboxReady();
      await p3;
      // hydration 只触发一次 getOutboxEntries
      expect(cacheMock.getOutboxEntries).toHaveBeenCalledTimes(1);
    });
  });

  describe('enqueueWrite', () => {
    it('同步更新内存 cache，立即可被 getOutboxCount 读到', async () => {
      await outbox.whenOutboxReady();
      const before = outbox.getOutboxCount();

      const result = outbox.enqueueWrite({ content: '即时', author: UserType.HER });

      // 同步：返回值就是乐观 Memory
      expect(result.optimisticMemory.id).toBe(result.entry.localId);
      expect(result.optimisticMemory.content).toBe('即时');
      expect(result.optimisticMemory.author).toBe(UserType.HER);

      // 同步：count 立刻 +1，无需 await
      expect(outbox.getOutboxCount()).toBe(before + 1);
    });

    it('异步把条目持久化到 IDB（fire-and-forget）', async () => {
      await outbox.whenOutboxReady();
      const { entry } = outbox.enqueueWrite({ content: '持久化', author: UserType.HIM });

      // 给 fire-and-forget 一点时间落盘
      await flushMicrotasks();

      const persisted = cacheMock.__readStore();
      expect(persisted.map((e) => e.localId)).toContain(entry.localId);
      expect(cacheMock.putOutboxEntry).toHaveBeenCalledWith(entry);
    });

    it('imageUrls 数组会同时回填 imageUrl（与 saveMemory 行为一致）', async () => {
      await outbox.whenOutboxReady();
      const { optimisticMemory } = outbox.enqueueWrite({
        content: 'photo',
        author: UserType.HER,
        imageUrls: ['a.jpg', 'b.jpg'],
      });
      expect(optimisticMemory.imageUrls).toEqual(['a.jpg', 'b.jpg']);
      expect(optimisticMemory.imageUrl).toBe('a.jpg');
    });

    it('customDate 优先于入队时间作为 optimisticMemory.createdAt', async () => {
      await outbox.whenOutboxReady();
      const customDate = Date.parse('2020-08-08T00:00:00Z');
      const { optimisticMemory } = outbox.enqueueWrite({
        content: '回忆',
        author: UserType.HER,
        customDate,
      });
      expect(optimisticMemory.createdAt).toBe(customDate);
    });
  });

  describe('removeFromOutbox', () => {
    it('同步从 cache 移除并异步从 IDB 删除', async () => {
      await outbox.whenOutboxReady();
      const { entry } = outbox.enqueueWrite({ content: 'x', author: UserType.HER });
      await flushMicrotasks();

      outbox.removeFromOutbox(entry.localId);
      expect(outbox.getOutboxCount()).toBe(0);

      await flushMicrotasks();
      expect(cacheMock.deleteOutboxEntry).toHaveBeenCalledWith(entry.localId);
      expect(cacheMock.__readStore().map((e) => e.localId)).not.toContain(entry.localId);
    });
  });

  describe('drainOutbox', () => {
    const saved = (id: string): Memory => ({
      id,
      content: 'saved',
      createdAt: Date.now(),
      author: UserType.HER,
    });

    it('内部会先 await hydration，再读 cache 决定排空范围', async () => {
      cacheMock.__seedStore([
        { localId: 'q1', enqueuedAt: 1, dto: { content: '1', author: UserType.HER } },
      ]);

      // 注意：这里没主动 await whenOutboxReady，drainOutbox 应该自己等
      const saver = vi.fn(async () => saved('cloud-1'));
      const result = await outbox.drainOutbox(saver);

      expect(saver).toHaveBeenCalledTimes(1);
      expect(result.flushed).toHaveLength(1);
      expect(result.flushed[0].localId).toBe('q1');
      expect(outbox.getOutboxCount()).toBe(0);
    });

    it('成功的从 cache 和 IDB 都移除，失败的留下', async () => {
      await outbox.whenOutboxReady();
      const a = outbox.enqueueWrite({ content: 'a', author: UserType.HER });
      const b = outbox.enqueueWrite({ content: 'b', author: UserType.HIM });
      await flushMicrotasks();
      expect(outbox.getOutboxCount()).toBe(2);

      // a 成功 / b 失败
      const saver = vi.fn(async (dto) => (dto.content === 'a' ? saved('cloud-a') : null));
      const result = await outbox.drainOutbox(saver);

      expect(result.flushed.map((f) => f.localId)).toEqual([a.entry.localId]);
      expect(result.failed.map((f) => f.localId)).toEqual([b.entry.localId]);
      expect(outbox.getOutboxCount()).toBe(1);

      await flushMicrotasks();
      const persisted = cacheMock.__readStore().map((e) => e.localId);
      expect(persisted).toEqual([b.entry.localId]);
    });

    it('saver 抛错也算 failed，不会让整批中断', async () => {
      await outbox.whenOutboxReady();
      const e1 = outbox.enqueueWrite({ content: '1', author: UserType.HER });
      const e2 = outbox.enqueueWrite({ content: '2', author: UserType.HIM });
      await flushMicrotasks();

      const saver = vi.fn(async (dto) => {
        if (dto.content === '1') throw new Error('boom');
        return saved('cloud-2');
      });
      const result = await outbox.drainOutbox(saver);

      expect(result.failed.map((f) => f.localId)).toEqual([e1.entry.localId]);
      expect(result.flushed.map((f) => f.localId)).toEqual([e2.entry.localId]);
    });

    it('空队列直接返回，不调用 saver', async () => {
      await outbox.whenOutboxReady();
      const saver = vi.fn();
      const result = await outbox.drainOutbox(saver);
      expect(saver).not.toHaveBeenCalled();
      expect(result).toEqual({ flushed: [], failed: [] });
    });
  });

  describe('clearOutbox', () => {
    it('清空 cache 和 IDB store', async () => {
      await outbox.whenOutboxReady();
      outbox.enqueueWrite({ content: 'x', author: UserType.HER });
      outbox.enqueueWrite({ content: 'y', author: UserType.HIM });
      await flushMicrotasks();
      expect(outbox.getOutboxCount()).toBe(2);

      await outbox.clearOutbox();

      expect(outbox.getOutboxCount()).toBe(0);
      expect(cacheMock.clearOutboxStore).toHaveBeenCalled();
      expect(cacheMock.__readStore()).toEqual([]);
    });
  });
});
