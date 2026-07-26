# App Hosting / Cloud Run compatibility spike

## Target

- Firebase project: `pawtner-app-2026`
- App Hosting backend: `pawtner-web` (`asia-east1`)
- App: Next.js `16.2.11` (see `package.json`)
- Fallback: [`Dockerfile`](../Dockerfile) + Firebase Hosting rewrite to Cloud Run (`firebase.json` `hosting.rewrites`)

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

# Cloud Run fallback build
docker build -t pawtner-web .
```

## Decision

- [x] **App Hosting** is the Phase 1 production path (backend `pawtner-web` created; spike checklist below)
- [ ] **Cloud Run + Firebase Hosting** is the Phase 1 production path (App Hosting failed spike)

| Field | Value |
| --- | --- |
| Decision | App Hosting primary (`pawtner-web`); Dockerfile retained as fallback |
| Date | 2026-07-23 |
| Staging URL | https://pawtner-web--pawtner-app-2026.asia-east1.hosted.app |
| Operator | migration agent / project owner |
