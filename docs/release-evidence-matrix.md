# Pawtner release evidence matrix

Canonical project status lives in
[Pawtner Project Home](https://app.notion.com/p/104a4181b628802b93fdee5ce0dadee0).
This file mirrors the Phase 1-2 evidence captured on 2026-08-19 before any closed-pilot
database lifecycle enablement.

## Release evidence matrix

| Item | Expected | Actual | Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| Repository | `main@2e547e5` | `2e547e5` | Local `git rev-parse --short HEAD` | Engineering | Pass |
| Production deploy | `2e547e5` | `2e547e542b80d2211ce5424f61aa6b79721ed638` | `https://pawtner-tw.web.app/api/ops/status` at 2026-08-19 15:10 UTC | DevOps | Pass |
| Production image | Pinned production image digest | `sha256:8227e48cc14dfbdc263b90b9a6e3eab25c79aa3b1cad5618f395376d79cc1a83` | `/api/ops/status` deployment metadata | DevOps | Pass |
| Production workflow | Successful `Release production` for `main@2e547e5` | Success, run `32242515508`, PR #8, completed 2026-08-19 10:34 UTC | GitHub Actions `Release production` | Engineering | Pass |
| Staging deploy | `develop@a4f5222` or newer | `a4f52224687747da5298671afc661b2f80e3355e` | GitHub Actions run `32242108789`, completed 2026-08-19 10:21 UTC | DevOps | Pass |
| Staging presentation | Staging frontend renders without mutating shared backend | `/recommend` returned 200 | `https://pawtner-tw-staging.web.app/recommend` | DevOps | Pass |
| Hosting topology | Production -> `pawtner-hosting-web`; staging pages -> `pawtner-hosting-web-staging`; staging `/api/**` -> production | Matches repository configs and Firebase site list | `firebase.production.json`, `firebase.staging.json`, `firebase hosting:sites:list` | DevOps | Pass |
| Production smoke | `/api/health`, `/api/ops/status`, `/`, `/explore`, `/api/pets?limit=1` pass; unauthenticated `/api/admin/pets` returns 401/403 | 200, 200, 200, 200, 200, 401 | Read-only curl checks at 2026-08-19 15:10-15:11 UTC | Engineering | Pass |
| Closed-pilot app/API flag | `true` | `true` | `/api/ops/status` metric `closedPilotAdoptionOperations` | Product | Pass |
| Database lifecycle flag | `false` | Not live-verified in this pass | Requires authenticated Supabase query | Product | Blocked |
| DB migrations | Through `20260817040943_grant_closed_pilot_reads` | Repository contains migration; live migration history not verified | `supabase` CLI unavailable on PATH; no production DB credentials in workspace | Backend | Blocked |
| MOA Cron | Unique `pawtner-moa-pet-sync`, `30 10 * * *` | Repository migration repairs schedule; live Cron not verified | Requires Supabase SQL access | Backend | Blocked |
| Vault secrets | `project_url` and `moa_sync_secret` exist, values not exposed | Not live-verified | Requires Supabase SQL/admin access | Backend | Blocked |
| Edge Function | Approved `sync-moa-pets` version active | Not live-verified | Requires Supabase CLI/admin access | Backend | Blocked |
| MOA scheduled sync | Latest scheduled real run success, non-dry-run, non-empty, not rejected, fresh <26h | Not proven | Production operational smoke run `32257893836` is waiting | Operations | Blocked |
| Cloud Run direct inspection | Services match deployed revisions and image digests | Not verified by `gcloud` | `gcloud` auth token refresh failed with `invalid_grant`; `/api/ops/status` provided running-service metadata | DevOps | Blocked |

## Release decision

Do not enable the shared production database lifecycle flag yet. Production application deployment
and public smoke are verified, but live Supabase migration/Cron/Vault/Edge Function evidence and a
successful scheduled real MOA sync remain blocked.

## Next actions

- Refresh `gcloud` credentials and confirm Cloud Run revision/image details for
  `pawtner-hosting-web` and `pawtner-hosting-web-staging`.
- Install or expose the Supabase CLI with production read access, then verify migration history,
  Cron uniqueness/schedule, Vault secret presence, Edge Function version, MOA sync history, and the
  `closed_pilot_adoption_operations` database flag.
- Unblock or rerun the protected `Production operational smoke` workflow and record its result.
