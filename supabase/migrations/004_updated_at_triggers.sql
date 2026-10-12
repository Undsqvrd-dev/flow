-- FLOW — updated_at triggers voor conflict-aware sync
-- Zorgt ervoor dat updated_at altijd door de server wordt gezet bij wijzigingen.

-- Generieke trigger-functie die updated_at op now() zet
create or replace function set_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

-- Helper: maak trigger alleen aan als deze nog niet bestaat
do $$
declare
  trigger_name text;
  table_name text;
  pairs text[][] := array[
    array['tasks_updated_at', 'tasks'],
    array['focus_updated_at', 'focus'],
    array['goals_updated_at', 'goals'],
    array['flow_values_updated_at', 'flow_values'],
    array['sport_sessions_updated_at', 'sport_sessions'],
    array['day_states_updated_at', 'day_states'],
    array['pomodoro_sessions_updated_at', 'pomodoro_sessions'],
    array['ideas_updated_at', 'ideas']
  ];
  pair text[];
begin
  foreach pair slice 1 in array pairs
  loop
    trigger_name := pair[1];
    table_name := pair[2];
    if not exists (
      select 1 from pg_trigger
      where tgname = trigger_name
    ) then
      execute format(
        'create trigger %I before update on %I for each row execute function set_updated_at()',
        trigger_name, table_name
      );
    end if;
  end loop;
end $$;

-- Voeg updated_at kolom toe aan tabellen die deze nog missen
alter table goals add column if not exists updated_at timestamptz not null default now();
alter table flow_values add column if not exists updated_at timestamptz not null default now();
alter table sport_sessions add column if not exists updated_at timestamptz not null default now();
alter table day_states add column if not exists updated_at timestamptz not null default now();
alter table pomodoro_sessions add column if not exists updated_at timestamptz not null default now();
alter table ideas add column if not exists updated_at timestamptz not null default now();

-- Enable realtime voor alle tabellen (veilig: alleen toevoegen als nog niet aanwezig)
do $$
declare
  t text;
begin
  foreach t in array array['tasks', 'goals', 'flow_values', 'focus', 'sport_sessions', 'day_states', 'pomodoro_sessions']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
