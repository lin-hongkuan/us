import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_CLIENT_KEY = '__us_shared_supabase_client__';

type SupabaseGlobal = typeof globalThis & {
  [SUPABASE_CLIENT_KEY]?: SupabaseClient;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  '';

export const isSupabaseConfigured =
  !!supabaseUrl &&
  !!supabaseAnonKey &&
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
  supabaseUrl.startsWith('http');

const supabaseGlobal = globalThis as SupabaseGlobal;

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? supabaseGlobal[SUPABASE_CLIENT_KEY] ??
    createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

if (supabase) {
  supabaseGlobal[SUPABASE_CLIENT_KEY] = supabase;
}
