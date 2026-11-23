import { calendarEmail, exchangeAuthCode, googleAccountEmail } from '@/lib/calendar/google';
import { currentUserId, OAUTH_STATE_COOKIE, settingsRedirect } from '@/lib/calendar/http';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = readCookie(request, OAUTH_STATE_COOKIE);

  const finish = (query: Record<string, string>) => clearOauthCookie(settingsRedirect(request, query));

  const userId = await currentUserId();
  if (!userId) return finish({ agenda: 'fout', reden: 'Niet ingelogd' });
  if (!code || !state || !expected || state !== expected) {
    return finish({ agenda: 'fout', reden: 'Ongeldige OAuth-status' });
  }

  try {
    const tokens = await exchangeAuthCode(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      return finish({
        agenda: 'fout',
        reden: 'Google gaf geen refresh-token. Koppel opnieuw en geef toegang.',
      });
    }
    const email = (await googleAccountEmail(tokens.access_token)).toLowerCase();
    const allowed = calendarEmail().toLowerCase();
    if (email !== allowed) {
      return finish({
        agenda: 'fout',
        reden: `Alleen ${allowed} mag gekoppeld worden.`,
      });
    }

    const admin = createAdminClient();
    const { error } = await admin.from('calendar_connections').upsert({
      user_id: userId,
      refresh_token: tokens.refresh_token,
      google_email: email,
      calendar_id: 'primary',
      last_error: null,
    }, { onConflict: 'user_id' });
    if (error) throw new Error(error.message);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Koppelen mislukt';
    return finish({ agenda: 'fout', reden: message });
  }

  return finish({ agenda: 'gekoppeld' });
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') ?? '';
  const match = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

function clearOauthCookie(response: NextResponse): NextResponse {
  response.cookies.set(OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
