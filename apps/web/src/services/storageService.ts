/**
 * 存储服务
 *
 * 统一处理共享记忆日记的数据持久化。当前云端后端为 Cloudflare Worker + D1 + R2，
 * 本地仍保留内存缓存和 IndexedDB 兜底，维持原来的 cache-first 使用体验。
 */

import { Memory, UserType, CreateMemoryDTO } from '../types';
import { createMemory, deleteMemoryRow, listMemories, updateMemoryRow } from './cloudflareClient';
import { deleteImage, extractStoragePathFromUrl, compressImage, compressImageToBlob, fileToBase64, uploadImage, uploadImages } from './imageStorageService';
import { scheduleImagePreload, schedulePriorityPreload } from './imagePreloadService';
import { areMemoriesEqual, createMemoryInsertPayload, createMemoryUpdatePayload, getMemoriesImageUrls, getMemoryImageUrls, insertMemorySorted, mapRowToMemory } from './memoryMapper';
import {
  getMemoryCache,
  setMemoryCache,
  getIndexedDBMemories,
  setIndexedDBMemories,
  addToIndexedDB,
  removeFromIndexedDB,
  updateInIndexedDB,
  notifyCacheUpdate,
} from './cacheService';

export { deleteImage, extractStoragePathFromUrl, compressImage, compressImageToBlob, fileToBase64, uploadImage, uploadImages };

// ==========================================
// Cloudflare polling sync
// ==========================================

let pollingTimer: ReturnType<typeof setInterval> | null = null;
let isPollingSubscribed = false;
const POLLING_INTERVAL = 10_000;

const applyCloudMemories = async (cloudMemories: Memory[]): Promise<void> => {
  const cachedMemories = getMemoryCache();
  const hasChanges = !areMemoriesEqual(cachedMemories, cloudMemories);
  if (!hasChanges) return;

  const oldImages = new Set(getMemoriesImageUrls(cachedMemories || []));
  const newImages = getMemoriesImageUrls(cloudMemories).filter(url => !oldImages.has(url));

  setMemoryCache(cloudMemories);
  await setIndexedDBMemories(cloudMemories);
  notifyCacheUpdate(cloudMemories);

  if (newImages.length > 0) {
    schedulePriorityPreload(newImages, 'high');
  }
};

export const subscribeToMemoryChanges = (): void => {
  if (isPollingSubscribed) return;
  isPollingSubscribed = true;

  const poll = async () => {
    try {
      const rows = await listMemories();
      await applyCloudMemories(rows.map(mapRowToMemory));
    } catch (error) {
      console.warn('Cloudflare memory polling failed:', error);
    }
  };

  pollingTimer = setInterval(poll, POLLING_INTERVAL);
  void poll();
};

export const unsubscribeFromMemoryChanges = (): void => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
  isPollingSubscribed = false;
};

// ==========================================
// 本地存储回退
// ==========================================

const getLocalMemoriesAsync = async (): Promise<Memory[]> => {
  return getMemoryCache() ?? (await getIndexedDBMemories()) ?? [];
};

/**
 * 获取所有记忆。Cache-first：内存 → IndexedDB → Cloudflare；缓存命中后后台静默同步。
 */
export const getMemories = async (): Promise<Memory[]> => {
  const memoryFromCache = getMemoryCache();
  if (memoryFromCache && memoryFromCache.length > 0) {
    syncFromCloudInBackground();
    return memoryFromCache;
  }

  const indexedDBCached = await getIndexedDBMemories();
  if (indexedDBCached && indexedDBCached.length > 0) {
    setMemoryCache(indexedDBCached);
    scheduleImagePreload(getMemoriesImageUrls(indexedDBCached));
    syncFromCloudInBackground();
    return indexedDBCached;
  }

  try {
    const memories = (await listMemories()).map(mapRowToMemory);
    setMemoryCache(memories);
    await setIndexedDBMemories(memories);
    scheduleImagePreload(getMemoriesImageUrls(memories));
    return memories;
  } catch (e) {
    console.error('Failed to load memories from Cloudflare', e);
    return [];
  }
};

let isSyncing = false;
const MIN_SYNC_INTERVAL = 12_000;
let lastSyncStartAt = 0;

const syncFromCloudInBackground = async (): Promise<void> => {
  if (isSyncing) return;
  const now = Date.now();
  if (now - lastSyncStartAt < MIN_SYNC_INTERVAL) return;

  lastSyncStartAt = now;
  isSyncing = true;

  try {
    const cloudMemories = (await listMemories()).map(mapRowToMemory);
    await applyCloudMemories(cloudMemories);
  } catch (e) {
    console.warn('Background sync error:', e);
  } finally {
    isSyncing = false;
  }
};

export const saveMemory = async (dto: CreateMemoryDTO): Promise<Memory | null> => {
  const effectiveTimestamp = dto.customDate ?? Date.now();
  const newEntryBase = createMemoryInsertPayload(dto, effectiveTimestamp);

  try {
    const newMemory = mapRowToMemory(await createMemory(newEntryBase));
    const cachedMemories = getMemoryCache() || [];
    const updatedMemories = insertMemorySorted(cachedMemories, newMemory);
    setMemoryCache(updatedMemories);
    await addToIndexedDB(newMemory);
    return newMemory;
  } catch (e) {
    console.error('Failed to save memory to Cloudflare; using IndexedDB fallback', e);
    const newMemory: Memory = {
      id: crypto.randomUUID(),
      content: dto.content,
      createdAt: effectiveTimestamp,
      author: dto.author,
      imageUrl: dto.imageUrl || (dto.imageUrls?.[0]),
      imageUrls: dto.imageUrls || (dto.imageUrl ? [dto.imageUrl] : undefined),
    };
    const current = await getLocalMemoriesAsync();
    const updatedMemories = insertMemorySorted(current, newMemory);
    setMemoryCache(updatedMemories);
    await addToIndexedDB(newMemory);
    return newMemory;
  }
};

export const updateMemory = async (id: string, content: string, imageUrls?: string[] | null): Promise<Memory | null> => {
  const current = await getLocalMemoriesAsync();
  const existing = current.find(m => m.id === id);

  try {
    const updatedMemory = mapRowToMemory(await updateMemoryRow(id, createMemoryUpdatePayload(content, imageUrls)));
    const cachedMemories = getMemoryCache() || [];
    const updatedMemories = cachedMemories.map(m => m.id === id ? updatedMemory : m);
    setMemoryCache(updatedMemories);
    await updateInIndexedDB(updatedMemory);

    const removedUrls = existing
      ? getMemoryImageUrls(existing).filter(url => !getMemoryImageUrls(updatedMemory).includes(url))
      : [];
    await Promise.all(removedUrls.map(url => deleteImage(url)));

    return updatedMemory;
  } catch (e) {
    console.error('Failed to update memory in Cloudflare; updating local cache only', e);
    const index = current.findIndex(m => m.id === id);
    if (index === -1) return null;

    const next = current.slice();
    next[index] = { ...next[index], content };
    if (imageUrls === null) {
      delete next[index].imageUrl;
      delete next[index].imageUrls;
    } else if (imageUrls !== undefined) {
      next[index].imageUrls = imageUrls;
      next[index].imageUrl = imageUrls[0];
    }

    setMemoryCache(next);
    await updateInIndexedDB(next[index]);
    return next[index];
  }
};

export const deleteMemory = async (id: string): Promise<boolean> => {
  const current = await getLocalMemoriesAsync();
  const existing = current.find(m => m.id === id);

  try {
    await deleteMemoryRow(id);
  } catch (e) {
    console.error('Failed to delete memory from Cloudflare; removing local cache only', e);
  }

  const cachedMemories = getMemoryCache() || (await getLocalMemoriesAsync());
  const updatedMemories = cachedMemories.filter(m => m.id !== id);
  setMemoryCache(updatedMemories);
  await removeFromIndexedDB(id);

  if (existing) {
    await Promise.all(getMemoryImageUrls(existing).map(url => deleteImage(url)));
  }

  return true;
};

export const seedDataIfEmpty = async () => {
  try {
    const memories = await listMemories();
    if (memories.length > 0) return;

    const sampleData = [
      createMemoryInsertPayload({ content: '欢迎来到 Us！这是我们在 Cloudflare 上的第一条共同记忆。', author: UserType.HER }, Date.now()),
      createMemoryInsertPayload({ content: '开始记录我们点点滴滴的旅程吧。', author: UserType.HIM }, Date.now() + 1),
    ];

    const created = await Promise.all(sampleData.map(createMemory));
    const mapped = created.map(mapRowToMemory);
    setMemoryCache(mapped);
    await setIndexedDBMemories(mapped);
  } catch (e) {
    console.error('Auto-seed failed', e);
  }
};
