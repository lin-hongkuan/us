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

import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Memory, UserType, CreateMemoryDTO } from '../types';
import {
  getMemoryCache,
  setMemoryCache,
  clearMemoryCache,
  getIndexedDBMemories,
  setIndexedDBMemories,
  addToIndexedDB,
  removeFromIndexedDB,
  updateInIndexedDB,
  notifyCacheUpdate,
  preloadImages,
} from './cacheService';

// ==========================================
// SUPABASE配置
// ==========================================

/** Supabase项目URL - 请替换为您的实际Supabase URL */
const SUPABASE_URL: string = 'https://uiczraluplwdupdigkar.supabase.co';

/** Supabase匿名密钥 - 请替换为您的实际Supabase密钥 */
const SUPABASE_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pyYWx1cGx3ZHVwZGlna2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjQzNDMsImV4cCI6MjA4MDg0MDM0M30.xS-mEzW1i1sPrhfAOgQNb6pux7bZjqKQiVe3LU0TbVo';

/** 检查Supabase凭据是否正确配置 */
const isConfigured = SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_URL.startsWith('http');

/** Supabase客户端实例 - 仅在正确配置时创建 */
const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
}) : null;

// ==========================================
// Realtime 实时订阅
// ==========================================

let realtimeChannel: RealtimeChannel | null = null;
let isRealtimeSubscribed = false;

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
        
        // 关键修复：确保每次触发都拉取最新缓存，防止闭包过时
        const cachedMemories = await getIndexedDBMemories() || [];
        let updatedMemories: Memory[];
        
        switch (payload.eventType) {
          case 'INSERT': {
            const newMemory = mapRowToMemory(payload.new);
            // 检查是否已存在（可能是自己刚添加的）
            const exists = cachedMemories.some(m => m.id === newMemory.id);
            if (!exists) {
              updatedMemories = [newMemory, ...cachedMemories];
              setMemoryCache(updatedMemories);
              await addToIndexedDB(newMemory);
              notifyCacheUpdate(updatedMemories);
              // 预加载新图片
              if (newMemory.imageUrls?.length || newMemory.imageUrl) {
                preloadImages(newMemory.imageUrls || [newMemory.imageUrl!]);
              }
            }
            break;
          }
          
          case 'UPDATE': {
            const updatedMemory = mapRowToMemory(payload.new);
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
  } catch (e) {
    return [];
  }
};

/**
 * 将数据库行映射到Memory类型
 * 将Supabase数据库格式转换为应用的Memory接口
 */
const mapRowToMemory = (row: any): Memory => ({
  id: row.id,
  content: row.content,
  author: row.author as UserType,
  createdAt: new Date(row.created_at).getTime(), // 将ISO字符串转换为时间戳
  tags: row.tags,
  imageUrl: row.image_url,
  imageUrls: row.image_urls || (row.image_url ? [row.image_url] : [])
});

// ==========================================
// 图片处理工具
// ==========================================

/** Supabase存储桶名称，用于记忆图片 */
const STORAGE_BUCKET = 'memory-images';

/**
 * 压缩并调整图片大小，返回Blob用于上传
 * 在保持质量的同时减小文件大小以适合网页显示
 *
 * @param file - 要压缩的图片文件
 * @param maxWidth - 最大宽度像素（默认：1200）
 * @param quality - JPEG质量（0-1，默认：0.8）
 * @returns Promise解析为压缩后的Blob
 */
export const compressImageToBlob = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * 旧版函数，用于本地存储回退（返回base64）
 * 压缩图片并返回base64字符串用于localStorage
 *
 * @param file - 要压缩的图片文件
 * @param maxWidth - 最大宽度像素（默认：1200）
 * @param quality - JPEG质量（0-1，默认：0.8）
 * @returns Promise解析为base64字符串
 */
export const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * 将文件转换为base64字符串，无压缩
 * 当不需要压缩时用于localStorage回退
 *
 * @param file - 要转换的文件
 * @returns Promise解析为base64字符串
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * 上传图片到存储（Supabase或localStorage回退）
 * 自动处理云上传和本地回退
 *
 * @param file - 要上传的图片文件
 * @returns Promise解析为图片URL或失败时为null
 */
export const uploadImage = async (file: File): Promise<string | null> => {
  // Fallback to base64 for local storage
  if (!supabase) {
    return fileToBase64(file);
  }

  try {
    // Get file extension
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';

    // Generate unique filename with original extension
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    // Upload original file to Supabase Storage (no compression)
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, file, {
        contentType: file.type,
        cacheControl: '31536000', // Cache for 1 year
      });

    if (error) {
      console.error('Failed to upload image:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (e) {
    console.error('Image upload failed:', e);
    // Fallback to base64 if storage upload fails
    console.warn('Falling back to base64 storage');
    return fileToBase64(file);
  }
};

/**
 * 从Supabase存储删除图片
 * 仅在使用Supabase时尝试删除（不是base64图片）
 *
 * @param imageUrl - 要删除的图片URL
 * @returns Promise解析为成功布尔值
 */
export const deleteImage = async (imageUrl: string): Promise<boolean> => {
  if (!supabase || !imageUrl) return true;

  // Skip if it's a base64 image
  if (imageUrl.startsWith('data:')) return true;

  try {
    // Extract filename from URL
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filename]);

    if (error) {
      console.error('Failed to delete image:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Image deletion failed:', e);
    return false;
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
  const memoryCached = getMemoryCache();
  if (memoryCached && memoryCached.length > 0) {
    // 后台静默同步云端数据
    syncFromCloudInBackground();
    return memoryCached;
  }

  // 2. 尝试从 IndexedDB 获取（次快）
  const indexedDBCached = await getIndexedDBMemories();
  if (indexedDBCached && indexedDBCached.length > 0) {
    // 更新内存缓存
    setMemoryCache(indexedDBCached);
    // 预加载图片
    const imageUrls = indexedDBCached.flatMap(m => m.imageUrls || (m.imageUrl ? [m.imageUrl] : []));
    preloadImages(imageUrls);
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
    const imageUrls = memories.flatMap(m => m.imageUrls || (m.imageUrl ? [m.imageUrl] : []));
    preloadImages(imageUrls);
    
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

/**
 * 深度比较两个记忆数组是否相同
 */
const areMemoriesEqual = (a: Memory[] | null, b: Memory[]): boolean => {
  if (!a) return false;
  if (a.length !== b.length) return false;
  
  // 创建 ID 到内容的映射进行比较
  const aMap = new Map(a.map(m => [m.id, JSON.stringify({ content: m.content, imageUrls: m.imageUrls })]));
  
  for (const memory of b) {
    const aContent = aMap.get(memory.id);
    const bContent = JSON.stringify({ content: memory.content, imageUrls: memory.imageUrls });
    if (aContent !== bContent) return false;
  }
  
  return true;
};

const syncFromCloudInBackground = async (): Promise<void> => {
  if (isSyncing || !supabase) return;
  
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
      const imageUrls = cloudMemories.flatMap(m => m.imageUrls || (m.imageUrl ? [m.imageUrl] : []));
      preloadImages(imageUrls);
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
  const newEntryBase = {
    content: dto.content,
    author: dto.author,
    image_url: dto.imageUrl || (dto.imageUrls?.[0] || null),
    image_urls: dto.imageUrls || (dto.imageUrl ? [dto.imageUrl] : null),
    // created_at will be handled by default value in DB or we can send ISO string
    // created_at: new Date().toISOString(), 
  };

  // Fallback to Local Storage
  if (!supabase) {
    const newMemory: Memory = {
      id: crypto.randomUUID(),
      content: dto.content,
      createdAt: Date.now(),
      author: dto.author,
      imageUrl: dto.imageUrl || (dto.imageUrls?.[0]),
      imageUrls: dto.imageUrls || (dto.imageUrl ? [dto.imageUrl] : undefined)
    };
    const current = getLocalMemories();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([newMemory, ...current]));
    
    // 【优化】更新缓存
    const updatedMemories = [newMemory, ...current];
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
    const updatedMemories = [newMemory, ...cachedMemories];
    setMemoryCache(updatedMemories);
    await addToIndexedDB(newMemory);
    
    return newMemory;
  } catch (e: any) {
    console.error("Failed to save memory to cloud", e);
    alert(`保存失败: ${e.message || "请检查网络"}`);
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
 * @param imageUrl - 新图片URL（可选，null表示删除图片）
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
    const updateData: any = { content };
    // Only update image_url if explicitly provided (including null for deletion)
    if (imageUrls !== undefined) {
      updateData.image_urls = imageUrls;
      updateData.image_url = imageUrls && imageUrls.length > 0 ? imageUrls[0] : null;
    }
    
    const { data, error } = await supabase
      .from('memories')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.warn("Update returned 0 rows. Possible RLS issue.");
      alert("更新失败：无法修改云端数据。可能是因为数据库未开启 UPDATE 权限 (RLS Policy)。请在 Supabase SQL Editor 中运行允许 UPDATE 的策略。");
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