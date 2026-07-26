# Phase 4 — production cutover runbook

## Preconditions

- [x] Phase 1 hosting exit criteria met
- [ ] Phase 2 dual-auth verified for test cohort
- [x] Phase 3 migrations applied (`firebase_identity_bridge`, `firebase_rls_internal_user`)
- [ ] SQL tests in `supabase/tests/firebase_identity.sql` / `firebase_rls.sql` pass on staging
- [ ] Secret Manager populated; Admin SDK ADC or service account configured

## Cutover steps

1. Apply remaining additive DB migrations to production.
2. Enable Supabase third-party Firebase Auth (`project_id = pawtner-app-2026`) on the linked project.
3. Deploy Next.js with `FEATURE_FIREBASE_AUTH_ENABLED=true` (optionally set `FIREBASE_AUTH_EMAIL_COHORT` for gradual enablement).
4. Monitor for 24–72h:
   - `GET /api/health`
   - `GET /api/ops/status`
   - Login success / 401–403 rates
   - Unmapped identity errors from `/api/auth/provision`
   - Webhook processing
5. Expand cohort → 100% Firebase Auth.
6. After rollback window: remove Supabase Auth client paths from `auth-form.tsx` and retire unused Auth hooks.
7. Do **not** destructively delete `auth.users` until traffic is stable.

## Rollback

1. Set `FEATURE_FIREBASE_AUTH_ENABLED=false` and `NEXT_PUBLIC_FEATURE_FIREBASE_AUTH_ENABLED=false`.
2. Redeploy previous revision.
3. Keep `external_identities` table (additive; safe to retain).

## Alerting

Wire Cloud Monitoring / Sentry to:

- Spike in 401/403 on `/api/*`
- Failures on `/api/auth/provision`
- Payment webhook errors
- Postgres CPU / connection saturation
