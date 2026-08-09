# Supabase-koppeling

FLOW gebruikt Supabase voor **auth** (magic link). Data staat nog in localStorage via
Zustand `persist` — de database-koppeling per store volgt in een volgende stap.

## Supabase-dashboard instellen

### Authentication → URL Configuration

| Veld | Waarde |
|---|---|
| **Site URL** | `https://flow-ecru-three.vercel.app` |
| **Redirect URLs** | `https://flow-ecru-three.vercel.app/**` |
| | `http://localhost:3000/**` |

### Authentication → Providers

- **Email** aan, magic link (geen wachtwoord)
- Na je eerste login: **Disable new user signups**

### Environment variables

Lokaal (`.env.local`) en in Vercel (Production + Preview):

```
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # anon public key
```

## Bestanden

- `client.ts` — browserclient
- `server.ts` — serverclient voor Server Components
- `middleware.ts` — sessie vernieuwen + routebescherming

## Login-flow

1. `/login` — e-mail invoeren → magic link
2. `/auth/callback` — token/code verwerken → door naar `/dashboard`
3. Middleware stuurt niet-ingelogde bezoekers naar `/login`

## Database (volgende stap)

Schema staat in [`supabase/migrations/001_init.sql`](../../supabase/migrations/001_init.sql).
Zodra stores naar Supabase schrijven: TanStack Query + optimistic updates.
