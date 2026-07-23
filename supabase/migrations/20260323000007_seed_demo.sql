-- Optional demo seed (safe defaults; no private fundraising data)
insert into public.organizations (name, slug, description, is_verified)
values (
  '示範合法動保團體',
  'demo-org',
  '示範用合作團體，僅供開發環境導流測試。',
  true
)
on conflict (slug) do nothing;

insert into public.fundraising_authorizations (
  organization_id,
  project_name,
  permit_number,
  valid_from,
  valid_to,
  lookup_url,
  donation_page_url,
  is_active
)
select
  o.id,
  '示範公益專案',
  'DEMO-PERMIT-0001',
  current_date - 30,
  current_date + 335,
  'https://example.com/permit-lookup',
  'https://example.com/partner-donate',
  true
from public.organizations o
where o.slug = 'demo-org'
  and not exists (
    select 1 from public.fundraising_authorizations fa
    where fa.organization_id = o.id and fa.permit_number = 'DEMO-PERMIT-0001'
  );

insert into public.products (sku, name, description, category, price_cents, stock, is_active)
values
  ('FOOD-DOG-01', '犬用飼料 2kg', '指定物資商品（非捐款）', 'food', 45000, 100, true),
  ('LITTER-01', '豆腐貓砂 6L', '指定物資商品（非捐款）', 'supplies', 28000, 100, true)
on conflict (sku) do nothing;
