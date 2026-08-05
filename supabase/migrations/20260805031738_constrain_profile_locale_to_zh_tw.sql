update public.user_profiles
set locale = 'zh-TW'
where locale <> 'zh-TW';

alter table public.user_profiles
  alter column locale set default 'zh-TW',
  alter column locale set not null,
  drop constraint if exists user_profiles_locale_check;

alter table public.user_profiles
  add constraint user_profiles_locale_check
  check (locale = 'zh-TW');
