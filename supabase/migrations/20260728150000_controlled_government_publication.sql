-- Controlled government pet ingestion and publication workflow.
-- A complete MOA feed is staged first, then merged atomically. Synchronization
-- never publishes a newly discovered or reappearing government listing.

create type public.pet_source_quality_status as enum (
  'pending',
  'clean',
  'warning',
  'blocked'
);

create type public.pet_source_publication_status as enum (
  'pending_review',
  'approved',
  'published',
  'held',
  'unpublished_source_change'
);

create type public.pet_source_issue_severity as enum ('warning', 'blocker');

alter table public.pet_source_records
  add column quality_status public.pet_source_quality_status not null default 'pending',
  add column publication_status public.pet_source_publication_status not null default 'pending_review',
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.user_profiles (id) on delete set null,
  add column approved_at timestamptz,
  add column approved_by uuid references public.user_profiles (id) on delete set null,
  add column hold_reason text,
  add column last_validated_at timestamptz;

create table public.pet_source_staging_records (
  run_id uuid not null references public.pet_sync_runs (id) on delete cascade,
  source_id uuid not null references public.pet_sources (id) on delete cascade,
  external_id text not null,
  pet_id uuid not null default gen_random_uuid(),
  normalized_payload jsonb not null,
  raw_payload jsonb not null,
  content_hash text not null,
  quality_status public.pet_source_quality_status not null,
  issues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (run_id, external_id),
  check (length(trim(external_id)) > 0),
  check (jsonb_typeof(normalized_payload) = 'object'),
  check (jsonb_typeof(raw_payload) = 'object'),
  check (jsonb_typeof(issues) = 'array')
);

create table public.pet_source_record_issues (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  issue_code text not null,
  field_name text,
  severity public.pet_source_issue_severity not null,
  message text not null,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (pet_id, issue_code)
);

create table public.pet_publication_events (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  actor_id uuid references public.user_profiles (id) on delete set null,
  action text not null,
  from_status public.pet_source_publication_status,
  to_status public.pet_source_publication_status not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object')
);

create index pet_source_records_review_queue_idx
  on public.pet_source_records (publication_status, quality_status, updated_at desc);
create index pet_source_staging_run_idx
  on public.pet_source_staging_records (run_id, quality_status);
create index pet_source_record_issues_open_idx
  on public.pet_source_record_issues (pet_id, severity)
  where resolved_at is null;
create index pet_publication_events_pet_created_idx
  on public.pet_publication_events (pet_id, created_at desc);

alter table public.pet_source_staging_records enable row level security;
alter table public.pet_source_record_issues enable row level security;
alter table public.pet_publication_events enable row level security;

create policy "source_issues_staff_read"
  on public.pet_source_record_issues for select
  to authenticated
  using (public.is_staff());

create policy "publication_events_staff_read"
  on public.pet_publication_events for select
  to authenticated
  using (public.is_staff());

grant select on public.pet_source_record_issues, public.pet_publication_events to authenticated;
grant all on public.pet_source_staging_records, public.pet_source_record_issues,
  public.pet_publication_events to service_role;

grant select (
  quality_status, publication_status, reviewed_at, reviewed_by, approved_at,
  approved_by, hold_reason, last_validated_at
) on public.pet_source_records to authenticated;

-- Private-foster review invalidation must not run for source-controlled pets.
create or replace function public.invalidate_pet_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.source_type <> 'private_foster'::public.pet_source_type then
    return new;
  end if;

  if old.review_status = 'approved'
    and (
      old.name is distinct from new.name
      or old.species is distinct from new.species
      or old.breed is distinct from new.breed
      or old.sex is distinct from new.sex
      or old.age_months is distinct from new.age_months
      or old.weight_kg is distinct from new.weight_kg
      or old.color is distinct from new.color
      or old.region is distinct from new.region
      or old.sterilized is distinct from new.sterilized
      or old.microchipped is distinct from new.microchipped
      or old.vaccinated is distinct from new.vaccinated
      or old.dewormed is distinct from new.dewormed
      or old.personality_summary is distinct from new.personality_summary
      or old.special_care is distinct from new.special_care
      or old.adoption_conditions is distinct from new.adoption_conditions
    )
  then
    new.review_status := 'changes_requested';
    new.review_note := 'Public pet information changed and requires review.';
    new.is_published := false;
    new.published_at := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

create or replace function public.invalidate_related_pet_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_pet_id uuid;
  actor uuid;
begin
  target_pet_id := coalesce(new.pet_id, old.pet_id);
  actor := public.current_app_user_id();

  update public.pets
  set review_status = 'changes_requested',
      review_note = 'Pet health, traits, or media changed and requires review.',
      is_published = false,
      published_at = null,
      reviewed_at = null,
      reviewed_by = null
  where id = target_pet_id
    and source_type = 'private_foster'
    and review_status = 'approved';

  if found then
    insert into public.pet_review_events (
      pet_id, actor_id, action, from_review_status, to_review_status, note
    ) values (
      target_pet_id, actor, 'content_changed', 'approved', 'changes_requested',
      'Pet health, traits, or media changed and requires review.'
    );
  end if;

  return coalesce(new, old);
end;
$$;

-- Batches are run-scoped staging writes only. No live pets are changed here.
create or replace function public.ingest_pet_source_batch(
  p_run_id uuid,
  p_records jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  run_row public.pet_sync_runs;
  received_count integer;
  staged_count integer;
  v_skipped_count integer;
begin
  select * into run_row
  from public.pet_sync_runs
  where id = p_run_id and status = 'running'
  for update;

  if not found then raise exception 'sync run is not running'; end if;
  if jsonb_typeof(p_records) <> 'array' then raise exception 'records must be a JSON array'; end if;

  received_count := jsonb_array_length(p_records);

  insert into public.pet_source_staging_records (
    run_id, source_id, external_id, normalized_payload, raw_payload,
    content_hash, quality_status, issues
  )
  select
    p_run_id,
    run_row.source_id,
    trim(item->>'externalId'),
    item - 'rawPayload' - 'issues',
    coalesce(item->'rawPayload', '{}'::jsonb),
    coalesce(nullif(item->>'contentHash', ''), md5(item::text)),
    coalesce(nullif(item->>'qualityStatus', ''), 'pending')::public.pet_source_quality_status,
    coalesce(item->'issues', '[]'::jsonb)
  from jsonb_array_elements(p_records) as records(item)
  where nullif(trim(item->>'externalId'), '') is not null
  on conflict (run_id, external_id) do update set
    normalized_payload = excluded.normalized_payload,
    raw_payload = excluded.raw_payload,
    content_hash = excluded.content_hash,
    quality_status = excluded.quality_status,
    issues = excluded.issues,
    created_at = now();

  get diagnostics staged_count = row_count;
  v_skipped_count := received_count - staged_count;

  update public.pet_sync_runs r
  set fetched_count = r.fetched_count + received_count,
      skipped_count = r.skipped_count + greatest(v_skipped_count, 0)
  where r.id = p_run_id;

  return jsonb_build_object(
    'staged', staged_count,
    'skipped', greatest(v_skipped_count, 0),
    'dryRun', run_row.dry_run
  );
end;
$$;

-- Validation and the complete live merge run in this single database transaction.
create or replace function public.finish_pet_source_sync(
  p_run_id uuid,
  p_complete_count integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  run_row public.pet_sync_runs;
  source_row public.pet_sources;
  staged_count integer;
  v_inserted_count integer := 0;
  v_updated_count integer := 0;
  departed_count integer := 0;
begin
  select * into run_row
  from public.pet_sync_runs
  where id = p_run_id and status = 'running'
  for update;
  if not found then raise exception 'sync run is not running'; end if;

  select * into source_row
  from public.pet_sources
  where id = run_row.source_id
  for update;

  select count(*) into staged_count
  from public.pet_source_staging_records
  where run_id = p_run_id;

  if p_complete_count <= 0
    or p_complete_count <> run_row.fetched_count
    or staged_count <> p_complete_count
    or (
      source_row.last_successful_record_count is not null
      and p_complete_count < ceil(source_row.last_successful_record_count * 0.5)
    )
  then
    update public.pet_sync_runs
    set status = 'rejected',
        finished_at = now(),
        error_count = error_count + 1,
        error_message = 'merge rejected: empty, incomplete, duplicate, or below 50% of previous success'
    where id = p_run_id;
    return jsonb_build_object('accepted', false, 'staged', staged_count, 'unpublished', 0);
  end if;

  if run_row.dry_run then
    update public.pet_sync_runs
    set status = 'succeeded', finished_at = now()
    where id = p_run_id;
    delete from public.pet_source_staging_records where run_id = p_run_id;
    return jsonb_build_object('accepted', true, 'dryRun', true, 'staged', staged_count);
  end if;

  select count(*) into v_inserted_count
  from public.pet_source_staging_records s
  where s.run_id = p_run_id
    and not exists (
      select 1 from public.pet_source_records r
      where r.source_id = run_row.source_id and r.external_id = s.external_id
    );
  v_updated_count := staged_count - v_inserted_count;

  insert into public.pets (
    id, foster_profile_id, source_type, name, species, breed, sex, age_months,
    age_band, body_size, color, region, found_location, status, sterilized,
    vaccinated, rabies_vaccinated, review_status, reviewed_at,
    is_published, published_at
  )
  select
    s.pet_id,
    null,
    'government',
    s.normalized_payload->>'name',
    (s.normalized_payload->>'species')::public.pet_species,
    nullif(s.normalized_payload->>'breed', ''),
    s.normalized_payload->>'sex',
    nullif(s.normalized_payload->>'ageMonths', '')::integer,
    coalesce(nullif(s.normalized_payload->>'ageBand', ''), 'unknown')::public.pet_age_band,
    coalesce(nullif(s.normalized_payload->>'bodySize', ''), 'unknown')::public.pet_body_size,
    nullif(s.normalized_payload->>'color', ''),
    nullif(s.normalized_payload->>'region', ''),
    nullif(s.normalized_payload->>'foundLocation', ''),
    'hidden',
    nullif(s.normalized_payload->>'sterilized', '')::boolean,
    nullif(s.normalized_payload->>'vaccinated', '')::boolean,
    nullif(s.normalized_payload->>'rabiesVaccinated', '')::boolean,
    'approved',
    now(),
    false,
    null
  from public.pet_source_staging_records s
  where s.run_id = p_run_id
    and not exists (
      select 1 from public.pet_source_records r
      where r.source_id = run_row.source_id and r.external_id = s.external_id
    );

  -- Record automatic safety transitions before replacing source values.
  insert into public.pet_publication_events (
    pet_id, action, from_status, to_status, reason, metadata
  )
  select
    r.pet_id,
    'source_safety_unpublish',
    r.publication_status,
    case
      when coalesce(o.is_hidden, false) then 'held'::public.pet_source_publication_status
      else 'unpublished_source_change'::public.pet_source_publication_status
    end,
    case
      when coalesce(o.is_hidden, false) then 'Listing is hidden by staff.'
      when s.quality_status = 'blocked' then 'Source validation produced a blocking issue.'
      else 'Official availability or adoption-open date is no longer publishable.'
    end,
    jsonb_build_object('runId', p_run_id)
  from public.pet_source_staging_records s
  join public.pet_source_records r
    on r.source_id = run_row.source_id and r.external_id = s.external_id
  left join public.pet_editorial_overrides o on o.pet_id = r.pet_id
  where s.run_id = p_run_id
    and r.publication_status = 'published'
    and (
      s.quality_status = 'blocked'
      or coalesce(s.normalized_payload->>'availability', 'unavailable') <> 'open'
      or (
        nullif(s.normalized_payload->>'adoptionOpenAt', '')::timestamptz is not null
        and nullif(s.normalized_payload->>'adoptionOpenAt', '')::timestamptz > now()
      )
      or coalesce(o.is_hidden, false)
    );

  update public.pets p
  set name = s.normalized_payload->>'name',
      species = (s.normalized_payload->>'species')::public.pet_species,
      breed = nullif(s.normalized_payload->>'breed', ''),
      sex = s.normalized_payload->>'sex',
      age_months = nullif(s.normalized_payload->>'ageMonths', '')::integer,
      age_band = coalesce(nullif(s.normalized_payload->>'ageBand', ''), 'unknown')::public.pet_age_band,
      body_size = coalesce(nullif(s.normalized_payload->>'bodySize', ''), 'unknown')::public.pet_body_size,
      color = nullif(s.normalized_payload->>'color', ''),
      region = nullif(s.normalized_payload->>'region', ''),
      found_location = nullif(s.normalized_payload->>'foundLocation', ''),
      sterilized = nullif(s.normalized_payload->>'sterilized', '')::boolean,
      vaccinated = nullif(s.normalized_payload->>'vaccinated', '')::boolean,
      rabies_vaccinated = nullif(s.normalized_payload->>'rabiesVaccinated', '')::boolean,
      status = case
        when r.publication_status = 'published'
          and s.quality_status <> 'blocked'
          and coalesce(s.normalized_payload->>'availability', 'unavailable') = 'open'
          and (
            nullif(s.normalized_payload->>'adoptionOpenAt', '')::timestamptz is null
            or nullif(s.normalized_payload->>'adoptionOpenAt', '')::timestamptz <= now()
          )
          and not coalesce(o.is_hidden, false)
        then 'available'::public.pet_status
        else 'hidden'::public.pet_status
      end,
      is_published = (
        r.publication_status = 'published'
        and s.quality_status <> 'blocked'
        and coalesce(s.normalized_payload->>'availability', 'unavailable') = 'open'
        and (
          nullif(s.normalized_payload->>'adoptionOpenAt', '')::timestamptz is null
          or nullif(s.normalized_payload->>'adoptionOpenAt', '')::timestamptz <= now()
        )
        and not coalesce(o.is_hidden, false)
      ),
      published_at = case
        when r.publication_status = 'published'
          and s.quality_status <> 'blocked'
          and coalesce(s.normalized_payload->>'availability', 'unavailable') = 'open'
          and (
            nullif(s.normalized_payload->>'adoptionOpenAt', '')::timestamptz is null
            or nullif(s.normalized_payload->>'adoptionOpenAt', '')::timestamptz <= now()
          )
          and not coalesce(o.is_hidden, false)
        then coalesce(p.published_at, now())
        else null
      end,
      review_status = 'approved',
      reviewed_at = coalesce(p.reviewed_at, now()),
      updated_at = now()
  from public.pet_source_staging_records s
  join public.pet_source_records r
    on r.source_id = run_row.source_id and r.external_id = s.external_id
  left join public.pet_editorial_overrides o on o.pet_id = r.pet_id
  where s.run_id = p_run_id and p.id = r.pet_id;

  insert into public.pet_source_records (
    pet_id, source_id, external_id, external_sub_id, shelter_id, shelter_name,
    shelter_address, shelter_phone, official_url, adoption_open_at,
    source_created_at, source_updated_at, last_seen_at, availability,
    content_hash, raw_payload, quality_status, publication_status,
    last_validated_at
  )
  select
    coalesce(r.pet_id, s.pet_id),
    run_row.source_id,
    s.external_id,
    nullif(s.normalized_payload->>'externalSubId', ''),
    nullif(s.normalized_payload->>'shelterId', ''),
    nullif(s.normalized_payload->>'shelterName', ''),
    nullif(s.normalized_payload->>'shelterAddress', ''),
    nullif(s.normalized_payload->>'shelterPhone', ''),
    nullif(s.normalized_payload->>'officialUrl', ''),
    nullif(s.normalized_payload->>'adoptionOpenAt', '')::timestamptz,
    nullif(s.normalized_payload->>'sourceCreatedAt', '')::timestamptz,
    nullif(s.normalized_payload->>'sourceUpdatedAt', '')::timestamptz,
    now(),
    coalesce(nullif(s.normalized_payload->>'availability', ''), 'unavailable')::public.pet_source_availability,
    s.content_hash,
    s.raw_payload,
    s.quality_status,
    case
      when r.pet_id is null then 'pending_review'::public.pet_source_publication_status
      when r.publication_status = 'published' and (
        s.quality_status = 'blocked'
        or coalesce(s.normalized_payload->>'availability', 'unavailable') <> 'open'
        or (
          nullif(s.normalized_payload->>'adoptionOpenAt', '')::timestamptz is not null
          and nullif(s.normalized_payload->>'adoptionOpenAt', '')::timestamptz > now()
        )
      ) then 'unpublished_source_change'::public.pet_source_publication_status
      when r.publication_status = 'published' and coalesce(o.is_hidden, false)
        then 'held'::public.pet_source_publication_status
      when r.publication_status = 'unpublished_source_change'
        and s.quality_status <> 'blocked'
        and coalesce(s.normalized_payload->>'availability', 'unavailable') = 'open'
        and (
          nullif(s.normalized_payload->>'adoptionOpenAt', '')::timestamptz is null
          or nullif(s.normalized_payload->>'adoptionOpenAt', '')::timestamptz <= now()
        )
        then 'pending_review'::public.pet_source_publication_status
      else r.publication_status
    end,
    now()
  from public.pet_source_staging_records s
  left join public.pet_source_records r
    on r.source_id = run_row.source_id and r.external_id = s.external_id
  left join public.pet_editorial_overrides o on o.pet_id = r.pet_id
  where s.run_id = p_run_id
  on conflict (pet_id) do update set
    external_sub_id = excluded.external_sub_id,
    shelter_id = excluded.shelter_id,
    shelter_name = excluded.shelter_name,
    shelter_address = excluded.shelter_address,
    shelter_phone = excluded.shelter_phone,
    official_url = excluded.official_url,
    adoption_open_at = excluded.adoption_open_at,
    source_created_at = excluded.source_created_at,
    source_updated_at = excluded.source_updated_at,
    last_seen_at = excluded.last_seen_at,
    availability = excluded.availability,
    content_hash = excluded.content_hash,
    raw_payload = excluded.raw_payload,
    quality_status = excluded.quality_status,
    publication_status = excluded.publication_status,
    last_validated_at = excluded.last_validated_at,
    updated_at = now();

  update public.pet_source_record_issues i
  set resolved_at = now()
  where i.resolved_at is null
    and exists (
      select 1
      from public.pet_source_staging_records s
      join public.pet_source_records r
        on r.source_id = run_row.source_id and r.external_id = s.external_id
      where s.run_id = p_run_id
        and r.pet_id = i.pet_id
        and not exists (
          select 1 from jsonb_array_elements(s.issues) issue
          where issue->>'code' = i.issue_code
        )
    );

  insert into public.pet_source_record_issues (
    pet_id, issue_code, field_name, severity, message, detected_at, resolved_at
  )
  select
    r.pet_id,
    issue->>'code',
    nullif(issue->>'field', ''),
    (issue->>'severity')::public.pet_source_issue_severity,
    issue->>'message',
    now(),
    null
  from public.pet_source_staging_records s
  join public.pet_source_records r
    on r.source_id = run_row.source_id and r.external_id = s.external_id
  cross join lateral jsonb_array_elements(s.issues) issue
  where s.run_id = p_run_id
  on conflict (pet_id, issue_code) do update set
    field_name = excluded.field_name,
    severity = excluded.severity,
    message = excluded.message,
    detected_at = now(),
    resolved_at = null;

  insert into public.pet_media (
    pet_id, storage_path, external_url, media_type, is_cover, is_public, sort_order
  )
  select
    r.pet_id, null, nullif(s.normalized_payload->>'imageUrl', ''),
    'image', true, true, 0
  from public.pet_source_staging_records s
  join public.pet_source_records r
    on r.source_id = run_row.source_id and r.external_id = s.external_id
  where s.run_id = p_run_id
    and nullif(s.normalized_payload->>'imageUrl', '') is not null
  on conflict do nothing;

  update public.pet_media m
  set external_url = nullif(s.normalized_payload->>'imageUrl', '')
  from public.pet_source_staging_records s
  join public.pet_source_records r
    on r.source_id = run_row.source_id and r.external_id = s.external_id
  where s.run_id = p_run_id
    and m.pet_id = r.pet_id
    and m.storage_path is null
    and m.is_cover = true
    and nullif(s.normalized_payload->>'imageUrl', '') is not null;

  with missing as (
    select r.pet_id, r.publication_status
    from public.pet_source_records r
    where r.source_id = run_row.source_id
      and not exists (
        select 1 from public.pet_source_staging_records s
        where s.run_id = p_run_id and s.external_id = r.external_id
      )
      and r.availability <> 'departed_unconfirmed'
  ), events as (
    insert into public.pet_publication_events (
      pet_id, action, from_status, to_status, reason, metadata
    )
    select
      pet_id, 'source_departed', publication_status,
      'unpublished_source_change', 'Listing is absent from the complete official feed.',
      jsonb_build_object('runId', p_run_id)
    from missing
    returning pet_id
  ), source_update as (
    update public.pet_source_records r
    set availability = 'departed_unconfirmed',
        publication_status = 'unpublished_source_change',
        updated_at = now()
    where r.pet_id in (select pet_id from missing)
    returning r.pet_id
  )
  update public.pets p
  set status = 'hidden', is_published = false, published_at = null, updated_at = now()
  where p.id in (select pet_id from source_update);
  get diagnostics departed_count = row_count;

  update public.pet_sync_runs
  set status = 'succeeded',
      finished_at = now(),
      inserted_count = v_inserted_count,
      updated_count = v_updated_count,
      unpublished_count = departed_count
  where id = p_run_id;

  update public.pet_sources
  set last_successful_sync_at = now(),
      last_successful_record_count = p_complete_count,
      updated_at = now()
  where id = run_row.source_id;

  delete from public.pet_source_staging_records where run_id = p_run_id;

  return jsonb_build_object(
    'accepted', true,
    'inserted', v_inserted_count,
    'updated', v_updated_count,
    'unpublished', departed_count
  );
end;
$$;

create or replace function public.manage_government_pet_publication(
  p_pet_id uuid,
  p_action text,
  p_reason text default null
)
returns public.pet_source_records
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid;
  source_record public.pet_source_records;
  source_row public.pet_sources;
  editorial_hidden boolean;
  previous_status public.pet_source_publication_status;
  next_status public.pet_source_publication_status;
begin
  if not public.is_staff() then raise exception 'staff access required'; end if;
  actor := public.current_app_user_id();

  select r.* into source_record
  from public.pet_source_records r
  join public.pets p on p.id = r.pet_id
  where r.pet_id = p_pet_id and p.source_type = 'government'
  for update;
  if not found then raise exception 'government pet not found'; end if;
  previous_status := source_record.publication_status;

  select * into source_row from public.pet_sources where id = source_record.source_id;
  select coalesce(o.is_hidden, false) into editorial_hidden
  from public.pet_editorial_overrides o where o.pet_id = p_pet_id;
  editorial_hidden := coalesce(editorial_hidden, false);

  if p_action = 'approve' then
    if source_record.quality_status = 'blocked' then
      raise exception 'blocked source records cannot be approved';
    end if;
    next_status := 'approved';
    update public.pet_source_records
    set publication_status = next_status,
        reviewed_at = now(), reviewed_by = actor,
        approved_at = now(), approved_by = actor,
        hold_reason = null, updated_at = now()
    where pet_id = p_pet_id
    returning * into source_record;
    update public.pets
    set is_published = false, published_at = null, status = 'hidden', updated_at = now()
    where id = p_pet_id;
  elsif p_action = 'publish' then
    if source_record.publication_status <> 'approved' then
      raise exception 'record must be approved before publishing';
    end if;
    if source_record.quality_status = 'blocked'
      or source_record.availability <> 'open'
      or (source_record.adoption_open_at is not null and source_record.adoption_open_at > now())
      or not source_row.enabled
    then
      raise exception 'record does not meet publication safety requirements';
    end if;
    next_status := 'published';
    update public.pet_editorial_overrides
    set is_hidden = false, updated_at = now()
    where pet_id = p_pet_id;
    update public.pet_source_records
    set publication_status = next_status,
        reviewed_at = coalesce(reviewed_at, now()),
        reviewed_by = coalesce(reviewed_by, actor),
        approved_at = coalesce(approved_at, now()),
        approved_by = coalesce(approved_by, actor),
        hold_reason = null, updated_at = now()
    where pet_id = p_pet_id
    returning * into source_record;
    update public.pets
    set is_published = true, published_at = coalesce(published_at, now()),
        status = 'available', review_status = 'approved', reviewed_at = coalesce(reviewed_at, now()),
        updated_at = now()
    where id = p_pet_id;
  elsif p_action in ('hold', 'unpublish') then
    if nullif(trim(p_reason), '') is null then
      raise exception 'a reason is required to hold or unpublish a listing';
    end if;
    next_status := 'held';
    insert into public.pet_editorial_overrides (pet_id, is_hidden)
    values (p_pet_id, true)
    on conflict (pet_id) do update set is_hidden = true, updated_at = now();
    update public.pet_source_records
    set publication_status = next_status,
        hold_reason = trim(p_reason), reviewed_at = now(), reviewed_by = actor,
        updated_at = now()
    where pet_id = p_pet_id
    returning * into source_record;
    update public.pets
    set is_published = false, published_at = null, status = 'hidden', updated_at = now()
    where id = p_pet_id;
  else
    raise exception 'unsupported publication action';
  end if;

  insert into public.pet_publication_events (
    pet_id, actor_id, action, from_status, to_status, reason
  ) values (
    p_pet_id, actor, p_action, previous_status, next_status,
    nullif(trim(p_reason), '')
  );

  return source_record;
end;
$$;

revoke all on function public.manage_government_pet_publication(uuid, text, text)
  from public, anon;
grant execute on function public.manage_government_pet_publication(uuid, text, text)
  to authenticated, service_role;

create or replace function public.is_pet_publicly_visible(target_pet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pets p
    left join public.pet_source_records r on r.pet_id = p.id
    left join public.pet_sources s on s.id = r.source_id
    left join public.pet_editorial_overrides o on o.pet_id = p.id
    where p.id = target_pet_id
      and p.review_status = 'approved'
      and p.is_published = true
      and p.status in ('available', 'application_pending', 'reserved', 'trial_adoption')
      and coalesce(o.is_hidden, false) = false
      and (
        p.source_type = 'private_foster'
        or (
          p.source_type = 'government'
          and s.public_enabled = true
          and r.availability = 'open'
          and r.publication_status = 'published'
          and r.quality_status <> 'blocked'
        )
      )
  );
$$;

-- One-time repair: legacy media triggers produced false changes_requested states.
-- All existing government records re-enter the explicit review queue unpublished.
update public.pet_source_records r
set quality_status = case
      when nullif(trim(r.shelter_name), '') is null
        or nullif(trim(r.shelter_phone), '') is null
        or nullif(trim(r.shelter_address), '') is null
      then 'blocked'::public.pet_source_quality_status
      when not exists (
        select 1 from public.pet_media m
        where m.pet_id = r.pet_id and m.external_url is not null
      )
      then 'warning'::public.pet_source_quality_status
      else 'clean'::public.pet_source_quality_status
    end,
    publication_status = 'pending_review',
    reviewed_at = null,
    reviewed_by = null,
    approved_at = null,
    approved_by = null,
    hold_reason = null,
    last_validated_at = now(),
    updated_at = now();

update public.pets
set review_status = 'approved',
    review_note = null,
    reviewed_at = coalesce(reviewed_at, now()),
    is_published = false,
    published_at = null,
    status = 'hidden',
    updated_at = now()
where source_type = 'government';

insert into public.pet_source_record_issues (
  pet_id, issue_code, field_name, severity, message
)
select r.pet_id, issue_code, field_name, 'blocker', message
from public.pet_source_records r
cross join lateral (
  values
    ('missing_shelter_name', 'shelterName', 'Official shelter name is required.', r.shelter_name),
    ('missing_shelter_phone', 'shelterPhone', 'Official shelter phone is required.', r.shelter_phone),
    ('missing_shelter_address', 'shelterAddress', 'Official shelter address is required.', r.shelter_address)
) issue(issue_code, field_name, message, field_value)
where nullif(trim(field_value), '') is null
on conflict (pet_id, issue_code) do nothing;

insert into public.pet_source_record_issues (
  pet_id, issue_code, field_name, severity, message
)
select r.pet_id, 'missing_image', 'imageUrl', 'warning',
  'The official feed does not provide an image.'
from public.pet_source_records r
where not exists (
  select 1 from public.pet_media m
  where m.pet_id = r.pet_id and m.external_url is not null
)
on conflict (pet_id, issue_code) do nothing;

revoke all on function public.ingest_pet_source_batch(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.finish_pet_source_sync(uuid, integer) from public, anon, authenticated;
grant execute on function public.ingest_pet_source_batch(uuid, jsonb) to service_role;
grant execute on function public.finish_pet_source_sync(uuid, integer) to service_role;
