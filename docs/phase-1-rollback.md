# Phase 1 hosting rollback

## Keep last known-good deploy

Until Firebase hosting is proven:

1. Keep the previous Node/`next start` (or current host) deployment available.
2. Do not delete DNS / previous URLs until smoke tests pass for 24h.
3. Feature flag `FEATURE_FIREBASE_AUTH_ENABLED=false` during hosting-only (Phase 1).

## Rollback steps

1. Point traffic / DNS back to the previous deployment.
2. Leave Supabase Auth / DB unchanged (Phase 1 does not alter identity).
3. If App Hosting backend is unhealthy, pause traffic in Firebase console for `pawtner-web`.
4. If using Cloud Run fallback, route Firebase Hosting rewrite back or scale previous Cloud Run revision to 100%.

## Smoke list after rollback

- Login / logout
- Explore pets
- Create adoption application (authenticated)
- Checkout webhook still receives events on the active host
