# Google Agenda in Flow

Flow leest de primaire Google Agenda van `steijn@facilityfinder.nl` en zet afspraken als alleen-lezen kaarten op het bord. Taken blijven een aparte tabel. Het refresh-token staat alleen in `calendar_connections` en is voor de browser niet leesbaar.

Pas `supabase/migrations/014_google_calendar.sql` zelf toe. Deze agent voert hem niet uit op productie.

## Omgevingsvariabelen

Zet deze in Vercel (Production en Preview), niet in de client:

| Variabele | Waarde |
| --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth-client-ID uit Google Cloud |
| `GOOGLE_CLIENT_SECRET` | OAuth-client-secret |
| `GOOGLE_REDIRECT_URI` | `https://flow-ecru-three.vercel.app/api/calendar/callback` |
| `GOOGLE_CALENDAR_EMAIL` | `steijn@facilityfinder.nl` (dit is ook de standaard) |
| `CRON_SECRET` | Lang willekeurig geheim. Vercel stuurt `Authorization: Bearer <CRON_SECRET>` naar de cron. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key uit Supabase → Project Settings → API. Alleen server. |

Bestaande variabelen blijven nodig: `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Lokaal testen mag een tweede redirect URI toevoegen, bijvoorbeeld `http://localhost:3000/api/calendar/callback`, en die als `GOOGLE_REDIRECT_URI` zetten. Productie blijft de Vercel-URL.

## Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) met het account dat de app mag beheren.
2. Maak of kies een project.
3. **APIs & Services → Library**: zet **Google Calendar API** aan.
4. **APIs & Services → OAuth consent screen**:
   - User type **External** (of Internal als het een Workspace-organisatie is).
   - App-naam bijvoorbeeld `Flow`.
   - Support-e-mail en developer contact: `steijn@facilityfinder.nl`.
   - Scopes: `openid`, `email` en `https://www.googleapis.com/auth/calendar.readonly`. Geen schrijfrechten.
   - Staat de app op **Testing**, voeg `steijn@facilityfinder.nl` toe als test user.
5. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URI, exact: `https://flow-ecru-three.vercel.app/api/calendar/callback`
6. Kopieer Client ID en Client secret naar de Vercel-variabelen hierboven.
7. Zet ook `CRON_SECRET` en `SUPABASE_SERVICE_ROLE_KEY`.
8. Draai migratie `014_google_calendar.sql` in Supabase.
9. Deploy opnieuw, zodat de cron en de nieuwe routes live zijn.
10. In Flow: **Instellingen → Koppel Google Agenda**. Log in als `steijn@facilityfinder.nl` en geef leestoegang. Een ander Google-account wordt geweigerd.

Daarna haalt Vercel Cron (`vercel.json`, `*/15 * * * *`) deze week en volgende week op. **Nu synchroniseren** doet hetzelfde meteen. Op het Hobby-plan van Vercel mag een cron soms maar één keer per dag draaien; het schema vraagt elke 15 minuten. Lukt dat niet, dan blijft de knop werken.

## Wat er niet gebeurt

- Gewone taken worden niet aangemaakt, gewijzigd of verwijderd.
- Afvinken gebeurt alleen in Flow (`done`) en gaat niet terug naar Google.
- Het refresh-token gaat nooit naar de browser. De status komt uit `calendar_connection_status()`.
