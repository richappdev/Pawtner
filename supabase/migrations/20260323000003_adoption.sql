-- Phase 3: adoption workflow, matching inputs, follow-ups
create type public.application_status as enum (
  'draft',
  'submitted',
  'screening',
  'interview',
  'home_check',
  'trial',
  'approved',
  'adopted',
  'rejected',
  'withdrawn',
  'returned'
);

create table public.questionnaires (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null default 1,
  schema jsonb not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.adoption_applications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  adopter_user_id uuid not null references public.user_profiles (id) on delete cascade,
  status public.application_status not null default 'draft',
  match_score numeric(5, 2),
  match_breakdown jsonb not null default '{}'::jsonb,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_answers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.adoption_applications (id) on delete cascade,
  questionnaire_id uuid not null references public.questionnaires (id),
  answers jsonb not null,
  created_at timestamptz not null default now()
);

create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.adoption_applications (id) on delete cascade,
  from_status public.application_status,
  to_status public.application_status not null,
  changed_by uuid references public.user_profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create table public.home_checks (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.adoption_applications (id) on delete cascade,
  scheduled_at timestamptz,
  completed_at timestamptz,
  result text check (result in ('pass', 'fail', 'need_info')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.trial_adoptions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.adoption_applications (id) on delete cascade,
  started_at timestamptz not null default now(),
  ends_at timestamptz,
  outcome text check (outcome in ('success', 'returned', 'extended')),
  notes text
);

create table public.adoption_followups (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.adoption_applications (id) on delete cascade,
  day_offset integer not null check (day_offset in (7, 30, 90)),
  due_at timestamptz not null,
  completed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'completed', 'missed', 'returned')),
  notes text,
  unique (application_id, day_offset)
);

create or replace function public.can_manage_application(app_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.adoption_applications a
    join public.pets p on p.id = a.pet_id
    join public.foster_profiles fp on fp.id = p.foster_profile_id
    where a.id = app_id
      and (a.adopter_user_id = auth.uid() or fp.user_id = auth.uid() or public.is_staff())
  );
$$;

alter table public.questionnaires enable row level security;
alter table public.adoption_applications enable row level security;
alter table public.application_answers enable row level security;
alter table public.application_status_history enable row level security;
alter table public.home_checks enable row level security;
alter table public.trial_adoptions enable row level security;
alter table public.adoption_followups enable row level security;

create policy "questionnaires_read"
  on public.questionnaires for select using (is_active or public.is_staff());

create policy "questionnaires_staff_write"
  on public.questionnaires for all
  using (public.is_staff()) with check (public.is_staff());

create policy "applications_participants"
  on public.adoption_applications for select
  using (
    adopter_user_id = auth.uid()
    or public.owns_pet(pet_id)
    or public.is_staff()
  );

create policy "applications_adopter_insert"
  on public.adoption_applications for insert
  with check (adopter_user_id = auth.uid());

create policy "applications_update_participants"
  on public.adoption_applications for update
  using (
    adopter_user_id = auth.uid()
    or public.owns_pet(pet_id)
    or public.is_staff()
  );

create policy "answers_via_app"
  on public.application_answers for all
  using (public.can_manage_application(application_id))
  with check (public.can_manage_application(application_id));

create policy "history_via_app"
  on public.application_status_history for select
  using (public.can_manage_application(application_id));

create policy "history_insert_participants"
  on public.application_status_history for insert
  with check (public.can_manage_application(application_id));

create policy "home_checks_via_app"
  on public.home_checks for all
  using (public.can_manage_application(application_id))
  with check (public.can_manage_application(application_id));

create policy "trials_via_app"
  on public.trial_adoptions for all
  using (public.can_manage_application(application_id))
  with check (public.can_manage_application(application_id));

create policy "followups_via_app"
  on public.adoption_followups for all
  using (public.can_manage_application(application_id))
  with check (public.can_manage_application(application_id));

insert into public.questionnaires (name, version, schema, is_active)
values (
  'default_lifestyle',
  1,
  '{
    "fields": [
      {"id": "housing_type", "type": "select", "required": true, "options": ["apartment", "house", "shared"]},
      {"id": "hours_alone", "type": "number", "required": true},
      {"id": "has_children", "type": "boolean", "required": true},
      {"id": "has_other_pets", "type": "boolean", "required": true},
      {"id": "experience_level", "type": "select", "required": true, "options": ["none", "some", "experienced"]},
      {"id": "energy_preference", "type": "number", "required": true, "min": 1, "max": 5}
    ]
  }'::jsonb,
  true
);
