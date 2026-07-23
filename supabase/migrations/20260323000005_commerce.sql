-- Phase 5: materials commerce + legal org donation redirects (separate domains)
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  category text not null,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'TWD',
  supplier_name text,
  stock integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  foster_profile_id uuid not null references public.foster_profiles (id) on delete cascade,
  pet_id uuid references public.pets (id) on delete set null,
  title text not null,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity integer not null default 1 check (quantity > 0),
  notes text
);

create type public.order_status as enum (
  'pending_payment',
  'paid',
  'fulfilled',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references public.user_profiles (id),
  wishlist_id uuid references public.wishlists (id),
  foster_profile_id uuid references public.foster_profiles (id),
  pet_id uuid references public.pets (id),
  status public.order_status not null default 'pending_payment',
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'TWD',
  payment_provider text,
  payment_ref text,
  receipt_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0)
);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  carrier text,
  tracking_number text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  status text not null default 'pending'
);

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

-- Legal org donation redirects ONLY — no private fundraising amounts/progress
create table public.fundraising_authorizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_name text not null,
  permit_number text not null,
  valid_from date not null,
  valid_to date not null,
  lookup_url text not null,
  donation_page_url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.shipments enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.fundraising_authorizations enable row level security;

create policy "products_public_read"
  on public.products for select using (is_active or public.is_staff());

create policy "products_staff_write"
  on public.products for all using (public.is_staff()) with check (public.is_staff());

create policy "wishlists_public_or_owner"
  on public.wishlists for select
  using (
    is_public
    or exists (select 1 from public.foster_profiles fp where fp.id = foster_profile_id and fp.user_id = auth.uid())
    or public.is_staff()
  );

create policy "wishlists_foster_write"
  on public.wishlists for all
  using (
    exists (select 1 from public.foster_profiles fp where fp.id = foster_profile_id and fp.user_id = auth.uid())
    or public.is_staff()
  )
  with check (
    exists (select 1 from public.foster_profiles fp where fp.id = foster_profile_id and fp.user_id = auth.uid())
    or public.is_staff()
  );

create policy "wishlist_items_via_list"
  on public.wishlist_items for all
  using (
    exists (
      select 1 from public.wishlists w
      join public.foster_profiles fp on fp.id = w.foster_profile_id
      where w.id = wishlist_id and (w.is_public or fp.user_id = auth.uid() or public.is_staff())
    )
  )
  with check (
    exists (
      select 1 from public.wishlists w
      join public.foster_profiles fp on fp.id = w.foster_profile_id
      where w.id = wishlist_id and (fp.user_id = auth.uid() or public.is_staff())
    )
  );

create policy "orders_buyer_or_staff"
  on public.orders for select
  using (buyer_user_id = auth.uid() or public.is_staff());

create policy "orders_buyer_insert"
  on public.orders for insert
  with check (buyer_user_id = auth.uid());

create policy "orders_update_buyer_or_staff"
  on public.orders for update
  using (buyer_user_id = auth.uid() or public.is_staff());

create policy "order_items_via_order"
  on public.order_items for select
  using (
    exists (select 1 from public.orders o where o.id = order_id and (o.buyer_user_id = auth.uid() or public.is_staff()))
  );

create policy "shipments_via_order"
  on public.shipments for select
  using (
    exists (select 1 from public.orders o where o.id = order_id and (o.buyer_user_id = auth.uid() or public.is_staff()))
  );

create policy "webhooks_staff_only"
  on public.payment_webhook_events for all
  using (public.is_staff()) with check (public.is_staff());

create policy "fundraising_public_active"
  on public.fundraising_authorizations for select
  using (is_active or public.is_staff());

create policy "fundraising_staff_write"
  on public.fundraising_authorizations for all
  using (public.is_staff()) with check (public.is_staff());
