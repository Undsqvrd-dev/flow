-- Sport hoort, net als Mediteren, standaard bij het label Persoonlijk.
create or replace function tasks_ritual_default_label()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  label_id text;
begin
  if NEW.ritual_key is null
     or not (
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

update tasks t
set labels = coalesce(t.labels, '{}') || flow_personal_label_id(t.user_id)
where t.ritual_key like 'sport:%'
  and flow_personal_label_id(t.user_id) is not null
  and not (coalesce(t.labels, '{}') @> array[flow_personal_label_id(t.user_id)]);
