import type { MemoryRow, MemoryInsertPayload, MemoryUpdatePayload } from './memoryMapper';
import { UserType } from '../types';

export const API_BASE_URL = (import.meta.env.VITE_CLOUDFLARE_API_BASE_URL || '').replace(/\/$/, '');

const apiUrl = (path: string): string => {
  if (API_BASE_URL) return `${API_BASE_URL}${path}`;
  // Browser builds should use same-origin relative routes. Node/Vitest fetch requires absolute URLs.
  if (typeof window !== 'undefined') return path;
  return `http://127.0.0.1${path}`;
};

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!response.ok || !parsed?.success) {
    throw new Error(parsed?.message || `Cloudflare API request failed: ${response.status}`);
  }
  return parsed.data as T;
};

export const isCloudflareConfigured = true;

export const listMemories = async (): Promise<MemoryRow[]> => {
  const response = await fetch(apiUrl('/api/memories'), {
    headers: { Accept: 'application/json' },
  });
  return parseJsonResponse<MemoryRow[]>(response);
};

export const createMemory = async (payload: MemoryInsertPayload): Promise<MemoryRow> => {
  const response = await fetch(apiUrl('/api/memories'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<MemoryRow>(response);
};

export const updateMemoryRow = async (id: string, payload: MemoryUpdatePayload): Promise<MemoryRow> => {
  const response = await fetch(apiUrl(`/api/memories/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseJsonResponse<MemoryRow>(response);
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
  const data = await parseJsonResponse<{ url: string }>(response);
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

export const heartbeatPresence = async (userType: UserType, instanceId: string): Promise<{ partnerOnline: boolean; partnerUser: UserType | null }> => {
  const response = await fetch(apiUrl('/api/presence'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ user_type: userType, instance_id: instanceId }),
  });
  return parseJsonResponse<{ partnerOnline: boolean; partnerUser: UserType | null }>(response);
};

export const clearPresence = async (instanceId: string): Promise<void> => {
  const response = await fetch(apiUrl('/api/presence'), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ instance_id: instanceId }),
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
