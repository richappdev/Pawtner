# Phase 2 — Firebase Auth dual-auth bridge

## Status

- [x] Additive migration applied on Pawtner Supabase (`external_identities`, `provision_firebase_identity`, `current_app_user_id`)
- [x] App code dual-auth path (feature-flagged; default **off**)
- [x] Provisioning assigns Firebase custom claim `role: authenticated` (required by Supabase)
- [ ] Enable Supabase **Third-party Auth → Firebase** in the dashboard
- [ ] Enable feature flags for a test cohort
- [x] Deploy the Cloud Run production service with the flags enabled

## Manual: enable Supabase third-party Firebase Auth

1. Open [Authentication → Third-party](https://supabase.com/dashboard/project/rlwctljjjvlxrexcgqmg/auth/third-party)
2. Add Firebase integration with project ID: `pawtner-app-2026`
3. Confirm `supabase/config.toml` already has:

```toml
[auth.third_party.firebase]
enabled = true
project_id = "pawtner-app-2026"
```

## Enable dual-auth for a test cohort (local)

In `.env.local`:

```env
FEATURE_FIREBASE_AUTH_ENABLED=true
NEXT_PUBLIC_FEATURE_FIREBASE_AUTH_ENABLED=true
FIREBASE_AUTH_EMAIL_COHORT=your-test@example.com
NEXT_PUBLIC_FIREBASE_AUTH_EMAIL_COHORT=your-test@example.com
```

Also ensure Firebase Admin can verify tokens locally
(`FIREBASE_ADMIN_CLIENT_EMAIL` + `FIREBASE_ADMIN_PRIVATE_KEY`) or use ADC on
Cloud Run.

## Enable on Cloud Run

Update the Cloud Run environment and the build-time values in
`cloudbuild.yaml`:

- `FEATURE_FIREBASE_AUTH_ENABLED=true`
- `NEXT_PUBLIC_FEATURE_FIREBASE_AUTH_ENABLED=true`
- optional cohort vars

Build a new immutable image, deploy it to `pawtner-hosting-web`, and redeploy
the pinned Firebase Hosting release.

## Exit criteria checklist

- [ ] Test user signs up/in with Firebase email/password
- [ ] `/api/auth/provision` returns `userId` and sets `role: authenticated` when needed
- [ ] Mapped user can call `/api/me` with Bearer Firebase ID token
- [ ] Non-cohort users still use Supabase Auth when cohort is set
- [ ] Logout clears Firebase cookie (`POST /api/auth/logout`)
- [ ] Rollback: set both feature flags to `false` and redeploy

## Notes

Phase 3 (RLS rewrite to `current_app_user_id()` everywhere) is applied — see `docs/phase-3-rls.md`. Complete the Phase 3 exit smoke checks before expanding the cohort in Phase 4.
