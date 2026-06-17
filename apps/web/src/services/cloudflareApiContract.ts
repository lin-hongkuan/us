import { UserType } from '../types';

export interface CloudflareEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PresenceSnapshot {
  partnerOnline: boolean;
  partnerUser: UserType | null;
}

export interface MemoryRowContract {
  id: string;
  content: string;
  author: UserType;
  created_at: string;
  tags: string[];
  image_url: string | null;
  image_urls: string[];
  updated_at?: string;
}

export interface MemoryCreateBody {
  content: string;
  author: UserType;
  created_at: string;
  image_url: string | null;
  image_urls: string[] | null;
  tags?: string[] | null;
}

export interface MemoryPatchBody {
  content?: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  tags?: string[] | null;
}

export interface ImageUploadResult {
  key: string;
  url: string;
}

export interface PresenceHeartbeatBody {
  user_type: UserType;
  instance_id: string;
}

export interface PresenceClearBody {
  instance_id: string;
}

export const isUserType = (value: unknown): value is UserType => {
  return value === UserType.HER || value === UserType.HIM;
};

export const normalizeStringArray = (value: unknown): string[] | null => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string');
  }
  if (typeof value !== 'string' || value.length === 0) return null;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === 'string')
      : null;
  } catch {
    return null;
  }
};
