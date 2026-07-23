-- Phase 3 messaging
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid references public.pets (id) on delete set null,
  application_id uuid references public.adoption_applications (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.user_profiles (id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.user_profiles (id) on delete cascade,
  body text not null,
  attachment_path text,
  read_at timestamptz,
  flagged boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_conversation_participant(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = cid and user_id = auth.uid()
  ) or public.is_staff();
$$;

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create policy "conversations_participants"
  on public.conversations for select
  using (public.is_conversation_participant(id));

create policy "conversations_insert_auth"
  on public.conversations for insert
  with check (auth.uid() is not null);

create policy "participants_read"
  on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id));

create policy "participants_insert"
  on public.conversation_participants for insert
  with check (user_id = auth.uid() or public.is_staff());

create policy "messages_participants"
  on public.messages for select
  using (public.is_conversation_participant(conversation_id));

create policy "messages_send"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );

create policy "messages_update_own_or_staff"
  on public.messages for update
  using (sender_id = auth.uid() or public.is_staff());
