begin;
select plan(1);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('10000000-0000-0000-0000-000000000001', 'buyer@example.test', '{}'::jsonb),
  ('10000000-0000-0000-0000-000000000002', 'foster@example.test', '{}'::jsonb);

insert into public.foster_profiles (
  id,
  user_id,
  status,
  display_name
)
values (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'approved',
  'Migration test foster'
);

insert into public.pets (
  id,
  foster_profile_id,
  name,
  species,
  status,
  is_published
)
values (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'Migration test pet',
  'dog',
  'available',
  true
);

insert into public.adoption_applications (
  id,
  pet_id,
  adopter_user_id,
  status
)
values (
  '40000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'submitted'
);

create temporary table hardening_checkout_result (payload jsonb);
grant select, insert on table pg_temp.hardening_checkout_result to service_role, authenticated;

set local role service_role;

insert into pg_temp.hardening_checkout_result (payload)
select public.create_checkout_order(
  '10000000-0000-0000-0000-000000000001',
  jsonb_build_array(
    jsonb_build_object(
      'product_id',
      (select id from public.products where sku = 'FOOD-DOG-01'),
      'quantity',
      1
    ),
    jsonb_build_object(
      'product_id',
      (select id from public.products where sku = 'FOOD-DOG-01'),
      'quantity',
      2
    )
  )
);

reset role;

do $$
declare
  checkout jsonb;
  line_count integer;
  line_quantity integer;
begin
  select payload into checkout from pg_temp.hardening_checkout_result;

  if (checkout->>'status') <> 'pending_payment' then
    raise exception 'Checkout did not create a pending payment order.';
  end if;

  if (checkout->>'total_cents')::integer <> 135000 then
    raise exception 'Checkout total was not calculated from authoritative product prices.';
  end if;

  select count(*), max(quantity)
  into line_count, line_quantity
  from public.order_items
  where order_id = (checkout->>'id')::uuid;

  if line_count <> 1 or line_quantity <> 3 then
    raise exception 'Checkout did not atomically aggregate and persist line items.';
  end if;

  if has_function_privilege('authenticated', 'public.create_checkout_order(uuid,jsonb)', 'execute') then
    raise exception 'Authenticated users must not execute create_checkout_order directly.';
  end if;

  if not has_function_privilege('service_role', 'public.create_checkout_order(uuid,jsonb)', 'execute') then
    raise exception 'Service role must be able to execute create_checkout_order.';
  end if;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-0000-0000-000000000001',
  true
);
set local role authenticated;

do $$
declare
  affected integer;
begin
  begin
    update public.orders
    set status = 'paid'
    where id = (
      select (payload->>'id')::uuid
      from pg_temp.hardening_checkout_result
    );
    get diagnostics affected = row_count;

    if affected <> 0 then
      raise exception 'A buyer was able to modify payment-controlled order state.';
    end if;
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.adoption_applications
    set status = 'approved'
    where id = '40000000-0000-0000-0000-000000000001';
    get diagnostics affected = row_count;

    if affected <> 0 then
      raise exception 'An applicant was able to approve their own application.';
    end if;
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.orders (
      buyer_user_id,
      status,
      total_cents,
      currency
    )
    values (
      '10000000-0000-0000-0000-000000000001',
      'paid',
      0,
      'TWD'
    );
    raise exception 'A buyer was able to insert an arbitrary paid order.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    insert into public.adoption_applications (
      pet_id,
      adopter_user_id,
      status
    )
    values (
      '30000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'approved'
    );
    raise exception 'An applicant was able to insert an approved application.';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
select pass('Commerce and adoption hardening policies reject unauthorized mutations');
select * from finish();
rollback;
