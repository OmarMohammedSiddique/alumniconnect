-- #33: transactional, address-free notification ledger. No historical backfill.
create schema if not exists notification_internal;
revoke all on schema notification_internal from public, anon, authenticated;

create table public.email_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  requests boolean not null default true,
  connections boolean not null default true,
  matches boolean not null default true
);
alter table public.email_preferences enable row level security;
create policy "email preferences: own" on public.email_preferences
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke all on public.email_preferences from anon, authenticated;
grant select, insert, update on public.email_preferences to authenticated;
grant all on public.email_preferences to service_role;

create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  kind text not null check (kind in ('request_received','connection_accepted','request_declined','matches_ready')),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.mentorship_requests(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','processing','sent','skipped','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  provider_id text,
  last_error text,
  check ((kind = 'matches_ready') = (request_id is null))
);
alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from public, anon, authenticated;
grant all on public.email_outbox to service_role;
create index email_outbox_pending on public.email_outbox(available_at) where status in ('pending','processing');

-- Private, trigger-only definer is necessary: members cannot write the ledger.
create function notification_internal.queue_request_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'INSERT' and new.status = 'pending' then
    insert into public.email_outbox(event_key,kind,recipient_id,request_id)
    values ('request:' || new.id, 'request_received', new.mentor_id, new.id)
    on conflict (event_key) do nothing;
  elsif new.status = 'accepted' and old.status = 'pending' then
    insert into public.email_outbox(event_key,kind,recipient_id,request_id)
    values ('accepted:' || new.id || ':' || new.mentee_id, 'connection_accepted', new.mentee_id, new.id),
           ('accepted:' || new.id || ':' || new.mentor_id, 'connection_accepted', new.mentor_id, new.id)
    on conflict (event_key) do nothing;
  elsif new.status = 'declined' and old.status = 'pending' then
    insert into public.email_outbox(event_key,kind,recipient_id,request_id)
    values ('declined:' || new.id, 'request_declined', new.mentee_id, new.id)
    on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function notification_internal.queue_request_email() from public, anon, authenticated;
create trigger queue_request_email after insert or update of status on public.mentorship_requests
for each row execute function notification_internal.queue_request_email();

create function notification_internal.queue_match_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'mentee' and new.is_visible and new.embedding is not null
     and new.embedding::text is distinct from old.embedding::text
     and exists (select 1 from public.profiles p where p.role = 'mentor'
       and p.is_visible and p.accepting_requests and p.embedding is not null
       and not exists (select 1 from public.blocks b where
         (b.blocker_id = new.id and b.blocked_id = p.id) or
         (b.blocker_id = p.id and b.blocked_id = new.id))) then
    insert into public.email_outbox(event_key,kind,recipient_id)
    values ('matches:' || new.id || ':' || to_char(now() at time zone 'UTC','YYYY-MM-DD'), 'matches_ready', new.id)
    on conflict (event_key) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function notification_internal.queue_match_email() from public, anon, authenticated;
create trigger queue_match_email after update of embedding on public.profiles
for each row execute function notification_internal.queue_match_email();

-- Service-only invoker RPC: SKIP LOCKED prevents concurrent workers claiming a row.
-- A 5-minute lease permits crash recovery; a 20-hour event TTL stays within
-- Resend's 24-hour idempotency window, including retries after an uncertain send.
create function public.claim_email_events() returns setof public.email_outbox
language sql security invoker set search_path = '' as $$
  update public.email_outbox set status = 'processing', attempts = attempts + 1,
    available_at = now() + interval '5 minutes'
  where id in (select id from public.email_outbox
    where status in ('pending','processing') and available_at <= now()
      and attempts < 5 and created_at > now() - interval '20 hours'
    order by available_at limit 5 for update skip locked)
  returning *;
$$;
revoke all on function public.claim_email_events() from public, anon, authenticated;
grant execute on function public.claim_email_events() to service_role;

-- Recheck current privacy/state immediately before delivery. No profile content
-- is returned; emails use generic copy and protected in-app destinations.
create function public.email_event_is_eligible(p_event_id uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
select exists (
  select 1 from public.email_outbox e
  join public.profiles me on me.id = e.recipient_id
  left join public.email_preferences pref on pref.user_id = me.id
  left join public.mentorship_requests r on r.id = e.request_id
  where e.id = p_event_id and e.status = 'processing' and me.is_visible
    and case e.kind
      when 'matches_ready' then coalesce(pref.matches, true) and me.role = 'mentee'
        and me.embedding is not null and exists (
          select 1 from public.profiles p where p.role = 'mentor' and p.is_visible
          and p.accepting_requests and p.embedding is not null
          and not exists (select 1 from public.blocks b where
            (b.blocker_id = me.id and b.blocked_id = p.id) or
            (b.blocker_id = p.id and b.blocked_id = me.id)))
      else
        (case when e.kind = 'connection_accepted' then coalesce(pref.connections,true)
         else coalesce(pref.requests,true) end)
        and (me.id = r.mentee_id or me.id = r.mentor_id)
        and exists (select 1 from public.profiles p where
          p.id = case when me.id = r.mentee_id then r.mentor_id else r.mentee_id end and p.is_visible)
        and not exists (select 1 from public.blocks b where
          (b.blocker_id = r.mentee_id and b.blocked_id = r.mentor_id) or
          (b.blocker_id = r.mentor_id and b.blocked_id = r.mentee_id))
        and case e.kind
          when 'request_received' then r.status = 'pending' and me.id = r.mentor_id
          when 'request_declined' then r.status = 'declined' and me.id = r.mentee_id
          when 'connection_accepted' then r.status = 'accepted' and exists (
            select 1 from public.connections c where c.request_id = r.id)
          else false end
    end
);
$$;
revoke all on function public.email_event_is_eligible(uuid) from public, anon, authenticated;
grant execute on function public.email_event_is_eligible(uuid) to service_role;

-- Hashes only, shared across webhook/worker instances; no raw addresses stored.
create table public.email_suppressions (
  email_hash text primary key,
  created_at timestamptz not null default now()
);
alter table public.email_suppressions enable row level security;
revoke all on public.email_suppressions from public, anon, authenticated;
grant all on public.email_suppressions to service_role;
