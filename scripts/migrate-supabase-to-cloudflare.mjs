#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempDir = os.tmpdir();
const dryRun = process.argv.includes('--dry-run');
const readSecretFallback = async (envKey, filename) => {
  if (process.env[envKey]) return process.env[envKey];
  return fs.readFile(path.join(tempDir, filename), 'utf8');
};

const supabaseUrl = (await readSecretFallback('SUPABASE_URL', 'us_supabase_url.txt')).trim().replace(/\/$/, '');
const supabaseKey = (await readSecretFallback('SUPABASE_ANON_KEY', 'us_supabase_anon.txt')).trim();
const workerBaseUrl = (process.env.US_WORKER_BASE_URL || 'https://us.linhk.top').replace(/\/$/, '');

const requestJson = async (url, options = {}) => {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`); }
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}: ${text.slice(0, 500)}`);
  return data;
};

const run = (args, input) => {
  const res = spawnSync('npx', ['--yes', 'wrangler', ...args], {
    cwd: repoRoot,
    input,
    encoding: 'utf8',
    stdio: input ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  if (res.status !== 0) {
    throw new Error(`wrangler ${args.join(' ')} failed\nSTDOUT:\n${res.stdout}\nSTDERR:\n${res.stderr}`);
  }
  return res.stdout;
};

const quoteSql = (value) => value == null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;
const toJsonArray = (value) => JSON.stringify(Array.isArray(value) ? value : []);

const extractSupabasePath = (url) => {
  try {
    const u = new URL(url);
    const marker = '/storage/v1/object/public/memory-images/';
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch { return null; }
};

const extFromContentType = (contentType) => {
  if (contentType?.includes('png')) return 'png';
  if (contentType?.includes('webp')) return 'webp';
  if (contentType?.includes('gif')) return 'gif';
  return 'jpg';
};

const dataUrlToImage = (url) => {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(url || '');
  if (!match) return null;
  const contentType = match[1] || 'application/octet-stream';
  return {
    buffer: Buffer.from(match[2], 'base64'),
    contentType,
    ext: extFromContentType(contentType),
  };
};

const putR2Object = async ({ buffer, key, contentType, index, ext }) => {
  const tmp = path.join(tempDir, `us-r2-${process.pid}-${index}.${ext || extFromContentType(contentType)}`);
  await fs.writeFile(tmp, buffer);
  if (!dryRun) {
    run(['r2', 'object', 'put', `memory-images/${key}`, '--remote', '--file', tmp, '--content-type', contentType || 'application/octet-stream']);
  }
  await fs.unlink(tmp).catch(() => {});
  return `/images/${encodeURI(key)}`;
};

const migrateImage = async (url, index) => {
  if (!url || url.startsWith('/images/') || url.startsWith('blob:')) return url;

  const embedded = dataUrlToImage(url);
  if (embedded) {
    const key = `memories/imported/data-url-${index}-${crypto.randomUUID()}.${embedded.ext}`;
    return putR2Object({ ...embedded, key, index });
  }

  const res = await fetch(url, { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } });
  if (!res.ok) {
    console.warn(`skip image ${index}: HTTP ${res.status} ${url}`);
    return url;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const sourcePath = extractSupabasePath(url);
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const ext = sourcePath?.split('.').pop() || extFromContentType(contentType);
  const key = `memories/imported/${sourcePath ? sourcePath.replace(/^\/+/, '') : `${crypto.randomUUID()}.${ext}`}`;
  return putR2Object({ buffer, key, contentType, index, ext });
};

console.log('Fetching Supabase memories...');
const rows = await requestJson(`${supabaseUrl}/rest/v1/memories?select=*&order=created_at.desc`, {
  headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, Accept: 'application/json' },
});
console.log(`Fetched ${rows.length} memories`);

const migrated = [];
let imageIndex = 0;
for (const row of rows) {
  const originalUrls = Array.isArray(row.image_urls) ? row.image_urls : (row.image_url ? [row.image_url] : []);
  const newUrls = [];
  for (const imageUrl of originalUrls) {
    imageIndex += 1;
    newUrls.push(await migrateImage(imageUrl, imageIndex));
  }
  migrated.push({ ...row, image_url: newUrls[0] || null, image_urls: newUrls });
}

console.log(`Migrated ${imageIndex} image references`);

const statements = [];
statements.push('DELETE FROM memories;');
statements.push('DELETE FROM presence;');
for (const row of migrated) {
  statements.push(`INSERT INTO memories (id, content, author, created_at, tags, image_url, image_urls, updated_at) VALUES (${quoteSql(row.id)}, ${quoteSql(row.content)}, ${quoteSql(row.author)}, ${quoteSql(row.created_at)}, ${quoteSql(toJsonArray(row.tags))}, ${quoteSql(row.image_url)}, ${quoteSql(toJsonArray(row.image_urls))}, ${quoteSql(new Date().toISOString())});`);
}
const sql = statements.join('\n');
const sqlPath = path.join(tempDir, 'us_d1_import.sql');
await fs.writeFile(sqlPath, sql);
if (dryRun) {
  console.log(JSON.stringify({ success: true, dryRun: true, memories: migrated.length, images: imageIndex, workerBaseUrl }));
} else {
  console.log('Importing into D1...');
  run(['d1', 'execute', 'us-memories', '--remote', '--file', sqlPath]);
  console.log(JSON.stringify({ success: true, memories: migrated.length, images: imageIndex, workerBaseUrl }));
}
