-- #33: explicit reminder consent, no existing-member or historical-request backfill.
alter table public.email_preferences
  add column reminders boolean not null default false,
  add column reminders_enabled_at timestamptz;

-- The database owns the consent time, including direct authenticated API writes.
create function notification_internal.stamp_reminder_consent() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not new.reminders then
    new.reminders_enabled_at := null;
  elsif TG_OP = 'INSERT' then
    new.reminders_enabled_at := statement_timestamp();
  elsif not old.reminders then
    new.reminders_enabled_at := statement_timestamp();
  else
    new.reminders_enabled_at := old.reminders_enabled_at;
  end if;
  return new;
end;
$$;
revoke all on function notification_internal.stamp_reminder_consent() from public, anon, authenticated;
create trigger stamp_reminder_consent before insert or update on public.email_preferences
for each row execute function notification_internal.stamp_reminder_consent();

alter table public.email_outbox drop constraint email_outbox_kind_check;
alter table public.email_outbox add constraint email_outbox_kind_check
  check (kind in ('request_received','connection_accepted','request_declined','matches_ready','request_reminder'));
-- A separate timestamp measures provider acceptance, not observed inbox arrival.
alter table public.email_outbox add column sent_at timestamptz;
create function notification_internal.stamp_email_sent() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'sent' and old.status <> 'sent' then
    new.sent_at := statement_timestamp();
  else
    new.sent_at := old.sent_at;
  end if;
  return new;
end;
$$;
revoke all on function notification_internal.stamp_email_sent() from public, anon, authenticated;
create trigger stamp_email_sent before update on public.email_outbox
for each row execute function notification_internal.stamp_email_sent();
create index email_outbox_reminder_recipient on public.email_outbox(recipient_id, created_at, sent_at)
  where kind = 'request_reminder';
create index mentorship_pending_reminder_age on public.mentorship_requests(created_at, mentor_id)
  where status = 'pending';

-- Shared generation/delivery predicate. Service-only, no private content returned.
create function notification_internal.reminder_is_eligible(p_request_id uuid, p_recipient_id uuid)
returns boolean language sql stable security invoker set search_path = '' as $$
  select exists (
    select 1 from public.mentorship_requests r
    join public.email_preferences pref on pref.user_id = r.mentor_id
    join public.profiles mentor on mentor.id = r.mentor_id
    join public.profiles mentee on mentee.id = r.mentee_id
    where r.id = p_request_id and r.mentor_id = p_recipient_id
      and r.status = 'pending' and r.created_at <= now() - interval '3 days'
      and r.created_at > now() - interval '7 days'
      and pref.reminders and r.created_at >= pref.reminders_enabled_at
      and mentor.role = 'mentor' and mentor.is_visible and mentor.accepting_requests
      and mentee.role = 'mentee' and mentee.is_visible
      and not exists (select 1 from public.blocks b where
        (b.blocker_id = r.mentee_id and b.blocked_id = r.mentor_id) or
        (b.blocker_id = r.mentor_id and b.blocked_id = r.mentee_id))
  );
$$;
revoke all on function notification_internal.reminder_is_eligible(uuid, uuid) from public, anon, authenticated;
grant usage on schema notification_internal to service_role;
grant execute on function notification_internal.reminder_is_eligible(uuid, uuid) to service_role;

-- Serialize scheduler calls so different requests cannot bypass a recipient cap.
create function public.enqueue_request_reminders() returns integer
language plpgsql security invoker set search_path = '' as $$
declare queued integer;
begin
  perform pg_advisory_xact_lock(330033);
  insert into public.email_outbox(event_key, kind, recipient_id, request_id)
  select 'reminder:' || due.id, 'request_reminder', due.mentor_id, due.id
  from (
    select distinct on (r.mentor_id) r.id, r.mentor_id
    from public.mentorship_requests r
    where r.status = 'pending' and r.created_at <= now() - interval '3 days'
      and r.created_at > now() - interval '7 days'
      and notification_internal.reminder_is_eligible(r.id, r.mentor_id)
      and not exists (select 1 from public.email_outbox e where e.event_key = 'reminder:' || r.id)
      and not exists (select 1 from public.email_outbox e
        where e.recipient_id = r.mentor_id and e.kind = 'request_reminder'
          and (e.created_at > now() - interval '7 days'
            or e.sent_at > now() - interval '7 days'
            or e.status in ('pending','processing')))
    order by r.mentor_id, r.created_at, r.id
    limit 100
  ) due
  on conflict (event_key) do nothing;
  get diagnostics queued = row_count;
  return queued;
end;
$$;
revoke all on function public.enqueue_request_reminders() from public, anon, authenticated;
grant execute on function public.enqueue_request_reminders() to service_role;

create or replace function public.email_event_is_eligible(p_event_id uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
select exists (
  select 1 from public.email_outbox e
  join public.profiles me on me.id = e.recipient_id
  left join public.email_preferences pref on pref.user_id = me.id
  left join public.mentorship_requests r on r.id = e.request_id
  where e.id = p_event_id and e.status = 'processing' and me.is_visible
    and case e.kind
      when 'request_reminder' then notification_internal.reminder_is_eligible(e.request_id, e.recipient_id)
        and e.created_at >= pref.reminders_enabled_at
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
