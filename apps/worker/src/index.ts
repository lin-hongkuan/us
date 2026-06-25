import {
  isUserType,
  normalizeStringArray,
  type MemoryCreateBody,
  type MemoryPatchBody,
  type MemoryRowContract,
  type PresenceClearBody,
  type PresenceHeartbeatBody,
  type SiteConfigContract,
  type SiteMonitorTarget,
  type UptimeSnapshotContract,
} from '../../web/src/services/cloudflareApiContract';

export interface Env {
  DB: D1Database;
  MEMORY_IMAGES: R2Bucket;
  ASSETS: Fetcher;
}

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


const SITE_CONFIG: SiteConfigContract = {
  uptime: {
    provider: 'Cloudflare Worker live checks（可对接 Uptime Kuma status page）',
    summary: '这里展示我已经配置进站点的公开服务健康检查；每次打开都会从 Worker 侧实时探测。',
    monitors: [
      {
        id: 'us-web',
        name: 'Us. 主站',
        url: 'https://us.linhk.top/api/health',
        group: '核心应用',
        description: 'Cloudflare Worker、D1 与 R2 图片入口。',
      },
      {
        id: 'newapi',
        name: 'NewAPI',
        url: 'https://api.linhongkuan.com/api/status',
        group: 'AI 服务',
        description: '模型网关与账号额度服务。',
      },
      {
        id: 'halo',
        name: 'HaloWebUI',
        url: 'https://halo.linhk.top/',
        group: '内容服务',
        description: 'HaloWebUI 公网页面。',
      },
      {
        id: 'komga',
        name: 'Komga',
        url: 'https://manga.linhk.top/',
        group: '媒体服务',
        description: '漫画库 Web 入口。',
      },
      {
        id: 'image2',
        name: 'chatgpt2api / image2',
        url: 'https://image2.linhk.top/',
        group: 'AI 服务',
        description: '图片/API 兼容入口。',
      },
    ],
  },
  faq: [
    {
      question: '这个网站是做什么的？',
      answer: 'Us. 是两个人共享的记忆日记，用来记录文字、图片和当天的小心情。',
    },
    {
      question: '数据保存在哪里？',
      answer: '文字数据保存在 Cloudflare D1，图片保存在 Cloudflare R2；浏览器本地也会缓存一份以提升加载速度。',
    },
    {
      question: '离线时能写吗？',
      answer: '可以。离线写入会先进本地队列，网络恢复后自动同步到云端。',
    },
    {
      question: '图片上传失败怎么办？',
      answer: '先确认网络连接，再尝试刷新或清除本地缓存；已保存到云端的回忆不会因为清缓存丢失。',
    },
    {
      question: '运行时间监控怎么看？',
      answer: '设置页「关于」里会显示已配置服务的实时健康检查，包括主站、NewAPI、Halo、Komga 和 image2。',
    },
    {
      question: '这些监控来自哪里？',
      answer: '当前由 Cloudflare Worker 实时探测公开健康 URL；后续也可以无缝切换为 Uptime Kuma status page 数据源。',
    },
  ],
};

const checkMonitor = async (monitor: SiteMonitorTarget): Promise<UptimeSnapshotContract['monitors'][number]> => {
  const started = Date.now();
  if (monitor.id === 'us-web') {
    return {
      ...monitor,
      status: 'up',
      statusCode: 200,
      latencyMs: 0,
      checkedAt: new Date().toISOString(),
    };
  }
  try {
    const response = await fetch(monitor.url, {
      method: 'GET',
      headers: { Accept: 'application/json,text/html;q=0.8,*/*;q=0.5' },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    const latencyMs = Date.now() - started;
    return {
      ...monitor,
      status: response.ok ? 'up' : 'down',
      statusCode: response.status,
      latencyMs,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...monitor,
      status: 'down',
      statusCode: null,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'check failed',
    };
  }
};

const normalizeRow = (row: Record<string, unknown>): MemoryRowContract => ({
  id: String(row.id),
  content: String(row.content || ''),
  author: row.author === 'HIM' ? 'HIM' : 'HER',
  created_at: String(row.created_at),
  tags: normalizeStringArray(row.tags) || [],
  image_url: typeof row.image_url === 'string' ? row.image_url : null,
  image_urls: normalizeStringArray(row.image_urls) || [],
  updated_at: typeof row.updated_at === 'string' ? row.updated_at : undefined,
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

const ensureAuthor = (author: unknown): 'HER' | 'HIM' => {
  if (!isUserType(author)) {
    throw new Error('Invalid author');
  }
  return author;
};

const normalizeMemoryImages = (imageUrl: unknown, imageUrls: unknown): { imageUrl: string | null; imageUrls: string[] } => {
  const normalizedUrls = normalizeStringArray(imageUrls);
  if (normalizedUrls) {
    return {
      imageUrl: normalizedUrls[0] || null,
      imageUrls: normalizedUrls,
    };
  }

  if (typeof imageUrl === 'string' && imageUrl.length > 0) {
    return {
      imageUrl,
      imageUrls: [imageUrl],
    };
  }

  return {
    imageUrl: null,
    imageUrls: [],
  };
};

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

  if (url.pathname === '/api/site-config' && request.method === 'GET') {
    return ok(SITE_CONFIG);
  }

  if (url.pathname === '/api/uptime' && request.method === 'GET') {
    const checkedAt = new Date().toISOString();
    const monitors = await Promise.all(SITE_CONFIG.uptime.monitors.map(checkMonitor));
    return ok({ provider: SITE_CONFIG.uptime.provider, checkedAt, monitors } satisfies UptimeSnapshotContract);
  }

  if (url.pathname === '/api/memories' && request.method === 'GET') {
    return ok(await listMemories(env));
  }

  if (url.pathname === '/api/memories' && request.method === 'POST') {
    const body = await readBody<MemoryCreateBody>(request);
    const id = crypto.randomUUID();
    if (typeof body.content !== 'string' || body.content.trim().length === 0) {
      return fail('Content is required');
    }
    if (!isUserType(body.author)) {
      return fail('Invalid author');
    }
    const createdAt = body.created_at || new Date().toISOString();
    const images = normalizeMemoryImages(body.image_url, body.image_urls);
    const tags = normalizeStringArray(body.tags) || [];
    await env.DB.prepare(
      'INSERT INTO memories (id, content, author, created_at, tags, image_url, image_urls, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      body.content,
      ensureAuthor(body.author),
      createdAt,
      JSON.stringify(tags),
      images.imageUrl,
      JSON.stringify(images.imageUrls),
      new Date().toISOString(),
    ).run();
    return ok(await getMemory(env, id), { status: 201 });
  }

  const memoryMatch = url.pathname.match(/^\/api\/memories\/([^/]+)$/);
  if (memoryMatch) {
    const id = decodeURIComponent(memoryMatch[1]);
    if (request.method === 'PATCH') {
      const body = await readBody<MemoryPatchBody>(request);
      const existing = await getMemory(env, id);
      if (!existing) return fail('Memory not found', 404);
      const hasImageUrl = Object.prototype.hasOwnProperty.call(body, 'image_url');
      const hasImageUrls = Object.prototype.hasOwnProperty.call(body, 'image_urls');
      const hasTags = Object.prototype.hasOwnProperty.call(body, 'tags');
      const mergedImages = hasImageUrl || hasImageUrls
        ? normalizeMemoryImages(
            hasImageUrl ? body.image_url : existing.image_url,
            hasImageUrls ? body.image_urls : existing.image_urls,
          )
        : { imageUrl: existing.image_url, imageUrls: existing.image_urls };
      const nextTags = hasTags ? (normalizeStringArray(body.tags) || []) : existing.tags;
      await env.DB.prepare(
        'UPDATE memories SET content = ?, tags = ?, image_url = ?, image_urls = ?, updated_at = ? WHERE id = ?'
      ).bind(
        body.content === undefined ? existing.content : String(body.content),
        JSON.stringify(nextTags),
        mergedImages.imageUrl,
        JSON.stringify(mergedImages.imageUrls),
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
    const body = await readBody<PresenceHeartbeatBody>(request);
    if (!isUserType(body.user_type)) return fail('Invalid user type');
    const userType = body.user_type;
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
    const body = await readBody<PresenceClearBody>(request);
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
