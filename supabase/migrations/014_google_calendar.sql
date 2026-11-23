-- Google Agenda, alleen-lezen.
-- Additief: nieuwe tabellen, geen wijziging aan tasks. Niet zelf op productie draaien.
--
-- calendar_connections bewaart het refresh-token. RLS staat aan en er is geen
-- policy; anon en authenticated hebben geen grants. Alleen de service role
-- (server, cron) leest het token. De client ziet hooguit e-mail en status
-- via calendar_connection_status().
--
-- calendar_events is de weergave op het bord. De client mag lezen en alleen
-- `done` wijzigen. Titel, tijd en links blijven van de sync.

create table if not exists calendar_connections (
  user_id uuid primary key references auth.users on delete cascade,
  refresh_token text not null,
  google_email text,
  calendar_id text not null default 'primary',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_error text
);

alter table calendar_connections enable row level security;

revoke all on table calendar_connections from public, anon, authenticated;
grant all on table calendar_connections to service_role;

drop trigger if exists calendar_connections_set_updated_at on calendar_connections;
create trigger calendar_connections_set_updated_at
  before update on calendar_connections
  for each row execute function set_updated_at();

create or replace function calendar_connection_status()
returns table (
  google_email text,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.google_email, c.connected_at, c.last_sync_at, c.last_error
  from calendar_connections c
  where c.user_id = auth.uid();
$$;

revoke all on function calendar_connection_status() from public;
grant execute on function calendar_connection_status() to authenticated;

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  google_event_id text not null,
  title text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  all_day boolean not null default false,
  event_date date not null,
  end_date date not null,
  location text,
  meet_link text,
  html_link text,
  status text not null default 'confirmed',
  done boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint calendar_events_user_google unique (user_id, google_event_id)
);

create index if not exists calendar_events_user_date_idx
  on calendar_events (user_id, event_date);

drop trigger if exists calendar_events_set_updated_at on calendar_events;
create trigger calendar_events_set_updated_at
  before update on calendar_events
  for each row execute function set_updated_at();

create or replace function calendar_events_lock_content()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') in ('service_role', 'supabase_admin')
     or current_user in ('service_role', 'postgres', 'supabase_admin') then
    return NEW;
  end if;
  NEW.user_id := OLD.user_id;
  NEW.google_event_id := OLD.google_event_id;
  NEW.title := OLD.title;
  NEW.starts_at := OLD.starts_at;
  NEW.ends_at := OLD.ends_at;
  NEW.all_day := OLD.all_day;
  NEW.event_date := OLD.event_date;
  NEW.end_date := OLD.end_date;
  NEW.location := OLD.location;
  NEW.meet_link := OLD.meet_link;
  NEW.html_link := OLD.html_link;
  NEW.status := OLD.status;
  return NEW;
end;
$$;

drop trigger if exists calendar_events_lock_content on calendar_events;
create trigger calendar_events_lock_content
  before update on calendar_events
  for each row execute function calendar_events_lock_content();

alter table calendar_events enable row level security;

drop policy if exists "eigen data" on calendar_events;
create policy "eigen data" on calendar_events
  for select
  using (user_id = auth.uid());

drop policy if exists "eigen afvinken" on calendar_events;
create policy "eigen afvinken" on calendar_events
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, update on table calendar_events to authenticated;
grant all on table calendar_events to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'calendar_events'
  ) then
    alter publication supabase_realtime add table calendar_events;
  end if;
end $$;
