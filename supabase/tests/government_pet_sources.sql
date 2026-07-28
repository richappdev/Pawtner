begin;
select plan(18);

select has_column('public', 'pets', 'source_type', 'pets have a source discriminator');
select has_column('public', 'pets', 'rabies_vaccinated', 'pets track rabies vaccination');
select has_table('public', 'pet_sources', 'source metadata table exists');
select has_table('public', 'pet_source_records', 'source record table exists');
select has_table('public', 'pet_sync_runs', 'sync run table exists');
select has_table('public', 'pet_editorial_overrides', 'staff enrichment table exists');

select is(
  (select count(*)::integer from public.pets where source_type <> 'private_foster'),
  0,
  'existing rows are backfilled as private foster'
);

select ok(
  not has_table_privilege('anon', 'public.pet_sync_runs', 'select'),
  'anonymous users cannot read sync controls'
);
select ok(
  not has_column_privilege('anon', 'public.pet_source_records', 'raw_payload', 'select'),
  'anonymous users cannot read raw source payloads'
);
select ok(
  not has_function_privilege('authenticated', 'public.ingest_pet_source_batch(uuid,jsonb)', 'execute'),
  'authenticated users cannot invoke ingestion'
);

create temporary table test_sync_state as
select public.start_pet_source_sync('moa-animal-adoption', false) as run_id;

select lives_ok(
  $$
    select public.ingest_pet_source_batch(
      (select run_id from test_sync_state),
      '[{
        "externalId":"MOA-TEST-1",
        "externalSubId":"TEST-001",
        "name":"待認養犬 · TEST-001",
        "species":"dog",
        "sex":"unknown",
        "ageBand":"adult",
        "bodySize":"medium",
        "publishEligible":true,
        "contentHash":"hash-1",
        "officialUrl":"https://www.pet.gov.tw/AnimalApp/AnnounceMent.aspx?AnimalId=MOA-TEST-1",
        "rawPayload":{"animal_id":"MOA-TEST-1"}
      }]'::jsonb
    )
  $$,
  'a normalized government batch imports atomically'
);

select lives_ok(
  $$
    select public.ingest_pet_source_batch(
      (select run_id from test_sync_state),
      '[{
        "externalId":"MOA-TEST-1",
        "externalSubId":"TEST-001",
        "name":"政府來源名稱更新",
        "species":"dog",
        "sex":"unknown",
        "ageBand":"adult",
        "bodySize":"medium",
        "publishEligible":true,
        "contentHash":"hash-2",
        "officialUrl":"https://www.pet.gov.tw/AnimalApp/AnnounceMent.aspx?AnimalId=MOA-TEST-1",
        "rawPayload":{"animal_id":"MOA-TEST-1","animal_update":"changed"}
      }]'::jsonb
    )
  $$,
  're-importing the same MOA animal is idempotent'
);

select is(
  (
    select count(*)::integer
    from public.pet_source_records
    where external_id = 'MOA-TEST-1'
  ),
  1,
  'unique MOA ids map to one Pawtner pet'
);

insert into public.pet_editorial_overrides (pet_id, display_name)
select pet_id, '保留的編輯名稱'
from public.pet_source_records
where external_id = 'MOA-TEST-1';

select is(
  (
    select display_name
    from public.pet_editorial_overrides o
    join public.pet_source_records r on r.pet_id = o.pet_id
    where r.external_id = 'MOA-TEST-1'
  ),
  '保留的編輯名稱',
  'staff enrichment is stored separately from synchronized source fields'
);

select throws_ok(
  $$
    insert into public.adoption_applications (pet_id, adopter_user_id, status)
    select pet_id, gen_random_uuid(), 'submitted'
    from public.pet_source_records
    where external_id = 'MOA-TEST-1'
  $$,
  '23514',
  'government pets must be adopted through the official shelter',
  'government pets cannot receive Pawtner applications'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'pet_media_exactly_one_location'
      and conrelid = 'public.pet_media'::regclass
  ),
  'media location has an exactly-one check'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'pet_media_external_url_allowlist'
      and conrelid = 'public.pet_media'::regclass
  ),
  'external media has an allow-list check'
);

select ok(
  exists (
    select 1 from pg_trigger
    where tgname = 'adoption_applications_private_pets_only' and not tgisinternal
  ),
  'database trigger prevents government applications'
);

select * from finish();
rollback;
