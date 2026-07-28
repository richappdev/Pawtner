begin;
select plan(8);

select has_table('storage', 'buckets', 'storage buckets table exists');

select ok(
  exists (
    select 1 from storage.buckets
    where id = 'pet-media' and public = false
  ),
  'pet media bucket is private'
);

select has_index(
  'public',
  'pet_media',
  'pet_media_public_cover_idx',
  'public cover media lookup is indexed'
);

select has_index(
  'public',
  'pets',
  'pets_public_discovery_idx',
  'public discovery lookup is indexed'
);

select policies_are(
  'storage',
  'objects',
  array[
    'pet_media_storage_delete',
    'pet_media_storage_insert',
    'pet_media_storage_select',
    'pet_media_storage_update'
  ],
  'pet media storage has explicit owner and staff policies'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'INSERT'
      and ('anon' = any(roles) or 'public' = any(roles))
  ),
  'anonymous users have no upload policy for pet media'
);

select ok(
  not has_table_privilege('anon', 'public.pet_media', 'insert'),
  'anonymous users cannot create pet media records'
);

select hasnt_column(
  'public',
  'pets_public',
  'private_address',
  'public pet view does not expose private address'
);

select * from finish();
rollback;
