-- Phase 2 additive identity bridge: map Firebase (and other) subjects to internal UUIDs.
-- Safe to apply before Auth cutover.
-- Drop auth.users FK early so Firebase provisioning can create profiles without auth.users rows.
-- UUID values and existing FKs from business tables to user_profiles are preserved.

alter table public.user_profiles
  drop constraint if exists user_profiles_id_fkey;

create table if not exists public.external_identities (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  subject text not null,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, subject)
);

create index if not exists external_identities_user_id_idx
  on public.external_identities (user_id);

create index if not exists external_identities_subject_idx
  on public.external_identities (subject);

alter table public.external_identities enable row level security;

create policy "external_identities_select_own_or_staff"
  on public.external_identities for select
  using (
    user_id = auth.uid()
    or public.is_staff()
  );

-- Service role / security definer provisioning owns writes.
revoke insert, update, delete on public.external_identities from anon, authenticated;
grant select on public.external_identities to authenticated;
grant all on public.external_identities to service_role;

-- Dual-auth compatible resolver:
-- 1) Prefer external_identities mapping for Firebase (or other) JWT subjects
-- 2) Fall back to auth.uid() for native Supabase Auth (profile id == auth uid)
create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select ei.user_id
      from public.external_identities ei
      where ei.subject = coalesce(auth.jwt() ->> 'sub', auth.uid()::text)
      order by case when ei.provider = 'firebase' then 0 else 1 end
      limit 1
    ),
    auth.uid()
  );
$$;

revoke all on function public.current_app_user_id() from public;
grant execute on function public.current_app_user_id() to anon, authenticated, service_role;

-- Idempotent provisioning used by BFF (service role).
create or replace function public.provision_firebase_identity(
  p_firebase_uid text,
  p_email text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  if p_firebase_uid is null or length(trim(p_firebase_uid)) = 0 then
    raise exception 'firebase uid is required';
  end if;

  select user_id into v_user_id
  from public.external_identities
  where provider = 'firebase' and subject = p_firebase_uid;

  if v_user_id is not null then
    return v_user_id;
  end if;

  -- Link by email to an existing profile when possible (migration path).
  if p_email is not null and length(trim(p_email)) > 0 then
    select id into v_user_id
    from public.user_profiles
    where lower(email) = lower(p_email)
    order by created_at asc
    limit 1;
  end if;

  if v_user_id is null then
    v_user_id := gen_random_uuid();
    insert into public.user_profiles (id, email, display_name)
    values (
      v_user_id,
      p_email,
      coalesce(nullif(trim(p_display_name), ''), split_part(coalesce(p_email, 'user'), '@', 1))
    );

    insert into public.user_roles (user_id, role)
    values (v_user_id, 'adopter')
    on conflict (user_id, role) do nothing;

    insert into public.adopter_profiles (user_id)
    values (v_user_id)
    on conflict (user_id) do nothing;
  end if;

  insert into public.external_identities (provider, subject, user_id)
  values ('firebase', p_firebase_uid, v_user_id)
  on conflict (provider, subject) do update
    set user_id = excluded.user_id,
        updated_at = now();

  return v_user_id;
end;
$$;

revoke all on function public.provision_firebase_identity(text, text, text) from public;
grant execute on function public.provision_firebase_identity(text, text, text) to service_role;

-- Backfill native Supabase identities so dual-auth lookups stay consistent.
insert into public.external_identities (provider, subject, user_id)
select 'supabase', up.id::text, up.id
from public.user_profiles up
on conflict (provider, subject) do nothing;
