-- Private photos: members can read photos; only an owner can write their avatar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', false, 524288, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "profile photos: members read" on storage.objects
for select to authenticated using (bucket_id = 'profile-photos');

create policy "profile photos: owner inserts" on storage.objects
for insert to authenticated
with check (bucket_id = 'profile-photos' and name = (select auth.uid())::text || '/avatar');

create policy "profile photos: owner replaces" on storage.objects
for update to authenticated
using (bucket_id = 'profile-photos' and name = (select auth.uid())::text || '/avatar')
with check (bucket_id = 'profile-photos' and name = (select auth.uid())::text || '/avatar');
