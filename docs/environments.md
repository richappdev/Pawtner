# Pawtner environment operations

## Environment contract

Pawtner has a local development environment and two frontend deployment tiers.
`PAWTNER_ENV` and `NEXT_PUBLIC_PAWTNER_ENV` identify the frontend tier and must
match. The staging and production frontends deliberately share the existing
production Firebase and Supabase backend.

| Tier | Git source | Frontend deployment | Firebase/Auth backend | Supabase backend |
| --- | --- | --- | --- | --- |
| Local | working tree | Next.js locally | Auth emulator (`pawtner-local`) | Supabase CLI |
| Staging frontend | `develop` | `pawtner-tw-staging` → `pawtner-hosting-web-staging` | `pawtner-app-2026` | `rlwctljjjvlxrexcgqmg` |
| Production frontend | `main` | `pawtner-tw` → `pawtner-hosting-web` | `pawtner-app-2026` | `rlwctljjjvlxrexcgqmg` |

Use `npm run dev:local` for a clean local database, Firebase Auth emulator,
synthetic role fixtures, and Next.js. Docker must be available for Supabase.

## Verified deployment evidence -- 2026-08-19

- Production `/api/ops/status` reports `environment=production`, `backendEnvironment=production`,
  commit `2e547e542b80d2211ce5424f61aa6b79721ed638`, and image digest
  `sha256:8227e48cc14dfbdc263b90b9a6e3eab25c79aa3b1cad5618f395376d79cc1a83`.
- GitHub Actions production run `32242515508` completed successfully for PR #8 on `main` at the
  same commit.
- Staging deployment run `32242108789` completed successfully for
  `develop@a4f52224687747da5298671afc661b2f80e3355e`; the staging `/recommend` page returned 200.
- Staging `/api/**` returned production metadata through `/api/ops/status`, which is expected
  because staging API traffic rewrites to `pawtner-hosting-web`.
- Direct Cloud Run inspection was blocked by expired local `gcloud` credentials. Treat
  `/api/ops/status`, GitHub Actions, Firebase Hosting site listing, and repository rewrite configs
  as the current evidence until `gcloud auth login` is refreshed and service revisions are inspected.

## Shared-backend safety rules

- Staging never applies database migrations. Reviewed migrations are applied
  only by the approval-gated production workflow.
- Staging never installs synthetic fixtures. The fixture script accepts only
  local emulator endpoints and refuses every hosted Supabase project.
- Staging and production use the same users, records, files, feature flags, and
  authorization policies. A write made through staging is a production write.
- The staging Hosting site routes `/api/**` to the production Cloud Run service;
  only page rendering and static assets use the staging revision. The staging
  service accepts the public ingress required by Firebase Hosting. Its direct
  `run.app` URL is unsupported and may render the frontend shell, but the
  application disables every `/api/**` route on the staging service itself.
- Database feature flags are inherently shared. A staging application flag may
  expose unfinished UI while the database flag remains off, but it must not be
  treated as permission to run mutating acceptance tests.
- The operations status endpoint reports both the frontend environment and the
  effective backend environment so the shared boundary is visible.

This topology validates frontend builds, routing, rendering, and browser
compatibility. It is not suitable for destructive tests, fixture-based role
journeys, migration rehearsal, or testing backend behavior against synthetic
cloud data; use the isolated local stack for those checks.

## Frontend deployment

1. Create Hosting site `pawtner-tw-staging` inside Firebase project
   `pawtner-app-2026` and map the `staging` Hosting target to it.
2. Deploy `develop` to Cloud Run service `pawtner-hosting-web-staging` and route
   page requests to that service. Route `/api/**` to `pawtner-hosting-web` first.
   Install this Hosting rewrite once with the project-owner identity; GitHub does
   not receive project-wide Firebase Hosting Admin.
3. Deploy `main`, after GitHub production-environment approval, to the existing
   `pawtner-hosting-web` service and `pawtner-tw` Hosting site.
4. Build separate immutable images from the same source when promoting because
   Next.js embeds `NEXT_PUBLIC_*` values during `next build`.
5. Roll staging back by restoring its previous Cloud Run revision. Production
   retains its existing Cloud Run and Firebase Hosting release rollback.

The previously created `pawtner-staging-2026` GCP/Firebase project is no longer
part of this design. It is intentionally not deleted automatically; remove or
archive it separately only after confirming nothing else uses it.

## Promotion

- Feature pull requests target `develop`.
- A successful `develop` push builds and deploys only the staging frontend.
- Release pull requests merge `develop` into `main`.
- `main` passes the release gate and builds a production frontend image.
- The production deployment waits for GitHub Environment approval before
  applying reviewed migrations or changing production traffic.

Database migrations remain forward-only. Roll back either frontend with its
previous Cloud Run revision and Firebase Hosting release; correct database
problems with a reviewed forward migration.
