import { CreateMemoryDTO, Memory, UserType } from '../types';

export interface MemoryRow {
  id: string;
  content: string;
  author: string;
  created_at: string;
  tags?: string[];
  image_url?: string | null;
  image_urls?: string[] | null;
}

export interface MemoryInsertPayload {
  content: string;
  author: UserType;
  image_url: string | null;
  image_urls: string[] | null;
  created_at: string;
}

export interface MemoryUpdatePayload {
  content: string;
  image_url?: string | null;
  image_urls?: string[] | null;
}

export const getMemoryImageUrls = (memory: Pick<Memory, 'imageUrl' | 'imageUrls'>): string[] => {
  return memory.imageUrls || (memory.imageUrl ? [memory.imageUrl] : []);
};

export const getMemoriesImageUrls = (memories: Memory[]): string[] => {
  return memories.flatMap(getMemoryImageUrls);
};

export const mapRowToMemory = (row: MemoryRow): Memory => ({
  id: row.id,
  content: row.content,
  author: row.author as UserType,
  createdAt: new Date(row.created_at).getTime(),
  tags: row.tags,
  imageUrl: row.image_url || undefined,
  imageUrls: row.image_urls || (row.image_url ? [row.image_url] : []),
});

export const createMemoryInsertPayload = (dto: CreateMemoryDTO, effectiveTimestamp: number): MemoryInsertPayload => ({
  content: dto.content,
  author: dto.author,
  image_url: dto.imageUrl || dto.imageUrls?.[0] || null,
  image_urls: dto.imageUrls || (dto.imageUrl ? [dto.imageUrl] : null),
  created_at: new Date(effectiveTimestamp).toISOString(),
});

export const createMemoryUpdatePayload = (content: string, imageUrls?: string[] | null): MemoryUpdatePayload => {
  const updateData: MemoryUpdatePayload = { content };
  if (imageUrls !== undefined) {
    updateData.image_urls = imageUrls;
    updateData.image_url = imageUrls && imageUrls.length > 0 ? imageUrls[0] : null;
  }
  return updateData;
};

export const insertMemorySorted = (list: Memory[], newMemory: Memory): Memory[] => {
  const result = [...list, newMemory];
  result.sort((a, b) => b.createdAt - a.createdAt);
  return result;
};

export const areStringArraysEqual = (a?: string[], b?: string[]): boolean => {
  if (a === b) return true;
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

export const areMemoriesEqual = (a: Memory[] | null, b: Memory[]): boolean => {
  if (!a) return false;
  if (a.length !== b.length) return false;

  for (let i = 0; i < b.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      left.content !== right.content ||
      left.author !== right.author ||
      left.createdAt !== right.createdAt ||
      left.imageUrl !== right.imageUrl ||
      !areStringArraysEqual(left.imageUrls, right.imageUrls)
    ) {
      return false;
    }
  }

  return true;
};
