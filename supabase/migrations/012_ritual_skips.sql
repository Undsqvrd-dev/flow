-- Een verwijderd dagsritueel (sport:YYYY-MM-DD, mediteren:…, dagafsluiting:…)
-- mag die dag niet terugkomen. De volgende dag heeft een andere ritual_key
-- en wordt gewoon weer aangemaakt.
--
-- De trigger onthoudt de skip bij elke DELETE, ook vanuit een oudere app.
-- ensure_daily_meditation en ensure_daily_rituals slaan die key over.
-- Een insert met dezelfde key wordt geannuleerd, zodat een lokale
-- heraanmaak de rij niet alsnog terugzet.

create table if not exists ritual_skips (
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  ritual_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, ritual_key)
);

alter table ritual_skips enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'ritual_skips' and policyname = 'eigen data'
  ) then
    create policy "eigen data" on ritual_skips
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

grant select, insert, delete on ritual_skips to authenticated;

create or replace function ritual_is_skipped(p_user uuid, p_key text)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from ritual_skips
    where user_id = p_user and ritual_key = p_key
  );
$$;

revoke all on function ritual_is_skipped(uuid, text) from public;
grant execute on function ritual_is_skipped(uuid, text) to authenticated;

create or replace function tasks_remember_ritual_skip()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if OLD.ritual_key is not null and btrim(OLD.ritual_key) <> '' then
    insert into ritual_skips (user_id, ritual_key)
    values (OLD.user_id, OLD.ritual_key)
    on conflict (user_id, ritual_key) do nothing;
  end if;
  return OLD;
end;
$$;

drop trigger if exists tasks_remember_ritual_skip on tasks;
create trigger tasks_remember_ritual_skip
  after delete on tasks
  for each row execute function tasks_remember_ritual_skip();

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

  if NEW.ritual_key is not null and ritual_is_skipped(NEW.user_id, NEW.ritual_key) then
    return null;
  end if;

  return NEW;
end;
$$;

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

  if ritual_is_skipped(actor, ritual) then
    return null;
  end if;

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
end;
$$;
