-- Closed-pilot adopter -> foster -> admin -> follow-up operations.
-- The schema is additive and remains inert until the database flag is enabled.

insert into public.feature_flags (key, enabled, description)
values (
  'closed_pilot_adoption_operations',
  false,
  'Secure adoption operations for invited closed-pilot participants'
)
on conflict (key) do update set
  description = excluded.description;

update public.questionnaires set is_active = false where name = 'default_lifestyle';
insert into public.questionnaires (name, version, schema, is_active)
values (
  'default_lifestyle',
  2,
  '{
    "fields": [
      {"id":"housing_type","type":"select","required":true,"options":["apartment","house","shared"]},
      {"id":"usable_home_size_sqm","type":"number","required":true,"min":1,"max":2000},
      {"id":"has_fenced_yard","type":"boolean","required":true},
      {"id":"daily_care_hours","type":"number","required":true,"min":0,"max":24},
      {"id":"has_children","type":"boolean","required":true},
      {"id":"has_dogs","type":"boolean","required":true},
      {"id":"can_administer_medication","type":"boolean","required":true},
      {"id":"can_provide_grooming","type":"boolean","required":true},
      {"id":"preferred_energy_levels","type":"multi_select","required":true,"options":["low","medium","high"]}
    ]
  }'::jsonb,
  true
)
on conflict do nothing;

create table public.adopter_questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  questionnaire_id uuid not null references public.questionnaires (id) on delete restrict,
  questionnaire_version integer not null check (questionnaire_version > 0),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, questionnaire_version)
);

create table public.pet_match_requirements (
  pet_id uuid primary key references public.pets (id) on delete cascade,
  allows_apartment boolean,
  requires_fenced_yard boolean,
  minimum_home_size_sqm numeric(8,2) check (minimum_home_size_sqm is null or minimum_home_size_sqm > 0),
  minimum_daily_care_hours numeric(4,2) check (
    minimum_daily_care_hours is null or minimum_daily_care_hours between 0 and 24
  ),
  requires_medication_ability boolean,
  requires_grooming_ability boolean,
  allows_children boolean,
  allows_dogs boolean,
  energy_level text check (energy_level is null or energy_level in ('low', 'medium', 'high')),
  hard_requirements text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_private_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.adoption_applications (id) on delete cascade,
  author_id uuid references public.user_profiles (id) on delete set null,
  kind text not null default 'internal' check (kind in ('internal', 'rejection', 'return')),
  note text not null check (length(trim(note)) > 0),
  created_at timestamptz not null default now()
);

alter table public.adoption_followups
  add column submitted_at timestamptz,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.user_profiles (id) on delete set null,
  add column response jsonb,
  add column outcome text check (outcome is null or outcome in ('stable', 'needs_support', 'returned')),
  add constraint adoption_followups_response_object check (
    response is null or jsonb_typeof(response) = 'object'
  );

alter table public.notifications
  add column available_at timestamptz not null default now();

create unique index adoption_applications_one_active_per_adopter_pet_idx
  on public.adoption_applications (adopter_user_id, pet_id)
  where status in ('draft', 'submitted', 'screening', 'interview', 'home_check', 'trial', 'approved');
create index adopter_questionnaire_responses_user_idx
  on public.adopter_questionnaire_responses (user_id, questionnaire_version desc);
create index application_private_notes_application_idx
  on public.application_private_notes (application_id, created_at desc);
create index adoption_followups_due_idx
  on public.adoption_followups (due_at, status)
  where reviewed_at is null;
drop index if exists public.notifications_user_unread_idx;
create index notifications_user_unread_idx
  on public.notifications (user_id, available_at desc, created_at desc)
  where read_at is null;

insert into public.application_private_notes (application_id, kind, note, created_at)
select id, 'internal', internal_notes, created_at
from public.adoption_applications
where nullif(trim(internal_notes), '') is not null;

insert into public.application_private_notes (application_id, author_id, kind, note, created_at)
select h.application_id, h.changed_by,
  case when h.to_status = 'returned' then 'return'
       when h.to_status = 'rejected' then 'rejection'
       else 'internal' end,
  h.note, h.created_at
from public.application_status_history h
where nullif(trim(h.note), '') is not null;

update public.adoption_applications set internal_notes = null
where internal_notes is not null;
update public.application_status_history set note = null
where note is not null;

alter table public.adopter_questionnaire_responses enable row level security;
alter table public.pet_match_requirements enable row level security;
alter table public.application_private_notes enable row level security;

create policy "questionnaire_responses_owner_staff_read"
  on public.adopter_questionnaire_responses for select to authenticated
  using (user_id = public.current_app_user_id() or public.is_staff());
create policy "questionnaire_responses_owner_write"
  on public.adopter_questionnaire_responses for insert to authenticated
  with check (user_id = public.current_app_user_id());
create policy "questionnaire_responses_owner_update"
  on public.adopter_questionnaire_responses for update to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

create policy "match_requirements_public_owner_staff_read"
  on public.pet_match_requirements for select
  using (public.is_pet_publicly_visible(pet_id) or public.owns_pet(pet_id) or public.is_staff());
create policy "match_requirements_owner_staff_write"
  on public.pet_match_requirements for all to authenticated
  using (public.owns_pet(pet_id) or public.is_staff())
  with check (public.owns_pet(pet_id) or public.is_staff());

create policy "application_private_notes_reviewer_read"
  on public.application_private_notes for select to authenticated
  using (
    exists (
      select 1
      from public.adoption_applications a
      where a.id = application_id
        and (public.owns_pet(a.pet_id) or public.is_staff())
    )
  );

grant select, insert, update on public.adopter_questionnaire_responses to authenticated;
grant select on public.pet_match_requirements, public.application_private_notes to authenticated;
grant insert, update, delete on public.pet_match_requirements to authenticated;
grant all on public.adopter_questionnaire_responses, public.pet_match_requirements,
  public.application_private_notes to service_role;

-- Lifecycle tables are read through RLS and written only by the audited RPCs below.
revoke insert, update, delete on public.adoption_applications from authenticated;
revoke insert, update, delete on public.application_answers from authenticated;
revoke insert, update, delete on public.application_status_history from authenticated;
revoke insert, update, delete on public.application_private_notes from authenticated;
revoke insert, update, delete on public.adoption_followups from authenticated;

create or replace function public.closed_pilot_adoption_enabled()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select enabled from public.feature_flags
    where key = 'closed_pilot_adoption_operations'
  ), false);
$$;

create or replace function public.submit_adoption_application(
  p_pet_id uuid,
  p_match_result jsonb default '{}'::jsonb
)
returns public.adoption_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.current_app_user_id();
  target_pet public.pets;
  active_response public.adopter_questionnaire_responses;
  created_application public.adoption_applications;
  foster_user_id uuid;
begin
  if not public.closed_pilot_adoption_enabled() then
    raise exception 'Closed-pilot adoption operations are disabled' using errcode = '55000';
  end if;
  if actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if not exists (
    select 1 from public.pilot_invitations i
    where i.accepted_by = actor and i.accepted_at is not null and i.revoked_at is null
  ) then raise exception 'A valid pilot invitation is required' using errcode = '42501'; end if;
  if jsonb_typeof(p_match_result) is distinct from 'object' then
    raise exception 'Match result must be an object' using errcode = '22023';
  end if;

  select p.* into target_pet
  from public.pets p
  where p.id = p_pet_id
  for update;
  if target_pet.id is null
    or target_pet.source_type <> 'private_foster'
    or target_pet.review_status <> 'approved'
    or target_pet.is_published is not true
    or target_pet.status not in ('available', 'application_pending')
  then raise exception 'Pet is not accepting Pawtner applications' using errcode = '23514'; end if;
  if public.owns_pet(p_pet_id) then
    raise exception 'A foster cannot apply to their own pet' using errcode = '42501';
  end if;

  select r.* into active_response
  from public.adopter_questionnaire_responses r
  join public.questionnaires q on q.id = r.questionnaire_id
  where r.user_id = actor and q.is_active = true and q.version = r.questionnaire_version
  order by r.completed_at desc
  limit 1;
  if active_response.id is null then
    raise exception 'Complete the active questionnaire before applying' using errcode = '23514';
  end if;

  insert into public.adoption_applications (
    pet_id, adopter_user_id, status, match_score, match_breakdown
  ) values (
    p_pet_id, actor, 'submitted',
    case when p_match_result ? 'score' and p_match_result->'score' <> 'null'::jsonb
      then (p_match_result->>'score')::numeric else null end,
    p_match_result
  ) returning * into created_application;

  insert into public.application_answers (application_id, questionnaire_id, answers)
  values (
    created_application.id,
    active_response.questionnaire_id,
    jsonb_build_object(
      'questionnaire_version', active_response.questionnaire_version,
      'answers', active_response.answers,
      'match', p_match_result
    )
  );
  insert into public.application_status_history (
    application_id, from_status, to_status, changed_by
  ) values (created_application.id, null, 'submitted', actor);

  update public.pets set status = 'application_pending', updated_at = now()
  where id = p_pet_id and status = 'available';
  select fp.user_id into foster_user_id
  from public.foster_profiles fp where fp.id = target_pet.foster_profile_id;
  insert into public.notifications (
    user_id, kind, title, body, href, resource_type, resource_id
  ) values (
    foster_user_id, 'application_submitted', 'New adoption application',
    'A new application is ready for review.',
    '/foster/applications/' || created_application.id::text,
    'application', created_application.id::text
  );
  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    actor, 'application.submitted', 'application', created_application.id::text,
    jsonb_build_object('pet_id', p_pet_id, 'questionnaire_version', active_response.questionnaire_version)
  );
  insert into public.analytics_events (user_id, name, resource_type, resource_id, properties)
  values (actor, 'application_submitted', 'application', created_application.id::text, '{}'::jsonb);
  return created_application;
exception
  when unique_violation then
    raise exception 'An active application already exists for this pet' using errcode = '23505';
end;
$$;

create or replace function public.transition_application(
  p_application_id uuid,
  p_status public.application_status,
  p_note text default null
)
returns public.adoption_applications
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.current_app_user_id();
  before_row public.adoption_applications;
  after_row public.adoption_applications;
  target_pet public.pets;
  actor_is_adopter boolean;
  actor_is_reviewer boolean;
  note_kind text;
begin
  if not public.closed_pilot_adoption_enabled() then
    raise exception 'Closed-pilot adoption operations are disabled' using errcode = '55000';
  end if;
  if actor is null then raise exception 'Authentication required' using errcode = '28000'; end if;

  select a.* into before_row from public.adoption_applications a
  where a.id = p_application_id for update;
  if before_row.id is null then raise exception 'Application not found' using errcode = 'P0002'; end if;
  select p.* into target_pet from public.pets p where p.id = before_row.pet_id for update;
  actor_is_adopter := before_row.adopter_user_id = actor;
  actor_is_reviewer := public.owns_pet(before_row.pet_id) or public.is_staff();

  if actor_is_adopter then
    if p_status <> 'withdrawn' or before_row.status not in ('submitted','screening','interview','home_check') then
      raise exception 'Adopters may only withdraw before trial' using errcode = '42501';
    end if;
  elsif actor_is_reviewer then
    if not (case before_row.status
      when 'submitted' then p_status in ('screening','rejected')
      when 'screening' then p_status in ('interview','rejected')
      when 'interview' then p_status in ('home_check','trial','rejected')
      when 'home_check' then p_status in ('trial','rejected')
      when 'trial' then p_status in ('approved','returned')
      when 'approved' then p_status in ('adopted','returned')
      when 'adopted' then p_status = 'returned'
      else false end)
    then raise exception 'Invalid application transition' using errcode = '23514'; end if;
  else
    raise exception 'Application is not manageable by this actor' using errcode = '42501';
  end if;

  if p_status in ('rejected','returned') and nullif(trim(p_note), '') is null then
    raise exception 'A private note is required for rejection or return' using errcode = '23514';
  end if;
  update public.adoption_applications set status = p_status, updated_at = now(), internal_notes = null
  where id = p_application_id returning * into after_row;
  insert into public.application_status_history (
    application_id, from_status, to_status, changed_by, note
  ) values (p_application_id, before_row.status, p_status, actor, null);
  if nullif(trim(p_note), '') is not null then
    note_kind := case when p_status = 'returned' then 'return'
      when p_status = 'rejected' then 'rejection' else 'internal' end;
    insert into public.application_private_notes (application_id, author_id, kind, note)
    values (p_application_id, actor, note_kind, trim(p_note));
  end if;

  if p_status = 'adopted' then
    insert into public.adoption_followups (application_id, day_offset, due_at)
    values
      (p_application_id, 7, now() + interval '7 days'),
      (p_application_id, 30, now() + interval '30 days'),
      (p_application_id, 90, now() + interval '90 days')
    on conflict (application_id, day_offset) do nothing;
    insert into public.notifications (
      user_id, kind, title, body, href, resource_type, resource_id, available_at
    ) select
      before_row.adopter_user_id, 'adoption_followup_due',
      day_offset::text || '-day adoption check-in',
      'Your adoption follow-up is ready.',
      '/applications/' || p_application_id::text,
      'adoption_followup', id::text, due_at
    from public.adoption_followups where application_id = p_application_id
    on conflict do nothing;
    update public.pets set status = 'adopted', is_published = false, published_at = null
    where id = before_row.pet_id;
  elsif p_status = 'returned' then
    update public.pets set
      status = 'hidden', review_status = 'changes_requested',
      review_note = 'Returned adoption requires a fresh pet review.',
      is_published = false, published_at = null,
      reviewed_at = null, reviewed_by = null
    where id = before_row.pet_id;
  elsif p_status = 'trial' then
    update public.pets set status = 'trial_adoption' where id = before_row.pet_id;
  elsif p_status in ('screening','interview','home_check') then
    update public.pets set status = 'application_pending' where id = before_row.pet_id;
  elsif p_status in ('withdrawn','rejected') and not exists (
    select 1 from public.adoption_applications other
    where other.pet_id = before_row.pet_id and other.id <> p_application_id
      and other.status in ('submitted','screening','interview','home_check','trial','approved')
  ) and target_pet.source_type = 'private_foster'
    and target_pet.review_status = 'approved' and target_pet.is_published = true
  then
    update public.pets set status = 'available' where id = before_row.pet_id;
  end if;

  insert into public.notifications (user_id, kind, title, body, href, resource_type, resource_id)
  values (
    before_row.adopter_user_id, 'application_status', 'Application status updated',
    'Your application status is now ' || p_status::text || '.',
    '/applications/' || p_application_id::text, 'application', p_application_id::text
  );
  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (actor, 'application.transition', 'application', p_application_id::text,
    jsonb_build_object('from', before_row.status, 'to', p_status));
  insert into public.analytics_events (user_id, name, resource_type, resource_id, properties)
  values (actor, case when p_status = 'adopted' then 'adoption_completed'
    when p_status = 'returned' then 'adoption_returned' else 'application_status_changed' end,
    'application', p_application_id::text, jsonb_build_object('status', p_status));
  return after_row;
end;
$$;

create or replace function public.submit_adoption_followup(
  p_application_id uuid,
  p_followup_id uuid,
  p_response jsonb
)
returns public.adoption_followups
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := public.current_app_user_id(); result public.adoption_followups;
begin
  if not public.closed_pilot_adoption_enabled() then raise exception 'Closed-pilot adoption operations are disabled'; end if;
  if jsonb_typeof(p_response) is distinct from 'object' or p_response = '{}'::jsonb then
    raise exception 'A structured response is required' using errcode = '22023';
  end if;
  update public.adoption_followups f set
    response = p_response, submitted_at = now(), status = 'completed'
  from public.adoption_applications a
  where f.id = p_followup_id and f.application_id = p_application_id
    and a.id = f.application_id and a.adopter_user_id = actor
    and a.status = 'adopted' and f.submitted_at is null and f.due_at <= now()
  returning f.* into result;
  if result.id is null then raise exception 'Follow-up is not available for submission' using errcode = '42501'; end if;
  insert into public.analytics_events (user_id, name, resource_type, resource_id, properties)
  values (actor, 'followup_submitted', 'adoption_followup', result.id::text,
    jsonb_build_object('day_offset', result.day_offset));
  return result;
end;
$$;

create or replace function public.review_adoption_followup(
  p_application_id uuid,
  p_followup_id uuid,
  p_outcome text,
  p_note text default null
)
returns public.adoption_followups
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := public.current_app_user_id(); result public.adoption_followups;
begin
  if not public.closed_pilot_adoption_enabled() then raise exception 'Closed-pilot adoption operations are disabled'; end if;
  if p_outcome not in ('stable','needs_support','returned') then
    raise exception 'Invalid follow-up outcome' using errcode = '22023';
  end if;
  if not (public.is_staff() or exists (
    select 1 from public.adoption_applications a where a.id = p_application_id and public.owns_pet(a.pet_id)
  )) then raise exception 'Reviewer access required' using errcode = '42501'; end if;
  update public.adoption_followups set
    outcome = p_outcome, reviewed_at = now(), reviewed_by = actor,
    completed_at = now(), status = case when p_outcome = 'returned' then 'returned' else 'completed' end,
    notes = null
  where id = p_followup_id and application_id = p_application_id and submitted_at is not null
  returning * into result;
  if result.id is null then raise exception 'Submitted follow-up not found' using errcode = 'P0002'; end if;
  if nullif(trim(p_note), '') is not null then
    insert into public.application_private_notes (application_id, author_id, kind, note)
    values (p_application_id, actor, case when p_outcome = 'returned' then 'return' else 'internal' end, trim(p_note));
  end if;
  if p_outcome = 'returned' then
    perform public.transition_application(p_application_id, 'returned', coalesce(nullif(trim(p_note), ''), 'Return identified during follow-up review.'));
  end if;
  insert into public.analytics_events (user_id, name, resource_type, resource_id, properties)
  values (actor,
    case when result.day_offset = 30 and p_outcome = 'stable'
      then 'adoption_30_day_stable' else 'followup_reviewed' end,
    'adoption_followup', result.id::text,
    jsonb_build_object('day_offset', result.day_offset, 'outcome', p_outcome));
  return result;
end;
$$;

create or replace function public.review_foster_profile(
  p_foster_profile_id uuid,
  p_status public.foster_status,
  p_note text
)
returns public.foster_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := public.current_app_user_id(); before_row public.foster_profiles; after_row public.foster_profiles;
begin
  if not public.closed_pilot_adoption_enabled() then raise exception 'Closed-pilot adoption operations are disabled'; end if;
  if not public.is_staff() then raise exception 'Staff access required' using errcode = '42501'; end if;
  if nullif(trim(p_note), '') is null then raise exception 'A review note is required' using errcode = '23514'; end if;
  select * into before_row from public.foster_profiles where id = p_foster_profile_id for update;
  if before_row.id is null then raise exception 'Foster profile not found' using errcode = 'P0002'; end if;
  if not (case before_row.status
    when 'submitted' then p_status in ('under_review','need_info','approved','rejected')
    when 'under_review' then p_status in ('need_info','approved','rejected')
    when 'need_info' then p_status in ('under_review','approved','rejected')
    when 'approved' then p_status = 'suspended'
    when 'suspended' then p_status in ('under_review','approved')
    else false end)
  then raise exception 'Invalid foster review transition' using errcode = '23514'; end if;
  update public.foster_profiles set
    status = p_status, verification_notes = trim(p_note), reviewed_at = now(), updated_at = now()
  where id = p_foster_profile_id returning * into after_row;
  if p_status = 'approved' then
    insert into public.user_roles (user_id, role) values (after_row.user_id, 'foster') on conflict do nothing;
  elsif p_status in ('rejected','suspended') then
    delete from public.user_roles where user_id = after_row.user_id and role = 'foster';
  end if;
  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (actor, 'foster.reviewed', 'foster_profile', p_foster_profile_id::text,
    jsonb_build_object('from', before_row.status, 'to', p_status));
  insert into public.notifications (user_id, kind, title, body, href, resource_type, resource_id)
  values (after_row.user_id, 'foster_review', 'Foster onboarding status updated',
    'Your foster onboarding status is now ' || p_status::text || '.',
    '/foster', 'foster_profile', p_foster_profile_id::text);
  return after_row;
end;
$$;

revoke all on function public.closed_pilot_adoption_enabled() from public, anon, authenticated;
revoke all on function public.submit_adoption_application(uuid, jsonb) from public, anon;
revoke all on function public.transition_application(uuid, public.application_status, text) from public, anon;
revoke all on function public.submit_adoption_followup(uuid, uuid, jsonb) from public, anon;
revoke all on function public.review_adoption_followup(uuid, uuid, text, text) from public, anon;
revoke all on function public.review_foster_profile(uuid, public.foster_status, text) from public, anon;
grant execute on function public.submit_adoption_application(uuid, jsonb) to authenticated, service_role;
grant execute on function public.transition_application(uuid, public.application_status, text) to authenticated, service_role;
grant execute on function public.submit_adoption_followup(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.review_adoption_followup(uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.review_foster_profile(uuid, public.foster_status, text) to authenticated, service_role;
