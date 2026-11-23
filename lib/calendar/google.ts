import type { GoogleCalendarEvent } from '@/lib/calendar/events';

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function googleConfig(): GoogleConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() ?? '';
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET of GOOGLE_REDIRECT_URI ontbreekt.');
  }
  return { clientId, clientSecret, redirectUri };
}

export function calendarEmail(): string {
  return process.env.GOOGLE_CALENDAR_EMAIL?.trim() || 'steijn@facilityfinder.nl';
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await response.json()) as TokenResponse;
  if (!response.ok) {
    throw new Error(json.error_description || json.error || 'Google-token mislukt');
  }
  return json;
}

export async function exchangeAuthCode(code: string, config = googleConfig()): Promise<TokenResponse> {
  return postToken(new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  }));
}

export async function refreshAccessToken(refreshToken: string, config = googleConfig()): Promise<string> {
  const json = await postToken(new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
  }));
  if (!json.access_token) throw new Error('Google gaf geen access token');
  return json.access_token;
}

export async function googleAccountEmail(accessToken: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const json = (await response.json()) as { email?: string; error?: { message?: string } };
  if (!response.ok || !json.email) {
    throw new Error(json.error?.message || 'Google-account onbekend');
  }
  return json.email;
}

export async function listPrimaryEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleCalendarEvent[]> {
  const events: GoogleCalendarEvent[] = [];
  let pageToken = '';
  do {
    const params = new URLSearchParams({
      singleEvents: 'true',
      orderBy: 'startTime',
      showDeleted: 'true',
      timeMin,
      timeMax,
      maxResults: '250',
    });
    if (pageToken) params.set('pageToken', pageToken);
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    const json = (await response.json()) as {
      items?: GoogleCalendarEvent[];
      nextPageToken?: string;
      error?: { message?: string };
    };
    if (!response.ok) throw new Error(json.error?.message || 'Agenda ophalen mislukt');
    events.push(...(json.items ?? []));
    pageToken = json.nextPageToken ?? '';
  } while (pageToken);
  return events;
}
