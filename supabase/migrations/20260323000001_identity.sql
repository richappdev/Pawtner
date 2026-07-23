-- Phase 1: identity, roles, orgs, audit, feature flags
create extension if not exists "pgcrypto";

create type public.app_role as enum (
  'guest',
  'adopter',
  'foster',
  'organization_manager',
  'support_agent',
  'moderator',
  'admin',
  'super_admin'
);

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  phone text,
  avatar_url text,
  locale text not null default 'zh-TW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  website_url text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type public.foster_status as enum (
  'draft',
  'submitted',
  'under_review',
  'need_info',
  'approved',
  'rejected',
  'suspended'
);

create table public.foster_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete set null,
  status public.foster_status not null default 'draft',
  display_name text not null,
  care_capacity integer not null default 1 check (care_capacity > 0),
  region text,
  -- Private address: never exposed via public API / public views
  private_address text,
  environment_notes text,
  verification_notes text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  foster_profile_id uuid not null references public.foster_profiles (id) on delete cascade,
  document_storage_path text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by uuid references public.user_profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.adopter_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.user_profiles (id) on delete cascade,
  household_size integer,
  has_children boolean,
  has_other_pets boolean,
  housing_type text,
  lifestyle_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.user_profiles (id),
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.feature_flags (key, enabled, description) values
  ('ai_enabled', true, 'AI content generation and pet agent'),
  ('commerce_enabled', true, 'Materials commerce checkout'),
  ('matching_enabled', true, 'Rule-based matching engine');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  insert into public.user_roles (user_id, role)
  values (new.id, 'adopter');
  insert into public.adopter_profiles (user_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.has_role(target_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = target_role
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('support_agent', 'moderator', 'admin', 'super_admin')
  );
$$;

alter table public.user_profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.organizations enable row level security;
alter table public.foster_profiles enable row level security;
alter table public.identity_verifications enable row level security;
alter table public.adopter_profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.feature_flags enable row level security;

create policy "profiles_select_own_or_staff"
  on public.user_profiles for select
  using (id = auth.uid() or public.is_staff());

create policy "profiles_update_own"
  on public.user_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "roles_select_own_or_staff"
  on public.user_roles for select
  using (user_id = auth.uid() or public.is_staff());

create policy "orgs_public_read"
  on public.organizations for select
  using (true);

create policy "orgs_staff_write"
  on public.organizations for all
  using (public.is_staff())
  with check (public.is_staff());

create policy "foster_select_own_or_staff"
  on public.foster_profiles for select
  using (user_id = auth.uid() or public.is_staff());

create policy "foster_insert_own"
  on public.foster_profiles for insert
  with check (user_id = auth.uid());

create policy "foster_update_own_or_staff"
  on public.foster_profiles for update
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());

create policy "identity_own_or_staff"
  on public.identity_verifications for all
  using (
    public.is_staff()
    or exists (
      select 1 from public.foster_profiles fp
      where fp.id = foster_profile_id and fp.user_id = auth.uid()
    )
  )
  with check (
    public.is_staff()
    or exists (
      select 1 from public.foster_profiles fp
      where fp.id = foster_profile_id and fp.user_id = auth.uid()
    )
  );

create policy "adopter_own_or_staff"
  on public.adopter_profiles for all
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());

create policy "audit_staff_read"
  on public.audit_logs for select
  using (public.is_staff());

create policy "audit_insert_authenticated"
  on public.audit_logs for insert
  with check (auth.uid() is not null);

create policy "flags_public_read"
  on public.feature_flags for select
  using (true);

create policy "flags_admin_write"
  on public.feature_flags for all
  using (public.has_role('admin') or public.has_role('super_admin'))
  with check (public.has_role('admin') or public.has_role('super_admin'));
