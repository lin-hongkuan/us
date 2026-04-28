import { useCallback, useEffect, useState } from 'react';
import { Memory, CreateMemoryDTO } from '../types';
import { getMemories, saveMemory, seedDataIfEmpty, subscribeToMemoryChanges, unsubscribeFromMemoryChanges } from '../services/storageService';
import { subscribeToCacheUpdates } from '../services/cacheService';
import { insertMemorySorted } from '../services/memoryMapper';

export const useMemoriesData = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const addMemory = useCallback(async (dto: CreateMemoryDTO): Promise<Memory | null> => {
    const newMemory = await saveMemory(dto);
    if (newMemory) {
      setMemories((prev) => insertMemorySorted(prev, newMemory));
    }
    return newMemory;
  }, []);

  return {
    memories,
    setMemories,
    isLoading,
    addMemory,
  };
};
