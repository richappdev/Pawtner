update public.user_profiles
set locale = 'zh-TW'
where locale not in ('zh-TW', 'en');

alter table public.user_profiles
  drop constraint if exists user_profiles_locale_check;

alter table public.user_profiles
  add constraint user_profiles_locale_check
  check (locale in ('zh-TW', 'en'));
