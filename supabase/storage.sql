-- Storage bucket: people-photos
insert into storage.buckets (id, name, public)
values ('people-photos', 'people-photos', false);

-- Policy: usuário autenticado faz upload na própria pasta
create policy "users upload own photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'people-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: usuário lê suas próprias fotos
create policy "users read own photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'people-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: coord lê tudo
create policy "coord read all photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'people-photos'
  and (select role from users where id = auth.uid()) = 'coord'
);
