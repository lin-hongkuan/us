import { useCallback, useEffect, useState } from 'react';
import { Memory, CreateMemoryDTO } from '../types';
import { getMemories, saveMemory, seedDataIfEmpty, subscribeToMemoryChanges, unsubscribeFromMemoryChanges } from '../services/storageService';
import { subscribeToCacheUpdates } from '../services/cacheService';
import { insertMemorySorted } from '../services/memoryMapper';
import { drainOutbox, enqueueWrite, getOutboxCount } from '../services/outboxService';

const isOnlineNow = (): boolean => {
  if (typeof navigator === 'undefined') return true;
  return typeof navigator.onLine === 'boolean' ? navigator.onLine : true;
};

export const useMemoriesData = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingOutboxCount, setPendingOutboxCount] = useState<number>(() => getOutboxCount());

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        await seedDataIfEmpty();
        const data = await getMemories();
        if (!cancelled) {
          setMemories(data);
        }
      } catch (e) {
        console.error('Failed to load memories:', e);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
      subscribeToMemoryChanges();
    };

    fetchData();

    const unsubscribe = subscribeToCacheUpdates((updatedMemories) => {
      setMemories(updatedMemories);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      unsubscribeFromMemoryChanges();
    };
  }, []);

  // 重连时把 outbox 里的暂存写入挨个重放
  const flushOutbox = useCallback(async () => {
    if (getOutboxCount() === 0) return;
    const result = await drainOutbox(saveMemory);
    if (result.flushed.length === 0 && result.failed.length === 0) return;

    setMemories((prev) => {
      let next = prev;
      for (const { localId, saved } of result.flushed) {
        // 删掉乐观条目，按时间序插入云端返回的真实 memory
        next = next.filter((m) => m.id !== localId);
        next = insertMemorySorted(next, saved);
      }
      return next;
    });
    setPendingOutboxCount(getOutboxCount());
  }, []);

  useEffect(() => {
    const handleOnline = () => { void flushOutbox(); };
    window.addEventListener('online', handleOnline);
    // 启动时如果已经在线但本地仍有未同步的，主动尝试一次
    if (isOnlineNow()) {
      void flushOutbox();
    }
    return () => window.removeEventListener('online', handleOnline);
  }, [flushOutbox]);

  const addMemory = useCallback(async (dto: CreateMemoryDTO): Promise<Memory | null> => {
    // 离线：不调用云端，直接进 outbox + 乐观上屏
    if (!isOnlineNow()) {
      const { optimisticMemory } = enqueueWrite(dto);
      setMemories((prev) => insertMemorySorted(prev, optimisticMemory));
      setPendingOutboxCount(getOutboxCount());
      return optimisticMemory;
    }

    const newMemory = await saveMemory(dto);
    if (newMemory) {
      setMemories((prev) => insertMemorySorted(prev, newMemory));
      return newMemory;
    }

    // 在线但写失败（比如服务端 5xx / 临时网络抖动）：也走 outbox 兜底
    const { optimisticMemory } = enqueueWrite(dto);
    setMemories((prev) => insertMemorySorted(prev, optimisticMemory));
    setPendingOutboxCount(getOutboxCount());
    return optimisticMemory;
  }, []);

  return {
    memories,
    setMemories,
    isLoading,
    addMemory,
    pendingOutboxCount,
  };
};
