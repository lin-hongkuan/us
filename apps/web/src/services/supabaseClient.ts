import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY: string = import.meta.env.VITE_SUPABASE_KEY ?? '';

export const isSupabaseConfigured = !!SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_URL.startsWith('http');

export const supabase = isSupabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
}) : null;
