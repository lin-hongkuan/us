import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker, { type Env } from './index';
import { UserType } from '../../web/src/types';

const makeMemoryRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'mem-1',
  content: 'old content',
  author: 'HER',
  created_at: '2026-06-18T00:00:00.000Z',
  tags: '["tag-a"]',
  image_url: 'cover.jpg',
  image_urls: '["cover.jpg","detail.jpg"]',
  updated_at: '2026-06-18T00:00:00.000Z',
  ...overrides,
});

const createDbMock = (existing: Record<string, unknown> | null = null) => {
  const state = {
    row: existing,
    inserted: null as unknown[] | null,
    updated: null as unknown[] | null,
    deleted: null as string[] | null,
    presence: [] as Array<{ instance_id: string; user_type: string; online_at: number }>,
  };

  const run = vi.fn(async function (this: { sql: string }, ...params: unknown[]) {
    if (this.sql.startsWith('INSERT INTO memories')) {
      state.inserted = params;
      state.row = makeMemoryRow({
        id: params[0],
        content: params[1],
        author: params[2],
        created_at: params[3],
        tags: params[4],
        image_url: params[5],
        image_urls: params[6],
        updated_at: params[7],
      });
    }
    if (this.sql.startsWith('UPDATE memories SET')) {
      state.updated = params;
      state.row = makeMemoryRow({
        ...(state.row ?? {}),
        content: params[0],
        tags: params[1],
        image_url: params[2],
        image_urls: params[3],
        updated_at: params[4],
        id: params[5],
      });
    }
    if (this.sql.startsWith('DELETE FROM memories WHERE id = ?')) {
      state.deleted = params as string[];
      state.row = null;
    }
    if (this.sql.startsWith('INSERT INTO presence')) {
      const [instance_id, user_type, online_at] = params as [string, string, number];
      state.presence = state.presence.filter((item) => item.instance_id !== instance_id);
      state.presence.push({ instance_id, user_type, online_at });
    }
    if (this.sql.startsWith('DELETE FROM presence WHERE online_at < ?')) {
      const [threshold] = params as [number];
      state.presence = state.presence.filter((item) => item.online_at >= threshold);
    }
    if (this.sql.startsWith('DELETE FROM presence WHERE instance_id = ?')) {
      const [instanceId] = params as [string];
      state.presence = state.presence.filter((item) => item.instance_id !== instanceId);
    }
    return Promise.resolve();
  });

  const first = vi.fn(async function <T>(this: { sql: string }, ...params: unknown[]) {
    if (this.sql.startsWith('SELECT * FROM memories WHERE id = ?')) {
      return state.row as T | null;
    }
    if (this.sql.startsWith('SELECT user_type FROM presence')) {
      const [userType, threshold] = params as [string, number];
      const partner = state.presence.find((item) => item.user_type !== userType && item.online_at >= threshold);
      return partner ? ({ user_type: partner.user_type } as T) : null;
    }
    return null;
  });

  const all = vi.fn(async function <T>(this: { sql: string }) {
    if (this.sql.startsWith('SELECT * FROM memories ORDER BY created_at DESC')) {
      return { results: state.row ? [state.row] : [] } as { results: T[] };
    }
    return { results: [] as T[] };
  });

  const bind = vi.fn(function (this: { sql: string }, ...params: unknown[]) {
    const prepared = {
      sql: this.sql,
      bind: vi.fn(() => prepared),
      run: () => run.call({ sql: this.sql }, ...params),
      first: <T>() => first.call({ sql: this.sql }, ...params) as Promise<T | null>,
      all: <T>() => all.call({ sql: this.sql }, ...params) as Promise<{ results: T[] }>,
    };
    return prepared;
  });

  return {
    state,
    db: {
      prepare: (sql: string) => ({
        sql,
        bind: bind.bind({ sql }),
        run: () => run.call({ sql }),
        first: <T>() => first.call({ sql }),
        all: <T>() => all.call({ sql }),
      }),
    },
  };
};

const createEnv = (existing: Record<string, unknown> | null = null) => {
  const db = createDbMock(existing);
  const images = {
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
    get: vi.fn(async () => null),
  };
  return {
    env: {
      DB: db.db as unknown as D1Database,
      MEMORY_IMAGES: images as unknown as R2Bucket,
      ASSETS: { fetch: vi.fn(async () => new Response('assets')) } as unknown as Fetcher,
    } satisfies Env,
    db,
    images,
  };
};

const request = (path: string, init: RequestInit = {}) => new Request(`https://example.com${path}`, init);

describe('apps/worker request handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid-test');
    vi.spyOn(Date, 'now').mockReturnValue(1_725_000_000_000);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-18T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('rejects POST /api/memories without content', async () => {
    const { env } = createEnv();
    const response = await worker.fetch(request('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: UserType.HER }),
    }), env);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: 'Content is required',
    });
  });

  it('keeps existing image fields when PATCH only changes content', async () => {
    const existing = makeMemoryRow();
    const { env, db } = createEnv(existing);

    const response = await worker.fetch(request('/api/memories/mem-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'new content' }),
    }), env);

    expect(response.ok).toBe(true);
    expect(db.state.updated).toEqual([
      'new content',
      '["tag-a"]',
      'cover.jpg',
      '["cover.jpg","detail.jpg"]',
      expect.any(String),
      'mem-1',
    ]);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        id: 'mem-1',
        content: 'new content',
        image_url: 'cover.jpg',
        image_urls: ['cover.jpg', 'detail.jpg'],
      },
    });
  });

  it('accepts DELETE /api/presence with instance_id and clears the row', async () => {
    const { env, db } = createEnv();

    await worker.fetch(request('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_type: UserType.HER, instance_id: 'tab-1' }),
    }), env);

    const response = await worker.fetch(request('/api/presence', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instance_id: 'tab-1' }),
    }), env);

    expect(response.ok).toBe(true);
    expect(db.state.presence).toHaveLength(0);
    await expect(response.json()).resolves.toMatchObject({ success: true, data: null });
  });

  it('returns the image url key when deleting an image by full url', async () => {
    const { env } = createEnv();
    const imageDelete = vi.spyOn(env.MEMORY_IMAGES, 'delete');

    const response = await worker.fetch(request('/api/images', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'https://example.com/images/memories/2026-06-18/photo.png' }),
    }), env);

    expect(response.ok).toBe(true);
    expect(imageDelete).toHaveBeenCalledWith('memories/2026-06-18/photo.png');
  });

  it('rejects invalid author on POST /api/memories', async () => {
    const { env } = createEnv();
    const response = await worker.fetch(request('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'x', author: 'UNKNOWN' }),
    }), env);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: 'Invalid author',
    });
  });

  it('rejects invalid user type on POST /api/presence', async () => {
    const { env } = createEnv();
    const response = await worker.fetch(request('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_type: 'UNKNOWN', instance_id: 'tab-1' }),
    }), env);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      message: 'Invalid user type',
    });
  });

  it('returns configured uptime monitors and FAQ entries', async () => {
    const { env } = createEnv();
    const response = await worker.fetch(request('/api/site-config'), env);

    expect(response.ok).toBe(true);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        uptime: {
          provider: expect.any(String),
          monitors: expect.arrayContaining([
            expect.objectContaining({ id: 'us-web', name: 'Us. 主站' }),
            expect.objectContaining({ id: 'newapi', name: 'NewAPI' }),
          ]),
        },
        faq: expect.arrayContaining([
          expect.objectContaining({ question: '这个网站是做什么的？' }),
          expect.objectContaining({ question: '运行时间监控怎么看？' }),
        ]),
      },
    });
  });

  it('checks configured uptime targets', async () => {
    const { env } = createEnv();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const response = await worker.fetch(request('/api/uptime'), env);

    expect(response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        provider: expect.any(String),
        monitors: expect.arrayContaining([
          expect.objectContaining({ id: 'us-web', status: 'up', statusCode: 200 }),
        ]),
      },
    });
  });
});
