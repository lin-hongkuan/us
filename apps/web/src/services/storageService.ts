/**
 * ==========================================
 * 存储服务
 * ==========================================
 *
 * 此服务处理共享记忆日记的所有数据持久化。
 * 它提供统一的接口来存储和检索记忆，
 * 自动从Supabase（云端）回退到localStorage（本地）。
 *
 * 功能特性：
 * - 通过Supabase进行云存储，并以localStorage作为本地回退
 * - 图片上传和压缩工具
 * - 记忆CRUD操作（创建、读取、更新、删除）
 * - 演示用途的自动数据种子填充
 * - 数据库和应用模型之间的类型安全数据映射
 * - 【优化】三层缓存策略：内存 > IndexedDB > 云端
 * - 【优化】Cache-First 加载策略，毫秒级响应
 * - 【优化】Supabase Realtime 实时订阅，自动同步数据变化
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { Memory, UserType, CreateMemoryDTO } from '../types';
import { supabase } from './supabaseClient';
import { deleteImage, extractStoragePathFromUrl, compressImage, compressImageToBlob, fileToBase64, uploadImage } from './imageStorageService';
import { scheduleImagePreload } from './imagePreloadService';
import { areMemoriesEqual, createMemoryInsertPayload, createMemoryUpdatePayload, getMemoriesImageUrls, getMemoryImageUrls, insertMemorySorted, mapRowToMemory, type MemoryRow } from './memoryMapper';
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

export { deleteImage, extractStoragePathFromUrl, compressImage, compressImageToBlob, fileToBase64, uploadImage };

// ==========================================
// Realtime 实时订阅
// ==========================================

let realtimeChannel: RealtimeChannel | null = null;
let isRealtimeSubscribed = false;

const getRealtimeBaseMemories = async (): Promise<Memory[]> => {
  const inMemory = getMemoryCache();
  if (inMemory) return inMemory;
  return (await getIndexedDBMemories()) || [];
};

/** 将新记忆按 createdAt 降序插入到已排序列表中 */
/**
 * 订阅记忆表的实时变化
 * 当其他用户添加、修改、删除记忆时，自动同步到本地
 */
export const subscribeToMemoryChanges = (): void => {
  if (!supabase || isRealtimeSubscribed) return;
  
  isRealtimeSubscribed = true;
  
  // 如果已存在channel先清理，防范并发调用遗留
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }
  
  realtimeChannel = supabase
    .channel('memories-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // 监听所有变化：INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'memories'
      },
      async (payload) => {
        console.log('Realtime update received:', payload.eventType);

        const cachedMemories = await getRealtimeBaseMemories();
        let updatedMemories: Memory[];
        
        switch (payload.eventType) {
          case 'INSERT': {
            const newMemory = mapRowToMemory(payload.new as MemoryRow);
            // 检查是否已存在（可能是自己刚添加的）
            const exists = cachedMemories.some(m => m.id === newMemory.id);
            if (!exists) {
              updatedMemories = insertMemorySorted(cachedMemories, newMemory);
              setMemoryCache(updatedMemories);
              await addToIndexedDB(newMemory);
              notifyCacheUpdate(updatedMemories);
              // 预加载新图片
              if (newMemory.imageUrls?.length || newMemory.imageUrl) {
                scheduleImagePreload(getMemoryImageUrls(newMemory));
              }
            }
            break;
          }
          
          case 'UPDATE': {
            const updatedMemory = mapRowToMemory(payload.new as MemoryRow);
            updatedMemories = cachedMemories.map(m => 
              m.id === updatedMemory.id ? updatedMemory : m
            );
            setMemoryCache(updatedMemories);
            await updateInIndexedDB(updatedMemory);
            notifyCacheUpdate(updatedMemories);
            break;
          }
          
          case 'DELETE': {
            const deletedId = payload.old?.id;
            if (deletedId) {
              updatedMemories = cachedMemories.filter(m => m.id !== deletedId);
              setMemoryCache(updatedMemories);
              await removeFromIndexedDB(deletedId);
              notifyCacheUpdate(updatedMemories);
            }
            break;
          }
        }
      }
    )
    .subscribe((status) => {
      console.log('Realtime subscription status:', status);
      if (status === 'CHANNEL_ERROR') {
        console.error('Failed to subscribe to realtime changes');
        isRealtimeSubscribed = false;
      }
    });
};

/**
 * 取消实时订阅
 */
export const unsubscribeFromMemoryChanges = (): void => {
  if (realtimeChannel && supabase) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
    isRealtimeSubscribed = false;
  }
};

// ==========================================
// 本地存储回退
// ==========================================

/** 当Supabase不可用时，用于存储记忆的本地存储键 */
const LOCAL_STORAGE_KEY = 'us_app_memories';

/**
 * 从localStorage检索记忆
 * 当Supabase未配置或不可用时用作回退
 */
const getLocalMemories = (): Memory[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

/**
 * 获取所有记忆
 * 【优化】Cache-First 策略：
 * 1. 优先返回内存缓存（毫秒级）
 * 2. 其次返回 IndexedDB 缓存（10ms级）
 * 3. 后台静默从云端同步最新数据
 *
 * @returns Promise解析为记忆数组
 */
export const getMemories = async (): Promise<Memory[]> => {
  // 1. 尝试从内存缓存获取（最快）
  const memoryFromCache = getMemoryCache();
  if (memoryFromCache && memoryFromCache.length > 0) {
    // 后台静默同步云端数据
    syncFromCloudInBackground();
    return memoryFromCache;
  }

  // 2. 尝试从 IndexedDB 获取（次快）
  const indexedDBCached = await getIndexedDBMemories();
  if (indexedDBCached && indexedDBCached.length > 0) {
    // 更新内存缓存
    setMemoryCache(indexedDBCached);
    // 预加载图片
    scheduleImagePreload(getMemoriesImageUrls(indexedDBCached));
    // 后台静默同步云端数据
    syncFromCloudInBackground();
    return indexedDBCached;
  }

  // 3. Fallback to Local Storage if Supabase is not configured
  if (!supabase) {
    console.warn("Supabase not configured. Using Local Storage.");
    const localMemories = getLocalMemories();
    if (localMemories.length > 0) {
      setMemoryCache(localMemories);
      await setIndexedDBMemories(localMemories);
    }
    return localMemories;
  }

  // 4. 从云端获取（首次加载或缓存为空）
  try {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const memories = (data || []).map(mapRowToMemory);
    
    // 更新所有缓存层
    setMemoryCache(memories);
    await setIndexedDBMemories(memories);
    
    // 预加载图片
    scheduleImagePreload(getMemoriesImageUrls(memories));
    
    return memories;
  } catch (e) {
    console.error("Failed to load memories from cloud", e);
    return [];
  }
};

/**
 * 后台静默同步云端数据
 * 不阻塞 UI，同步完成后通过事件通知更新
 */
let isSyncing = false;
const SYNC_TIMEOUT = 3000; // 3秒超时
const MIN_SYNC_INTERVAL = 12_000;
let lastSyncStartAt = 0;

const syncFromCloudInBackground = async (): Promise<void> => {
  if (!supabase || isSyncing) return;
  const now = Date.now();
  if (now - lastSyncStartAt < MIN_SYNC_INTERVAL) return;

  lastSyncStartAt = now;
  isSyncing = true;
  
  try {
    // 使用 AbortController 实现超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SYNC_TIMEOUT);
    
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false })
      .abortSignal(controller.signal);
    
    clearTimeout(timeoutId);
    
    if (error) {
      // 检查是否是超时取消的请求
      if ((error as any).name !== 'AbortError' && error.message !== 'AbortError') {
        console.warn('Background sync failed:', error);
      }
      return;
    }
    
    const cloudMemories = (data || []).map(mapRowToMemory);
    const cachedMemories = getMemoryCache();
    
    // 【改进】使用深度比较检测数据变化
    const hasChanges = !areMemoriesEqual(cachedMemories, cloudMemories);
    
    if (hasChanges) {
      // 更新缓存
      setMemoryCache(cloudMemories);
      await setIndexedDBMemories(cloudMemories);
      
      // 触发 UI 更新事件
      notifyCacheUpdate(cloudMemories);
      
      // 预加载新图片
      scheduleImagePreload(getMemoriesImageUrls(cloudMemories));
    }
  } catch (e) {
    // 静默失败，不影响用户体验
    console.warn('Background sync error:', e);
  } finally {
    isSyncing = false;
  }
};

/**
 * 保存新记忆
 * 创建新的记忆条目并保存到Supabase或localStorage
 * 【优化】同时更新所有缓存层
 *
 * @param dto - 创建记忆的数据传输对象
 * @returns Promise解析为创建的记忆或失败时为null
 */
export const saveMemory = async (dto: CreateMemoryDTO): Promise<Memory | null> => {
  const effectiveTimestamp = dto.customDate || Date.now();
  const newEntryBase = createMemoryInsertPayload(dto, effectiveTimestamp);

  // Fallback to Local Storage
  if (!supabase) {
    const newMemory: Memory = {
      id: crypto.randomUUID(),
      content: dto.content,
      createdAt: effectiveTimestamp,
      author: dto.author,
      imageUrl: dto.imageUrl || (dto.imageUrls?.[0]),
      imageUrls: dto.imageUrls || (dto.imageUrl ? [dto.imageUrl] : undefined)
    };
    const current = getLocalMemories();
    const updatedMemories = insertMemorySorted(current, newMemory);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedMemories));
    setMemoryCache(updatedMemories);
    await addToIndexedDB(newMemory);
    
    return newMemory;
  }

  try {
    const { data, error } = await supabase
      .from('memories')
      .insert([newEntryBase])
      .select()
      .single();

    if (error) throw error;
    
    const newMemory = mapRowToMemory(data);
    
    // 【优化】更新缓存
    const cachedMemories = getMemoryCache() || [];
    const updatedMemories = insertMemorySorted(cachedMemories, newMemory);
    setMemoryCache(updatedMemories);
    await addToIndexedDB(newMemory);
    
    return newMemory;
  } catch (e) {
    console.error("Failed to save memory to cloud", e);
    return null;
  }
};

/**
 * 更新现有记忆
 * 修改记忆内容和/或图片
 * 【优化】同时更新所有缓存层
 *
 * @param id - 要更新的记忆ID
 * @param content - 新内容
 * @param imageUrls - 新图片URL数组（可选，null表示删除图片）
 * @returns Promise解析为更新后的记忆或失败时为null
 */
export const updateMemory = async (id: string, content: string, imageUrls?: string[] | null): Promise<Memory | null> => {
  // Fallback to Local Storage
  if (!supabase) {
    const current = getLocalMemories();
    const index = current.findIndex(m => m.id === id);
    if (index !== -1) {
      current[index].content = content;
      // Update imageUrls - if null, remove it; if undefined, keep existing
      if (imageUrls === null) {
        delete current[index].imageUrl;
        delete current[index].imageUrls;
      } else if (imageUrls !== undefined) {
        current[index].imageUrls = imageUrls;
        current[index].imageUrl = imageUrls[0];
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
      
      // 【优化】更新缓存
      setMemoryCache(current);
      await updateInIndexedDB(current[index]);
      
      return current[index];
    }
    return null;
  }

  try {
    const updateData = createMemoryUpdatePayload(content, imageUrls);

    const { data, error } = await supabase
      .from('memories')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.warn("Update returned 0 rows. Possible RLS issue.");
      return null;
    }

    const updatedMemory = mapRowToMemory(data[0]);
    
    // 【优化】更新缓存
    const cachedMemories = getMemoryCache() || [];
    const updatedMemories = cachedMemories.map(m => m.id === id ? updatedMemory : m);
    setMemoryCache(updatedMemories);
    await updateInIndexedDB(updatedMemory);
    
    return updatedMemory;
  } catch (e) {
    console.error("Failed to update memory", e);
    return null;
  }
};

/**
 * 删除记忆
 * 从Supabase或localStorage中删除指定的记忆
 * 【优化】同时更新所有缓存层
 *
 * @param id - 要删除的记忆ID
 * @returns Promise解析为成功布尔值
 */
export const deleteMemory = async (id: string): Promise<boolean> => {
  // Fallback to Local Storage
  if (!supabase) {
    const current = getLocalMemories();
    const updated = current.filter(m => m.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    
    // 【优化】更新缓存
    setMemoryCache(updated);
    await removeFromIndexedDB(id);
    
    return true;
  }

  try {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // 【优化】更新缓存
    const cachedMemories = getMemoryCache() || [];
    const updatedMemories = cachedMemories.filter(m => m.id !== id);
    setMemoryCache(updatedMemories);
    await removeFromIndexedDB(id);
    
    return true;
  } catch (e) {
    console.error("Failed to delete memory", e);
    return false;
  }
};

/**
 * 如果数据为空则填充种子数据
 * 为演示目的自动添加初始记忆数据
 */
export const seedDataIfEmpty = async () => {
  if (!supabase) {
     if (!localStorage.getItem(LOCAL_STORAGE_KEY)) {
        const initialData: Memory[] = [
          {
            id: '1',
            content: "Welcome to Us. This is a local demo memory because Supabase keys are not configured yet.",
            createdAt: Date.now(),
            author: UserType.HER
          }
        ];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialData));
     }
  } else {
    try {
      const { count, error } = await supabase.from('memories').select('*', { count: 'exact', head: true });
      
      if (!error && count === 0) {
        const sampleData = [
          {
            content: "欢迎来到 Us！这是我们在云端的第一条共同记忆。",
            author: UserType.HER,
          },
          {
            content: "开始记录我们点点滴滴的旅程吧。",
            author: UserType.HIM,
          }
        ];
        await supabase.from('memories').insert(sampleData);
      }
    } catch (e) {
      console.error("Auto-seed failed", e);
    }
  }
};
