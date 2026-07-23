-- Restrict adoption lifecycle decisions to the foster responsible for the pet or staff.
drop policy if exists "applications_update_participants" on public.adoption_applications;
drop policy if exists "applications_adopter_insert" on public.adoption_applications;

create policy "applications_update_reviewers"
  on public.adoption_applications for update
  to authenticated
  using (public.owns_pet(pet_id) or public.is_staff())
  with check (public.owns_pet(pet_id) or public.is_staff());

create policy "applications_adopter_insert"
  on public.adoption_applications for insert
  to authenticated
  with check (
    adopter_user_id = (select auth.uid())
    and status in ('draft', 'submitted')
    and match_score is null
    and match_breakdown = '{}'::jsonb
    and internal_notes is null
  );

drop policy if exists "history_insert_participants" on public.application_status_history;

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

-- Buyers may read and create orders, but all order state and payment fields are server-controlled.
drop policy if exists "orders_update_buyer_or_staff" on public.orders;
drop policy if exists "orders_buyer_insert" on public.orders;

create policy "orders_update_staff"
  on public.orders for update
  to authenticated
  using (public.is_staff())
  with check (public.is_staff());

-- Atomically price products and create the order with its line items.
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
