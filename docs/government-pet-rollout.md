# Government pet rollout

Government discovery is currently released through both gates:

- `FEATURE_GOVERNMENT_PETS_ENABLED=true` enables government pets in Pawtner server queries.
- `pet_sources.public_enabled=true` enables approved/published government rows in the public database read model.

Setting either gate to `false` remains the supported emergency rollback.

## Current operational status -- 2026-08-19

- Production application deployment is verified at `main@2e547e5`, and public production smoke
  endpoints passed on 2026-08-19. See [Release evidence matrix](release-evidence-matrix.md).
- Repository migrations include `20260817030136_repair_moa_cron_schedule` and
  `20260817040943_grant_closed_pilot_reads`. The live Supabase migration history was not verified in
  this pass because the Supabase CLI was unavailable on PATH and production database credentials were
  not present in the workspace.
- The Cron repair migration safely replaces the named `pawtner-moa-pet-sync` job through
  `cron.unschedule` and `cron.schedule`, with schedule `30 10 * * *` and body
  `{"trigger":"cron"}`. Live Cron uniqueness and Vault secret presence still require authenticated
  Supabase verification.
- The active `sync-moa-pets` Edge Function version and the latest scheduled non-dry-run MOA sync
  were not proven in this pass. The protected `Production operational smoke` workflow run
  `32257893836` was still waiting, so MOA freshness remains a release blocker.

## Required secrets

Generate one high-entropy value and store the same value in:

1. Supabase Edge Function secret `MOA_SYNC_SECRET`.
2. Supabase Vault secret named `moa_sync_secret`.
3. Google Secret Manager secret `MOA_SYNC_SECRET`, exposed only to the
   `pawtner-hosting-web` Cloud Run service.

Also store the Supabase project base URL in Vault as `project_url`. The migration creates the
`30 10 * * *` UTC Cron job only when both Vault secrets already exist. If secrets are added after
the migration, create the job from the Supabase Cron dashboard using the same schedule and the
`sync-moa-pets` Edge Function.

## Initial deployment sequence

1. Apply the database migration while both release gates remain off.
2. Deploy `sync-moa-pets` with its function-local `deno.json`.
3. From `/admin/pets`, run **模擬測試** and inspect the newest `pet_sync_runs` row.
4. Run one real sync. Compare record, species, and shelter totals with the MOA response.
5. Inspect government records and external images in the admin UI.
6. On staging, set `pet_sources.public_enabled=true` for `moa-animal-adoption`, then set
   `FEATURE_GOVERNMENT_PETS_ENABLED=true` and redeploy the web app.
7. Repeat the release-gate change in production.
8. Confirm the daily Cron job is active at 10:30 UTC / 18:30 Taiwan time.

## Monitoring

Alert when:

- the latest run is `failed` or `rejected`;
- no successful run has completed in 26 hours;
- a run returns zero records;
- a run is below 50% of the previous successful record count;
- the Edge Function or Cron job has not run on schedule.

Missing records are marked `departed_unconfirmed`, hidden, and unpublished. They must never be
reported as adopted unless a separate authoritative workflow confirms adoption.
