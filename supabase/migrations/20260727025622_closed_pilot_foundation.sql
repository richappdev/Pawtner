-- Closed-pilot foundation: invitations, review workflow, notifications,
-- analytics, and transactional audited state changes.

create type public.pet_review_status as enum (
  'draft',
  'pending_review',
  'changes_requested',
  'approved'
);

alter table public.user_profiles
  add column if not exists profile_completed_at timestamptz,
  add column if not exists suspended_at timestamptz;

create table public.pilot_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  intended_role public.app_role not null default 'adopter',
  invited_by uuid not null references public.user_profiles (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.user_profiles (id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (email = lower(trim(email))),
  check (expires_at > created_at)
);

alter table public.pets
  add column review_status public.pet_review_status not null default 'draft',
  add column review_note text,
  add column submitted_for_review_at timestamptz,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.user_profiles (id);

create table public.pet_review_events (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  actor_id uuid references public.user_profiles (id),
  action text not null check (
    action in (
      'submitted',
      'approved',
      'changes_requested',
      'hidden',
      'unpublished',
      'archived',
      'content_changed'
    )
  ),
  from_review_status public.pet_review_status,
  to_review_status public.pet_review_status not null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  changed_by uuid references public.user_profiles (id),
  admin_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  href text,
  resource_type text,
  resource_id text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles (id) on delete set null,
  name text not null,
  resource_type text,
  resource_id text,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index pilot_invitations_email_idx on public.pilot_invitations (email);
create index pilot_invitations_expiry_idx on public.pilot_invitations (expires_at)
  where accepted_at is null and revoked_at is null;
create index pets_review_status_idx on public.pets (review_status, updated_at desc);
create index pet_review_events_pet_idx on public.pet_review_events (pet_id, created_at desc);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc)
  where read_at is null;
create index analytics_events_name_time_idx on public.analytics_events (name, occurred_at desc);

alter table public.pilot_invitations enable row level security;
alter table public.pet_review_events enable row level security;
alter table public.order_status_history enable row level security;
alter table public.notifications enable row level security;
alter table public.analytics_events enable row level security;

create policy "pilot_invitations_admin_read"
  on public.pilot_invitations for select
  to authenticated
  using (
    public.has_role('admin') or public.has_role('super_admin')
  );

create policy "pet_review_events_participants_read"
  on public.pet_review_events for select
  to authenticated
  using (public.owns_pet(pet_id) or public.is_staff());

create policy "order_status_history_participants_read"
  on public.order_status_history for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and (o.buyer_user_id = public.current_app_user_id() or public.is_staff())
    )
  );

create policy "notifications_own_read"
  on public.notifications for select
  to authenticated
  using (user_id = public.current_app_user_id());

create policy "notifications_own_update"
  on public.notifications for update
  to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

create policy "analytics_insert_authenticated"
  on public.analytics_events for insert
  to authenticated
  with check (
    user_id is null or user_id = public.current_app_user_id()
  );

create policy "analytics_staff_read"
  on public.analytics_events for select
  to authenticated
  using (public.is_staff());

grant select on public.pilot_invitations, public.pet_review_events,
  public.order_status_history, public.notifications, public.analytics_events
  to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant insert on public.analytics_events to authenticated;
grant all on public.pilot_invitations, public.pet_review_events,
  public.order_status_history, public.notifications, public.analytics_events
  to service_role;

create or replace function public.invalidate_pet_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.review_status = 'approved'
    and (
      old.name is distinct from new.name
      or old.species is distinct from new.species
      or old.breed is distinct from new.breed
      or old.sex is distinct from new.sex
      or old.age_months is distinct from new.age_months
      or old.weight_kg is distinct from new.weight_kg
      or old.color is distinct from new.color
      or old.region is distinct from new.region
      or old.sterilized is distinct from new.sterilized
      or old.microchipped is distinct from new.microchipped
      or old.vaccinated is distinct from new.vaccinated
      or old.dewormed is distinct from new.dewormed
      or old.personality_summary is distinct from new.personality_summary
      or old.special_care is distinct from new.special_care
      or old.adoption_conditions is distinct from new.adoption_conditions
    )
  then
    new.review_status := 'changes_requested';
    new.review_note := 'Public pet information changed and requires review.';
    new.is_published := false;
    new.published_at := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

create trigger pets_invalidate_review
  before update on public.pets
  for each row execute function public.invalidate_pet_review();

create or replace function public.invalidate_related_pet_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_pet_id uuid;
  actor uuid;
begin
  target_pet_id := coalesce(new.pet_id, old.pet_id);
  actor := public.current_app_user_id();

  update public.pets
  set review_status = 'changes_requested',
      review_note = 'Pet health, traits, or media changed and requires review.',
      is_published = false,
      published_at = null,
      reviewed_at = null,
      reviewed_by = null
  where id = target_pet_id and review_status = 'approved';

  if found then
    insert into public.pet_review_events (
      pet_id, actor_id, action, from_review_status, to_review_status, note
    ) values (
      target_pet_id, actor, 'content_changed', 'approved', 'changes_requested',
      'Pet health, traits, or media changed and requires review.'
    );
  end if;

  return coalesce(new, old);
end;
$$;

create trigger pet_traits_invalidate_review
  after insert or update or delete on public.pet_traits
  for each row execute function public.invalidate_related_pet_review();
create trigger pet_health_invalidate_review
  after insert or update or delete on public.pet_health_records
  for each row execute function public.invalidate_related_pet_review();
create trigger pet_media_invalidate_review
  after insert or update or delete on public.pet_media
  for each row execute function public.invalidate_related_pet_review();

create or replace function public.submit_pet_for_review(p_pet_id uuid, p_note text default null)
returns public.pets
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.current_app_user_id();
  before_row public.pets;
  after_row public.pets;
begin
  if actor is null then raise exception 'Authentication required'; end if;

  select p.* into before_row
  from public.pets p
  join public.foster_profiles fp on fp.id = p.foster_profile_id
  where p.id = p_pet_id and fp.user_id = actor and fp.status = 'approved'
  for update of p;

  if before_row.id is null then raise exception 'Pet not found or not manageable'; end if;
  if before_row.name is null or before_row.region is null
    or before_row.personality_summary is null or before_row.adoption_conditions is null
  then
    raise exception 'Pet profile is not ready for review';
  end if;

  update public.pets
  set review_status = 'pending_review',
      review_note = nullif(trim(p_note), ''),
      submitted_for_review_at = now(),
      is_published = false,
      published_at = null
  where id = p_pet_id
  returning * into after_row;

  insert into public.pet_review_events (
    pet_id, actor_id, action, from_review_status, to_review_status, note
  ) values (
    p_pet_id, actor, 'submitted', before_row.review_status, 'pending_review', nullif(trim(p_note), '')
  );

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    actor, 'pet.submitted', 'pet', p_pet_id::text,
    jsonb_build_object('before', to_jsonb(before_row), 'after', to_jsonb(after_row))
  );
  return after_row;
end;
$$;

create or replace function public.review_pet(
  p_pet_id uuid,
  p_action text,
  p_note text default null
)
returns public.pets
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.current_app_user_id();
  before_row public.pets;
  after_row public.pets;
  next_review public.pet_review_status;
begin
  if actor is null or not exists (
    select 1 from public.user_roles ur
    where ur.user_id = actor and ur.role in ('admin', 'super_admin')
  ) then raise exception 'Administrator access required'; end if;

  if p_action not in ('approve', 'request_changes', 'hide', 'unpublish', 'archive') then
    raise exception 'Invalid review action';
  end if;
  if p_action = 'request_changes' and nullif(trim(p_note), '') is null then
    raise exception 'A note is required when requesting changes';
  end if;

  select * into before_row from public.pets where id = p_pet_id for update;
  if before_row.id is null then raise exception 'Pet not found'; end if;

  if p_action = 'approve' then
    if before_row.review_status <> 'pending_review' then
      raise exception 'Only pending pets can be approved';
    end if;
    if before_row.status = 'medical_hold' then
      raise exception 'A pet on medical hold cannot be published';
    end if;
    next_review := 'approved';
    update public.pets
    set review_status = 'approved',
        review_note = nullif(trim(p_note), ''),
        reviewed_at = now(),
        reviewed_by = actor,
        status = case when status in ('intake', 'hidden') then 'available' else status end,
        is_published = true,
        published_at = now()
    where id = p_pet_id returning * into after_row;
  elsif p_action = 'request_changes' then
    next_review := 'changes_requested';
    update public.pets
    set review_status = next_review, review_note = trim(p_note),
        reviewed_at = now(), reviewed_by = actor,
        is_published = false, published_at = null
    where id = p_pet_id returning * into after_row;
  elsif p_action = 'hide' then
    next_review := before_row.review_status;
    update public.pets
    set status = 'hidden', is_published = false, published_at = null,
        review_note = nullif(trim(p_note), '')
    where id = p_pet_id returning * into after_row;
  elsif p_action = 'archive' then
    next_review := before_row.review_status;
    update public.pets
    set status = 'archived', is_published = false, published_at = null,
        review_note = nullif(trim(p_note), '')
    where id = p_pet_id returning * into after_row;
  else
    next_review := before_row.review_status;
    update public.pets
    set is_published = false, published_at = null,
        review_note = nullif(trim(p_note), '')
    where id = p_pet_id returning * into after_row;
  end if;

  insert into public.pet_review_events (
    pet_id, actor_id, action, from_review_status, to_review_status, note
  ) values (
    p_pet_id, actor,
    case when p_action = 'request_changes' then 'changes_requested' else p_action end,
    before_row.review_status, next_review, nullif(trim(p_note), '')
  );
  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    actor, 'pet.' || p_action, 'pet', p_pet_id::text,
    jsonb_build_object('before', to_jsonb(before_row), 'after', to_jsonb(after_row))
  );
  return after_row;
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
  allowed boolean := false;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  select a.* into before_row
  from public.adoption_applications a
  join public.pets p on p.id = a.pet_id
  join public.foster_profiles fp on fp.id = p.foster_profile_id
  where a.id = p_application_id
    and (
      fp.user_id = actor or exists (
        select 1 from public.user_roles ur
        where ur.user_id = actor and ur.role in ('admin', 'super_admin', 'moderator')
      )
    )
  for update of a;
  if before_row.id is null then raise exception 'Application not found or not manageable'; end if;

  allowed := case before_row.status
    when 'submitted' then p_status in ('screening', 'rejected', 'withdrawn')
    when 'screening' then p_status in ('interview', 'rejected', 'withdrawn')
    when 'interview' then p_status in ('home_check', 'trial', 'rejected', 'withdrawn')
    when 'home_check' then p_status in ('trial', 'rejected', 'withdrawn')
    when 'trial' then p_status in ('approved', 'returned')
    when 'approved' then p_status in ('adopted', 'returned')
    when 'adopted' then p_status = 'returned'
    else false
  end;
  if not allowed then raise exception 'Invalid application transition'; end if;

  update public.adoption_applications set status = p_status, updated_at = now()
  where id = p_application_id returning * into after_row;
  insert into public.application_status_history (
    application_id, from_status, to_status, changed_by, note
  ) values (p_application_id, before_row.status, p_status, actor, nullif(trim(p_note), ''));

  if p_status = 'adopted' then
    insert into public.adoption_followups (application_id, day_offset, due_at)
    values
      (p_application_id, 7, now() + interval '7 days'),
      (p_application_id, 30, now() + interval '30 days'),
      (p_application_id, 90, now() + interval '90 days')
    on conflict (application_id, day_offset) do nothing;
    update public.pets set status = 'adopted', is_published = false, published_at = null
    where id = before_row.pet_id;
  elsif p_status = 'trial' then
    update public.pets set status = 'trial_adoption' where id = before_row.pet_id;
  elsif p_status in ('submitted', 'screening', 'interview', 'home_check') then
    update public.pets set status = 'application_pending' where id = before_row.pet_id;
  end if;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    actor, 'application.transition', 'application', p_application_id::text,
    jsonb_build_object('from', before_row.status, 'to', p_status, 'note', p_note)
  );
  return after_row;
end;
$$;

create or replace function public.transition_manual_order(
  p_order_id uuid,
  p_status public.order_status,
  p_note text default null,
  p_carrier text default null,
  p_tracking_number text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := public.current_app_user_id();
  before_row public.orders;
  after_row public.orders;
  allowed boolean := false;
begin
  if actor is null or not exists (
    select 1 from public.user_roles ur
    where ur.user_id = actor and ur.role in ('admin', 'super_admin')
  ) then raise exception 'Administrator access required'; end if;
  select * into before_row from public.orders where id = p_order_id for update;
  if before_row.id is null then raise exception 'Order not found'; end if;

  allowed := case before_row.status
    when 'pending_payment' then p_status in ('paid', 'cancelled')
    when 'paid' then p_status in ('fulfilled', 'refunded', 'cancelled')
    when 'fulfilled' then p_status in ('shipped', 'refunded')
    when 'shipped' then p_status in ('delivered', 'refunded')
    when 'delivered' then p_status = 'refunded'
    else false
  end;
  if not allowed then raise exception 'Invalid order transition'; end if;

  update public.orders set status = p_status, updated_at = now()
  where id = p_order_id returning * into after_row;

  if p_status = 'shipped' then
    insert into public.shipments (order_id, carrier, tracking_number, shipped_at, status)
    values (p_order_id, nullif(trim(p_carrier), ''), nullif(trim(p_tracking_number), ''), now(), 'shipped');
  end if;
  insert into public.order_status_history (
    order_id, from_status, to_status, changed_by, admin_note
  ) values (p_order_id, before_row.status, p_status, actor, nullif(trim(p_note), ''));
  insert into public.notifications (user_id, kind, title, body, href, resource_type, resource_id)
  values (
    before_row.buyer_user_id, 'order_status', 'Order status updated',
    'Your pilot support order is now ' || p_status::text || '.',
    '/orders/' || p_order_id::text, 'order', p_order_id::text
  );
  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    actor, 'order.transition', 'order', p_order_id::text,
    jsonb_build_object('from', before_row.status, 'to', p_status, 'note', p_note)
  );
  return after_row;
end;
$$;

revoke all on function public.invalidate_related_pet_review() from public, anon, authenticated;
revoke all on function public.submit_pet_for_review(uuid, text) from public, anon;
revoke all on function public.review_pet(uuid, text, text) from public, anon;
revoke all on function public.transition_application(uuid, public.application_status, text) from public, anon;
revoke all on function public.transition_manual_order(uuid, public.order_status, text, text, text) from public, anon;
grant execute on function public.submit_pet_for_review(uuid, text) to authenticated, service_role;
grant execute on function public.review_pet(uuid, text, text) to authenticated, service_role;
grant execute on function public.transition_application(uuid, public.application_status, text) to authenticated, service_role;
grant execute on function public.transition_manual_order(uuid, public.order_status, text, text, text) to authenticated, service_role;

create or replace function public.provision_invited_firebase_identity(
  p_firebase_uid text,
  p_email text,
  p_display_name text,
  p_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.pilot_invitations;
  app_user_id uuid;
begin
  if p_email is null or nullif(trim(p_email), '') is null then
    raise exception 'An email address is required';
  end if;

  select * into invitation
  from public.pilot_invitations
  where email = lower(trim(p_email))
    and token_hash = p_token_hash
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  for update;
  if invitation.id is null then raise exception 'Invitation is invalid or expired'; end if;

  app_user_id := public.provision_firebase_identity(
    p_firebase_uid, lower(trim(p_email)), p_display_name
  );

  update public.pilot_invitations
  set accepted_at = now(), accepted_by = app_user_id
  where id = invitation.id;

  insert into public.audit_logs (actor_id, action, resource_type, resource_id, metadata)
  values (
    app_user_id, 'invitation.accepted', 'pilot_invitation', invitation.id::text,
    jsonb_build_object('email', invitation.email, 'intended_role', invitation.intended_role)
  );
  return app_user_id;
end;
$$;

revoke all on function public.provision_invited_firebase_identity(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.provision_invited_firebase_identity(text, text, text, text)
  to service_role;

create or replace view public.pets_public
with (security_invoker = true)
as
select
  p.id, p.name, p.species, p.breed, p.sex, p.age_months, p.weight_kg,
  p.color, p.region, p.status, p.sterilized, p.microchipped, p.vaccinated,
  p.dewormed, p.personality_summary, p.special_care, p.adoption_conditions,
  p.published_at, fp.display_name as foster_display_name, fp.region as foster_region
from public.pets p
join public.foster_profiles fp on fp.id = p.foster_profile_id
where p.review_status = 'approved'
  and p.is_published = true
  and p.status in ('available', 'application_pending', 'reserved', 'trial_adoption');
