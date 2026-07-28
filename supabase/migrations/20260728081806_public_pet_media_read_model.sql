-- Private pet media bucket. Public delivery is handled through short-lived,
-- server-created signed URLs after the related row passes publication checks.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-media',
  'pet-media',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "pet_media_storage_select" on storage.objects;
create policy "pet_media_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'pet-media'
    and (
      (select public.is_staff())
      or exists (
        select 1
        from public.pets p
        join public.foster_profiles fp on fp.id = p.foster_profile_id
        where p.id::text = (storage.foldername(name))[1]
          and fp.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "pet_media_storage_insert" on storage.objects;
create policy "pet_media_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'pet-media'
    and (
      (select public.is_staff())
      or exists (
        select 1
        from public.pets p
        join public.foster_profiles fp on fp.id = p.foster_profile_id
        where p.id::text = (storage.foldername(name))[1]
          and fp.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "pet_media_storage_update" on storage.objects;
create policy "pet_media_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'pet-media'
    and (
      (select public.is_staff())
      or exists (
        select 1
        from public.pets p
        join public.foster_profiles fp on fp.id = p.foster_profile_id
        where p.id::text = (storage.foldername(name))[1]
          and fp.user_id = (select auth.uid())
      )
    )
  )
  with check (
    bucket_id = 'pet-media'
    and (
      (select public.is_staff())
      or exists (
        select 1
        from public.pets p
        join public.foster_profiles fp on fp.id = p.foster_profile_id
        where p.id::text = (storage.foldername(name))[1]
          and fp.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "pet_media_storage_delete" on storage.objects;
create policy "pet_media_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'pet-media'
    and (
      (select public.is_staff())
      or exists (
        select 1
        from public.pets p
        join public.foster_profiles fp on fp.id = p.foster_profile_id
        where p.id::text = (storage.foldername(name))[1]
          and fp.user_id = (select auth.uid())
      )
    )
  );

create index if not exists pet_media_public_cover_idx
  on public.pet_media (pet_id, is_public, is_cover, sort_order);

create index if not exists pets_public_discovery_idx
  on public.pets (review_status, is_published, status, published_at desc);
