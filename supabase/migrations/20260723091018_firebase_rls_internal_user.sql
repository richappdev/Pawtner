-- Phase 3: authorize via internal UUID helper; decouple profiles from auth.users.
-- Apply only after Phase 2 dual-auth bridge is verified in staging.

-- 1) Update helpers that previously used auth.uid()
create or replace function public.has_role(target_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = public.current_app_user_id() and role = target_role
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = public.current_app_user_id()
      and role in ('support_agent', 'moderator', 'admin', 'super_admin')
  );
$$;

create or replace function public.owns_pet(target_pet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pets p
    join public.foster_profiles fp on fp.id = p.foster_profile_id
    where p.id = target_pet_id and fp.user_id = public.current_app_user_id()
  );
$$;

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
      and (
        a.adopter_user_id = public.current_app_user_id()
        or fp.user_id = public.current_app_user_id()
        or public.is_staff()
      )
  );
$$;

create or replace function public.is_conversation_participant(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = cid and user_id = public.current_app_user_id()
  ) or public.is_staff();
$$;

-- 2) Recreate policies that compared auth.uid() directly (helpers above cover many)

-- Identity
drop policy if exists "profiles_select_own_or_staff" on public.user_profiles;
create policy "profiles_select_own_or_staff"
  on public.user_profiles for select
  using (id = public.current_app_user_id() or public.is_staff());

drop policy if exists "profiles_update_own" on public.user_profiles;
create policy "profiles_update_own"
  on public.user_profiles for update
  using (id = public.current_app_user_id())
  with check (id = public.current_app_user_id());

drop policy if exists "roles_select_own_or_staff" on public.user_roles;
create policy "roles_select_own_or_staff"
  on public.user_roles for select
  using (user_id = public.current_app_user_id() or public.is_staff());

drop policy if exists "foster_select_own_or_staff" on public.foster_profiles;
create policy "foster_select_own_or_staff"
  on public.foster_profiles for select
  using (user_id = public.current_app_user_id() or public.is_staff());

drop policy if exists "foster_insert_own" on public.foster_profiles;
create policy "foster_insert_own"
  on public.foster_profiles for insert
  with check (user_id = public.current_app_user_id());

drop policy if exists "foster_update_own_or_staff" on public.foster_profiles;
create policy "foster_update_own_or_staff"
  on public.foster_profiles for update
  using (user_id = public.current_app_user_id() or public.is_staff())
  with check (user_id = public.current_app_user_id() or public.is_staff());

drop policy if exists "identity_own_or_staff" on public.identity_verifications;
create policy "identity_own_or_staff"
  on public.identity_verifications for all
  using (
    public.is_staff()
    or exists (
      select 1 from public.foster_profiles fp
      where fp.id = foster_profile_id and fp.user_id = public.current_app_user_id()
    )
  )
  with check (
    public.is_staff()
    or exists (
      select 1 from public.foster_profiles fp
      where fp.id = foster_profile_id and fp.user_id = public.current_app_user_id()
    )
  );

drop policy if exists "adopter_own_or_staff" on public.adopter_profiles;
create policy "adopter_own_or_staff"
  on public.adopter_profiles for all
  using (user_id = public.current_app_user_id() or public.is_staff())
  with check (user_id = public.current_app_user_id() or public.is_staff());

drop policy if exists "audit_insert_authenticated" on public.audit_logs;
create policy "audit_insert_authenticated"
  on public.audit_logs for insert
  with check (public.current_app_user_id() is not null);

drop policy if exists "external_identities_select_own_or_staff" on public.external_identities;
create policy "external_identities_select_own_or_staff"
  on public.external_identities for select
  using (
    user_id = public.current_app_user_id()
    or public.is_staff()
  );

-- Pets / favorites
drop policy if exists "pets_insert_approved_foster" on public.pets;
create policy "pets_insert_approved_foster"
  on public.pets for insert
  with check (
    exists (
      select 1 from public.foster_profiles fp
      where fp.id = foster_profile_id
        and fp.user_id = public.current_app_user_id()
        and fp.status = 'approved'
    )
    or public.is_staff()
  );

drop policy if exists "favorites_own" on public.favorites;
create policy "favorites_own"
  on public.favorites for all
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());

-- Adoption
drop policy if exists "applications_participants" on public.adoption_applications;
create policy "applications_participants"
  on public.adoption_applications for select
  using (
    adopter_user_id = public.current_app_user_id()
    or public.owns_pet(pet_id)
    or public.is_staff()
  );

drop policy if exists "applications_adopter_insert" on public.adoption_applications;
create policy "applications_adopter_insert"
  on public.adoption_applications for insert
  to authenticated
  with check (
    adopter_user_id = public.current_app_user_id()
    and status in ('draft', 'submitted')
    and match_score is null
    and match_breakdown = '{}'::jsonb
    and internal_notes is null
  );

-- Messaging
drop policy if exists "conversations_insert_auth" on public.conversations;
create policy "conversations_insert_auth"
  on public.conversations for insert
  with check (public.current_app_user_id() is not null);

drop policy if exists "participants_insert" on public.conversation_participants;
create policy "participants_insert"
  on public.conversation_participants for insert
  with check (user_id = public.current_app_user_id() or public.is_staff());

drop policy if exists "messages_send" on public.messages;
create policy "messages_send"
  on public.messages for insert
  with check (
    sender_id = public.current_app_user_id()
    and public.is_conversation_participant(conversation_id)
  );

drop policy if exists "messages_update_own_or_staff" on public.messages;
create policy "messages_update_own_or_staff"
  on public.messages for update
  using (sender_id = public.current_app_user_id() or public.is_staff());

-- Commerce
drop policy if exists "wishlists_public_or_owner" on public.wishlists;
create policy "wishlists_public_or_owner"
  on public.wishlists for select
  using (
    is_public
    or exists (
      select 1 from public.foster_profiles fp
      where fp.id = foster_profile_id and fp.user_id = public.current_app_user_id()
    )
    or public.is_staff()
  );

drop policy if exists "wishlists_foster_write" on public.wishlists;
create policy "wishlists_foster_write"
  on public.wishlists for all
  using (
    exists (
      select 1 from public.foster_profiles fp
      where fp.id = foster_profile_id and fp.user_id = public.current_app_user_id()
    )
    or public.is_staff()
  )
  with check (
    exists (
      select 1 from public.foster_profiles fp
      where fp.id = foster_profile_id and fp.user_id = public.current_app_user_id()
    )
    or public.is_staff()
  );

drop policy if exists "wishlist_items_via_list" on public.wishlist_items;
create policy "wishlist_items_via_list"
  on public.wishlist_items for all
  using (
    exists (
      select 1 from public.wishlists w
      join public.foster_profiles fp on fp.id = w.foster_profile_id
      where w.id = wishlist_id
        and (w.is_public or fp.user_id = public.current_app_user_id() or public.is_staff())
    )
  )
  with check (
    exists (
      select 1 from public.wishlists w
      join public.foster_profiles fp on fp.id = w.foster_profile_id
      where w.id = wishlist_id
        and (fp.user_id = public.current_app_user_id() or public.is_staff())
    )
  );

drop policy if exists "orders_buyer_or_staff" on public.orders;
create policy "orders_buyer_or_staff"
  on public.orders for select
  using (buyer_user_id = public.current_app_user_id() or public.is_staff());

drop policy if exists "order_items_via_order" on public.order_items;
create policy "order_items_via_order"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_user_id = public.current_app_user_id() or public.is_staff())
    )
  );

drop policy if exists "shipments_via_order" on public.shipments;
create policy "shipments_via_order"
  on public.shipments for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_user_id = public.current_app_user_id() or public.is_staff())
    )
  );

-- AI / reports
drop policy if exists "ai_own_or_staff" on public.ai_generations;
create policy "ai_own_or_staff"
  on public.ai_generations for select
  using (
    requested_by = public.current_app_user_id()
    or public.is_staff()
    or public.owns_pet(pet_id)
  );

drop policy if exists "ai_insert_auth" on public.ai_generations;
create policy "ai_insert_auth"
  on public.ai_generations for insert
  with check (requested_by = public.current_app_user_id());

drop policy if exists "ai_update_owner_or_staff" on public.ai_generations;
create policy "ai_update_owner_or_staff"
  on public.ai_generations for update
  using (
    requested_by = public.current_app_user_id()
    or public.is_staff()
    or public.owns_pet(pet_id)
  );

drop policy if exists "quota_own_or_staff" on public.ai_usage_quotas;
create policy "quota_own_or_staff"
  on public.ai_usage_quotas for all
  using (user_id = public.current_app_user_id() or public.is_staff())
  with check (user_id = public.current_app_user_id() or public.is_staff());

drop policy if exists "reports_insert_auth" on public.reports;
create policy "reports_insert_auth"
  on public.reports for insert
  with check (public.current_app_user_id() is not null);

drop policy if exists "reports_own_or_staff" on public.reports;
create policy "reports_own_or_staff"
  on public.reports for select
  using (reporter_id = public.current_app_user_id() or public.is_staff());

-- 3) Keep Supabase Auth trigger for dual-auth window; register supabase external identity.
-- (FK to auth.users already dropped in firebase_identity_bridge.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'adopter')
  on conflict (user_id, role) do nothing;

  insert into public.adopter_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.external_identities (provider, subject, user_id)
  values ('supabase', new.id::text, new.id)
  on conflict (provider, subject) do nothing;

  return new;
end;
$$;
