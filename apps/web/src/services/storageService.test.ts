import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserType, type Memory, type CreateMemoryDTO } from '../types';

// 让 supabase 客户端为 null，强制走本地 fallback 分支（最稳定的可测路径）
vi.mock('./supabaseClient', () => ({ supabase: null }));

// imageStorageService / imagePreloadService 在 fallback 路径不会被实际调用，但导入时会被求值，提供轻量 stub
vi.mock('./imageStorageService', () => ({
  deleteImage: vi.fn(),
  extractStoragePathFromUrl: vi.fn(),
  compressImage: vi.fn(),
  compressImageToBlob: vi.fn(),
  fileToBase64: vi.fn(),
  uploadImage: vi.fn(),
}));
vi.mock('./imagePreloadService', () => ({
  scheduleImagePreload: vi.fn(),
}));

// 用一个简单的内存版 cacheService 替代真实 IndexedDB 副作用。
// 与之前不同的是：getIndexedDBMemories / addToIndexedDB / removeFromIndexedDB / updateInIndexedDB
// 这次实现成"真的会读写共享 idb 状态"，因为 storageService 在无 Supabase 路径下完全依赖它们做持久化。
vi.mock('./cacheService', () => {
  const state: { items: Memory[] | null; version: number; idb: Map<string, Memory> } = {
    items: null,
    version: 0,
    idb: new Map(),
  };
  const listeners = new Set<(memories: Memory[]) => void>();

  const idbAsArray = (): Memory[] =>
    Array.from(state.idb.values()).sort((a, b) => b.createdAt - a.createdAt);

  return {
    getMemoryCache: vi.fn(() => state.items),
    setMemoryCache: vi.fn((m: Memory[]) => {
      state.items = m;
      state.version += 1;
    }),
    clearMemoryCache: vi.fn(() => {
      state.items = null;
    }),
    getCacheVersion: vi.fn(() => state.version),
    getIndexedDBMemories: vi.fn(async () => {
      if (state.idb.size === 0) return null;
      return idbAsArray();
    }),
    setIndexedDBMemories: vi.fn(async (memories: Memory[]) => {
      state.idb.clear();
      for (const m of memories) state.idb.set(m.id, m);
    }),
    addToIndexedDB: vi.fn(async (memory: Memory) => {
      state.idb.set(memory.id, memory);
    }),
    removeFromIndexedDB: vi.fn(async (id: string) => {
      state.idb.delete(id);
    }),
    updateInIndexedDB: vi.fn(async (memory: Memory) => {
      state.idb.set(memory.id, memory);
    }),
    notifyCacheUpdate: vi.fn((m: Memory[]) => listeners.forEach((cb) => cb(m))),
    subscribeToCacheUpdates: vi.fn((cb: (m: Memory[]) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }),
    __reset: () => {
      state.items = null;
      state.version = 0;
      state.idb.clear();
      listeners.clear();
    },
    __readIdb: () => idbAsArray(),
    __seedIdb: (items: Memory[]) => {
      state.idb.clear();
      for (const m of items) state.idb.set(m.id, m);
    },
  };
});

const sample = (overrides: Partial<Memory> = {}): Memory => ({
  id: overrides.id ?? `m-${Math.random().toString(36).slice(2, 8)}`,
  content: overrides.content ?? 'a memory',
  createdAt: overrides.createdAt ?? Date.parse('2025-06-01T00:00:00Z'),
  author: overrides.author ?? UserType.HER,
  ...overrides,
});

describe('storageService (无 supabase 时的本地回退路径，使用 IndexedDB)', () => {
  let storage: typeof import('./storageService');
  // 给 mock 加上 __readIdb / __seedIdb 钩子，方便用例直接读写底层"IDB"状态
  type CacheMock = typeof import('./cacheService') & {
    __reset: () => void;
    __readIdb: () => Memory[];
    __seedIdb: (items: Memory[]) => void;
  };
  let cacheMock: CacheMock;

  beforeEach(async () => {
    vi.resetModules();
    cacheMock = (await import('./cacheService')) as CacheMock;
    cacheMock.__reset();
    storage = await import('./storageService');
    // 提供一个稳定的 randomUUID（jsdom 环境下可能没有）
    if (!('randomUUID' in crypto)) {
      Object.defineProperty(crypto, 'randomUUID', {
        configurable: true,
        value: () => `uuid-${Math.random().toString(36).slice(2, 10)}`,
      });
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMemories', () => {
    it('IndexedDB 为空时返回空数组', async () => {
      const result = await storage.getMemories();
      expect(result).toEqual([]);
    });

    it('能读到 IndexedDB 里的现有记忆，并写入内存缓存', async () => {
      const seeded = [sample({ id: 'a' }), sample({ id: 'b' })];
      cacheMock.__seedIdb(seeded);

      const result = await storage.getMemories();
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.id).sort()).toEqual(['a', 'b']);
      expect(cacheMock.setMemoryCache).toHaveBeenCalled();
    });
  });

  describe('saveMemory', () => {
    it('生成 id + 时间戳，按 createdAt 降序插入并写回 IndexedDB', async () => {
      cacheMock.__seedIdb([sample({ id: 'old', createdAt: Date.parse('2024-01-01T00:00:00Z') })]);

      const dto: CreateMemoryDTO = { content: '今天好开心', author: UserType.HIM };
      const created = await storage.saveMemory(dto);

      expect(created).not.toBeNull();
      expect(created?.id).toBeTruthy();
      expect(created?.author).toBe(UserType.HIM);

      const idb = cacheMock.__readIdb();
      expect(idb).toHaveLength(2);
      // 新条目应排在最前（createdAt 比 old 大）
      expect(idb[0].id).toBe(created?.id);
      expect(idb[1].id).toBe('old');
      expect(cacheMock.addToIndexedDB).toHaveBeenCalled();
    });

    it('customDate 优先于 Date.now() 作为 createdAt', async () => {
      const customDate = Date.parse('2020-08-08T00:00:00Z');
      const created = await storage.saveMemory({
        content: '时光机',
        author: UserType.HER,
        customDate,
      });
      expect(created?.createdAt).toBe(customDate);
    });

    it('imageUrls 数组会同时回填 imageUrl（向后兼容）', async () => {
      const created = await storage.saveMemory({
        content: 'photo',
        author: UserType.HER,
        imageUrls: ['a.jpg', 'b.jpg'],
      });
      expect(created?.imageUrls).toEqual(['a.jpg', 'b.jpg']);
      expect(created?.imageUrl).toBe('a.jpg');
    });
  });

  describe('updateMemory', () => {
    it('能更新内容并写回 IndexedDB，缓存也同步刷新', async () => {
      const target = sample({ id: 'edit-me', content: '旧的' });
      cacheMock.__seedIdb([target]);

      const updated = await storage.updateMemory('edit-me', '新的内容');
      expect(updated?.content).toBe('新的内容');
      const idb = cacheMock.__readIdb();
      expect(idb[0].content).toBe('新的内容');
      expect(cacheMock.updateInIndexedDB).toHaveBeenCalled();
    });

    it('imageUrls 传 null 会同时清掉 imageUrl 和 imageUrls', async () => {
      cacheMock.__seedIdb([sample({ id: 'img', imageUrl: 'a.jpg', imageUrls: ['a.jpg', 'b.jpg'] })]);
      const updated = await storage.updateMemory('img', '保留文字', null);
      expect(updated?.imageUrl).toBeUndefined();
      expect(updated?.imageUrls).toBeUndefined();

      const idb = cacheMock.__readIdb();
      expect(idb[0].imageUrl).toBeUndefined();
      expect(idb[0].imageUrls).toBeUndefined();
    });

    it('id 不存在时返回 null', async () => {
      cacheMock.__seedIdb([sample({ id: 'a' })]);
      const result = await storage.updateMemory('not-exist', 'x');
      expect(result).toBeNull();
    });
  });

  describe('deleteMemory', () => {
    it('从 IndexedDB 中移除目标条目', async () => {
      cacheMock.__seedIdb([sample({ id: 'a' }), sample({ id: 'b' })]);
      const ok = await storage.deleteMemory('a');
      expect(ok).toBe(true);

      const idb = cacheMock.__readIdb();
      expect(idb.map((m) => m.id)).toEqual(['b']);
      expect(cacheMock.removeFromIndexedDB).toHaveBeenCalledWith('a');
    });

    it('删除不存在的 id 也安全返回 true（已经不存在）', async () => {
      cacheMock.__seedIdb([sample({ id: 'a' })]);
      const ok = await storage.deleteMemory('ghost');
      expect(ok).toBe(true);
      expect(cacheMock.__readIdb()).toHaveLength(1);
    });
  });
});
