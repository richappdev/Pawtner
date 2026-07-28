begin;
select plan(41);

select has_column('public', 'pets', 'source_type', 'pets have a source discriminator');
select has_column('public', 'pets', 'rabies_vaccinated', 'pets track rabies vaccination');
select has_table('public', 'pet_sources', 'source metadata table exists');
select has_table('public', 'pet_source_records', 'source record table exists');
select has_table('public', 'pet_sync_runs', 'sync run table exists');
select has_table('public', 'pet_source_staging_records', 'run-scoped staging table exists');
select has_table('public', 'pet_source_record_issues', 'quality issue table exists');
select has_table('public', 'pet_publication_events', 'publication audit table exists');

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
  not has_table_privilege('authenticated', 'public.pet_source_staging_records', 'select'),
  'authenticated users cannot read staged raw records'
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
  $test$
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
        "availability":"open",
        "qualityStatus":"warning",
        "issues":[{"code":"unknown_sex","field":"animal_sex","severity":"warning","message":"Sex is unknown."}],
        "shelterName":"測試收容所",
        "shelterAddress":"臺北市信義區",
        "shelterPhone":"02-12345678",
        "imageUrl":"https://www.pet.gov.tw/upload/pic/test.jpg",
        "contentHash":"hash-1",
        "officialUrl":"https://www.pet.gov.tw/AnimalApp/AnnounceMent.aspx?AnimalId=MOA-TEST-1",
        "rawPayload":{"animal_id":"MOA-TEST-1"}
      }]'::jsonb
    )
  $test$,
  'a normalized government batch stages successfully'
);

select is(
  (select count(*)::integer from public.pet_source_records where external_id = 'MOA-TEST-1'),
  0,
  'staging does not mutate live source records'
);

select is(
  (select count(*)::integer from public.pet_source_staging_records),
  1,
  'one record is staged for the run'
);

select lives_ok(
  $test$
    select public.finish_pet_source_sync(
      (select run_id from test_sync_state),
      1
    )
  $test$,
  'a complete staged feed merges atomically'
);

select is(
  (select count(*)::integer from public.pet_source_records where external_id = 'MOA-TEST-1'),
  1,
  'unique MOA ids map to one Pawtner pet'
);

select is(
  (
    select publication_status::text
    from public.pet_source_records
    where external_id = 'MOA-TEST-1'
  ),
  'pending_review',
  'new government records wait for explicit publication review'
);

select is(
  (
    select p.is_published
    from public.pets p
    join public.pet_source_records r on r.pet_id = p.id
    where r.external_id = 'MOA-TEST-1'
  ),
  false,
  'synchronization never auto-publishes a new government pet'
);

select is(
  (
    select p.review_status::text
    from public.pets p
    join public.pet_source_records r on r.pet_id = p.id
    where r.external_id = 'MOA-TEST-1'
  ),
  'approved',
  'government media does not trigger private-foster review invalidation'
);

select is(
  (
    select count(*)::integer
    from public.pet_source_record_issues i
    join public.pet_source_records r on r.pet_id = i.pet_id
    where r.external_id = 'MOA-TEST-1' and i.resolved_at is null
  ),
  1,
  'quality issues are persisted outside the source payload'
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
  $test$
    insert into public.adoption_applications (pet_id, adopter_user_id, status)
    select pet_id, gen_random_uuid(), 'submitted'
    from public.pet_source_records
    where external_id = 'MOA-TEST-1'
  $test$,
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

select throws_ok(
  $test$
    select public.manage_government_pet_publication(
      (select pet_id from public.pet_source_records where external_id = 'MOA-TEST-1'),
      'publish',
      null
    )
  $test$,
  'P0001',
  'staff access required',
  'publication RPC rejects callers without a staff identity'
);

select is(
  (select count(*)::integer from public.pet_source_staging_records),
  0,
  'successful merge clears run staging'
);

select is(
  (
    select status::text from public.pet_sync_runs
    where id = (select run_id from test_sync_state)
  ),
  'succeeded',
  'successful merge records a succeeded run'
);

insert into auth.users (id, email, raw_user_meta_data)
values ('10000000-0000-0000-0000-000000000099', 'government-reviewer@example.test', '{}'::jsonb);
insert into public.user_roles (user_id, role)
values ('10000000-0000-0000-0000-000000000099', 'admin');
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000099","role":"authenticated"}',
  true
);

select lives_ok(
  $test$
    select public.manage_government_pet_publication(
      (select pet_id from public.pet_source_records where external_id = 'MOA-TEST-1'),
      'approve',
      null
    )
  $test$,
  'staff can approve a non-blocked source record'
);

select is(
  (select publication_status::text from public.pet_source_records where external_id = 'MOA-TEST-1'),
  'approved',
  'approval is distinct from publication'
);

select lives_ok(
  $test$
    select public.manage_government_pet_publication(
      (select pet_id from public.pet_source_records where external_id = 'MOA-TEST-1'),
      'publish',
      null
    )
  $test$,
  'staff can publish an approved eligible source record'
);

select is(
  (select publication_status::text from public.pet_source_records where external_id = 'MOA-TEST-1'),
  'published',
  'publication workflow records the published state'
);

select is(
  (
    select p.is_published
    from public.pets p join public.pet_source_records r on r.pet_id = p.id
    where r.external_id = 'MOA-TEST-1'
  ),
  true,
  'publishing updates the pet visibility atomically'
);

select is(
  (
    select public.is_pet_publicly_visible(r.pet_id)
    from public.pet_source_records r where r.external_id = 'MOA-TEST-1'
  ),
  false,
  'the source-level launch gate still hides an approved listing'
);

update public.pet_sources set public_enabled = true where source_key = 'moa-animal-adoption';

select is(
  (
    select public.is_pet_publicly_visible(r.pet_id)
    from public.pet_source_records r where r.external_id = 'MOA-TEST-1'
  ),
  true,
  'published government pets become visible only after the source gate is enabled'
);

create temporary table test_closed_sync_state as
select public.start_pet_source_sync('moa-animal-adoption', false) as run_id;

select lives_ok(
  $test$
    select public.ingest_pet_source_batch(
      (select run_id from test_closed_sync_state),
      '[{
        "externalId":"MOA-TEST-1",
        "externalSubId":"TEST-001",
        "name":"待認養犬 · TEST-001",
        "species":"dog",
        "sex":"unknown",
        "ageBand":"adult",
        "bodySize":"medium",
        "availability":"unavailable",
        "qualityStatus":"warning",
        "issues":[],
        "shelterName":"測試收容所",
        "shelterAddress":"臺北市信義區",
        "shelterPhone":"02-12345678",
        "contentHash":"hash-closed",
        "officialUrl":"https://www.pet.gov.tw/AnimalApp/AnnounceMent.aspx?AnimalId=MOA-TEST-1",
        "rawPayload":{"animal_id":"MOA-TEST-1","animal_status":"CLOSED"}
      }]'::jsonb
    )
  $test$,
  'a later official closure stages successfully'
);

select lives_ok(
  $test$
    select public.finish_pet_source_sync(
      (select run_id from test_closed_sync_state),
      1
    )
  $test$,
  'the complete closure feed merges successfully'
);

select is(
  (select publication_status::text from public.pet_source_records where external_id = 'MOA-TEST-1'),
  'unpublished_source_change',
  'an official closure moves a published listing to the source-change queue'
);

select is(
  (
    select p.is_published
    from public.pets p join public.pet_source_records r on r.pet_id = p.id
    where r.external_id = 'MOA-TEST-1'
  ),
  false,
  'an official closure immediately removes public visibility without claiming adoption'
);

select * from finish();
rollback;
