create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated, service_role;

create or replace function app_private.ensure_moa_pet_sync_cron(
  p_force boolean default false
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  existing_job record;
begin
  if not p_force and not (
    exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'moa_sync_secret')
  ) then
    return false;
  end if;

  for existing_job in
    select jobid
    from cron.job
    where jobname = 'pawtner-moa-pet-sync'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;

  perform cron.schedule(
    'pawtner-moa-pet-sync',
    '30 10 * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
          || '/functions/v1/sync-moa-pets',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'moa_sync_secret')
        ),
        body := '{"trigger":"cron"}'::jsonb,
        timeout_milliseconds := 300000
      );
    $job$
  );

  return true;
end;
$function$;

revoke all on function app_private.ensure_moa_pet_sync_cron(boolean)
  from public, anon, authenticated, service_role;

do $migration$
begin
  perform app_private.ensure_moa_pet_sync_cron(false);
end;
$migration$;
