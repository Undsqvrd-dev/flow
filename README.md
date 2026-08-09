# FLOW

Persoonlijk werk- en levensbesturingssysteem. Vervangt Trello als dagelijkse
to-do-tool en voegt de laag toe die Trello mist: **richting**.

> Trello laat me zien wat ik kán doen. FLOW zet me scherp op wat vandaag telt.

De volledige specificatie staat in [`PROJECT.md`](PROJECT.md).

## Starten

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — de app opent op het dashboard.

## Scripts

| Commando | Doel |
|---|---|
| `npm run dev` | Ontwikkelserver |
| `npm run build` | Productiebuild |
| `npm test` | Unittests (o.a. `lib/priority.ts`) |
| `npx tsx scripts/import-trello.ts export.json` | Trello-export omzetten naar FLOW-taken (kan ook in de app via Instellingen) |

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Radix UI · dnd-kit ·
Zustand (persist) · Framer Motion · Recharts · date-fns (`nl`) · next-themes.

## Data

Na login is **Supabase** de bron van waarheid. Zustand cache’t lokaal (`flow-*`).
Schema: [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) +
[`002_schema_sync.sql`](supabase/migrations/002_schema_sync.sql).
Setup: [`lib/supabase/README.md`](lib/supabase/README.md).
