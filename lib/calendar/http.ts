import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const OAUTH_STATE_COOKIE = 'flow_google_oauth';

export async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function settingsRedirect(request: Request, query: Record<string, string>): NextResponse {
  const url = new URL('/settings', request.url);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return NextResponse.redirect(url);
}
