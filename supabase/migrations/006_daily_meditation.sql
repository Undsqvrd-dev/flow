-- Dagelijkse taak "Mediteren".
-- Eén rij per gebruiker per kalenderdag, herkenbaar aan ritual_key
-- (mediteren:YYYY-MM-DD). De app roept ensure_daily_meditation(lokale datum)
-- aan; een tweede apparaat of een gelijktijdige aanroep krijgt dezelfde rij.
-- sport_sessions blijft onaangeroerd.
--
-- De triggers tasks_set_updated_at (004) en tasks_repair_checklist (005)
-- blijven gelden: een insert loopt daar doorheen, een verouderde update
-- wordt nog steeds overgeslagen.

alter table tasks add column if not exists ritual_key text;

create unique index if not exists tasks_user_ritual_key_uidx
  on tasks (user_id, ritual_key);

-- Zelfde indeling als lib/dates.ts: week begint op maandag, sleutels ma–zo.
create or replace function flow_day_key(p_date date)
returns text
language sql
immutable
as $$
  select case extract(isodow from p_date)::int
    when 1 then 'ma'
    when 2 then 'di'
    when 3 then 'wo'
    when 4 then 'do'
    when 5 then 'vr'
    when 6 then 'za'
    else 'zo'
  end;
$$;

create or replace function flow_week_of(p_date date)
returns date
language sql
immutable
as $$
  select date_trunc('week', p_date::timestamp)::date;
$$;

create or replace function flow_date_for_day(p_week date, p_day_key text)
returns date
language sql
immutable
as $$
  select case p_day_key
    when 'ma' then p_week
    when 'di' then p_week + 1
    when 'wo' then p_week + 2
    when 'do' then p_week + 3
    when 'vr' then p_week + 4
    when 'za' then p_week + 5
    when 'zo' then p_week + 6
    else null
  end;
$$;

-- Datum van een bordtaak. week_of is normaal de maandag; als iemand de
-- kalenderdatum zelf in week_of zet én day_key daarbij past, gebruiken we die.
create or replace function flow_task_date(p_week date, p_day_key text)
returns date
language sql
immutable
as $$
  select case
    when p_week is null or p_day_key is null then null
    when extract(isodow from p_week)::int = 1 then flow_date_for_day(p_week, p_day_key)
    when flow_day_key(p_week) = p_day_key then p_week
    else null
  end;
$$;

create or replace function tasks_assign_meditation_ritual()
returns trigger
language plpgsql
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

  return NEW;
end;
$$;

drop trigger if exists tasks_assign_meditation_ritual on tasks;
create trigger tasks_assign_meditation_ritual
  before insert or update on tasks
  for each row execute function tasks_assign_meditation_ritual();

create or replace function ensure_daily_meditation(p_date date)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  ritual text;
  result tasks;
begin
  if actor is null then
    raise exception 'ensure_daily_meditation: niet ingelogd';
  end if;
  if p_date is null then
    raise exception 'ensure_daily_meditation: datum ontbreekt';
  end if;

  ritual := 'mediteren:' || to_char(p_date, 'YYYY-MM-DD');

  select * into result
  from tasks
  where user_id = actor and ritual_key = ritual;

  if found then
    return to_jsonb(result);
  end if;

  insert into tasks (user_id, title, day_key, daypart, rank, week_of, ritual_key)
  values (actor, 'Mediteren', flow_day_key(p_date), null, 0, flow_week_of(p_date), ritual)
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

revoke all on function ensure_daily_meditation(date) from public;
grant execute on function ensure_daily_meditation(date) to authenticated;
