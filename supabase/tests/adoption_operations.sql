begin;
select plan(18);

select has_table('public', 'adopter_questionnaire_responses', 'versioned adopter responses exist');
select has_table('public', 'pet_match_requirements', 'structured pet requirements exist');
select has_table('public', 'application_private_notes', 'private application notes exist');
select has_column('public', 'notifications', 'available_at', 'notifications can be scheduled');
select has_column('public', 'adoption_followups', 'response', 'follow-ups store structured responses');
select has_column('public', 'adoption_followups', 'outcome', 'follow-ups store reviewer outcomes');

select has_function(
  'public', 'submit_adoption_application', array['uuid', 'jsonb'],
  'application submission is transactional'
);
select has_function(
  'public', 'submit_adoption_followup', array['uuid', 'uuid', 'jsonb'],
  'follow-up submission is transactional'
);
select has_function(
  'public', 'review_adoption_followup', array['uuid', 'uuid', 'text', 'text'],
  'follow-up review is transactional'
);
select has_function(
  'public', 'review_foster_profile', array['uuid', 'public.foster_status', 'text'],
  'foster review is transactional'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'adoption_applications_one_active_per_adopter_pet_idx'
      and indexdef like '%WHERE%'
  ),
  'duplicate active applications are protected by a partial unique index'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.adopter_questionnaire_responses'::regclass),
  'questionnaire responses use RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.application_private_notes'::regclass),
  'private application notes use RLS'
);
select ok(
  not has_function_privilege('anon', 'public.submit_adoption_application(uuid,jsonb)', 'execute'),
  'anonymous users cannot submit applications'
);
select ok(
  has_function_privilege('authenticated', 'public.submit_adoption_application(uuid,jsonb)', 'execute'),
  'authenticated users can call application submission'
);
select ok(
  not has_table_privilege('authenticated', 'public.application_private_notes', 'insert'),
  'clients cannot insert private notes directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.adoption_applications', 'update'),
  'clients cannot update lifecycle fields directly'
);
select results_eq(
  $$select enabled from public.feature_flags where key = 'closed_pilot_adoption_operations'$$,
  array[false],
  'closed-pilot adoption operations default off'
);

select * from finish();
rollback;
