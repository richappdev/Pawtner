-- SQL smoke tests for Firebase identity bridge.
-- Style matches supabase/tests/hardening.sql (no pgtap dependency).

begin;

insert into public.user_profiles (id, email, display_name)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'firebase-mapped@example.test', 'Mapped User')
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'adopter')
on conflict (user_id, role) do nothing;

insert into public.external_identities (provider, subject, user_id)
values ('firebase', 'firebase-uid-mapped-001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
on conflict (provider, subject) do update set user_id = excluded.user_id;

do $$
declare
  mapped uuid;
  created uuid;
begin
  mapped := public.provision_firebase_identity(
    'firebase-uid-mapped-001',
    'firebase-mapped@example.test',
    'Mapped User'
  );
  if mapped <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid then
    raise exception 'expected idempotent mapped user, got %', mapped;
  end if;

  created := public.provision_firebase_identity(
    'firebase-uid-new-002',
    'firebase-new@example.test',
    'New User'
  );
  if created is null then
    raise exception 'expected new firebase user id';
  end if;

  if not exists (
    select 1 from public.external_identities
    where provider = 'firebase' and subject = 'firebase-uid-new-002' and user_id = created
  ) then
    raise exception 'missing external_identities row for new firebase subject';
  end if;

  if not exists (
    select 1 from public.user_roles where user_id = created and role = 'adopter'
  ) then
    raise exception 'missing default adopter role for provisioned user';
  end if;
end $$;

rollback;
