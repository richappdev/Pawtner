# Firebase project — Pawtner

Created as part of Phase 0 of the Firebase + Supabase hybrid migration.

## Project

| Field | Value |
| --- | --- |
| Display name | Pawtner |
| Project ID | `pawtner-app-2026` |
| Project number | `611592714843` |
| Console | https://console.firebase.google.com/project/pawtner-app-2026 |
| GCP console | https://console.cloud.google.com/home/dashboard?project=pawtner-app-2026 |
| Billing / IAM owner | Account used to create the project (`app.developer.rich@gmail.com` at creation time) |

## Web app

| Field | Value |
| --- | --- |
| Display name | Pawtner Web |
| App ID | `1:611592714843:web:b10424774e91a6ff9add7e` |
| Auth domain | `pawtner-app-2026.firebaseapp.com` |
| Messaging sender ID | `611592714843` |

Public web config (safe for client bundles — not secrets):

```text
projectId: pawtner-app-2026
appId: 1:611592714843:web:b10424774e91a6ff9add7e
authDomain: pawtner-app-2026.firebaseapp.com
messagingSenderId: 611592714843
storageBucket: pawtner-app-2026.firebasestorage.app
measurementId: set after enabling Google Analytics for the web app
```

API keys and Admin SDK credentials live in Secret Manager / local `.env.local` — **never commit them**.

## Firebase Hosting production

| Field | Value |
| --- | --- |
| Site ID | `pawtner-tw` |
| Target | `production` |
| Primary URL | https://pawtner-tw.web.app |
| Firebase alias | https://pawtner-tw.firebaseapp.com |
| Cloud Run service | `pawtner-hosting-web` |
| Cloud Run region | `asia-east1` |
| Runtime service account | `pawtner-hosting-run@pawtner-app-2026.iam.gserviceaccount.com` |

The Hosting catch-all rewrite is pinned to the deployed Cloud Run revision.
Production images are built with [`cloudbuild.yaml`](../cloudbuild.yaml) and
stored in the `pawtner-images` Artifact Registry repository. The runtime
identity has Firebase Authentication Admin for user/custom-claim provisioning
and per-secret Secret Manager access for the application secrets.

## App Hosting backend (rollback)

| Field | Value |
| --- | --- |
| Backend ID | `pawtner-web` |
| Region | `asia-east1` |
| Resource | `projects/pawtner-app-2026/locations/asia-east1/backends/pawtner-web` |
| URL | https://pawtner-web--pawtner-app-2026.asia-east1.hosted.app |

Auth email/password providers were deployed via `firebase deploy --only auth`.

## Auth providers

- Email/password enabled in `firebase.json` (deploy with `npx -y firebase-tools@latest deploy --only auth --project pawtner-app-2026`).
- Keep Auth unused for production traffic until Phase 2 dual-auth bridge.

## Secrets (Secret Manager)

Production build and runtime mappings are defined by
[`cloudbuild.yaml`](../cloudbuild.yaml) and the Cloud Run service. The retained
App Hosting rollback mapping remains in [`apphosting.yaml`](../apphosting.yaml).

- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `PAYMENT_WEBHOOK_SECRET`
- `SENTRY_DSN` (optional)

## Analytics and Performance

Firebase Analytics and Performance Monitoring are integrated in the web client but remain
disabled unless `NEXT_PUBLIC_FIREBASE_OBSERVABILITY_ENABLED=true`. Analytics additionally
requires `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`. Both SDKs start only after the visitor grants
analytics consent in the browser. See [`firebase-observability.md`](firebase-observability.md)
for console setup, validation, rollback, and reporting queries.

Example:

```bash
npx -y firebase-tools@latest apphosting:secrets:set SUPABASE_SERVICE_ROLE_KEY --project pawtner-app-2026
```

## CLI aliases

[`.firebaserc`](../.firebaserc) sets `default` / `staging` → `pawtner-app-2026`.
