/**
 * ==========================================
 * 多层缓存服务
 * ==========================================
 *
 * 实现三层缓存策略：
 * 1. 内存缓存 - 毫秒级访问，应用内直接使用
 * 2. IndexedDB - 本地持久化，大容量存储
 * 3. 云端 Supabase - 数据同步源
 *
 * 效果：首次访问后，再次打开网站瞬间加载（从本地缓存），无需等待网络。
 */

import { Memory } from '../types';

// ==========================================
// 内存缓存层
// ==========================================

interface MemoryCache {
  memories: Memory[] | null;
  timestamp: number;
  version: number;
}

const memoryCache: MemoryCache = {
  memories: null,
  timestamp: 0,
  version: 0,
};

// 内存缓存有效期：5分钟
const MEMORY_CACHE_TTL = 5 * 60 * 1000;

/**
 * 获取内存缓存
 */
export const getMemoryCache = (): Memory[] | null => {
  if (!memoryCache.memories) return null;
  
  const now = Date.now();
  if (now - memoryCache.timestamp > MEMORY_CACHE_TTL) {
    // 缓存过期，但仍返回数据（后台会更新）
    return memoryCache.memories;
  }
  
  return memoryCache.memories;
};

/**
 * 设置内存缓存
 */
export const setMemoryCache = (memories: Memory[]): void => {
  memoryCache.memories = memories;
  memoryCache.timestamp = Date.now();
  memoryCache.version++;
};

/**
 * 清除内存缓存
 */
export const clearMemoryCache = (): void => {
  memoryCache.memories = null;
  memoryCache.timestamp = 0;
};

/**
 * 获取缓存版本号（用于检测更新）
 */
export const getCacheVersion = (): number => {
  return memoryCache.version;
};

// ==========================================
// IndexedDB 缓存层
// ==========================================

const DB_NAME = 'us_app_cache';
const DB_VERSION = 1;
const STORE_NAME = 'memories';
const META_STORE = 'meta';

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * 打开/获取 IndexedDB 数据库实例
 */
const openDB = (): Promise<IDBDatabase> => {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  
  if (dbPromise) {
    return dbPromise;
  }
  
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('IndexedDB open error:', request.error);
      dbPromise = null;
      reject(request.error);
    };
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // 创建记忆存储
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('author', 'author', { unique: false });
      }
      
      // 创建元数据存储
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
  });
  
  return dbPromise;
};

/**
 * 从 IndexedDB 获取所有记忆
 */
export const getIndexedDBMemories = async (): Promise<Memory[] | null> => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const memories = request.result as Memory[];
        // 按创建时间降序排列
        memories.sort((a, b) => b.createdAt - a.createdAt);
        resolve(memories.length > 0 ? memories : null);
      };
      
      request.onerror = () => {
        console.error('IndexedDB getAll error:', request.error);
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('Failed to get memories from IndexedDB:', e);
    return null;
  }
};

/**
 * 将记忆保存到 IndexedDB
 */
export const setIndexedDBMemories = async (memories: Memory[]): Promise<void> => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME, META_STORE], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const metaStore = transaction.objectStore(META_STORE);
      
      // 清除现有数据
      store.clear();
      
      // 插入新数据
      for (const memory of memories) {
        store.put(memory);
      }
      
      // 更新同步时间戳
      metaStore.put({ key: 'lastSync', value: Date.now() });
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      transaction.onerror = () => {
        console.error('IndexedDB transaction error:', transaction.error);
        reject(transaction.error);
      };
    });
  } catch (e) {
    console.error('Failed to save memories to IndexedDB:', e);
  }
};

/**
 * 向 IndexedDB 添加单条记忆
 */
export const addToIndexedDB = async (memory: Memory): Promise<void> => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      store.put(memory);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error('Failed to add memory to IndexedDB:', e);
  }
};

/**
 * 从 IndexedDB 删除单条记忆
 */
export const removeFromIndexedDB = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      store.delete(id);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error('Failed to remove memory from IndexedDB:', e);
  }
};

/**
 * 更新 IndexedDB 中的单条记忆
 */
export const updateInIndexedDB = async (memory: Memory): Promise<void> => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      store.put(memory);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error('Failed to update memory in IndexedDB:', e);
  }
};

/**
 * 获取上次同步时间
 */
export const getLastSyncTime = async (): Promise<number | null> => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(META_STORE, 'readonly');
      const store = transaction.objectStore(META_STORE);
      const request = store.get('lastSync');
      
      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };
      
      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('Failed to get last sync time:', e);
    return null;
  }
};

/**
 * 清除 IndexedDB 缓存
 */
export const clearIndexedDBCache = async (): Promise<void> => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME, META_STORE], 'readwrite');
      
      transaction.objectStore(STORE_NAME).clear();
      transaction.objectStore(META_STORE).clear();
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error('Failed to clear IndexedDB cache:', e);
  }
};

// ==========================================
// 缓存同步事件
// ==========================================

type CacheUpdateListener = (memories: Memory[]) => void;
const listeners: Set<CacheUpdateListener> = new Set();

/**
 * 订阅缓存更新事件
 */
export const subscribeToCacheUpdates = (callback: CacheUpdateListener): () => void => {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
};

/**
 * 触发缓存更新事件
 */
export const notifyCacheUpdate = (memories: Memory[]): void => {
  listeners.forEach(callback => {
    try {
      callback(memories);
    } catch (e) {
      console.error('Cache update listener error:', e);
    }
  });
};

// ==========================================
// 图片 URL 缓存（用于预加载）
// ==========================================

const imageUrlCache = new Map<string, string>();

/**
 * 预加载图片并缓存
 */
export const preloadImage = (url: string): Promise<void> => {
  if (!url || url.startsWith('data:') || imageUrlCache.has(url)) {
    return Promise.resolve();
  }
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      imageUrlCache.set(url, url);
      resolve();
    };
    img.onerror = () => {
      resolve(); // 失败也继续
    };
    img.src = url;
  });
};

/**
 * 批量预加载图片
 */
export const preloadImages = async (urls: string[]): Promise<void> => {
  const uniqueUrls = [...new Set(urls.filter(url => url && !url.startsWith('data:')))];
  await Promise.all(uniqueUrls.slice(0, 10).map(preloadImage)); // 最多预加载10张
};
