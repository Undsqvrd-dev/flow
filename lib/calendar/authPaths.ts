/** Cron heeft geen gebruikerssessie; het route-bestand controleert CRON_SECRET. */
export function skipsAuth(pathname: string): boolean {
  return pathname.startsWith('/api/cron/');
}

export function googleAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  loginHint: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    scope: 'openid email https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    login_hint: input.loginHint,
    state: input.state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export const DEFAULT_CALENDAR_EMAIL = 'steijn@facilityfinder.nl';
