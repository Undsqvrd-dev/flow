import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from '@/lib/supabase/env';

export function createClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error('Supabase env vars ontbreken (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).');
  }
  return createBrowserClient(env.url, env.anonKey);
}
