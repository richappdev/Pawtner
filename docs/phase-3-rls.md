# Phase 3 — RLS rewrite to internal user IDs

## Status

- [x] Helpers (`has_role`, `is_staff`, `owns_pet`, `can_manage_application`, `is_conversation_participant`) use `public.current_app_user_id()`
- [x] Direct `auth.uid()` policies rewritten to `current_app_user_id()`
- [x] `user_profiles` ↔ `auth.users` FK already dropped in Phase 2
- [x] `handle_new_user()` registers `external_identities` provider `supabase`
- [x] `create_checkout_order` present for service-role checkout
- [ ] Cohort smoke: Firebase JWT browser path can SELECT own profile under RLS
- [ ] Non-cohort Supabase Auth path still works

## Applied migration

`supabase/migrations/20260723091018_firebase_rls_internal_user.sql`

## Why this matters

Firebase UIDs are not `user_profiles.id`. Policies that compared `auth.uid()` to business FKs would deny Firebase users even when `external_identities` mapped correctly. Authorization now resolves:

1. JWT `sub` → `external_identities.user_id` (Firebase preferred)
2. else `auth.uid()` (native Supabase Auth)

## Exit criteria

- [ ] No public RLS policies still reference `auth.uid()` directly (helpers may still fall back inside `current_app_user_id`)
- [ ] Mapped Firebase user can read/update own `user_profiles` / favorites via anon key + Firebase JWT
- [ ] Supabase Auth user (non-cohort) still passes the same checks
- [ ] Checkout RPC still callable from service role
- [ ] Rollback path: redeploy previous App Hosting revision; DB rollback only via restore / reverse migration (prefer flag-off first)

## Manual verification (staging)

1. Sign in as cohort email (`smoke-test@gmail.com`) on App Hosting.
2. Confirm provisioned profile loads (e.g. `/api/me` or profile UI).
3. Sign in as a non-cohort email → Supabase Auth path still works.
4. Optional SQL (service role): confirm `create_checkout_order` exists and helpers mention `current_app_user_id`.

## Next

Phase 4 gradual cutover — expand cohort, monitor RLS denials / 401s, then retire Supabase Auth client paths.
