-- Cover workflow foreign keys used by staff audit and run cleanup queries.
create index pet_source_records_reviewed_by_idx
  on public.pet_source_records (reviewed_by)
  where reviewed_by is not null;
create index pet_source_records_approved_by_idx
  on public.pet_source_records (approved_by)
  where approved_by is not null;
create index pet_source_staging_source_idx
  on public.pet_source_staging_records (source_id);
create index pet_publication_events_actor_idx
  on public.pet_publication_events (actor_id)
  where actor_id is not null;
