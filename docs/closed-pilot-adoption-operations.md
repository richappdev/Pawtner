# Closed-pilot adoption operations

This increment delivers the invited adopter → foster → admin → 7/30/90-day follow-up journey. It remains unavailable unless both rollout controls are enabled:

- Application: `FEATURE_CLOSED_PILOT_ADOPTION_OPERATIONS_ENABLED=true`
- Database: `feature_flags.key = 'closed_pilot_adoption_operations'` with `enabled = true`

The migration is additive. Disabling either control stops new operational writes and hides unfinished UI/API without deleting schema or history.

## Deployment order

1. Apply `20260803052801_closed_pilot_adoption_operations.sql`. Confirm the database flag remains `false`.
2. Deploy the web application with `FEATURE_CLOSED_PILOT_ADOPTION_OPERATIONS_ENABLED=false`.
3. Run synthetic fixtures only against the local emulators with `npm run fixtures:local`. Cloud staging shares the production backend and refuses fixture installation.
4. Enable the application flag in the staging frontend while leaving the shared production database flag off. Verify rendering, navigation, loading, empty, forbidden, and conflict states without submitting mutations.
5. Run complete adopter, approved-foster, pending-foster, and staff role journeys against the isolated local stack. Confirm government pets expose only the official-shelter action.
6. Locally disable the database flag and verify writes fail without removing existing records. Re-enable it only for continued local acceptance.
7. For production, keep the database flag and production application flag off until the invited cohort and support owner are approved. Enabling the shared database flag makes mutations available through both cloud frontends.

## Acceptance evidence

- Questionnaire v2 saves all structured matching fields and rejects incomplete values.
- Zero pet evidence yields a null match score and missing-data indicators.
- Same adopter/pet concurrent submissions produce one active application and one conflict.
- Adopters never receive `application_private_notes`, legacy `internal_notes`, or status-history notes.
- Adopters can withdraw only before trial. Foster/staff rejection and return require private notes.
- Adoption creates due-at 7/30/90 follow-ups and future notifications that are invisible until `available_at`.
- A reviewed 30-day `stable` outcome emits the north-star event; `returned` hides the pet and requires a fresh review.
- Pending/need-info/suspended fosters see onboarding state instead of operational data.

## Safe observability

Structured logs contain actor/resource identifiers, transition names, and database error codes only. Analytics contain event names, status, questionnaire version, day offset, and outcome. Never add answers, notes, addresses, email, phone, document paths, or identity attributes to either channel.

## Rollback

Set the database flag to `false`, then redeploy with the application flag `false`. Leave the migration and historical rows in place. Scheduled notifications remain stored and unavailable; no schema rollback is required.
