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
  tags: row.tags
});

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
      author: dto.author
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