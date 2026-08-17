-- RLS defines which closed-pilot rows each authenticated actor may read.
-- These table-level grants are also required before PostgREST can evaluate
-- those policies for Firebase-backed sessions.
grant select on table
  public.user_roles,
  public.foster_profiles,
  public.pets,
  public.adoption_applications,
  public.application_answers,
  public.application_status_history,
  public.application_private_notes,
  public.adoption_followups
to authenticated;
