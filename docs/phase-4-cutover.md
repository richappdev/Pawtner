# Phase 4 — production cutover runbook

## Status

- [x] Phase 1 hosting exit criteria met
- [x] Phase 3 migrations applied (`firebase_identity_bridge`, `firebase_rls_internal_user`)
- [x] Dual-auth cutover scaffolding (cohort flags, ops snapshot, auth logging, dual logout)
- [ ] Phase 2/3 cohort smoke completed on staging
- [ ] 24–72h monitoring window with stable metrics
- [ ] Expand cohort → 100% Firebase Auth
- [ ] After rollback window: retire Supabase Auth client paths

## Preconditions

- [ ] SQL tests `supabase/tests/firebase_identity.sql` / `firebase_rls.sql` pass on staging
- [ ] Secret Manager populated; Admin SDK ADC or service account configured
- [ ] Supabase Third-party Auth → Firebase enabled for `pawtner-app-2026`

## Cutover steps

1. Keep `FEATURE_FIREBASE_AUTH_ENABLED=true` on App Hosting.
2. Expand gradually via cohort env (redeploy after each change):
   - Start: `NEXT_PUBLIC_FIREBASE_AUTH_EMAIL_COHORT=smoke-test@gmail.com`
   - Add more emails comma-separated
   - Full cutover: clear both cohort vars (empty cohort + flags true = all emails use Firebase)
3. Monitor for 24–72h after each expansion:
   - `GET /api/health` → `firebaseAuthEnabled`, `firebaseAuthRollout`
   - `GET /api/ops/status` → identity counts, cohort size, suggested alerts
   - Cloud Logging events:
     - `auth.login.success` / `auth.login.failure`
     - `auth.provision.success` / `auth.provision.failure`
     - `auth.resolve.unmapped`
     - `auth.require_user.unauthorized`
     - `auth.logout.success`
4. Confirm logout from `/me` clears Firebase cookie + Supabase session.
5. After stable 100% Firebase window: remove Supabase Auth client paths from `auth-form.tsx` (separate PR).
6. Do **not** destructively delete `auth.users` until traffic is stable.

## Rollback

Prefer shrink-first:

1. Reduce `FIREBASE_AUTH_EMAIL_COHORT` / `NEXT_PUBLIC_FIREBASE_AUTH_EMAIL_COHORT` and redeploy.
2. Or set both feature flags to `false` and redeploy.
3. Keep `external_identities` (additive; safe to retain).

Current rollback hint is also returned by `GET /api/ops/status`.

## Alerting

Wire Cloud Monitoring / Sentry to:

- Spike in 401/403 on `/api/*` (`auth.require_user.unauthorized`)
- `auth.provision.failure`
- `auth.resolve.unmapped`
- Payment webhook errors
- Postgres CPU / connection saturation

## What Phase 4 does **not** do yet

Full retirement of Supabase Auth (delete `submitSupabase`, drop Auth providers, delete `auth.users`) waits until after the monitoring window.
