-- Connection journey (#107): after a request is accepted, each person can share
-- a preferred contact detail with the other, and either person can record that
-- the first conversation has happened.

-- ---------------------------------------------------------------------------
-- 1. First conversation marker on the connection itself.
-- ---------------------------------------------------------------------------
alter table public.connections
  add column if not exists first_conversation_at timestamptz;

-- Connections have no direct UPDATE policy; this function is the only way a
-- participant changes the marker, and it always stamps the server clock.
create or replace function public.set_first_conversation(
  p_connection_id uuid,
  p_held boolean
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_connection public.connections%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into v_connection from public.connections where id = p_connection_id;
  if not found
     or auth.uid() not in (v_connection.mentee_id, v_connection.mentor_id) then
    raise exception 'Connection not found' using errcode = '42501';
  end if;

  if public.is_blocked_with(
       case when auth.uid() = v_connection.mentee_id
            then v_connection.mentor_id else v_connection.mentee_id end) then
    raise exception 'Connection unavailable' using errcode = '42501';
  end if;

  update public.connections
     set first_conversation_at = case
           when p_held then coalesce(first_conversation_at, now())
           else null end
   where id = p_connection_id
  returning first_conversation_at into v_connection.first_conversation_at;

  return v_connection.first_conversation_at;
end;
$$;

revoke execute on function public.set_first_conversation(uuid, boolean) from public, anon;
grant execute on function public.set_first_conversation(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Contact details a participant chooses to share with their connection.
--    Readable by the two participants only; staff moderation views of
--    connections deliberately do not include these details.
-- ---------------------------------------------------------------------------
create table if not exists public.connection_contacts (
  connection_id uuid not null references public.connections (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  contact text not null check (char_length(btrim(contact)) between 3 and 200),
  updated_at timestamptz not null default now(),
  primary key (connection_id, user_id)
);

alter table public.connection_contacts enable row level security;

-- True when the signed-in member is one of the two people in the connection
-- and neither has blocked the other.
create or replace function public.is_connection_participant(p_connection_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.connections c
    where c.id = p_connection_id
      and auth.uid() in (c.mentee_id, c.mentor_id)
      and not public.is_blocked_with(
        case when auth.uid() = c.mentee_id then c.mentor_id else c.mentee_id end)
  );
$$;

revoke execute on function public.is_connection_participant(uuid) from public, anon;
grant execute on function public.is_connection_participant(uuid) to authenticated;

drop policy if exists "connection_contacts: participants read" on public.connection_contacts;
-- Members always see their own row (so they can remove it after blocking);
-- the other person's row needs an active, unblocked connection.
create policy "connection_contacts: participants read"
  on public.connection_contacts for select to authenticated
  using (user_id = auth.uid() or public.is_connection_participant(connection_id));

drop policy if exists "connection_contacts: share own" on public.connection_contacts;
create policy "connection_contacts: share own"
  on public.connection_contacts for insert to authenticated
  with check (user_id = auth.uid() and public.is_connection_participant(connection_id));

drop policy if exists "connection_contacts: change own" on public.connection_contacts;
create policy "connection_contacts: change own"
  on public.connection_contacts for update to authenticated
  using (user_id = auth.uid() and public.is_connection_participant(connection_id))
  with check (user_id = auth.uid() and public.is_connection_participant(connection_id));

drop policy if exists "connection_contacts: remove own" on public.connection_contacts;
create policy "connection_contacts: remove own"
  on public.connection_contacts for delete to authenticated
  using (user_id = auth.uid());

-- Keep updated_at honest regardless of what the client sends.
create or replace function public.stamp_connection_contact()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.contact := btrim(new.contact);
  return new;
end;
$$;

drop trigger if exists stamp_connection_contact on public.connection_contacts;
create trigger stamp_connection_contact
  before insert or update on public.connection_contacts
  for each row execute function public.stamp_connection_contact();

grant select, insert, update, delete on public.connection_contacts to authenticated;
grant all on public.connection_contacts to service_role;
