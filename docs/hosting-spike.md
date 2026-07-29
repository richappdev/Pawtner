# App Hosting / Cloud Run compatibility spike

## Target

- Firebase project: `pawtner-app-2026`
- App Hosting backend: `pawtner-web` (`asia-east1`)
- App: Next.js `16.2.11` (see `package.json`)
- Production: [`Dockerfile`](../Dockerfile) + Firebase Hosting rewrite to an
  independently managed Cloud Run service (`firebase.json` `hosting.rewrites`)

## Checklist (run on staging URL)

| Check | Pass? | Notes |
| --- | --- | --- |
| SSR home / explore | | |
| Route handlers under `/api/*` | | |
| `src/proxy.ts` cookie refresh (`getClaims`) | | |
| Image optimization | | |
| Env / Secret Manager injection | | |
| Payment webhook route | | |
| Health: `GET /api/health` | | |

## Commands

```bash
# Set secrets (once)
npx -y firebase-tools@latest apphosting:secrets:set NEXT_PUBLIC_SUPABASE_ANON_KEY --project pawtner-app-2026
npx -y firebase-tools@latest apphosting:secrets:set SUPABASE_SERVICE_ROLE_KEY --project pawtner-app-2026
npx -y firebase-tools@latest apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY --project pawtner-app-2026

# Deploy App Hosting (requires Blaze + linked repo or CLI source deploy)
npx -y firebase-tools@latest deploy --only apphosting --project pawtner-app-2026

# Cloud Run production build
gcloud builds submit --config cloudbuild.yaml --region asia-east1
```

## Decision

- [ ] **App Hosting** is the production path (retained as the rollback endpoint)
- [x] **Cloud Run + Firebase Hosting** is the production path

| Field | Value |
| --- | --- |
| Decision | Firebase Hosting `pawtner-tw` to Cloud Run `pawtner-hosting-web` |
| Date | 2026-07-29 |
| Production URL | https://pawtner-tw.web.app |
| Rollback URL | https://pawtner-web--pawtner-app-2026.asia-east1.hosted.app |
| Operator | migration agent / project owner |
