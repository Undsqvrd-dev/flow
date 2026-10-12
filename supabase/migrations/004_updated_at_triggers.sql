-- FLOW — server-side updated_at en stale-write bescherming.
-- Eerst kolommen, daarna de trigger. Een UPDATE die een oudere updated_at
-- meestuurt wordt overgeslagen; elke geaccepteerde schrijfactie (ook rauwe SQL)
-- krijgt updated_at = now().

alter table goals add column if not exists updated_at timestamptz not null default now();
alter table flow_values add column if not exists updated_at timestamptz not null default now();
alter table sport_sessions add column if not exists updated_at timestamptz not null default now();
alter table day_states add column if not exists updated_at timestamptz not null default now();
alter table pomodoro_sessions add column if not exists updated_at timestamptz not null default now();
alter table ideas add column if not exists updated_at timestamptz not null default now();

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'UPDATE'
     and NEW.updated_at is not null
     and OLD.updated_at is not null
     and NEW.updated_at < OLD.updated_at then
    return null;
  end if;
  NEW.updated_at = now();
  return NEW;
end;
$$;

do $$
declare
  tables text[] := array[
    'tasks',
    'focus',
    'goals',
    'flow_values',
    'sport_sessions',
    'day_states',
    'pomodoro_sessions',
    'ideas'
  ];
  rel text;
  trigger_name text;
begin
  foreach rel in array tables
  loop
    trigger_name := rel || '_set_updated_at';
    execute format('drop trigger if exists %I on %I', trigger_name, rel);
    execute format(
      'create trigger %I before insert or update on %I for each row execute function set_updated_at()',
      trigger_name,
      rel
    );
  end loop;
end $$;

do $$
declare
  tables text[] := array[
    'tasks',
    'goals',
    'flow_values',
    'focus',
    'sport_sessions',
    'day_states',
    'pomodoro_sessions'
  ];
  rel text;
begin
  foreach rel in array tables
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = rel
    ) then
      execute format('alter publication supabase_realtime add table %I', rel);
    end if;
  end loop;
end $$;
