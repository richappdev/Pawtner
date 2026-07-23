-- Phase 4 AI + Phase 6 reports
create type public.ai_generation_kind as enum (
  'pet_story',
  'social_post',
  'faq',
  'image_enhance',
  'pet_chat',
  'application_summary'
);

create type public.ai_generation_status as enum (
  'generated',
  'needs_review',
  'approved',
  'rejected',
  'published'
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  kind public.ai_generation_kind not null,
  pet_id uuid references public.pets (id) on delete set null,
  application_id uuid references public.adoption_applications (id) on delete set null,
  requested_by uuid not null references public.user_profiles (id),
  prompt_version text not null default 'v1',
  input_snapshot jsonb not null,
  output_text text,
  output_meta jsonb not null default '{}'::jsonb,
  status public.ai_generation_status not null default 'needs_review',
  safety_flags text[] not null default '{}',
  token_usage integer not null default 0,
  cost_cents numeric(10, 4) not null default 0,
  model_name text,
  reviewed_by uuid references public.user_profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.ai_usage_quotas (
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  month_key text not null,
  tokens_used integer not null default 0,
  request_count integer not null default 0,
  primary key (user_id, month_key)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.user_profiles (id),
  target_type text not null,
  target_id text not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.ai_generations enable row level security;
alter table public.ai_usage_quotas enable row level security;
alter table public.reports enable row level security;

create policy "ai_own_or_staff"
  on public.ai_generations for select
  using (requested_by = auth.uid() or public.is_staff() or public.owns_pet(pet_id));

create policy "ai_insert_auth"
  on public.ai_generations for insert
  with check (requested_by = auth.uid());

create policy "ai_update_owner_or_staff"
  on public.ai_generations for update
  using (requested_by = auth.uid() or public.is_staff() or public.owns_pet(pet_id));

create policy "quota_own_or_staff"
  on public.ai_usage_quotas for all
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());

create policy "reports_insert_auth"
  on public.reports for insert
  with check (auth.uid() is not null);

create policy "reports_own_or_staff"
  on public.reports for select
  using (reporter_id = auth.uid() or public.is_staff());

create policy "reports_staff_update"
  on public.reports for update
  using (public.is_staff());
