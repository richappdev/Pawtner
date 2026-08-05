begin;
select plan(1);

insert into public.user_profiles (id, email, display_name)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'locale@example.test', 'Locale Test');

do $$
declare
  stored_locale text;
begin
  select locale
  into stored_locale
  from public.user_profiles
  where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  if stored_locale <> 'zh-TW' then
    raise exception 'expected zh-TW default, got %', stored_locale;
  end if;

  begin
    update public.user_profiles
    set locale = 'en'
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    raise exception 'English locale unexpectedly passed the profile constraint';
  exception
    when check_violation then null;
  end;
end;
$$;

select pass('Profile locale defaults to and is constrained to zh-TW');
select * from finish();
rollback;
