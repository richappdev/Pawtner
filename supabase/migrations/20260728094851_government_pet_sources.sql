-- Government open-data pet ingestion, provenance, editorial overlays, and sync controls.
-- Existing foster-created pets remain unchanged and are backfilled as private_foster.

create type public.pet_source_type as enum ('private_foster', 'government');
create type public.pet_age_band as enum ('child', 'adult', 'senior', 'unknown');
create type public.pet_body_size as enum ('small', 'medium', 'large', 'unknown');
create type public.pet_source_availability as enum ('open', 'future', 'unavailable', 'departed_unconfirmed');
create type public.pet_sync_status as enum ('running', 'succeeded', 'failed', 'rejected');

alter table public.pets
  add column source_type public.pet_source_type not null default 'private_foster',
  add column age_band public.pet_age_band,
  add column body_size public.pet_body_size,
  add column found_location text,
  add column rabies_vaccinated boolean,
  alter column foster_profile_id drop not null,
  add constraint pets_source_ownership_check check (
    (source_type = 'private_foster' and foster_profile_id is not null)
    or (source_type = 'government' and foster_profile_id is null)
  );

create table public.pet_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  dataset_name text not null,
  attribution text not null,
  dataset_url text not null,
  api_url text not null,
  license_name text not null,
  license_url text not null,
  enabled boolean not null default true,
  public_enabled boolean not null default false,
  last_successful_sync_at timestamptz,
  last_successful_record_count integer check (last_successful_record_count is null or last_successful_record_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pet_source_records (
  pet_id uuid primary key references public.pets (id) on delete cascade,
  source_id uuid not null references public.pet_sources (id) on delete restrict,
  external_id text not null,
  external_sub_id text,
  shelter_id text,
  shelter_name text,
  shelter_address text,
  shelter_phone text,
  official_url text,
  adoption_open_at timestamptz,
  source_created_at timestamptz,
  source_updated_at timestamptz,
  last_seen_at timestamptz not null,
  availability public.pet_source_availability not null default 'open',
  content_hash text not null,
  raw_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, external_id),
  check (length(trim(external_id)) > 0),
  check (official_url is null or official_url ~ '^https://')
);

create table public.pet_editorial_overrides (
  pet_id uuid primary key references public.pets (id) on delete cascade,
  display_name text,
  personality_summary text,
  special_care text,
  adoption_conditions text,
  tags text[],
  is_hidden boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.pet_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.pet_sources (id) on delete restrict,
  status public.pet_sync_status not null default 'running',
  dry_run boolean not null default false,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  fetched_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  unpublished_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  error_message text,
  check (
    fetched_count >= 0 and inserted_count >= 0 and updated_count >= 0
    and unpublished_count >= 0 and skipped_count >= 0 and error_count >= 0
  )
);

insert into public.pet_sources (
  source_key, dataset_name, attribution, dataset_url, api_url, license_name, license_url
)
values (
  'moa-animal-adoption',
  '農業部動物認領養',
  '資料來源：農業部動物認領養開放資料',
  'https://data.gov.tw/dataset/85903',
  'https://data.moa.gov.tw/Service/OpenData/TransService.aspx',
  '政府資料開放授權條款－第1版',
  'https://data.gov.tw/license'
)
on conflict (source_key) do update set
  dataset_name = excluded.dataset_name,
  attribution = excluded.attribution,
  dataset_url = excluded.dataset_url,
  api_url = excluded.api_url,
  license_name = excluded.license_name,
  license_url = excluded.license_url,
  updated_at = now();

alter table public.pet_media
  alter column storage_path drop not null,
  add column external_url text,
  add constraint pet_media_exactly_one_location check (
    (storage_path is not null)::integer + (external_url is not null)::integer = 1
  ),
  add constraint pet_media_external_url_allowlist check (
    external_url is null
    or external_url ~ '^https://www\.pet\.gov\.tw/upload/pic/'
  );

create index pets_source_discovery_idx
  on public.pets (source_type, review_status, is_published, status, published_at desc, id);
create index pets_source_region_species_idx
  on public.pets (source_type, region, species, status);
create index pet_source_records_last_seen_idx
  on public.pet_source_records (source_id, last_seen_at);
create index pet_source_records_availability_idx
  on public.pet_source_records (source_id, availability, adoption_open_at);
create index pet_sync_runs_source_started_idx
  on public.pet_sync_runs (source_id, started_at desc);
create unique index pet_media_one_external_cover_idx
  on public.pet_media (pet_id)
  where storage_path is null and is_cover = true;

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
        )
      )
  );
$$;

create or replace function public.owns_pet(target_pet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pets p
    join public.foster_profiles fp on fp.id = p.foster_profile_id
    where p.id = target_pet_id
      and p.source_type = 'private_foster'
      and fp.user_id = public.current_app_user_id()
  );
$$;

create or replace function public.can_manage_application(app_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.adoption_applications a
    join public.pets p on p.id = a.pet_id
    left join public.foster_profiles fp on fp.id = p.foster_profile_id
    where a.id = app_id
      and (
        a.adopter_user_id = public.current_app_user_id()
        or (p.source_type = 'private_foster' and fp.user_id = public.current_app_user_id())
        or public.is_staff()
      )
  );
$$;

drop policy if exists "pets_public_or_owner_or_staff" on public.pets;
create policy "pets_public_or_owner_or_staff"
  on public.pets for select
  using (
    public.is_pet_publicly_visible(id)
    or public.owns_pet(id)
    or public.is_staff()
  );

drop policy if exists "pets_insert_approved_foster" on public.pets;
create policy "pets_insert_approved_foster"
  on public.pets for insert
  to authenticated
  with check (
    source_type = 'private_foster'
    and exists (
      select 1 from public.foster_profiles fp
      where fp.id = foster_profile_id
        and fp.user_id = public.current_app_user_id()
        and fp.status = 'approved'
    )
  );

drop policy if exists "pets_update_owner_or_staff" on public.pets;
create policy "pets_update_owner_or_staff"
  on public.pets for update
  to authenticated
  using (public.owns_pet(id) or public.is_staff())
  with check (
    (source_type = 'private_foster' and (public.owns_pet(id) or public.is_staff()))
    or (source_type = 'government' and public.is_staff())
  );

drop policy if exists "applications_adopter_insert" on public.adoption_applications;
create policy "applications_adopter_insert"
  on public.adoption_applications for insert
  to authenticated
  with check (
    adopter_user_id = public.current_app_user_id()
    and status in ('draft', 'submitted')
    and match_score is null
    and match_breakdown = '{}'::jsonb
    and internal_notes is null
    and exists (
      select 1
      from public.pets p
      where p.id = pet_id
        and p.source_type = 'private_foster'
        and p.review_status = 'approved'
        and p.is_published = true
        and p.status = 'available'
    )
  );

create or replace function public.reject_government_pet_application()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.pets p
    where p.id = new.pet_id and p.source_type = 'government'
  ) then
    raise exception 'government pets must be adopted through the official shelter'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger adoption_applications_private_pets_only
before insert or update of pet_id on public.adoption_applications
for each row execute function public.reject_government_pet_application();

create or replace function public.enforce_government_pet_source()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.source_type = 'government'
    and not exists (
      select 1 from public.pet_source_records r where r.pet_id = new.id
    )
  then
    raise exception 'government pet % requires an external source record', new.id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create constraint trigger pets_government_source_required
after insert or update of source_type on public.pets
deferrable initially deferred
for each row execute function public.enforce_government_pet_source();

create or replace function public.prevent_source_record_removal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.pets p
    where p.id = old.pet_id and p.source_type = 'government'
  ) then
    raise exception 'cannot remove the source record for government pet %', old.pet_id
      using errcode = '23514';
  end if;
  return old;
end;
$$;

create constraint trigger pet_source_record_required_on_delete
after delete on public.pet_source_records
deferrable initially deferred
for each row execute function public.prevent_source_record_removal();

alter table public.pet_sources enable row level security;
alter table public.pet_source_records enable row level security;
alter table public.pet_editorial_overrides enable row level security;
alter table public.pet_sync_runs enable row level security;

create policy "pet_sources_public_or_staff"
  on public.pet_sources for select
  using (public_enabled or public.is_staff());

create policy "pet_sources_staff_update"
  on public.pet_sources for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "pet_source_records_public_or_staff"
  on public.pet_source_records for select
  using (
    public.is_staff()
    or exists (
      select 1
      from public.pets p
      join public.pet_sources s on s.id = source_id
      where p.id = pet_id
        and p.is_published = true
        and p.review_status = 'approved'
        and s.public_enabled = true
    )
  );

drop policy if exists "media_via_pet" on public.pet_media;
create policy "media_via_pet"
  on public.pet_media for select
  using (
    (is_public = true and public.is_pet_publicly_visible(pet_id))
    or public.owns_pet(pet_id)
    or public.is_staff()
  );

create policy "pet_editorial_overrides_staff"
  on public.pet_editorial_overrides for all
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

create policy "pet_editorial_overrides_public_read"
  on public.pet_editorial_overrides for select
  using (public.is_pet_publicly_visible(pet_id));

create policy "pet_sync_runs_staff_read"
  on public.pet_sync_runs for select
  to authenticated
  using (public.is_staff());

revoke all on public.pet_sources, public.pet_source_records,
  public.pet_editorial_overrides, public.pet_sync_runs from anon, authenticated;
grant select on public.pet_sources to anon, authenticated;
grant select (
  pet_id, source_id, external_id, external_sub_id, shelter_id, shelter_name,
  shelter_address, shelter_phone, official_url, adoption_open_at,
  source_created_at, source_updated_at, last_seen_at, availability,
  content_hash, created_at, updated_at
) on public.pet_source_records to anon, authenticated;
grant select, insert, update, delete on public.pet_editorial_overrides to authenticated;
grant select (
  pet_id, display_name, personality_summary, special_care,
  adoption_conditions, tags, is_hidden, updated_at
) on public.pet_editorial_overrides to anon;
grant select on public.pet_sync_runs to authenticated;
grant update on public.pet_sources to authenticated;
grant all on public.pet_sources, public.pet_source_records,
  public.pet_editorial_overrides, public.pet_sync_runs to service_role;

drop view if exists public.pets_public;
create view public.pets_public
with (security_invoker = true)
as
select
  p.id,
  coalesce(o.display_name, p.name) as name,
  p.species,
  p.breed,
  p.sex,
  p.age_months,
  p.age_band,
  p.body_size,
  p.weight_kg,
  p.color,
  p.region,
  p.found_location,
  p.status,
  p.source_type,
  p.sterilized,
  p.microchipped,
  p.vaccinated,
  p.rabies_vaccinated,
  p.dewormed,
  coalesce(o.personality_summary, p.personality_summary) as personality_summary,
  coalesce(o.special_care, p.special_care) as special_care,
  coalesce(o.adoption_conditions, p.adoption_conditions) as adoption_conditions,
  coalesce(o.tags, t.tags, '{}'::text[]) as tags,
  p.published_at,
  fp.display_name as foster_display_name,
  fp.region as foster_region,
  org.name as organization_name,
  org.slug as organization_slug,
  org.is_verified as organization_verified,
  s.source_key,
  s.dataset_name as source_label,
  s.attribution as source_attribution,
  s.dataset_url,
  s.license_name,
  s.license_url,
  r.external_sub_id as official_reference,
  r.shelter_name,
  r.shelter_address,
  r.shelter_phone,
  r.official_url,
  r.adoption_open_at,
  r.last_seen_at,
  r.availability as source_availability
from public.pets p
left join public.foster_profiles fp on fp.id = p.foster_profile_id
left join public.organizations org on org.id = fp.organization_id
left join public.pet_traits t on t.pet_id = p.id
left join public.pet_editorial_overrides o on o.pet_id = p.id
left join public.pet_source_records r on r.pet_id = p.id
left join public.pet_sources s on s.id = r.source_id
where p.review_status = 'approved'
  and p.is_published = true
  and coalesce(o.is_hidden, false) = false
  and p.status in ('available', 'application_pending', 'reserved', 'trial_adoption')
  and (
    p.source_type = 'private_foster'
    or (p.source_type = 'government' and s.public_enabled = true and r.availability = 'open')
  );

grant select on public.pets_public to anon, authenticated, service_role;

create or replace function public.start_pet_source_sync(
  p_source_key text,
  p_dry_run boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_row public.pet_sources;
  run_id uuid;
begin
  select * into source_row
  from public.pet_sources
  where source_key = p_source_key and enabled = true
  for update;

  if not found then
    raise exception 'pet source is disabled or unknown';
  end if;

  if exists (
    select 1 from public.pet_sync_runs
    where source_id = source_row.id and status = 'running'
  ) then
    raise exception 'a sync is already running for this source';
  end if;

  insert into public.pet_sync_runs (source_id, dry_run)
  values (source_row.id, p_dry_run)
  returning id into run_id;
  return run_id;
end;
$$;

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
  item jsonb;
  existing_pet_id uuid;
  target_pet_id uuid;
  v_inserted_count integer := 0;
  v_updated_count integer := 0;
  v_skipped_count integer := 0;
  publish_eligible boolean;
  image_url text;
begin
  select * into run_row
  from public.pet_sync_runs
  where id = p_run_id and status = 'running'
  for update;
  if not found then raise exception 'sync run is not running'; end if;
  if jsonb_typeof(p_records) <> 'array' then raise exception 'records must be a JSON array'; end if;

  if run_row.dry_run then
    update public.pet_sync_runs
    set fetched_count = fetched_count + jsonb_array_length(p_records)
    where id = p_run_id;
    return jsonb_build_object(
      'inserted', 0, 'updated', 0, 'skipped', 0, 'dryRun', true
    );
  end if;

  for item in select value from jsonb_array_elements(p_records)
  loop
    if nullif(trim(item->>'externalId'), '') is null then
      v_skipped_count := v_skipped_count + 1;
      continue;
    end if;

    select r.pet_id into existing_pet_id
    from public.pet_source_records r
    where r.source_id = run_row.source_id
      and r.external_id = item->>'externalId';

    publish_eligible := coalesce((item->>'publishEligible')::boolean, false);
    image_url := nullif(trim(item->>'imageUrl'), '');

    if existing_pet_id is null then
      insert into public.pets (
        foster_profile_id, source_type, name, species, breed, sex, age_months,
        age_band, body_size, color, region, found_location, status, sterilized,
        vaccinated, rabies_vaccinated, review_status, reviewed_at,
        is_published, published_at
      ) values (
        null, 'government', item->>'name', (item->>'species')::public.pet_species,
        nullif(item->>'breed', ''), (item->>'sex'), nullif(item->>'ageMonths', '')::integer,
        coalesce(nullif(item->>'ageBand', ''), 'unknown')::public.pet_age_band,
        coalesce(nullif(item->>'bodySize', ''), 'unknown')::public.pet_body_size,
        nullif(item->>'color', ''), nullif(item->>'region', ''), nullif(item->>'foundLocation', ''),
        case when publish_eligible then 'available' else 'hidden' end::public.pet_status,
        nullif(item->>'sterilized', '')::boolean, nullif(item->>'vaccinated', '')::boolean,
        nullif(item->>'rabiesVaccinated', '')::boolean, 'approved', now(),
        publish_eligible, case when publish_eligible then now() else null end
      )
      returning id into target_pet_id;
      v_inserted_count := v_inserted_count + 1;
    else
      target_pet_id := existing_pet_id;
      update public.pets p set
        name = item->>'name',
        species = (item->>'species')::public.pet_species,
        breed = nullif(item->>'breed', ''),
        sex = item->>'sex',
        age_months = nullif(item->>'ageMonths', '')::integer,
        age_band = coalesce(nullif(item->>'ageBand', ''), 'unknown')::public.pet_age_band,
        body_size = coalesce(nullif(item->>'bodySize', ''), 'unknown')::public.pet_body_size,
        color = nullif(item->>'color', ''),
        region = nullif(item->>'region', ''),
        found_location = nullif(item->>'foundLocation', ''),
        sterilized = nullif(item->>'sterilized', '')::boolean,
        vaccinated = nullif(item->>'vaccinated', '')::boolean,
        rabies_vaccinated = nullif(item->>'rabiesVaccinated', '')::boolean,
        status = (case when publish_eligible then 'available' else 'hidden' end)::public.pet_status,
        is_published = publish_eligible
          and not coalesce((select o.is_hidden from public.pet_editorial_overrides o where o.pet_id = p.id), false),
        published_at = case
          when publish_eligible and p.published_at is null then now()
          when publish_eligible then p.published_at
          else null
        end,
        updated_at = now()
      where p.id = target_pet_id;
      v_updated_count := v_updated_count + 1;
    end if;

    insert into public.pet_source_records (
      pet_id, source_id, external_id, external_sub_id, shelter_id, shelter_name,
      shelter_address, shelter_phone, official_url, adoption_open_at,
      source_created_at, source_updated_at, last_seen_at, availability,
      content_hash, raw_payload
    ) values (
      target_pet_id, run_row.source_id, item->>'externalId', nullif(item->>'externalSubId', ''),
      nullif(item->>'shelterId', ''), nullif(item->>'shelterName', ''),
      nullif(item->>'shelterAddress', ''), nullif(item->>'shelterPhone', ''),
      nullif(item->>'officialUrl', ''), nullif(item->>'adoptionOpenAt', '')::timestamptz,
      nullif(item->>'sourceCreatedAt', '')::timestamptz,
      nullif(item->>'sourceUpdatedAt', '')::timestamptz,
      now(),
      coalesce(
        nullif(item->>'availability', ''),
        case when publish_eligible then 'open' else 'unavailable' end
      )::public.pet_source_availability,
      item->>'contentHash',
      item->'rawPayload'
    )
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
      updated_at = now();

    if image_url is not null then
      insert into public.pet_media (
        pet_id, storage_path, external_url, media_type, is_cover, is_public, sort_order
      ) values (target_pet_id, null, image_url, 'image', true, true, 0)
      on conflict do nothing;
      update public.pet_media
      set external_url = image_url
      where pet_id = target_pet_id and storage_path is null and is_cover = true;
    end if;
  end loop;

  update public.pet_sync_runs r set
    fetched_count = r.fetched_count + jsonb_array_length(p_records),
    inserted_count = r.inserted_count + v_inserted_count,
    updated_count = r.updated_count + v_updated_count,
    skipped_count = r.skipped_count + v_skipped_count
  where r.id = p_run_id;

  return jsonb_build_object(
    'inserted', v_inserted_count, 'updated', v_updated_count, 'skipped', v_skipped_count
  );
end;
$$;

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
  departed_count integer := 0;
begin
  select * into run_row from public.pet_sync_runs
  where id = p_run_id and status = 'running'
  for update;
  if not found then raise exception 'sync run is not running'; end if;
  select * into source_row from public.pet_sources where id = run_row.source_id for update;

  if p_complete_count <= 0
    or p_complete_count <> run_row.fetched_count
    or (
      source_row.last_successful_record_count is not null
      and p_complete_count < ceil(source_row.last_successful_record_count * 0.5)
    )
  then
    update public.pet_sync_runs set
      status = 'rejected',
      finished_at = now(),
      error_count = error_count + 1,
      error_message = 'reconciliation rejected: empty, incomplete, or below 50% of previous success'
    where id = p_run_id;
    return jsonb_build_object('accepted', false, 'unpublished', 0);
  end if;

  if not run_row.dry_run then
    with departed as (
      update public.pet_source_records r
      set availability = 'departed_unconfirmed', updated_at = now()
      where r.source_id = run_row.source_id
        and r.last_seen_at < run_row.started_at
        and r.availability <> 'departed_unconfirmed'
      returning r.pet_id
    ), hidden as (
      update public.pets p
      set status = 'hidden', is_published = false, published_at = null, updated_at = now()
      where p.id in (select pet_id from departed)
      returning p.id
    )
    select count(*) into departed_count from hidden;
  end if;

  update public.pet_sync_runs set
    status = 'succeeded',
    finished_at = now(),
    unpublished_count = departed_count
  where id = p_run_id;

  if not run_row.dry_run then
    update public.pet_sources set
      last_successful_sync_at = now(),
      last_successful_record_count = p_complete_count,
      updated_at = now()
    where id = run_row.source_id;
  end if;

  return jsonb_build_object('accepted', true, 'unpublished', departed_count);
end;
$$;

create or replace function public.fail_pet_source_sync(
  p_run_id uuid,
  p_error text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.pet_sync_runs
  set status = 'failed', finished_at = now(), error_count = error_count + 1,
      error_message = left(p_error, 4000)
  where id = p_run_id and status = 'running';
$$;

revoke all on function public.start_pet_source_sync(text, boolean) from public, anon, authenticated;
revoke all on function public.ingest_pet_source_batch(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.finish_pet_source_sync(uuid, integer) from public, anon, authenticated;
revoke all on function public.fail_pet_source_sync(uuid, text) from public, anon, authenticated;
grant execute on function public.start_pet_source_sync(text, boolean) to service_role;
grant execute on function public.ingest_pet_source_batch(uuid, jsonb) to service_role;
grant execute on function public.finish_pet_source_sync(uuid, integer) to service_role;
grant execute on function public.fail_pet_source_sync(uuid, text) to service_role;
revoke all on function public.is_pet_publicly_visible(uuid) from public;
grant execute on function public.is_pet_publicly_visible(uuid) to anon, authenticated, service_role;

-- Schedule creation is conditional so local resets and preview branches do not need secrets.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
do $$
begin
  if exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'moa_sync_secret')
  then
    perform cron.schedule(
      'pawtner-moa-pet-sync',
      '30 10 * * *',
      $job$
        select net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
            || '/functions/v1/sync-moa-pets',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'moa_sync_secret')
          ),
          body := '{"trigger":"cron"}'::jsonb,
          timeout_milliseconds := 300000
        );
      $job$
    );
  end if;
end
$$;
