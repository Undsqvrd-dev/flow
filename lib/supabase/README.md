# Supabase-koppeling (nog niet actief)

FLOW draait nu volledig lokaal: alle data staat in `localStorage` via Zustand
`persist` (sleutels `flow-*`). Deze map bevat alles om later naar Supabase te
schakelen zonder het datamodel te wijzigen.

## Stappen om te koppelen

1. Maak een project op [supabase.com](https://supabase.com).
2. Voer [`supabase/migrations/001_init.sql`](../../supabase/migrations/001_init.sql) uit in het SQL-paneel.
3. Zet in Authentication → Providers alleen **Email (magic link)** aan en beperk
   registratie: Authentication → Settings → "Disable new user signups" ná je
   eerste eigen login (whitelist van één account).
4. Kopieer `.env.example` naar `.env.local` en vul de waarden in.
5. `npm install @supabase/supabase-js @supabase/ssr`
6. Vervang de Zustand-persist-laag per store door TanStack Query-hooks op deze
   client (optimistic updates met rollback). De veldnamen in `lib/types.ts`
   mappen 1-op-1 op de kolommen (camelCase ↔ snake_case).

## Bestanden

- `client.ts` — browserclient (te activeren na `npm install @supabase/ssr`)
- `server.ts` — serverclient voor Server Components
