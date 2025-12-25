import { createClient } from '@supabase/supabase-js';
import { Memory, UserType, CreateMemoryDTO } from '../types';

// ==========================================
// CONFIGURATION
// Replace these with your actual Supabase credentials
// ==========================================
const SUPABASE_URL: string = 'https://uiczraluplwdupdigkar.supabase.co';
const SUPABASE_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pyYWx1cGx3ZHVwZGlna2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjQzNDMsImV4cCI6MjA4MDg0MDM0M30.xS-mEzW1i1sPrhfAOgQNb6pux7bZjqKQiVe3LU0TbVo';

// Check if Supabase is properly configured to prevent "Invalid URL" crash
const isConfigured = SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_URL.startsWith('http');

// Only create client if configured
const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ==========================================
// FALLBACK: LOCAL STORAGE IMPLEMENTATION
// Used when Supabase keys are not set
// ==========================================
const LOCAL_STORAGE_KEY = 'us_app_memories';

const getLocalMemories = (): Memory[] => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

// Map database row to app Memory type
const mapRowToMemory = (row: any): Memory => ({
  id: row.id,
  content: row.content,
  author: row.author as UserType,
  createdAt: new Date(row.created_at).getTime(), // Convert ISO string to timestamp
  tags: row.tags,
  imageUrl: row.image_url
});

// ==========================================
// IMAGE HANDLING UTILITIES
// ==========================================

const STORAGE_BUCKET = 'memory-images';

// Compress and resize image, return as Blob for upload
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

// Legacy function for local storage fallback (returns base64)
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

// Convert file to base64 (no compression, original quality)
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Upload image to Supabase Storage (original quality, no compression)
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

// Delete image from Supabase Storage
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

export const getMemories = async (): Promise<Memory[]> => {
  // Fallback to Local Storage if Supabase is not configured
  if (!supabase) {
    console.warn("Supabase not configured. Using Local Storage.");
    // Simulate async delay slightly for consistent UX
    await new Promise(resolve => setTimeout(resolve, 500));
    return getLocalMemories();
  }

  try {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapRowToMemory);
  } catch (e) {
    console.error("Failed to load memories from cloud", e);
    return [];
  }
};

export const saveMemory = async (dto: CreateMemoryDTO): Promise<Memory | null> => {
  const newEntryBase = {
    content: dto.content,
    author: dto.author,
    image_url: dto.imageUrl || null,
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
      imageUrl: dto.imageUrl
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

export const updateMemory = async (id: string, content: string, imageUrl?: string | null): Promise<Memory | null> => {
  // Fallback to Local Storage
  if (!supabase) {
    const current = getLocalMemories();
    const index = current.findIndex(m => m.id === id);
    if (index !== -1) {
      current[index].content = content;
      // Update imageUrl - if null, remove it; if undefined, keep existing
      if (imageUrl === null) {
        delete current[index].imageUrl;
      } else if (imageUrl !== undefined) {
        current[index].imageUrl = imageUrl;
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
      return current[index];
    }
    return null;
  }

  try {
    const updateData: any = { content };
    // Only update image_url if explicitly provided (including null for deletion)
    if (imageUrl !== undefined) {
      updateData.image_url = imageUrl;
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

export const deleteMemory = async (id: string): Promise<boolean> => {
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