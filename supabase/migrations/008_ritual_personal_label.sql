-- Dagelijkse rituelen (Mediteren, Dagafsluiting) krijgen standaard het label "Persoonlijk".
-- Labels in tasks.labels zijn label-id's uit settings.data->'labels'.
create or replace function flow_personal_label_id(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select l->>'id'
  from settings s, jsonb_array_elements(coalesce(s.data->'labels', '[]'::jsonb)) l
  where s.user_id = p_user and lower(btrim(l->>'name')) = 'persoonlijk'
  limit 1;
$$;

revoke all on function flow_personal_label_id(uuid) from public;

create or replace function tasks_ritual_default_label()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  label_id text;
begin
  if NEW.ritual_key is null
     or not (NEW.ritual_key like 'mediteren:%' or NEW.ritual_key like 'dagafsluiting:%') then
    return NEW;
  end if;
  label_id := flow_personal_label_id(NEW.user_id);
  if label_id is not null and not (coalesce(NEW.labels, '{}') @> array[label_id]) then
    NEW.labels := coalesce(NEW.labels, '{}') || label_id;
  end if;
  return NEW;
end;
$$;

-- Naam sorteert na tasks_assign_meditation_ritual, zodat ritual_key dan al gezet is.
drop trigger if exists tasks_ritual_default_label on tasks;
create trigger tasks_ritual_default_label
before insert on tasks
for each row execute function tasks_ritual_default_label();

-- Bestaande ritueeltaken bijwerken.
update tasks t
set labels = coalesce(t.labels, '{}') || flow_personal_label_id(t.user_id)
where (t.ritual_key like 'mediteren:%' or t.ritual_key like 'dagafsluiting:%')
  and flow_personal_label_id(t.user_id) is not null
  and not (coalesce(t.labels, '{}') @> array[flow_personal_label_id(t.user_id)]);
