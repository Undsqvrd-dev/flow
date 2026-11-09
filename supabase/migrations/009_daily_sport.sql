-- Dagelijkse taak "Sport" in de ochtend, naast Mediteren en Dagafsluiting.
-- Eén rij per gebruiker per lokale kalenderdag: ritual_key sport:YYYY-MM-DD.
-- Rank 1 zet de taak direct na Mediteren (rank 0), bovenaan de dag.
-- ensure_daily_meditation blijft bestaan. ensure_daily_rituals maakt ook Sport aan.

create or replace function tasks_assign_meditation_ritual()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  ritual_date date;
  ritual text;
begin
  if TG_OP = 'UPDATE' then
    if OLD.ritual_key is not null and NEW.ritual_key is null then
      NEW.ritual_key := OLD.ritual_key;
    end if;
    return NEW;
  end if;

  if NEW.ritual_key is null and btrim(NEW.title) = 'Mediteren' then
    ritual_date := flow_task_date(NEW.week_of, NEW.day_key);
    if ritual_date is not null then
      ritual := 'mediteren:' || to_char(ritual_date, 'YYYY-MM-DD');
      if exists (
        select 1 from tasks
        where user_id = NEW.user_id and ritual_key = ritual
      ) then
        return null;
      end if;
      NEW.ritual_key := ritual;
    end if;
  end if;

  if NEW.ritual_key is null and btrim(NEW.title) = 'Sport' then
    ritual_date := flow_task_date(NEW.week_of, NEW.day_key);
    if ritual_date is not null then
      ritual := 'sport:' || to_char(ritual_date, 'YYYY-MM-DD');
      if exists (
        select 1 from tasks
        where user_id = NEW.user_id and ritual_key = ritual
      ) then
        return null;
      end if;
      NEW.ritual_key := ritual;
      if NEW.daypart is null then
        NEW.daypart := 'ochtend';
      end if;
      if NEW.rank = 0 then
        NEW.rank := 1;
      end if;
    end if;
  end if;

  if NEW.ritual_key is null and btrim(NEW.title) = 'Dagafsluiting' then
    ritual_date := flow_task_date(NEW.week_of, NEW.day_key);
    if ritual_date is not null then
      ritual := 'dagafsluiting:' || to_char(ritual_date, 'YYYY-MM-DD');
      if exists (
        select 1 from tasks
        where user_id = NEW.user_id and ritual_key = ritual
      ) then
        return null;
      end if;
      NEW.ritual_key := ritual;
      if NEW.description is null or btrim(NEW.description) = '' then
        NEW.description := flow_closing_notes();
      end if;
      if NEW.estimate_min is null then
        NEW.estimate_min := 5;
      end if;
      if NEW.rank = 0 then
        NEW.rank := 2000000000;
      end if;
    end if;
  end if;

  return NEW;
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
  result jsonb := '[]'::jsonb;
  meditation jsonb;
begin
  if actor is null then
    raise exception 'ensure_daily_rituals: niet ingelogd';
  end if;
  if p_date is null then
    raise exception 'ensure_daily_rituals: datum ontbreekt';
  end if;

  meditation := ensure_daily_meditation(p_date);
  if meditation is not null then
    result := result || jsonb_build_array(meditation);
  end if;

  ritual := 'sport:' || to_char(p_date, 'YYYY-MM-DD');

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

  ritual := 'dagafsluiting:' || to_char(p_date, 'YYYY-MM-DD');

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

  return result;
end;
$$;
