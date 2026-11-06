-- Disposable reminder lifecycle and authorization checks. No provider calls.
begin;
insert into auth.users(id, email, raw_user_meta_data) values
 ('33300000-0000-0000-0000-000000000001','reminder-mentor@example.test','{"role":"mentor","full_name":"Reminder Mentor"}'),
 ('33300000-0000-0000-0000-000000000002','reminder-mentee@example.test','{"role":"mentee","full_name":"Reminder Mentee"}'),
 ('33300000-0000-0000-0000-000000000003','reminder-other@example.test','{"role":"mentee","full_name":"Reminder Other"}');
insert into public.mentorship_requests(id,mentor_id,mentee_id,created_at) values
 ('33300000-0000-0000-0000-000000000010','33300000-0000-0000-0000-000000000001','33300000-0000-0000-0000-000000000002',now()-interval '3 days'),
 ('33300000-0000-0000-0000-000000000011','33300000-0000-0000-0000-000000000001','33300000-0000-0000-0000-000000000003',now()-interval '3 days');
-- Missing preferences and default-off rows never schedule reminders.
do $$ begin
 if public.enqueue_request_reminders() <> 0 then raise exception 'Missing consent ignored'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33300000-0000-0000-0000-000000000001","role":"authenticated"}',true);
insert into public.email_preferences(user_id) values ('33300000-0000-0000-0000-000000000001');
do $$ begin
 if exists(select 1 from public.email_preferences where reminders or reminders_enabled_at is not null) then raise exception 'Reminders not default off'; end if;
 begin
  perform public.enqueue_request_reminders();
  raise exception 'Member can schedule';
 exception when insufficient_privilege then null; end;
 begin
  perform notification_internal.reminder_is_eligible('33300000-0000-0000-0000-000000000010','33300000-0000-0000-0000-000000000001');
  raise exception 'Member can inspect reminder eligibility';
 exception when insufficient_privilege then null; end;
 -- Identity cannot be reassigned through an update.
 begin
  update public.email_preferences set user_id='33300000-0000-0000-0000-000000000003';
  raise exception 'Preference ownership changed';
 exception when insufficient_privilege then null; end;
end $$;
update public.email_preferences set reminders=true, reminders_enabled_at=now()-interval '1 year';
do $$ begin
 if not exists(select 1 from public.email_preferences where reminders_enabled_at >= now() and reminders_enabled_at <= clock_timestamp()) then raise exception 'Consent timestamp spoofed'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ begin
 if public.enqueue_request_reminders() <> 0 then raise exception 'Historical requests backfilled'; end if;
end $$;
-- Simulate consent given four days ago, without changing the production clock.
alter table public.email_preferences disable trigger stamp_reminder_consent;
update public.email_preferences set reminders_enabled_at=now()-interval '4 days'
where user_id='33300000-0000-0000-0000-000000000001';
alter table public.email_preferences enable trigger stamp_reminder_consent;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33300000-0000-0000-0000-000000000001","role":"authenticated"}',true);
update public.email_preferences set reminders_enabled_at=now()-interval '1 year';
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ begin
 if not exists(select 1 from public.email_preferences where user_id='33300000-0000-0000-0000-000000000001' and reminders_enabled_at=now()-interval '4 days') then raise exception 'Existing consent timestamp changed'; end if;
end $$;
-- Check age window, visibility, availability, blocking and role eligibility before enqueue.
savepoint eligible;
update public.mentorship_requests set created_at=now()-interval '2 days';
do $$ begin if public.enqueue_request_reminders() <> 0 then raise exception 'Early reminder'; end if; end $$;
rollback to eligible;
update public.mentorship_requests set created_at=now()-interval '7 days';
do $$ begin if public.enqueue_request_reminders() <> 0 then raise exception 'Stale reminder'; end if; end $$;
rollback to eligible;
update public.profiles set accepting_requests=false where id='33300000-0000-0000-0000-000000000001';
do $$ begin if public.enqueue_request_reminders() <> 0 then raise exception 'Unavailable Mentor reminded'; end if; end $$;
rollback to eligible;
update public.profiles set is_visible=false where id='33300000-0000-0000-0000-000000000001';
do $$ begin if public.enqueue_request_reminders() <> 0 then raise exception 'Hidden Mentor reminded'; end if; end $$;
rollback to eligible;
insert into public.blocks(blocker_id,blocked_id) values
 ('33300000-0000-0000-0000-000000000001','33300000-0000-0000-0000-000000000002'),
 ('33300000-0000-0000-0000-000000000003','33300000-0000-0000-0000-000000000001');
do $$ begin if public.enqueue_request_reminders() <> 0 then raise exception 'Blocked request reminded'; end if; end $$;
rollback to eligible;
set local role service_role;
do $$ begin
 if public.enqueue_request_reminders() <> 1 then raise exception 'Expected one reminder for Mentor with two due requests'; end if;
 if public.enqueue_request_reminders() <> 0 then raise exception 'Repeated scheduler bypassed recipient cap'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
update public.email_outbox set status='processing', attempts=1 where kind='request_reminder';
do $$ begin
 if (select count(*) from public.email_outbox where kind='request_reminder' and public.email_event_is_eligible(id)) <> 1 then raise exception 'Due reminder not eligible'; end if;
end $$;
savepoint queued;
-- Consent withdrawal invalidates an already claimed event immediately.
update public.email_preferences set reminders=false where user_id='33300000-0000-0000-0000-000000000001';
do $$ begin
 if exists(select 1 from public.email_outbox where kind='request_reminder' and public.email_event_is_eligible(id)) then raise exception 'Unsubscribe ignored'; end if;
end $$;
update public.email_preferences set reminders=true where user_id='33300000-0000-0000-0000-000000000001';
do $$ begin
 if exists(select 1 from public.email_outbox where kind='request_reminder' and public.email_event_is_eligible(id)) then raise exception 'Reconsent revived old reminder'; end if;
end $$;
rollback to queued;
-- All terminal request states invalidate already queued reminders.
do $$ declare state public.request_status; begin
 foreach state in array array['accepted','declined','cancelled']::public.request_status[] loop
  update public.mentorship_requests set status=state;
  if exists(select 1 from public.email_outbox where kind='request_reminder' and public.email_event_is_eligible(id)) then raise exception 'Terminal request reminded: %',state; end if;
 end loop;
end $$;
rollback to queued;
update public.mentorship_requests set created_at=now()-interval '7 days';
do $$ begin
 if exists(select 1 from public.email_outbox where kind='request_reminder' and public.email_event_is_eligible(id)) then raise exception 'Delayed stale reminder eligible'; end if;
end $$;
rollback to queued;
update public.profiles set is_visible=false where id in ('33300000-0000-0000-0000-000000000002','33300000-0000-0000-0000-000000000003');
do $$ begin
 if exists(select 1 from public.email_outbox where kind='request_reminder' and public.email_event_is_eligible(id)) then raise exception 'Hidden sender leaked reminder'; end if;
end $$;
rollback to queued;
insert into public.blocks(blocker_id,blocked_id) values
 ('33300000-0000-0000-0000-000000000001','33300000-0000-0000-0000-000000000002'),
 ('33300000-0000-0000-0000-000000000001','33300000-0000-0000-0000-000000000003');
do $$ begin
 if exists(select 1 from public.email_outbox where kind='request_reminder' and public.email_event_is_eligible(id)) then raise exception 'Delivery-time block ignored'; end if;
end $$;
rollback to queued;
-- Terminal outcomes still occupy a weekly slot; no retry via a new event UUID.
update public.email_outbox set status='failed' where kind='request_reminder';
do $$ begin if public.enqueue_request_reminders() <> 0 then raise exception 'Failure bypassed weekly cap'; end if; end $$;
-- Old queued timestamp with a recent send must still honor the delivery cap.
update public.email_outbox set status='sent',created_at=now()-interval '8 days' where kind='request_reminder';
do $$ begin
 if public.enqueue_request_reminders() <> 0 then raise exception 'Recent send bypassed weekly cap'; end if;
 if exists(select 1 from public.email_outbox where kind='request_reminder' and sent_at is null) then raise exception 'Provider acceptance timestamp missing'; end if;
 if has_function_privilege('anon','public.enqueue_request_reminders()','execute') or has_function_privilege('authenticated','public.enqueue_request_reminders()','execute') then raise exception 'Scheduler publicly exposed'; end if;
end $$;
rollback;
