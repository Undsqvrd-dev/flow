-- FLOW — Storage-bucket voor moodboard-foto's
-- Uitvoeren in het Supabase SQL-paneel.

insert into storage.buckets (id, name, public)
values ('moodboard', 'moodboard', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'moodboard public read'
  ) then
    create policy "moodboard public read"
      on storage.objects for select
      using (bucket_id = 'moodboard');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'moodboard eigen upload'
  ) then
    create policy "moodboard eigen upload"
      on storage.objects for insert
      with check (
        bucket_id = 'moodboard'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'moodboard eigen delete'
  ) then
    create policy "moodboard eigen delete"
      on storage.objects for delete
      using (
        bucket_id = 'moodboard'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
