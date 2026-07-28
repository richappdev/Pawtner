# Government pet rollout

The implementation intentionally ships with two release gates closed:

- `FEATURE_GOVERNMENT_PETS_ENABLED=false` keeps government pets out of Pawtner's public server queries.
- `pet_sources.public_enabled=false` keeps imported government rows out of the public database read model.

## Required secrets

Generate one high-entropy value and store the same value in:

1. Supabase Edge Function secret `MOA_SYNC_SECRET`.
2. Supabase Vault secret named `moa_sync_secret`.
3. Firebase App Hosting secret `MOA_SYNC_SECRET`.

Also store the Supabase project base URL in Vault as `project_url`. The migration creates the
`30 10 * * *` UTC Cron job only when both Vault secrets already exist. If secrets are added after
the migration, create the job from the Supabase Cron dashboard using the same schedule and the
`sync-moa-pets` Edge Function.

## Deployment sequence

1. Apply the database migration while both release gates remain off.
2. Deploy `sync-moa-pets` with its function-local `deno.json`.
3. From `/admin/pets`, run **乾跑** and inspect the newest `pet_sync_runs` row.
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
