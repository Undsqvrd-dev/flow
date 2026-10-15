-- Checklist-items die alleen {text, done} hebben (bijvoorbeeld via SQL)
-- krijgen een id en een rank. Bestaande id's en ranks blijven staan.
-- De trigger vult ze ook aan bij latere inserts en updates.
-- set_updated_at blijft de stale-write bescherming: een oudere updated_at
-- slaat de hele update over, inclusief deze reparatie.

create or replace function flow_repair_checklist(items jsonb)
returns jsonb
language plpgsql
as $$
declare
  result jsonb := '[]'::jsonb;
  element jsonb;
  ordinal int := 0;
  seen text[] := '{}';
  item_id text;
  raw_id text;
  needs_id boolean;
  rank_text text;
  rank_ok boolean;
  done_ok boolean;
  text_ok boolean;
begin
  if items is null or jsonb_typeof(items) <> 'array' then
    return '[]'::jsonb;
  end if;

  for element in select value from jsonb_array_elements(items)
  loop
    ordinal := ordinal + 1;
    if jsonb_typeof(element) <> 'object' then
      continue;
    end if;

    raw_id := element->>'id';
    item_id := nullif(btrim(coalesce(raw_id, '')), '');
    needs_id := item_id is null or item_id = any(seen);
    if needs_id then
      item_id := gen_random_uuid()::text;
    end if;
    seen := array_append(seen, item_id);

    rank_text := element->>'rank';
    rank_ok := rank_text is not null and rank_text ~ '^-?[0-9]+(\.[0-9]+)?$';
    done_ok := jsonb_typeof(element->'done') = 'boolean';
    text_ok := jsonb_typeof(element->'text') = 'string';

    if needs_id or not rank_ok or not done_ok or not text_ok or raw_id is distinct from item_id then
      element := element || jsonb_build_object(
        'id', item_id,
        'text', coalesce(element->>'text', ''),
        'done', case when done_ok then (element->>'done')::boolean else false end,
        'rank', case when rank_ok then rank_text::numeric else ordinal * 1000 end
      );
    end if;

    result := result || jsonb_build_array(element);
  end loop;

  return result;
end;
$$;

create or replace function repair_task_checklist()
returns trigger
language plpgsql
as $$
declare
  repaired jsonb;
begin
  repaired := flow_repair_checklist(NEW.checklist);
  if repaired is distinct from NEW.checklist then
    NEW.checklist := repaired;
  end if;
  return NEW;
end;
$$;

drop trigger if exists tasks_repair_checklist on tasks;
create trigger tasks_repair_checklist
  before insert or update on tasks
  for each row execute function repair_task_checklist();

update tasks as task
set checklist = repaired.checklist
from (
  select id, flow_repair_checklist(checklist) as checklist
  from tasks
) as repaired
where task.id = repaired.id
  and task.checklist is distinct from repaired.checklist;
