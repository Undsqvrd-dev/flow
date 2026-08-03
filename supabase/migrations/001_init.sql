-- FLOW — initieel schema (§4 van PROJECT.md)
-- Uitvoeren in het Supabase SQL-paneel of via `supabase db push`.

create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  title text not null,
  scope text not null check (scope in ('zakelijk','prive')),
  color text not null default '#1F9254',
  target_value numeric, current_value numeric not null default 0,
  unit text, deadline date, active boolean not null default true,
  rank int not null default 0,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  title text not null,
  description text,
  day_key text not null default 'algemeen',
  daypart text check (daypart in ('ochtend','dag','avond')),
  rank int not null default 0,
  goal_id uuid references goals on delete set null,
  urgent boolean,                      -- null = niet beoordeeld
  important boolean,                   -- null = niet beoordeeld
  estimate_min int,
  labels text[] not null default '{}',
  done boolean not null default false,
  completed_at timestamptz,
  due_date date,
  checklist jsonb not null default '[]',
  comments jsonb not null default '[]',
  from_previous_week boolean not null default false,
  week_of date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on tasks (user_id, week_of, day_key, daypart, rank);

create table focus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  week_of date not null,
  goal_id uuid references goals on delete set null,
  headline text,
  day_focus_task_id uuid references tasks on delete set null,
  day_focus_note text,
  day_focus_date date,
  updated_at timestamptz not null default now(),
  unique (user_id, week_of)
);

create table ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  body text not null, scope text not null default 'zakelijk',
  status text not null default 'dumpbak',
  task_id uuid references tasks on delete set null,
  created_at timestamptz not null default now()
);

create table sport_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  date date not null, type text not null,
  duration_min int not null, intensity int not null default 3, note text
);

create table day_states (
  user_id uuid references auth.users not null default auth.uid(),
  date date not null, closed boolean not null default false,
  closed_at timestamptz, reflection text,
  primary key (user_id, date)
);

create table pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  task_id uuid references tasks on delete set null,
  mode text not null check (mode in ('focus','pauze')),
  planned_min int not null, actual_min int not null,
  started_at timestamptz not null, completed boolean not null default false
);

create table settings (
  user_id uuid primary key references auth.users default auth.uid(),
  data jsonb not null default '{}'
);

-- RLS op alle tabellen: alleen eigen data.
do $$
declare t text;
begin
  foreach t in array array['goals','tasks','focus','ideas','sport_sessions','day_states','pomodoro_sessions','settings']
  loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "eigen data" on %I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t
    );
  end loop;
end $$;
