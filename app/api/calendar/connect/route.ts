import { NextResponse } from 'next/server';
import { calendarEmail, googleConfig } from '@/lib/calendar/google';
import { googleAuthUrl } from '@/lib/calendar/authPaths';
import { currentUserId, OAUTH_STATE_COOKIE } from '@/lib/calendar/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.redirect(new URL('/login', request.url));

  let config;
  try {
    config = googleConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google is niet geconfigureerd';
    return NextResponse.redirect(new URL(`/settings?agenda=fout&reden=${encodeURIComponent(message)}`, request.url));
  }

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(googleAuthUrl({
    clientId: config.clientId,
    redirectUri: config.redirectUri,
    state,
    loginHint: calendarEmail(),
  }));
  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  return response;
}
