import type {
  ImageUploadResult,
  MemoryCreateBody,
  MemoryPatchBody,
  MemoryRowContract,
  PresenceClearBody,
  PresenceHeartbeatBody,
  PresenceSnapshot,
  SiteConfigContract,
  UptimeSnapshotContract,
} from './cloudflareApiContract';

export const API_BASE_URL = (import.meta.env.VITE_CLOUDFLARE_API_BASE_URL || '').replace(/\/$/, '');
const IS_TEST = import.meta.env.MODE === 'test';

const apiUrl = (path: string): string => {
  if (API_BASE_URL) return `${API_BASE_URL}${path}`;
  // Browser builds should use same-origin relative routes. Node/Vitest fetch requires absolute URLs.
  if (typeof window !== 'undefined' && !IS_TEST) return path;
  return `http://127.0.0.1${path}`;
};

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  let parsed: { success?: boolean; data?: T; message?: string } | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as typeof parsed;
    } catch {
      throw new Error(`Cloudflare API returned invalid JSON: ${text.slice(0, 200)}`);
    }
  }
  if (!response.ok || !parsed?.success) {
    throw new Error(parsed?.message || `Cloudflare API request failed: ${response.status}`);
  }
  return parsed.data as T;
};

export const isCloudflareConfigured = true;

export const listMemories = async (): Promise<MemoryRowContract[]> => {
  const response = await fetch(apiUrl('/api/memories'), {
    headers: { Accept: 'application/json' },
  });
  return parseJsonResponse<MemoryRowContract[]>(response);
};

export const createMemory = async (payload: MemoryCreateBody): Promise<MemoryRowContract> => {
  const response = await fetch(apiUrl('/api/memories'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<MemoryRowContract>(response);
};

export const updateMemoryRow = async (id: string, payload: MemoryPatchBody): Promise<MemoryRowContract> => {
  const response = await fetch(apiUrl(`/api/memories/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<MemoryRowContract>(response);
};

export const deleteMemoryRow = async (id: string): Promise<void> => {
  const response = await fetch(apiUrl(`/api/memories/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });
  await parseJsonResponse<null>(response);
};

export const uploadImageFile = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append('image', file, file.name);
  const response = await fetch(apiUrl('/api/images'), {
    method: 'POST',
    body: form,
  });
  const data = await parseJsonResponse<ImageUploadResult>(response);
  return data.url;
};

export const deleteImageKey = async (keyOrUrl: string): Promise<void> => {
  const response = await fetch(apiUrl('/api/images'), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ key: keyOrUrl }),
  });
  await parseJsonResponse<null>(response);
};

export const heartbeatPresence = async (body: PresenceHeartbeatBody): Promise<PresenceSnapshot> => {
  const response = await fetch(apiUrl('/api/presence'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJsonResponse<PresenceSnapshot>(response);
};

export const clearPresence = async (body: PresenceClearBody): Promise<void> => {
  const response = await fetch(apiUrl('/api/presence'), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  await parseJsonResponse<null>(response);
};

export const isApiAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(apiUrl('/api/health'), { headers: { Accept: 'application/json' } });
    const data = await response.json();
    return response.ok && data?.success === true;
  } catch {
    return false;
  }
};


export const fetchSiteConfig = async (): Promise<SiteConfigContract> => {
  const response = await fetch(apiUrl('/api/site-config'), {
    headers: { Accept: 'application/json' },
  });
  return parseJsonResponse<SiteConfigContract>(response);
};

export const fetchUptimeSnapshot = async (): Promise<UptimeSnapshotContract> => {
  const response = await fetch(apiUrl('/api/uptime'), {
    headers: { Accept: 'application/json' },
  });
  return parseJsonResponse<UptimeSnapshotContract>(response);
};
