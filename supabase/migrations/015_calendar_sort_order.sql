-- Handmatige bordpositie van een afspraak.
-- Additief. Niet zelf op productie draaien.
--
-- sort_order is null tot Steijn de kaart versleept. Null betekent: tijdsvolgorde.
-- De client mag `done` en `sort_order` wijzigen. De Google-sync upsert deze
-- kolom niet, zodat een verplaatste afspraak haar plek houdt.

alter table calendar_events
  add column if not exists sort_order double precision;

comment on column calendar_events.sort_order is
  'Handmatige positie op het bord, zelfde schaal als tasks.rank. Null = tijdsvolgorde.';

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
  -- done en sort_order blijven zoals de client ze stuurde.
  return NEW;
end;
$$;
