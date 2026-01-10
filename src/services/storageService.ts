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
 */

import { createClient } from '@supabase/supabase-js';
import { Memory, UserType, CreateMemoryDTO } from '../types';

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
const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

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

// ==========================================
// 内存缓存层 - 减少重复请求
// ==========================================

/** 内存缓存 */
let memoriesCache: Memory[] | null = null;
/** 缓存时间戳 */
let cacheTimestamp: number = 0;
/** 缓存有效期（5分钟） */
const CACHE_TTL = 5 * 60 * 1000;

/** 清除缓存 */
const invalidateCache = () => {
  memoriesCache = null;
  cacheTimestamp = 0;
};

/** 检查缓存是否有效 */
const isCacheValid = () => {
  return memoriesCache !== null && (Date.now() - cacheTimestamp) < CACHE_TTL;
};

/**
 * 获取所有记忆
 * 从Supabase或localStorage回退获取记忆列表
 * 使用内存缓存减少重复请求
 *
 * @returns Promise解析为记忆数组
 */
export const getMemories = async (): Promise<Memory[]> => {
  // 如果缓存有效，直接返回缓存
  if (isCacheValid()) {
    return memoriesCache!;
  }

  // Fallback to Local Storage if Supabase is not configured
  if (!supabase) {
    console.warn("Supabase not configured. Using Local Storage.");
    // Simulate async delay slightly for consistent UX
    await new Promise(resolve => setTimeout(resolve, 100));
    const localData = getLocalMemories();
    memoriesCache = localData;
    cacheTimestamp = Date.now();
    return localData;
  }

  try {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    const memories = (data || []).map(mapRowToMemory);
    // 更新缓存
    memoriesCache = memories;
    cacheTimestamp = Date.now();
    return memories;
  } catch (e) {
    console.error("Failed to load memories from cloud", e);
    return [];
  }
};

/**
 * 保存新记忆
 * 创建新的记忆条目并保存到Supabase或localStorage
 *
 * @param dto - 创建记忆的数据传输对象
 * @returns Promise解析为创建的记忆或失败时为null
 */
export const saveMemory = async (dto: CreateMemoryDTO): Promise<Memory | null> => {
  // 保存新记忆后失效缓存
  invalidateCache();
  
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
    await new Promise(resolve => setTimeout(resolve, 500));
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
    return newMemory;
  }

  try {
    const { data, error } = await supabase
      .from('memories')
      .insert([newEntryBase])
      .select()
      .single();

    if (error) throw error;
    return mapRowToMemory(data);
  } catch (e: any) {
    console.error("Failed to save memory to cloud", e);
    alert(`保存失败: ${e.message || "请检查网络"}`);
    return null;
  }
};

/**
 * 更新现有记忆
 * 修改记忆内容和/或图片
 *
 * @param id - 要更新的记忆ID
 * @param content - 新内容
 * @param imageUrl - 新图片URL（可选，null表示删除图片）
 * @returns Promise解析为更新后的记忆或失败时为null
 */
export const updateMemory = async (id: string, content: string, imageUrls?: string[] | null): Promise<Memory | null> => {
  // 更新记忆后失效缓存
  invalidateCache();
  
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

    return mapRowToMemory(data[0]);
  } catch (e) {
    console.error("Failed to update memory", e);
    return null;
  }
};

/**
 * 删除记忆
 * 从Supabase或localStorage中删除指定的记忆
 *
 * @param id - 要删除的记忆ID
 * @returns Promise解析为成功布尔值
 */
export const deleteMemory = async (id: string): Promise<boolean> => {
  // 删除记忆后失效缓存
  invalidateCache();
  
  // Fallback to Local Storage
  if (!supabase) {
    const current = getLocalMemories();
    const updated = current.filter(m => m.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return true;
  }

  try {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', id);

    if (error) throw error;
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