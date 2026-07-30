-- Admin-managed pet photo galleries. Government feed images remain external,
-- source-controlled fallback rows and do not count toward the five uploads.

create or replace function public.enforce_uploaded_pet_photo_integrity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.storage_path is null or new.media_type <> 'image' then
    return new;
  end if;

  -- Serialize uploaded-photo changes for a pet, including concurrent requests.
  perform 1
  from public.pets
  where id = new.pet_id
  for update;

  if (
    select count(*)
    from public.pet_media m
    where m.pet_id = new.pet_id
      and m.storage_path is not null
      and m.media_type = 'image'
      and m.id <> new.id
  ) >= 5 then
    raise exception using
      errcode = 'check_violation',
      message = 'A pet can have at most five uploaded photos.';
  end if;

  if new.is_cover and exists (
    select 1
    from public.pet_media m
    where m.pet_id = new.pet_id
      and m.storage_path is not null
      and m.media_type = 'image'
      and m.is_cover
      and m.id <> new.id
  ) then
    raise exception using
      errcode = 'unique_violation',
      message = 'A pet can have only one uploaded cover photo.';
  end if;

  return new;
end;
$$;

drop trigger if exists uploaded_pet_photo_integrity on public.pet_media;
create trigger uploaded_pet_photo_integrity
  before insert or update of pet_id, storage_path, media_type, is_cover
  on public.pet_media
  for each row execute function public.enforce_uploaded_pet_photo_integrity();

create or replace function public.register_admin_pet_photos(
  p_pet_id uuid,
  p_storage_paths text[]
)
returns setof public.pet_media
language plpgsql
security invoker
set search_path = ''
as $$
declare
  existing_count integer;
  existing_cover boolean;
  next_order integer;
  item_storage_path text;
  item_index integer := 0;
begin
  if not (
    public.has_role('admin'::public.app_role)
    or public.has_role('super_admin'::public.app_role)
  ) then
    raise exception using errcode = 'insufficient_privilege', message = 'Pet management permission is required.';
  end if;

  if coalesce(array_length(p_storage_paths, 1), 0) = 0 then
    raise exception using errcode = 'check_violation', message = 'At least one storage path is required.';
  end if;

  perform 1 from public.pets where id = p_pet_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Pet not found.';
  end if;

  select count(*), coalesce(bool_or(is_cover), false), coalesce(max(sort_order), -1) + 1
  into existing_count, existing_cover, next_order
  from public.pet_media
  where pet_id = p_pet_id
    and storage_path is not null
    and media_type = 'image';

  if existing_count + array_length(p_storage_paths, 1) > 5 then
    raise exception using errcode = 'check_violation', message = 'A pet can have at most five uploaded photos.';
  end if;

  foreach item_storage_path in array p_storage_paths loop
    if item_storage_path is null
      or item_storage_path = ''
      or split_part(item_storage_path, '/', 1) <> p_pet_id::text
    then
      raise exception using errcode = 'check_violation', message = 'Invalid pet media storage path.';
    end if;

    return query
    insert into public.pet_media (
      pet_id,
      storage_path,
      media_type,
      is_cover,
      is_public,
      sort_order
    )
    values (
      p_pet_id,
      item_storage_path,
      'image',
      not existing_cover and item_index = 0,
      true,
      next_order + item_index
    )
    returning *;

    item_index := item_index + 1;
  end loop;
end;
$$;

create or replace function public.reorder_admin_pet_photos(
  p_pet_id uuid,
  p_media_ids uuid[]
)
returns setof public.pet_media
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uploaded_count integer;
begin
  if not (
    public.has_role('admin'::public.app_role)
    or public.has_role('super_admin'::public.app_role)
  ) then
    raise exception using errcode = 'insufficient_privilege', message = 'Pet management permission is required.';
  end if;

  perform 1 from public.pets where id = p_pet_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Pet not found.';
  end if;

  select count(*) into uploaded_count
  from public.pet_media
  where pet_id = p_pet_id
    and storage_path is not null
    and media_type = 'image';

  if uploaded_count <> coalesce(array_length(p_media_ids, 1), 0)
    or uploaded_count <> (
      select count(distinct media_id)
      from unnest(coalesce(p_media_ids, array[]::uuid[])) media_id
    )
    or exists (
      select 1
      from unnest(coalesce(p_media_ids, array[]::uuid[])) media_id
      where not exists (
        select 1
        from public.pet_media m
        where m.id = media_id
          and m.pet_id = p_pet_id
          and m.storage_path is not null
          and m.media_type = 'image'
      )
    )
  then
    raise exception using errcode = 'check_violation', message = 'Photo order must contain every uploaded photo exactly once.';
  end if;

  update public.pet_media m
  set sort_order = ordered.ordinality - 1
  from unnest(coalesce(p_media_ids, array[]::uuid[])) with ordinality ordered(media_id, ordinality)
  where m.id = ordered.media_id;

  return query
  select *
  from public.pet_media
  where pet_id = p_pet_id
    and storage_path is not null
    and media_type = 'image'
  order by sort_order, created_at, id;
end;
$$;

create or replace function public.set_admin_pet_photo_cover(
  p_pet_id uuid,
  p_media_id uuid
)
returns setof public.pet_media
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (
    public.has_role('admin'::public.app_role)
    or public.has_role('super_admin'::public.app_role)
  ) then
    raise exception using errcode = 'insufficient_privilege', message = 'Pet management permission is required.';
  end if;

  perform 1 from public.pets where id = p_pet_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Pet not found.';
  end if;

  if not exists (
    select 1
    from public.pet_media
    where id = p_media_id
      and pet_id = p_pet_id
      and storage_path is not null
      and media_type = 'image'
  ) then
    raise exception using errcode = 'no_data_found', message = 'Uploaded photo not found.';
  end if;

  update public.pet_media
  set is_cover = false
  where pet_id = p_pet_id
    and storage_path is not null
    and media_type = 'image'
    and is_cover;

  update public.pet_media
  set is_cover = true
  where id = p_media_id;

  return query
  select *
  from public.pet_media
  where pet_id = p_pet_id
    and storage_path is not null
    and media_type = 'image'
  order by sort_order, created_at, id;
end;
$$;

create or replace function public.delete_admin_pet_photo(
  p_pet_id uuid,
  p_media_id uuid
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_path text;
  deleted_cover boolean;
  replacement_id uuid;
begin
  if not (
    public.has_role('admin'::public.app_role)
    or public.has_role('super_admin'::public.app_role)
  ) then
    raise exception using errcode = 'insufficient_privilege', message = 'Pet management permission is required.';
  end if;

  perform 1 from public.pets where id = p_pet_id for update;
  if not found then
    raise exception using errcode = 'no_data_found', message = 'Pet not found.';
  end if;

  select storage_path, is_cover
  into deleted_path, deleted_cover
  from public.pet_media
  where id = p_media_id
    and pet_id = p_pet_id
    and storage_path is not null
    and media_type = 'image'
  for update;

  if not found then
    raise exception using errcode = 'no_data_found', message = 'Uploaded photo not found.';
  end if;

  delete from public.pet_media where id = p_media_id;

  if deleted_cover then
    select id into replacement_id
    from public.pet_media
    where pet_id = p_pet_id
      and storage_path is not null
      and media_type = 'image'
    order by sort_order, created_at, id
    limit 1;

    if replacement_id is not null then
      update public.pet_media set is_cover = true where id = replacement_id;
    end if;
  end if;

  return deleted_path;
end;
$$;

revoke all on function public.enforce_uploaded_pet_photo_integrity() from public, anon, authenticated;
revoke all on function public.register_admin_pet_photos(uuid, text[]) from public, anon;
revoke all on function public.reorder_admin_pet_photos(uuid, uuid[]) from public, anon;
revoke all on function public.set_admin_pet_photo_cover(uuid, uuid) from public, anon;
revoke all on function public.delete_admin_pet_photo(uuid, uuid) from public, anon;

grant execute on function public.register_admin_pet_photos(uuid, text[]) to authenticated, service_role;
grant execute on function public.reorder_admin_pet_photos(uuid, uuid[]) to authenticated, service_role;
grant execute on function public.set_admin_pet_photo_cover(uuid, uuid) to authenticated, service_role;
grant execute on function public.delete_admin_pet_photo(uuid, uuid) to authenticated, service_role;
