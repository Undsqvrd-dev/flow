# Supabase-koppeling

FLOW gebruikt Supabase voor **auth** (e-mail + wachtwoord) en **data** (taken, doelen, enz.).
Zustand blijft de UI-bron; Supabase is de bron van waarheid na login.

## Supabase-dashboard (eenmalig)

### Authentication → Providers → Email

- Email provider **aan**
- Password sign-ins **aan**
- Magic link mag uit
- Maak/zet een wachtwoord voor je user (Authentication → Users)

### Authentication → URL Configuration

| Veld | Waarde |
|---|---|
| **Site URL** | `https://flow-ecru-three.vercel.app` |
| **Redirect URLs** | `https://flow-ecru-three.vercel.app/**` |
| | `http://localhost:3000/**` |

### Environment variables

Lokaal (`.env.local`) en in Vercel (Production + Preview) — **elke key apart, alleen de waarde**:

```
NEXT_PUBLIC_SUPABASE_URL=https://oxtgcgwottrqsblfsmmf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Schema

1. `supabase/migrations/001_init.sql` (al gedaan)
2. `supabase/migrations/002_schema_sync.sql` — horizon + values
3. `supabase/migrations/003_moodboard_storage.sql` — foto-bucket moodboard

## Bestanden

- `client.ts` / `server.ts` / `middleware.ts` / `env.ts` — clients + routebescherming
- `mappers.ts` — camelCase ↔ snake_case
- `../db/*` — load/upsert/bootstrap

## Login-flow

1. `/login` — e-mail + wachtwoord
2. Middleware stuurt niet-ingelogde bezoekers naar `/login`
3. Na login: bootstrap laadt remote data; lege DB + lokale data → eenmalige migratie
