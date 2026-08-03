-- The service role bypasses RLS but still needs explicit table privileges now
-- that public-schema tables are not auto-exposed. These grants are the minimum
-- needed by the idempotent staging/local fixture installer.
grant select, insert, update on table
  public.user_roles,
  public.foster_profiles,
  public.adopter_questionnaire_responses,
  public.pets,
  public.pet_traits,
  public.pet_match_requirements,
  public.pet_source_records,
  public.adoption_applications,
  public.application_answers,
  public.application_status_history,
  public.adoption_followups,
  public.notifications,
  public.pilot_invitations
to service_role;

grant select on table
  public.questionnaires,
  public.pet_sources
to service_role;

grant select, update on table public.feature_flags to service_role;
