# Auth / RLS / service-role inventory

Generated for Phase 0 of the Firebase + Supabase hybrid migration. Re-run the script to refresh counts:

```bash
node scripts/inventory-auth-uid.mjs
```

## Summary

| Area | Finding |
| --- | --- |
| Identity model | `user_profiles.id` PK FK → `auth.users(id)` ON DELETE CASCADE |
| Profile bootstrap | Trigger `on_auth_user_created` → `handle_new_user()` |
| `auth.uid()` in migrations | ~47 occurrences across 7 SQL files |
| Browser auth | Supabase email/password in `src/components/auth-form.tsx` |
| SSR session | `src/proxy.ts` → `updateSession` → `getClaims()` |
| API auth | `requireUser()` / `requireActor()` via cookie Supabase client |
| Service role | `createServiceClient()` — public catalog, checkout RPC, webhooks, donation page |

## `auth.uid()` by migration file

| File | Approx count | Notes |
| --- | --- | --- |
| `20260323000001_identity.sql` | 15 | `has_role`, `is_staff`, profile/foster/adopter policies |
| `20260323000002_pets.sql` | 4 | `owns_pet`, favorites, pet insert |
| `20260323000003_adoption.sql` | 5 | application access helpers/policies |
| `20260323000004_messaging.sql` | 5 | conversation membership / messages |
| `20260323000005_commerce.sql` | 10 | wishlists, orders, order_items |
| `20260323000006_ai_and_reports.sql` | 7 | AI jobs, reports |
| `20260723060957_harden_auth_adoption_commerce_donations.sql` | 1 | adopter ownership check |

## Supabase Auth helpers in `src/`

| Path | Usage |
| --- | --- |
| `src/lib/supabase/client.ts` | Browser `createBrowserClient` |
| `src/lib/supabase/server.ts` | Cookie SSR client + service role |
| `src/lib/supabase/middleware.ts` | Cookie refresh via `getClaims()` |
| `src/lib/api/http.ts` | `requireUser()` → `auth.getUser()` |
| `src/app/api/_shared.ts` | `requireActor()`, `serviceClient()` |
| `src/components/auth-form.tsx` | `signUp` / `signInWithPassword` |

## Service-role call sites

| Path | Purpose |
| --- | --- |
| `src/app/api/_handler.ts` | Public reads, checkout RPC, payment webhook, order confirm |
| `src/app/donate/[orgSlug]/page.tsx` | Donation destination load |
| `src/lib/supabase/server.ts` | `createServiceClient()` factory |

## Migration constraints

- Do **not** rewrite business FKs to Firebase UIDs.
- Dual-auth window must keep Supabase Auth working until Phase 4.
- Replace direct `auth.uid()` with `public.current_app_user_id()` after `external_identities` exists.
- Phase 3 status: applied (`20260723091018_firebase_rls_internal_user.sql`). See `docs/phase-3-rls.md`.
- Keep roles in `user_roles` (never Firebase custom claims for business roles).

## Auth providers / user counts

Document live numbers from the Supabase dashboard before Phase 2 cutover:

| Item | Value |
| --- | --- |
| Enabled providers today | Email/password (Supabase Auth) |
| Approximate auth.users count | _(fill from dashboard)_ |
| OAuth providers | None in-app today |
| Firebase project | `pawtner-app-2026` (see `docs/firebase-project.md`) |
