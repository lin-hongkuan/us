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

// 用一个简单的内存版 cacheService 替代 IndexedDB 相关副作用
vi.mock('./cacheService', () => {
  const state: { items: Memory[] | null; version: number } = { items: null, version: 0 };
  const listeners = new Set<(memories: Memory[]) => void>();

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
    getIndexedDBMemories: vi.fn(async () => null),
    setIndexedDBMemories: vi.fn(async () => undefined),
    addToIndexedDB: vi.fn(async () => undefined),
    removeFromIndexedDB: vi.fn(async () => undefined),
    updateInIndexedDB: vi.fn(async () => undefined),
    notifyCacheUpdate: vi.fn((m: Memory[]) => listeners.forEach((cb) => cb(m))),
    subscribeToCacheUpdates: vi.fn((cb: (m: Memory[]) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }),
    __reset: () => {
      state.items = null;
      state.version = 0;
      listeners.clear();
    },
  };
});

const LOCAL_STORAGE_KEY = 'us_app_memories';

/**
 * Node 22 / Vitest 4 的 jsdom 环境里，原生 localStorage 可能是只读 stub
 * （依赖 --localstorage-file），导致 setItem/clear 报错。
 * 这里直接用 Map 做一个最小内存实现覆盖到 window/globalThis。
 */
const installInMemoryLocalStorage = () => {
  const store = new Map<string, string>();
  const stub: Storage = {
    get length() { return store.size; },
    clear: () => { store.clear(); },
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => { store.delete(key); },
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: stub });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: stub });
  }
};

const seedLocalMemories = (items: Memory[]) => {
  globalThis.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
};

const readLocalMemories = (): Memory[] => {
  const raw = globalThis.localStorage.getItem(LOCAL_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const sample = (overrides: Partial<Memory> = {}): Memory => ({
  id: overrides.id ?? `m-${Math.random().toString(36).slice(2, 8)}`,
  content: overrides.content ?? 'a memory',
  createdAt: overrides.createdAt ?? Date.parse('2025-06-01T00:00:00Z'),
  author: overrides.author ?? UserType.HER,
  ...overrides,
});

describe('storageService (无 supabase 时的本地回退路径)', () => {
  let storage: typeof import('./storageService');
  let cacheMock: typeof import('./cacheService') & { __reset: () => void };

  beforeEach(async () => {
    installInMemoryLocalStorage();
    vi.resetModules();
    cacheMock = (await import('./cacheService')) as typeof cacheMock;
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
    it('localStorage 为空时返回空数组', async () => {
      const result = await storage.getMemories();
      expect(result).toEqual([]);
    });

    it('能读到 localStorage 里的现有记忆，并写入内存缓存', async () => {
      const seeded = [sample({ id: 'a' }), sample({ id: 'b' })];
      seedLocalMemories(seeded);

      const result = await storage.getMemories();
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.id).sort()).toEqual(['a', 'b']);
      expect(cacheMock.setMemoryCache).toHaveBeenCalled();
    });
  });

  describe('saveMemory', () => {
    it('生成 id + 时间戳，按 createdAt 降序插入并写回 localStorage', async () => {
      seedLocalMemories([sample({ id: 'old', createdAt: Date.parse('2024-01-01T00:00:00Z') })]);

      const dto: CreateMemoryDTO = { content: '今天好开心', author: UserType.HIM };
      const created = await storage.saveMemory(dto);

      expect(created).not.toBeNull();
      expect(created?.id).toBeTruthy();
      expect(created?.author).toBe(UserType.HIM);

      const local = readLocalMemories();
      expect(local).toHaveLength(2);
      // 新条目应排在最前（createdAt 比 old 大）
      expect(local[0].id).toBe(created?.id);
      expect(local[1].id).toBe('old');
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
    it('能更新内容并写回 localStorage，缓存也同步刷新', async () => {
      const target = sample({ id: 'edit-me', content: '旧的' });
      seedLocalMemories([target]);

      const updated = await storage.updateMemory('edit-me', '新的内容');
      expect(updated?.content).toBe('新的内容');
      const local = readLocalMemories();
      expect(local[0].content).toBe('新的内容');
      expect(cacheMock.updateInIndexedDB).toHaveBeenCalled();
    });

    it('imageUrls 传 null 会同时清掉 imageUrl 和 imageUrls', async () => {
      seedLocalMemories([sample({ id: 'img', imageUrl: 'a.jpg', imageUrls: ['a.jpg', 'b.jpg'] })]);
      const updated = await storage.updateMemory('img', '保留文字', null);
      expect(updated?.imageUrl).toBeUndefined();
      expect(updated?.imageUrls).toBeUndefined();

      const local = readLocalMemories();
      expect(local[0].imageUrl).toBeUndefined();
      expect(local[0].imageUrls).toBeUndefined();
    });

    it('id 不存在时返回 null', async () => {
      seedLocalMemories([sample({ id: 'a' })]);
      const result = await storage.updateMemory('not-exist', 'x');
      expect(result).toBeNull();
    });
  });

  describe('deleteMemory', () => {
    it('从 localStorage 中移除目标条目', async () => {
      seedLocalMemories([sample({ id: 'a' }), sample({ id: 'b' })]);
      const ok = await storage.deleteMemory('a');
      expect(ok).toBe(true);

      const local = readLocalMemories();
      expect(local.map((m) => m.id)).toEqual(['b']);
      expect(cacheMock.removeFromIndexedDB).toHaveBeenCalledWith('a');
    });

    it('删除不存在的 id 也安全返回 true（已经不存在）', async () => {
      seedLocalMemories([sample({ id: 'a' })]);
      const ok = await storage.deleteMemory('ghost');
      expect(ok).toBe(true);
      expect(readLocalMemories()).toHaveLength(1);
    });
  });
});
