begin;
select plan(5);

select has_table('public', 'pilot_invitations', 'pilot invitations table exists');
select has_table('public', 'pet_review_events', 'pet review history exists');
select has_table('public', 'notifications', 'notifications table exists');
select has_function(
  'public',
  'review_pet',
  array['uuid', 'text', 'text'],
  'transactional pet review RPC exists'
);
select ok(
  not has_function_privilege('anon', 'public.review_pet(uuid,text,text)', 'execute'),
  'anonymous users cannot execute pet review'
);

select * from finish();
rollback;
