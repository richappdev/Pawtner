-- Phase 2: pets, traits, health, media
create type public.pet_status as enum (
  'intake',
  'medical_hold',
  'available',
  'application_pending',
  'reserved',
  'trial_adoption',
  'adopted',
  'hidden',
  'archived'
);

create type public.pet_species as enum ('dog', 'cat', 'other');

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  foster_profile_id uuid not null references public.foster_profiles (id) on delete cascade,
  name text not null,
  species public.pet_species not null,
  breed text,
  sex text check (sex in ('male', 'female', 'unknown')),
  age_months integer,
  weight_kg numeric(6, 2),
  color text,
  region text,
  status public.pet_status not null default 'intake',
  sterilized boolean,
  microchipped boolean,
  vaccinated boolean,
  dewormed boolean,
  personality_summary text,
  special_care text,
  adoption_conditions text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pet_traits (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  energy_level integer check (energy_level between 1 and 5),
  sociability_people integer check (sociability_people between 1 and 5),
  sociability_dogs integer check (sociability_dogs between 1 and 5),
  sociability_cats integer check (sociability_cats between 1 and 5),
  child_friendly integer check (child_friendly between 1 and 5),
  alone_tolerance integer check (alone_tolerance between 1 and 5),
  tags text[] not null default '{}',
  unique (pet_id)
);

create table public.pet_health_records (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  record_date date not null default current_date,
  title text not null,
  details text,
  is_critical boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.pet_media (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  storage_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  is_cover boolean not null default false,
  is_ai_edited boolean not null default false,
  original_media_id uuid references public.pet_media (id) on delete set null,
  is_public boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create or replace view public.pets_public
with (security_invoker = true)
as
select
  p.id,
  p.name,
  p.species,
  p.breed,
  p.sex,
  p.age_months,
  p.weight_kg,
  p.color,
  p.region,
  p.status,
  p.sterilized,
  p.microchipped,
  p.vaccinated,
  p.dewormed,
  p.personality_summary,
  p.special_care,
  p.adoption_conditions,
  p.published_at,
  fp.display_name as foster_display_name,
  fp.region as foster_region
  -- intentionally omit foster private_address
from public.pets p
join public.foster_profiles fp on fp.id = p.foster_profile_id
where p.is_published = true
  and p.status in ('available', 'application_pending', 'reserved', 'trial_adoption');

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
    where p.id = target_pet_id and fp.user_id = auth.uid()
  );
$$;

alter table public.pets enable row level security;
alter table public.pet_traits enable row level security;
alter table public.pet_health_records enable row level security;
alter table public.pet_media enable row level security;

create policy "pets_public_or_owner_or_staff"
  on public.pets for select
  using (
    (is_published = true and status in ('available', 'application_pending', 'reserved', 'trial_adoption'))
    or public.owns_pet(id)
    or public.is_staff()
  );

create policy "pets_insert_approved_foster"
  on public.pets for insert
  with check (
    exists (
      select 1 from public.foster_profiles fp
      where fp.id = foster_profile_id
        and fp.user_id = auth.uid()
        and fp.status = 'approved'
    )
    or public.is_staff()
  );

create policy "pets_update_owner_or_staff"
  on public.pets for update
  using (public.owns_pet(id) or public.is_staff())
  with check (public.owns_pet(id) or public.is_staff());

create policy "traits_via_pet"
  on public.pet_traits for all
  using (
    exists (select 1 from public.pets p where p.id = pet_id and (p.is_published or public.owns_pet(p.id) or public.is_staff()))
  )
  with check (public.owns_pet(pet_id) or public.is_staff());

create policy "health_via_pet"
  on public.pet_health_records for all
  using (
    public.owns_pet(pet_id) or public.is_staff()
    or exists (select 1 from public.pets p where p.id = pet_id and p.is_published)
  )
  with check (public.owns_pet(pet_id) or public.is_staff());

create policy "media_via_pet"
  on public.pet_media for select
  using (
    (is_public = true and exists (select 1 from public.pets p where p.id = pet_id and p.is_published))
    or public.owns_pet(pet_id)
    or public.is_staff()
  );

create policy "media_write_owner_or_staff"
  on public.pet_media for all
  using (public.owns_pet(pet_id) or public.is_staff())
  with check (public.owns_pet(pet_id) or public.is_staff());

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, pet_id)
);

alter table public.favorites enable row level security;

create policy "favorites_own"
  on public.favorites for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
