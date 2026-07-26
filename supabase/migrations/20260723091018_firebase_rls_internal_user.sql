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

-- Prefer reviewer-only updates (foster/staff). Fall back rewrite if harden not applied yet.
drop policy if exists "applications_update_participants" on public.adoption_applications;
drop policy if exists "applications_update_reviewers" on public.adoption_applications;
create policy "applications_update_reviewers"
  on public.adoption_applications for update
  to authenticated
  using (public.owns_pet(pet_id) or public.is_staff())
  with check (public.owns_pet(pet_id) or public.is_staff());

drop policy if exists "history_insert_participants" on public.application_status_history;
drop policy if exists "history_insert_reviewers" on public.application_status_history;
create policy "history_insert_reviewers"
  on public.application_status_history for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.adoption_applications application
      where application.id = application_id
        and (public.owns_pet(application.pet_id) or public.is_staff())
    )
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

-- Client inserts/updates are not allowed; checkout runs via service-role RPC.
drop policy if exists "orders_buyer_insert" on public.orders;
drop policy if exists "orders_update_buyer_or_staff" on public.orders;
drop policy if exists "orders_update_staff" on public.orders;
create policy "orders_update_staff"
  on public.orders for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

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

-- 4) Ensure checkout RPC exists (was missing on remote if harden migration never applied).
create or replace function public.create_checkout_order(
  p_buyer_user_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_currency text;
  v_currency_count integer;
  v_product_count integer;
  v_requested_count integer;
  v_total integer;
  v_order public.orders;
begin
  if p_buyer_user_id is null then
    raise exception 'A buyer is required.';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one checkout item is required.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
    where item.product_id is null or item.quantity is null or item.quantity < 1 or item.quantity > 100
  ) then
    raise exception 'Checkout items are invalid.';
  end if;

  with requested as (
    select item.product_id, sum(item.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
    group by item.product_id
  ),
  priced as (
    select p.id, p.price_cents, p.currency, r.quantity
    from requested r
    join public.products p on p.id = r.product_id
    where p.is_active = true and p.stock >= r.quantity
    for update of p
  )
  select
    (select count(*) from requested),
    count(*),
    count(distinct priced.currency),
    min(priced.currency),
    coalesce(sum(priced.price_cents * priced.quantity), 0)::integer
  into v_requested_count, v_product_count, v_currency_count, v_currency, v_total
  from priced;

  if v_product_count <> v_requested_count then
    raise exception 'One or more products are unavailable or lack sufficient stock.';
  end if;

  if v_currency_count <> 1 then
    raise exception 'All checkout products must use the same currency.';
  end if;

  insert into public.orders (
    buyer_user_id,
    status,
    total_cents,
    currency
  )
  values (
    p_buyer_user_id,
    'pending_payment',
    v_total,
    v_currency
  )
  returning * into v_order;

  insert into public.order_items (
    order_id,
    product_id,
    quantity,
    unit_price_cents
  )
  select
    v_order.id,
    p.id,
    r.quantity,
    p.price_cents
  from (
    select item.product_id, sum(item.quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
    group by item.product_id
  ) r
  join public.products p on p.id = r.product_id;

  return jsonb_build_object(
    'id', v_order.id,
    'status', v_order.status,
    'total_cents', v_order.total_cents,
    'currency', v_order.currency,
    'created_at', v_order.created_at
  );
end;
$$;

revoke all on function public.create_checkout_order(uuid, jsonb) from public;
revoke all on function public.create_checkout_order(uuid, jsonb) from anon;
revoke all on function public.create_checkout_order(uuid, jsonb) from authenticated;
grant select on table public.products, public.orders to service_role;
grant update on table public.products to service_role;
grant insert on table public.orders, public.order_items to service_role;
grant update on table public.orders to service_role;
grant execute on function public.create_checkout_order(uuid, jsonb) to service_role;

-- 5) Tighten SECURITY DEFINER execute grants (helpers are for RLS, not public RPC).
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;
revoke all on function public.provision_firebase_identity(text, text, text) from public;
revoke all on function public.provision_firebase_identity(text, text, text) from anon, authenticated;
grant execute on function public.provision_firebase_identity(text, text, text) to service_role;

revoke all on function public.has_role(public.app_role) from public;
revoke all on function public.is_staff() from public;
revoke all on function public.owns_pet(uuid) from public;
revoke all on function public.can_manage_application(uuid) from public;
revoke all on function public.is_conversation_participant(uuid) from public;
revoke all on function public.current_app_user_id() from public;

-- RLS policies evaluate these as the table owner / definer path; authenticated still needs execute.
grant execute on function public.has_role(public.app_role) to authenticated, service_role;
grant execute on function public.is_staff() to authenticated, service_role;
grant execute on function public.owns_pet(uuid) to authenticated, service_role;
grant execute on function public.can_manage_application(uuid) to authenticated, service_role;
grant execute on function public.is_conversation_participant(uuid) to authenticated, service_role;
grant execute on function public.current_app_user_id() to authenticated, service_role;
-- anon may hit public-read policies that call is_staff()/current_app_user_id(); keep read-safe helpers.
grant execute on function public.is_staff() to anon;
grant execute on function public.current_app_user_id() to anon;
