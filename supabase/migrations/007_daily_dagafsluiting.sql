-- Dagelijkse taak "Dagafsluiting", naast Mediteren uit 006.
-- Eén rij per gebruiker per lokale kalenderdag: ritual_key dagafsluiting:YYYY-MM-DD.
-- ensure_daily_meditation blijft bestaan en doet nog steeds alleen Mediteren.
-- ensure_daily_rituals roept die functie aan en maakt daarna Dagafsluiting aan.
--
-- Geen tijd-van-de-dag-kolom: ±20:00 staat in de omschrijving.
-- Duur wel: estimate_min = 5. Rank hoog, zodat de taak onderaan de dag staat.
-- Trigger tasks_assign_meditation_ritual (006) krijgt een extra tak;
-- de Mediteren-tak en de triggernaam blijven, zodat de volgorde t.o.v.
-- tasks_repair_checklist (005) en tasks_set_updated_at (004) gelijk blijft.

create or replace function flow_closing_notes()
returns text
language sql
immutable
as $$
  select $notes$±20:00 · max 5 min

1. Hoe ging de dag?
2. Hoe voelde ik me vandaag en hoe voel ik me nu?
3. Waar ben je dankbaar voor?$notes$;
$$;

-- Zelfde functie als 006, plus een tak voor een insert met titel Dagafsluiting
-- zonder ritual_key (bijvoorbeeld een SQL-insert vanuit een assistent).
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

revoke all on function ensure_daily_rituals(date) from public;
grant execute on function ensure_daily_rituals(date) to authenticated;
