-- FLOW — schema-sync voor Zustand ↔ Supabase
-- Uitvoeren in het Supabase SQL-paneel ná 001_init.sql.

alter table goals
  add column if not exists horizon text not null default 'jaar';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'goals_horizon_check'
  ) then
    alter table goals
      add constraint goals_horizon_check
      check (horizon in ('jaar', 'kwartaal', 'maand'));
  end if;
end $$;

-- "values" is reserved in Postgres → flow_values
create table if not exists flow_values (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  text text not null,
  rank int not null default 0
);

alter table flow_values enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'flow_values' and policyname = 'eigen data'
  ) then
    create policy "eigen data" on flow_values
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
