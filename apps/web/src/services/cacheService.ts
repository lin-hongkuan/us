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

import { Memory, OutboxEntry } from '../types';

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
const DB_VERSION = 2;
const STORE_NAME = 'memories';
const META_STORE = 'meta';
const OUTBOX_STORE = 'outbox';

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

// Safari 私密浏览等场景下 indexedDB.open() 可能永远不触发回调，需要超时保护
const IDB_OPEN_TIMEOUT = 3000;

/**
 * 打开/获取 IndexedDB 数据库实例
 * Safari 兼容：检测 indexedDB 可用性 + 超时保护，防止 Promise 永远 pending
 */
const openDB = (): Promise<IDBDatabase> => {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }
  
  if (dbPromise) {
    return dbPromise;
  }

  // Safari 私密浏览或低版本可能没有 indexedDB
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available'));
  }
  
  dbPromise = new Promise((resolve, reject) => {
    // 超时保护：Safari 某些场景下 open() 回调永远不触发
    const timeout = setTimeout(() => {
      console.warn('IndexedDB open timed out (Safari compatibility)');
      dbPromise = null;
      reject(new Error('IndexedDB open timeout'));
    }, IDB_OPEN_TIMEOUT);

    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      // Safari 私密浏览可能在 open() 时直接抛异常
      clearTimeout(timeout);
      dbPromise = null;
      reject(e);
      return;
    }
    
    request.onerror = () => {
      clearTimeout(timeout);
      console.error('IndexedDB open error:', request.error);
      dbPromise = null;
      reject(request.error);
    };
    
    request.onsuccess = () => {
      clearTimeout(timeout);
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

      // v2: 创建离线写入队列存储（旧版本用户升级时也会进入这里）
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        const outboxStore = db.createObjectStore(OUTBOX_STORE, { keyPath: 'localId' });
        outboxStore.createIndex('enqueuedAt', 'enqueuedAt', { unique: false });
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
      const transaction = db.transaction([STORE_NAME, META_STORE, OUTBOX_STORE], 'readwrite');

      transaction.objectStore(STORE_NAME).clear();
      transaction.objectStore(META_STORE).clear();
      transaction.objectStore(OUTBOX_STORE).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error('Failed to clear IndexedDB cache:', e);
  }
};

// ==========================================
// 离线写入队列（outbox）IndexedDB 操作
// ==========================================
// 设计：outboxService 在内存维护 cache 数组保证同步语义；
// 这里只提供持久化原语，由 outboxService 在写入/启动 hydration 时调用。

/**
 * 读取所有 outbox 条目（启动 hydration 用）
 * IndexedDB 不可用时返回空数组（不抛错），调用方按"队列为空"处理
 */
export const getOutboxEntries = async (): Promise<OutboxEntry[]> => {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OUTBOX_STORE, 'readonly');
      const store = transaction.objectStore(OUTBOX_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as OutboxEntry[];
        // 按入队时间升序，保证 drain 顺序与原入队顺序一致
        entries.sort((a, b) => a.enqueuedAt - b.enqueuedAt);
        resolve(entries);
      };

      request.onerror = () => {
        console.error('IndexedDB outbox getAll error:', request.error);
        reject(request.error);
      };
    });
  } catch (e) {
    console.error('Failed to get outbox entries from IndexedDB:', e);
    return [];
  }
};

/**
 * 写入单条 outbox 条目（同 localId 会覆盖）
 */
export const putOutboxEntry = async (entry: OutboxEntry): Promise<void> => {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OUTBOX_STORE, 'readwrite');
      const store = transaction.objectStore(OUTBOX_STORE);

      store.put(entry);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error('Failed to put outbox entry to IndexedDB:', e);
  }
};

/**
 * 按 localId 删除 outbox 条目
 */
export const deleteOutboxEntry = async (localId: string): Promise<void> => {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OUTBOX_STORE, 'readwrite');
      const store = transaction.objectStore(OUTBOX_STORE);

      store.delete(localId);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error('Failed to delete outbox entry from IndexedDB:', e);
  }
};

/**
 * 清空 outbox store（avatar 长按手势用）
 */
export const clearOutboxStore = async (): Promise<void> => {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(OUTBOX_STORE, 'readwrite');
      transaction.objectStore(OUTBOX_STORE).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error('Failed to clear outbox store:', e);
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
