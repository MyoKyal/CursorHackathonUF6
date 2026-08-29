-- Storage: create buckets listing-photos and event-photos (public) in the dashboard,
-- then run this in the SQL editor.

insert into storage.buckets (id, name, public)
values
  ('listing-photos', 'listing-photos', true),
  ('event-photos', 'event-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "listing photos public read" on storage.objects;
create policy "listing photos public read"
on storage.objects for select
using (bucket_id in ('listing-photos', 'event-photos'));

drop policy if exists "listing photos auth upload" on storage.objects;
create policy "listing photos auth upload"
on storage.objects for insert
with check (
  bucket_id in ('listing-photos', 'event-photos')
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "listing photos own delete" on storage.objects;
create policy "listing photos own delete"
on storage.objects for delete
using (
  bucket_id in ('listing-photos', 'event-photos')
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);
