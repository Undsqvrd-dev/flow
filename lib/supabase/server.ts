import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from '@/lib/supabase/env';

export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error('Supabase env vars ontbreken (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).');
  }

  const cookieStore = await cookies();

  return createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll kan falen in Server Components — middleware vernieuwt de sessie.
          }
        },
      },
    },
  );
}
