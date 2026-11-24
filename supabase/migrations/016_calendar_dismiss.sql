-- Afspraak alleen in Flow verbergen.
-- Additief. Niet zelf op productie draaien.
--
-- dismissed_at wordt gezet via het contextmenu. Google Agenda blijft onaangeroerd.
-- De client mag done, sort_order en dismissed_at wijzigen. De Google-sync
-- upsert deze kolommen niet, zodat afvinken en verbergen blijven staan.

alter table calendar_events
  add column if not exists dismissed_at timestamptz;

comment on column calendar_events.dismissed_at is
  'Verborgen in Flow. Null = zichtbaar. Google Agenda wordt niet aangepast.';

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
  -- done, sort_order en dismissed_at blijven zoals de client ze stuurde.
  return NEW;
end;
$$;
