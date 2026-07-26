-- SQL smoke tests for Phase 3 RLS helpers (current_app_user_id-based).
-- Style matches supabase/tests/hardening.sql (no pgtap dependency).

begin;

do $$
declare
  def text;
begin
  def := pg_get_functiondef('public.owns_pet(uuid)'::regprocedure);
  if def not like '%current_app_user_id%' then
    raise exception 'owns_pet should use current_app_user_id';
  end if;

  def := pg_get_functiondef('public.is_staff()'::regprocedure);
  if def not like '%current_app_user_id%' then
    raise exception 'is_staff should use current_app_user_id';
  end if;

  def := pg_get_functiondef('public.has_role(public.app_role)'::regprocedure);
  if def not like '%current_app_user_id%' then
    raise exception 'has_role should use current_app_user_id';
  end if;

  if to_regprocedure('public.create_checkout_order(uuid, jsonb)') is null then
    raise exception 'create_checkout_order is required';
  end if;

  if exists (
    select 1
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and (
        coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') like '%auth.uid()%'
        or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') like '%auth.uid()%'
      )
  ) then
    raise exception 'public policies must not reference auth.uid() directly after Phase 3';
  end if;
end $$;

rollback;
