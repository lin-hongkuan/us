export interface Env {
  DB: D1Database;
  MEMORY_IMAGES: R2Bucket;
  ASSETS: Fetcher;
}

type MemoryRow = {
  id: string;
  content: string;
  author: 'HER' | 'HIM';
  created_at: string;
  tags?: string[] | null;
  image_url?: string | null;
  image_urls?: string[] | null;
};

const json = (data: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(data), {
  ...init,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...corsHeaders(),
    ...(init.headers || {}),
  },
});

const ok = (data: unknown = null, init: ResponseInit = {}) => json({ success: true, data }, init);
const fail = (message: string, status = 400) => json({ success: false, message }, { status });

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Accept',
});

const parseJsonArray = (value: unknown): string[] | null => {
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string');
  if (typeof value !== 'string' || !value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : null;
  } catch {
    return null;
  }
};

const normalizeRow = (row: Record<string, unknown>): MemoryRow => ({
  id: String(row.id),
  content: String(row.content || ''),
  author: row.author === 'HIM' ? 'HIM' : 'HER',
  created_at: String(row.created_at),
  tags: parseJsonArray(row.tags),
  image_url: typeof row.image_url === 'string' ? row.image_url : null,
  image_urls: parseJsonArray(row.image_urls),
});

const readBody = async <T>(request: Request): Promise<T> => {
  try {
    return await request.json() as T;
  } catch {
    throw new Error('Invalid JSON body');
  }
};

const listMemories = async (env: Env) => {
  const { results } = await env.DB.prepare('SELECT * FROM memories ORDER BY created_at DESC').all<Record<string, unknown>>();
  return (results || []).map(normalizeRow);
};

const getMemory = async (env: Env, id: string) => {
  const row = await env.DB.prepare('SELECT * FROM memories WHERE id = ?').bind(id).first<Record<string, unknown>>();
  return row ? normalizeRow(row) : null;
};

const ensureAuthor = (author: unknown): 'HER' | 'HIM' => author === 'HIM' ? 'HIM' : 'HER';

const imageKeyFromUrlOrKey = (input: string): string => {
  try {
    const url = new URL(input);
    const marker = '/images/';
    const idx = url.pathname.indexOf(marker);
    if (idx !== -1) return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    // not a URL
  }
  return input.replace(/^\/+/, '');
};

const contentTypeForKey = (key: string, fallback = 'application/octet-stream') => {
  const lower = key.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return fallback;
};

const handleApi = async (request: Request, env: Env, url: URL): Promise<Response> => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });

  if (url.pathname === '/api/health') {
    return ok({ service: 'us-cloudflare', now: new Date().toISOString() });
  }

  if (url.pathname === '/api/memories' && request.method === 'GET') {
    return ok(await listMemories(env));
  }

  if (url.pathname === '/api/memories' && request.method === 'POST') {
    const body = await readBody<Partial<MemoryRow>>(request);
    const id = crypto.randomUUID();
    const createdAt = body.created_at || new Date().toISOString();
    const imageUrls = parseJsonArray(body.image_urls) || (body.image_url ? [String(body.image_url)] : null);
    await env.DB.prepare(
      'INSERT INTO memories (id, content, author, created_at, tags, image_url, image_urls, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      String(body.content || ''),
      ensureAuthor(body.author),
      createdAt,
      JSON.stringify(parseJsonArray(body.tags) || []),
      imageUrls?.[0] || body.image_url || null,
      JSON.stringify(imageUrls || []),
      new Date().toISOString(),
    ).run();
    return ok(await getMemory(env, id), { status: 201 });
  }

  const memoryMatch = url.pathname.match(/^\/api\/memories\/([^/]+)$/);
  if (memoryMatch) {
    const id = decodeURIComponent(memoryMatch[1]);
    if (request.method === 'PATCH') {
      const body = await readBody<Partial<MemoryRow>>(request);
      const existing = await getMemory(env, id);
      if (!existing) return fail('Memory not found', 404);
      const imageUrls = body.image_urls === undefined ? existing.image_urls : parseJsonArray(body.image_urls);
      const imageUrl = body.image_url === undefined ? (imageUrls?.[0] || existing.image_url || null) : body.image_url;
      await env.DB.prepare(
        'UPDATE memories SET content = ?, image_url = ?, image_urls = ?, updated_at = ? WHERE id = ?'
      ).bind(
        body.content === undefined ? existing.content : String(body.content),
        imageUrl || null,
        JSON.stringify(imageUrls || []),
        new Date().toISOString(),
        id,
      ).run();
      return ok(await getMemory(env, id));
    }
    if (request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM memories WHERE id = ?').bind(id).run();
      return ok(null);
    }
  }

  if (url.pathname === '/api/images' && request.method === 'POST') {
    const form = await request.formData();
    const image = form.get('image');
    if (!(image instanceof File)) return fail('Missing image file');
    const ext = image.name.split('.').pop()?.toLowerCase() || 'jpg';
    const key = `memories/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
    await env.MEMORY_IMAGES.put(key, image.stream(), {
      httpMetadata: {
        contentType: image.type || contentTypeForKey(key),
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
    return ok({ key, url: `/images/${encodeURI(key)}` }, { status: 201 });
  }

  if (url.pathname === '/api/images' && request.method === 'DELETE') {
    const body = await readBody<{ key?: string }>(request);
    if (body.key) await env.MEMORY_IMAGES.delete(imageKeyFromUrlOrKey(body.key));
    return ok(null);
  }

  if (url.pathname === '/api/presence' && request.method === 'POST') {
    const body = await readBody<{ user_type?: string; instance_id?: string }>(request);
    const userType = ensureAuthor(body.user_type);
    const instanceId = body.instance_id || crypto.randomUUID();
    const now = Date.now();
    await env.DB.prepare(
      'INSERT INTO presence (instance_id, user_type, online_at) VALUES (?, ?, ?) ON CONFLICT(instance_id) DO UPDATE SET user_type = excluded.user_type, online_at = excluded.online_at'
    ).bind(instanceId, userType, now).run();
    await env.DB.prepare('DELETE FROM presence WHERE online_at < ?').bind(now - 70_000).run();
    const partner = await env.DB.prepare(
      'SELECT user_type FROM presence WHERE user_type != ? AND online_at >= ? LIMIT 1'
    ).bind(userType, now - 70_000).first<{ user_type: 'HER' | 'HIM' }>();
    return ok({ partnerOnline: !!partner, partnerUser: partner?.user_type || null });
  }

  if (url.pathname === '/api/presence' && request.method === 'DELETE') {
    const body = await readBody<{ instance_id?: string }>(request);
    if (body.instance_id) await env.DB.prepare('DELETE FROM presence WHERE instance_id = ?').bind(body.instance_id).run();
    return ok(null);
  }

  return fail('Not found', 404);
};

const handleImage = async (request: Request, env: Env, url: URL): Promise<Response> => {
  const key = decodeURIComponent(url.pathname.slice('/images/'.length));
  if (!key) return fail('Missing image key', 404);
  const object = await env.MEMORY_IMAGES.get(key);
  if (!object) return fail('Image not found', 404);
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || contentTypeForKey(key),
      'Cache-Control': object.httpMetadata?.cacheControl || 'public, max-age=31536000, immutable',
      'ETag': object.httpEtag,
    },
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith('/api/')) return await handleApi(request, env, url);
      if (url.pathname.startsWith('/images/')) return await handleImage(request, env, url);
      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error(error);
      return fail(error instanceof Error ? error.message : 'Internal error', 500);
    }
  },
};
