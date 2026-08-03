# Pawtner environment operations

## Environment contract

Pawtner has three isolated tiers. `PAWTNER_ENV` and `NEXT_PUBLIC_PAWTNER_ENV`
must match, and startup rejects production resource identifiers in staging or
local processes.

| Tier | Git source | Firebase/GCP | Supabase | Adoption operations |
| --- | --- | --- | --- | --- |
| Local | working tree | Auth emulator (`pawtner-local`) | Supabase CLI | enabled |
| Staging | `develop` | `pawtner-staging-2026` | persistent data-less `staging` branch | enabled |
| Production | `main` | `pawtner-app-2026` | `rlwctljjjvlxrexcgqmg` | default-off |

Use `npm run dev:local` for a clean local database, Firebase Auth emulator,
synthetic role fixtures, and Next.js. Docker must be available for Supabase.

## One-time staging provisioning

1. Confirm Supabase Branching entitlement and obtain explicit approval for any
   new recurring cost. Create the branch only after approval:

   `npx supabase branches create staging --project-ref rlwctljjjvlxrexcgqmg --persistent --region ap-northeast-1 --size micro`

   Do not pass `--with-data`. Record the returned branch ref as
   `STAGING_SUPABASE_PROJECT_REF`.
2. Create Firebase/GCP project `pawtner-staging-2026`; if unavailable use
   `pawtner-stg-714843`. Enable Firebase Auth email/password, Hosting, Cloud Run,
   Cloud Build, Artifact Registry, and Secret Manager. Register a Web App.
3. Create Artifact Registry repository `pawtner-images` and runtime service
   account `pawtner-hosting-run`. Grant only Firebase Auth Admin and access to
   the runtime secrets used by Cloud Run.
4. Create environment-local secrets named `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_FIREBASE_API_KEY`.
5. Configure GitHub `staging` and `production` environments. Require reviewers
   on `production`; use separate Workload Identity providers/service accounts.
6. Populate the GitHub variables and secrets listed at the top of each deploy
   workflow. Never reuse production database keys in staging.

### Provisioning status (August 3, 2026)

- Created Firebase/GCP project and default Hosting site `pawtner-staging-2026`.
- Registered staging Web App `1:946692082950:web:73c5c9cfb225864929e287`.
- Created service accounts `pawtner-hosting-run` and
  `pawtner-github-deploy` in the staging project.
- Created repository-scoped Workload Identity provider
  `projects/946692082950/locations/global/workloadIdentityPools/github/providers/pawtner-github`.
- Pending explicit financial approval: link billing account, initialize Firebase
  Auth, and enable/provision Cloud Run, Cloud Build, Artifact Registry, and
  Secret Manager.
- Pending Supabase organization upgrade: the `Rich` organization is on Free;
  persistent branches require Pro. The confirmed branch compute quote is
  US$0.01344/hour, excluding other usage.
- Do not grant GitHub broad project-wide roles. After resources exist, scope
  deploy/runtime permissions to the named service, repository, Hosting site,
  and individual secrets wherever the service supports resource-level IAM.

## Promotion

- Feature pull requests target `develop`.
- A successful `develop` push migrates, seeds, builds, and deploys staging.
- Release pull requests merge `develop` into `main`.
- `main` passes the release gate and builds an environment-specific image.
- The production deployment waits for GitHub Environment approval before
  migrations or traffic changes.

Database migrations are forward-only and additive during promotion. Roll back
the application with the previous Cloud Run revision and Firebase Hosting
release; correct database problems with a reviewed forward migration.
