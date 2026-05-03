import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserType, type Memory } from '../types';

const memory = (overrides: Partial<Memory> = {}): Memory => ({
  id: overrides.id ?? 'm-1',
  content: overrides.content ?? 'hello',
  createdAt: overrides.createdAt ?? 1700000000000,
  author: overrides.author ?? UserType.HER,
  ...overrides,
});

describe('cacheService - 内存缓存', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('get 返回 null 当缓存为空，set 后能读到', async () => {
    const mod = await import('./cacheService');
    expect(mod.getMemoryCache()).toBeNull();

    const items = [memory({ id: 'a' }), memory({ id: 'b' })];
    mod.setMemoryCache(items);
    expect(mod.getMemoryCache()).toEqual(items);
  });

  it('clear 后再次读取返回 null', async () => {
    const mod = await import('./cacheService');
    mod.setMemoryCache([memory()]);
    expect(mod.getMemoryCache()).not.toBeNull();
    mod.clearMemoryCache();
    expect(mod.getMemoryCache()).toBeNull();
  });

  it('版本号在每次 set 时递增', async () => {
    const mod = await import('./cacheService');
    const v0 = mod.getCacheVersion();
    mod.setMemoryCache([memory({ id: '1' })]);
    const v1 = mod.getCacheVersion();
    mod.setMemoryCache([memory({ id: '2' })]);
    const v2 = mod.getCacheVersion();
    expect(v1).toBe(v0 + 1);
    expect(v2).toBe(v1 + 1);
  });

  it('TTL 过期后仍返回缓存数据（不会丢）', async () => {
    vi.useFakeTimers();
    const mod = await import('./cacheService');
    const items = [memory()];
    mod.setMemoryCache(items);
    // 推进 6 分钟（默认 TTL 5 分钟）
    vi.advanceTimersByTime(6 * 60 * 1000);
    expect(mod.getMemoryCache()).toEqual(items);
    vi.useRealTimers();
  });
});

describe('cacheService - 更新事件', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('subscribe 注册的回调能收到 notifyCacheUpdate', async () => {
    const mod = await import('./cacheService');
    const spy = vi.fn();
    const unsubscribe = mod.subscribeToCacheUpdates(spy);

    const items = [memory({ id: 'x' })];
    mod.notifyCacheUpdate(items);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(items);

    unsubscribe();
    mod.notifyCacheUpdate([]);
    expect(spy).toHaveBeenCalledTimes(1); // 解绑后不再触发
  });

  it('某个监听器抛错不影响其他监听器', async () => {
    const mod = await import('./cacheService');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const ok = vi.fn();
    mod.subscribeToCacheUpdates(() => {
      throw new Error('boom');
    });
    mod.subscribeToCacheUpdates(ok);

    mod.notifyCacheUpdate([memory()]);
    expect(ok).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});

describe('cacheService - IndexedDB 异常路径', () => {
  let originalIDB: unknown;

  beforeEach(() => {
    vi.resetModules();
    originalIDB = (globalThis as Record<string, unknown>).indexedDB;
    // 模拟 Safari 私密浏览：indexedDB 缺失
    (globalThis as Record<string, unknown>).indexedDB = undefined;
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>).indexedDB = originalIDB;
  });

  it('IndexedDB 不可用时 getIndexedDBMemories 返回 null 而不是抛错', async () => {
    const mod = await import('./cacheService');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const result = await mod.getIndexedDBMemories();
    expect(result).toBeNull();
    errorSpy.mockRestore();
  });

  it('IndexedDB 不可用时 setIndexedDBMemories 也不会抛错', async () => {
    const mod = await import('./cacheService');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(mod.setIndexedDBMemories([memory()])).resolves.toBeUndefined();
    errorSpy.mockRestore();
  });
});
