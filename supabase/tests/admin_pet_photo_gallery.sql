begin;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data)
values ('10000000-0000-0000-0000-000000000088', 'media-admin@example.test', '{}'::jsonb);

insert into public.user_roles (user_id, role)
values ('10000000-0000-0000-0000-000000000088', 'admin');

insert into public.foster_profiles (id, user_id, status, display_name)
values (
  '20000000-0000-0000-0000-000000000088',
  '10000000-0000-0000-0000-000000000088',
  'approved',
  'Media test foster'
);

insert into public.pets (id, foster_profile_id, name, species)
values (
  '30000000-0000-0000-0000-000000000088',
  '20000000-0000-0000-0000-000000000088',
  'Media test pet',
  'dog'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000088","role":"authenticated"}',
  true
);

select lives_ok(
  $test$
    select public.register_admin_pet_photos(
      '30000000-0000-0000-0000-000000000088',
      array['30000000-0000-0000-0000-000000000088/one.webp']
    )
  $test$,
  'an admin can register the first uploaded photo'
);

select is(
  (
    select count(*)::integer
    from public.pet_media
    where pet_id = '30000000-0000-0000-0000-000000000088'
      and storage_path is not null
      and is_cover
  ),
  1,
  'the first uploaded photo becomes cover'
);

select lives_ok(
  $test$
    select public.register_admin_pet_photos(
      '30000000-0000-0000-0000-000000000088',
      array[
        '30000000-0000-0000-0000-000000000088/two.webp',
        '30000000-0000-0000-0000-000000000088/three.webp'
      ]
    )
  $test$,
  'additional photos can be registered'
);

select is(
  (
    select storage_path
    from public.pet_media
    where pet_id = '30000000-0000-0000-0000-000000000088' and is_cover and storage_path is not null
  ),
  '30000000-0000-0000-0000-000000000088/one.webp',
  'adding photos preserves the existing cover'
);

select lives_ok(
  $test$
    select public.set_admin_pet_photo_cover(
      '30000000-0000-0000-0000-000000000088',
      (
        select id from public.pet_media
        where storage_path = '30000000-0000-0000-0000-000000000088/three.webp'
      )
    )
  $test$,
  'an admin can select a different cover'
);

select is(
  (
    select storage_path
    from public.pet_media
    where pet_id = '30000000-0000-0000-0000-000000000088' and is_cover and storage_path is not null
  ),
  '30000000-0000-0000-0000-000000000088/three.webp',
  'cover selection changes only the uploaded cover'
);

select lives_ok(
  $test$
    select public.reorder_admin_pet_photos(
      '30000000-0000-0000-0000-000000000088',
      array[
        (select id from public.pet_media where storage_path = '30000000-0000-0000-0000-000000000088/two.webp'),
        (select id from public.pet_media where storage_path = '30000000-0000-0000-0000-000000000088/one.webp'),
        (select id from public.pet_media where storage_path = '30000000-0000-0000-0000-000000000088/three.webp')
      ]
    )
  $test$,
  'an admin can reorder the complete uploaded gallery'
);

select is(
  (
    select storage_path
    from public.pet_media
    where pet_id = '30000000-0000-0000-0000-000000000088'
      and storage_path is not null
    order by sort_order
    limit 1
  ),
  '30000000-0000-0000-0000-000000000088/two.webp',
  'reordering persists display order independently from cover'
);

insert into public.pet_media (
  pet_id, storage_path, external_url, media_type, is_cover, is_public, sort_order
)
values (
  '30000000-0000-0000-0000-000000000088',
  null,
  'https://www.pet.gov.tw/upload/pic/fallback.jpg',
  'image',
  true,
  true,
  0
);

select lives_ok(
  $test$
    select public.register_admin_pet_photos(
      '30000000-0000-0000-0000-000000000088',
      array[
        '30000000-0000-0000-0000-000000000088/four.webp',
        '30000000-0000-0000-0000-000000000088/five.webp'
      ]
    )
  $test$,
  'the external government fallback does not count toward five uploads'
);

select throws_ok(
  $test$
    select public.register_admin_pet_photos(
      '30000000-0000-0000-0000-000000000088',
      array['30000000-0000-0000-0000-000000000088/six.webp']
    )
  $test$,
  '23514',
  'A pet can have at most five uploaded photos.',
  'a sixth uploaded photo is rejected'
);

select throws_ok(
  $test$
    select public.delete_admin_pet_photo(
      '30000000-0000-0000-0000-000000000088',
      (
        select id from public.pet_media
        where external_url = 'https://www.pet.gov.tw/upload/pic/fallback.jpg'
      )
    )
  $test$,
  'P0002',
  'Uploaded photo not found.',
  'the government fallback cannot be deleted by the admin photo function'
);

select lives_ok(
  $test$
    select public.delete_admin_pet_photo(
      '30000000-0000-0000-0000-000000000088',
      (
        select id from public.pet_media
        where storage_path = '30000000-0000-0000-0000-000000000088/three.webp'
      )
    )
  $test$,
  'deleting the selected cover succeeds'
);

select is(
  (
    select storage_path
    from public.pet_media
    where pet_id = '30000000-0000-0000-0000-000000000088'
      and storage_path is not null
      and is_cover
  ),
  '30000000-0000-0000-0000-000000000088/two.webp',
  'deleting the cover promotes the first remaining photo'
);

select is(
  (
    select count(*)::integer
    from public.pet_media
    where pet_id = '30000000-0000-0000-0000-000000000088'
      and storage_path is not null
      and is_cover
  ),
  1,
  'exactly one uploaded cover remains'
);

select * from finish();
rollback;
