import { describe, expect, it } from 'vitest';
import { UserType } from '../types';
import {
  areMemoriesEqual,
  createMemoryInsertPayload,
  createMemoryUpdatePayload,
  getMemoryImageUrls,
  insertMemorySorted,
  mapRowToMemory,
} from './memoryMapper';

describe('memoryMapper', () => {
  it('maps database rows and prefers image_urls over legacy image_url', () => {
    const memory = mapRowToMemory({
      id: '1',
      content: 'hello',
      author: UserType.HER,
      created_at: '2026-01-02T00:00:00.000Z',
      tags: ['a'],
      image_url: 'legacy.jpg',
      image_urls: ['one.jpg', 'two.jpg'],
    });

    expect(memory).toMatchObject({
      id: '1',
      content: 'hello',
      author: UserType.HER,
      tags: ['a'],
      imageUrl: 'legacy.jpg',
      imageUrls: ['one.jpg', 'two.jpg'],
    });
    expect(memory.createdAt).toBe(new Date('2026-01-02T00:00:00.000Z').getTime());
  });

  it('falls back from legacy image_url to imageUrls', () => {
    const memory = mapRowToMemory({
      id: '1',
      content: 'hello',
      author: UserType.HIM,
      created_at: '2026-01-02T00:00:00.000Z',
      image_url: 'legacy.jpg',
      image_urls: null,
    });

    expect(getMemoryImageUrls(memory)).toEqual(['legacy.jpg']);
  });

  it('creates insert and update payloads for image fields', () => {
    expect(createMemoryInsertPayload({ content: 'x', author: UserType.HER, imageUrls: ['a.jpg', 'b.jpg'] }, 1000)).toEqual({
      content: 'x',
      author: UserType.HER,
      image_url: 'a.jpg',
      image_urls: ['a.jpg', 'b.jpg'],
      created_at: new Date(1000).toISOString(),
    });

    expect(createMemoryUpdatePayload('new', null)).toEqual({
      content: 'new',
      image_url: null,
      image_urls: null,
    });
    expect(createMemoryUpdatePayload('new')).toEqual({ content: 'new' });
  });

  it('sorts inserted memories and compares memory lists', () => {
    const older = { id: 'old', content: 'old', author: UserType.HER, createdAt: 1 };
    const newer = { id: 'new', content: 'new', author: UserType.HIM, createdAt: 2 };

    const sorted = insertMemorySorted([older], newer);

    expect(sorted.map(memory => memory.id)).toEqual(['new', 'old']);
    expect(areMemoriesEqual(sorted, [...sorted])).toBe(true);
    expect(areMemoriesEqual(sorted, [{ ...newer, content: 'changed' }, older])).toBe(false);
  });
});
