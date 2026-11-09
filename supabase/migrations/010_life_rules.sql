-- Leefregels, naast flow_values.
create table if not exists flow_life_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  text text not null,
  rank int not null default 0,
  updated_at timestamptz not null default now()
);

alter table flow_life_rules enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'flow_life_rules' and policyname = 'eigen data'
  ) then
    create policy "eigen data" on flow_life_rules
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

drop trigger if exists flow_life_rules_set_updated_at on flow_life_rules;
create trigger flow_life_rules_set_updated_at
  before insert or update on flow_life_rules
  for each row execute function set_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'flow_life_rules'
  ) then
    alter publication supabase_realtime add table flow_life_rules;
  end if;
end $$;
