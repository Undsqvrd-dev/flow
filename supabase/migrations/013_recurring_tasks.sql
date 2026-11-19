-- Terugkerende taken (routines) voor het weekbord.
--
-- Veilig om vóór de app-deploy te draaien. Deze migratie voegt alleen een tabel
-- toe en vervangt ensure_daily_rituals. Zolang een gebruiker nog geen rijen
-- heeft, blijft de functie exact Mediteren, Sport en Dagafsluiting aanmaken
-- zoals migratie 012. Na de seed (bestaande gebruikers) komen die drie uit de
-- tabel, met dezelfde ritual_key, rank, dagdeel en schatting. Er wordt niets
-- gedropt: geen tabellen, geen kolommen, en ensure_daily_meditation blijft.
--
-- Afgevinkte kaarten worden nooit verwijderd. Alleen open kaarten van de
-- meegegeven datum of later, waarvan de weekdag niet meer in het schema zit
-- (of de routine gepauzeerd is), gaan weg. De skip die de delete-trigger
-- daarbij schrijft, wordt meteen weer gewist, zodat een schema dat later
-- terugwijzigt de kaart opnieuw mag aanmaken.

create table if not exists recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  title text not null,
  description text,
  checklist jsonb not null default '[]'::jsonb,
  label_ids text[] not null default '{}',
  daypart text check (daypart is null or daypart in ('ochtend', 'dag', 'avond')),
  estimate_min int,
  streak boolean not null default false,
  schedule text not null check (schedule in ('daily', 'weekdays', 'times_per_week')),
  weekdays text[] not null default '{}',
  times_per_week int check (times_per_week is null or times_per_week between 1 and 7),
  rank int not null default 1000,
  ritual_prefix text not null,
  paused boolean not null default false,
  builtin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_tasks_user_prefix unique (user_id, ritual_prefix),
  constraint recurring_tasks_weekdays_ok check (
    weekdays <@ array['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']::text[]
  )
);

create index if not exists recurring_tasks_user_idx on recurring_tasks (user_id, rank);

drop trigger if exists recurring_tasks_set_updated_at on recurring_tasks;
create trigger recurring_tasks_set_updated_at
  before insert or update on recurring_tasks
  for each row execute function set_updated_at();

alter table recurring_tasks enable row level security;

drop policy if exists "eigen data" on recurring_tasks;
create policy "eigen data" on recurring_tasks
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on recurring_tasks to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'recurring_tasks'
  ) then
    alter publication supabase_realtime add table recurring_tasks;
  end if;
end $$;

-- Bestaande accounts krijgen de drie rituelen als bewerkbare routines.
-- Mediteren en Dagafsluiting (en Sport, zoals migratie 011) krijgen het
-- label Persoonlijk wanneer dat in de instellingen staat.
insert into recurring_tasks (
  user_id, title, description, checklist, label_ids, daypart, estimate_min,
  streak, schedule, weekdays, times_per_week, rank, ritual_prefix, paused, builtin
)
select
  u.id,
  seed.title,
  seed.description,
  seed.checklist,
  case
    when flow_personal_label_id(u.id) is null then '{}'::text[]
    else array[flow_personal_label_id(u.id)]
  end,
  seed.daypart,
  seed.estimate_min,
  seed.streak,
  'daily',
  array['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'],
  null,
  seed.rank,
  seed.ritual_prefix,
  false,
  true
from auth.users u
cross join (
  values
    (
      'Mediteren'::text,
      null::text,
      '[]'::jsonb,
      null::text,
      null::int,
      true,
      0,
      'mediteren'::text
    ),
    (
      'Sport',
      null,
      '[]'::jsonb,
      'ochtend',
      null,
      false,
      1,
      'sport'
    ),
    (
      'Dagafsluiting',
      '±20:00 · max 5 min',
      jsonb_build_array(
        jsonb_build_object('id', 'dagafsluiting-q1', 'text', 'Hoe ging de dag?', 'done', false, 'rank', 1000),
        jsonb_build_object('id', 'dagafsluiting-q2', 'text', 'Hoe voelde ik me vandaag en hoe voel ik me nu?', 'done', false, 'rank', 2000),
        jsonb_build_object('id', 'dagafsluiting-q3', 'text', 'Waar ben je dankbaar voor?', 'done', false, 'rank', 3000)
      ),
      null,
      5,
      false,
      2000000000,
      'dagafsluiting'
    )
) as seed(title, description, checklist, daypart, estimate_min, streak, rank, ritual_prefix)
on conflict (user_id, ritual_prefix) do nothing;

-- Bestaat er een routine voor dit ritual_key, dan zijn díe labels de keuze.
-- Zo kan Persoonlijk eraf, of een ander label erop. Zonder routine blijft
-- het oude vangnet: Mediteren, Sport en Dagafsluiting krijgen Persoonlijk.
create or replace function tasks_ritual_default_label()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  label_id text;
  prefix text;
  chosen text[];
begin
  if NEW.ritual_key is null then
    return NEW;
  end if;

  prefix := regexp_replace(NEW.ritual_key, ':[0-9]{4}-[0-9]{2}-[0-9]{2}$', '');
  select label_ids into chosen
  from recurring_tasks
  where user_id = NEW.user_id and ritual_prefix = prefix;

  if found then
    NEW.labels := coalesce(chosen, '{}'::text[]);
    return NEW;
  end if;

  if not (
    NEW.ritual_key like 'mediteren:%'
    or NEW.ritual_key like 'dagafsluiting:%'
    or NEW.ritual_key like 'sport:%'
  ) then
    return NEW;
  end if;

  label_id := flow_personal_label_id(NEW.user_id);
  if label_id is not null and not (coalesce(NEW.labels, '{}') @> array[label_id]) then
    NEW.labels := coalesce(NEW.labels, '{}') || label_id;
  end if;
  return NEW;
end;
$$;

create or replace function drop_stale_recurring_cards(
  p_prefix text,
  p_from date,
  p_weekdays text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or p_prefix is null or btrim(p_prefix) = '' or p_from is null then
    return;
  end if;

  with gone as (
    delete from tasks t
    where t.user_id = actor
      and t.done = false
      and t.ritual_key = p_prefix || ':' || right(t.ritual_key, 10)
      and right(t.ritual_key, 10) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      and right(t.ritual_key, 10)::date >= p_from
      and not (flow_day_key(right(t.ritual_key, 10)::date) = any (coalesce(p_weekdays, '{}')))
    returning t.ritual_key
  )
  delete from ritual_skips s
  where s.user_id = actor
    and s.ritual_key in (select ritual_key from gone);
end;
$$;

create or replace function drop_all_stale_recurring_cards(p_from date)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  routine recurring_tasks;
  days text[];
begin
  if actor is null or p_from is null then
    return;
  end if;

  for routine in
    select * from recurring_tasks where user_id = actor
  loop
    if routine.paused then
      days := '{}'::text[];
    elsif routine.schedule = 'daily' then
      days := array['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
    else
      days := routine.weekdays;
    end if;
    perform drop_stale_recurring_cards(routine.ritual_prefix, p_from, days);
  end loop;
end;
$$;

create or replace function ensure_one_recurring(p_row recurring_tasks, p_date date)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  ritual text;
  result tasks;
  due boolean;
begin
  if actor is null or p_date is null or p_row.user_id is distinct from actor then
    return null;
  end if;
  if p_row.paused then
    return null;
  end if;

  due := p_row.schedule = 'daily'
    or flow_day_key(p_date) = any (p_row.weekdays);
  if not due then
    return null;
  end if;

  ritual := p_row.ritual_prefix || ':' || to_char(p_date, 'YYYY-MM-DD');
  if ritual_is_skipped(actor, ritual) then
    return null;
  end if;

  select * into result
  from tasks
  where user_id = actor and ritual_key = ritual;

  if found then
    return to_jsonb(result);
  end if;

  insert into tasks (
    user_id, title, description, day_key, daypart, rank, week_of,
    ritual_key, estimate_min, checklist, labels
  )
  values (
    actor,
    p_row.title,
    p_row.description,
    flow_day_key(p_date),
    p_row.daypart,
    p_row.rank,
    flow_week_of(p_date),
    ritual,
    p_row.estimate_min,
    coalesce(p_row.checklist, '[]'::jsonb),
    coalesce(p_row.label_ids, '{}'::text[])
  )
  on conflict (user_id, ritual_key) do nothing
  returning * into result;

  if not found then
    select * into result
    from tasks
    where user_id = actor and ritual_key = ritual;
  end if;

  if not found then
    return null;
  end if;
  return to_jsonb(result);
end;
$$;

create or replace function ensure_daily_rituals(p_date date)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  ritual text;
  closing tasks;
  sport tasks;
  routine recurring_tasks;
  result jsonb := '[]'::jsonb;
  meditation jsonb;
  piece jsonb;
begin
  if actor is null then
    raise exception 'ensure_daily_rituals: niet ingelogd';
  end if;
  if p_date is null then
    raise exception 'ensure_daily_rituals: datum ontbreekt';
  end if;

  -- Geen routines (seed nog niet, of een account van vóór deze migratie dat
  -- nog niet is aangevuld): zelfde drie kaarten als migratie 012.
  if not exists (select 1 from recurring_tasks where user_id = actor) then
    meditation := ensure_daily_meditation(p_date);
    if meditation is not null then
      result := result || jsonb_build_array(meditation);
    end if;

    ritual := 'sport:' || to_char(p_date, 'YYYY-MM-DD');

    if not ritual_is_skipped(actor, ritual) then
      select * into sport
      from tasks
      where user_id = actor and ritual_key = ritual;

      if not found then
        insert into tasks (user_id, title, day_key, daypart, rank, week_of, ritual_key)
        values (actor, 'Sport', flow_day_key(p_date), 'ochtend', 1, flow_week_of(p_date), ritual)
        on conflict (user_id, ritual_key) do nothing
        returning * into sport;

        if not found then
          select * into sport
          from tasks
          where user_id = actor and ritual_key = ritual;
        end if;
      end if;

      if found then
        result := result || jsonb_build_array(to_jsonb(sport));
      end if;
    end if;

    ritual := 'dagafsluiting:' || to_char(p_date, 'YYYY-MM-DD');

    if not ritual_is_skipped(actor, ritual) then
      select * into closing
      from tasks
      where user_id = actor and ritual_key = ritual;

      if not found then
        insert into tasks (
          user_id, title, description, day_key, daypart, rank, week_of, ritual_key, estimate_min
        )
        values (
          actor,
          'Dagafsluiting',
          flow_closing_notes(),
          flow_day_key(p_date),
          null,
          2000000000,
          flow_week_of(p_date),
          ritual,
          5
        )
        on conflict (user_id, ritual_key) do nothing
        returning * into closing;

        if not found then
          select * into closing
          from tasks
          where user_id = actor and ritual_key = ritual;
        end if;
      end if;

      if found then
        result := result || jsonb_build_array(to_jsonb(closing));
      end if;
    end if;

    return result;
  end if;

  -- Open kaarten die niet meer op het schema vallen weghalen vóór het
  -- aanmaken. Afgevinkte en oudere kaarten blijven staan.
  perform drop_all_stale_recurring_cards(p_date);

  for routine in
    select * from recurring_tasks
    where user_id = actor
    order by rank, created_at
  loop
    piece := ensure_one_recurring(routine, p_date);
    if piece is not null then
      result := result || jsonb_build_array(piece);
    end if;
  end loop;

  return result;
end;
$$;

grant execute on function drop_stale_recurring_cards(text, date, text[]) to authenticated;
grant execute on function drop_all_stale_recurring_cards(date) to authenticated;
grant execute on function ensure_one_recurring(recurring_tasks, date) to authenticated;
