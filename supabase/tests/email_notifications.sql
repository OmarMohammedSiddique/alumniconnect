-- Disposable fixtures, rolled back. Run after applying the notification migration.
begin;
insert into auth.users(id, email, raw_user_meta_data) values
 ('33000000-0000-0000-0000-000000000001','notification-mentee@example.test','{"role":"mentee","full_name":"Notification Mentee"}'),
 ('33000000-0000-0000-0000-000000000002','notification-mentor@example.test','{"role":"mentor","full_name":"Notification Mentor"}'),
 ('33000000-0000-0000-0000-000000000003','notification-other@example.test','{"role":"mentee","full_name":"Other"}');

-- New embeddings generate one daily recommendation event, not one per save.
update public.profiles set embedding = array_fill(0.05::real,array[384])::extensions.vector
where id = '33000000-0000-0000-0000-000000000002';
update public.profiles set embedding = array_fill(0.1::real,array[384])::extensions.vector
where id = '33000000-0000-0000-0000-000000000001';
update public.profiles set embedding = array_fill(0.2::real,array[384])::extensions.vector
where id = '33000000-0000-0000-0000-000000000001';
do $$ begin
 if (select count(*) from public.email_outbox where recipient_id = '33000000-0000-0000-0000-000000000001' and kind = 'matches_ready') <> 1 then raise exception 'Daily match cap failed'; end if;
end $$;

-- Failed/rolled-back actions cannot leave events.
savepoint failed_action;
insert into public.mentorship_requests(id,mentee_id,mentor_id) values
 ('33000000-0000-0000-0000-000000000010','33000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000002');
rollback to failed_action;
do $$ begin
 if exists(select 1 from public.email_outbox where request_id = '33000000-0000-0000-0000-000000000010') then raise exception 'Rolled back request left event'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
insert into public.mentorship_requests(id,mentee_id,mentor_id) values
 ('33000000-0000-0000-0000-000000000010','33000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000002');
-- Own preferences allowed; other-user preferences denied.
insert into public.email_preferences(user_id, matches) values ('33000000-0000-0000-0000-000000000001', false);
do $$ begin
 begin
  insert into public.email_preferences(user_id) values ('33000000-0000-0000-0000-000000000003');
  raise exception 'Cross-user preference write allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform * from public.claim_email_events();
  raise exception 'Member can claim queue';
 exception when insufficient_privilege then null; end;
 begin
  perform * from public.email_outbox;
  raise exception 'Member can read queue';
 exception when insufficient_privilege then null; end;
end $$;
reset role;

-- Claiming leases events and a second claim cannot duplicate them.
create temporary table claimed as select * from public.claim_email_events() where recipient_id in
 ('33000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000002');
do $$ begin
 if not exists(select 1 from public.email_outbox where request_id = '33000000-0000-0000-0000-000000000010' and kind = 'request_received' and recipient_id = '33000000-0000-0000-0000-000000000002') then raise exception 'Request recipient incorrect'; end if;
 if exists(select 1 from public.claim_email_events() e join claimed c on c.id=e.id) then raise exception 'Event claimed twice'; end if;
 if exists(select 1 from claimed where kind='matches_ready' and public.email_event_is_eligible(id)) then raise exception 'Opt-out ignored'; end if;
end $$;

-- Authorized acceptance creates a connection and exactly two notifications.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select public.respond_to_request('33000000-0000-0000-0000-000000000010',true);
reset role;
select * from public.claim_email_events();
do $$ begin
 if (select count(*) from public.email_outbox where request_id='33000000-0000-0000-0000-000000000010' and kind='connection_accepted') <> 2 then raise exception 'Acceptance must notify both participants'; end if;
 if exists(select 1 from public.email_outbox where request_id='33000000-0000-0000-0000-000000000010' and kind='request_received' and public.email_event_is_eligible(id)) then raise exception 'Stale pending event eligible'; end if;
 if (select count(*) from public.email_outbox where request_id='33000000-0000-0000-0000-000000000010' and kind='connection_accepted' and public.email_event_is_eligible(id)) <> 2 then raise exception 'Connection notifications ineligible'; end if;
end $$;
insert into public.blocks(blocker_id,blocked_id) values ('33000000-0000-0000-0000-000000000001','33000000-0000-0000-0000-000000000002');
do $$ begin
 if exists(select 1 from public.email_outbox where request_id='33000000-0000-0000-0000-000000000010' and public.email_event_is_eligible(id)) then raise exception 'Blocking did not suppress delivery'; end if;
end $$;
delete from public.blocks where blocker_id='33000000-0000-0000-0000-000000000001';
update public.profiles set is_visible=false where id='33000000-0000-0000-0000-000000000002';
do $$ begin
 if exists(select 1 from public.email_outbox where request_id='33000000-0000-0000-0000-000000000010' and public.email_event_is_eligible(id)) then raise exception 'Hidden participant did not suppress delivery'; end if;
 if has_function_privilege('anon','public.claim_email_events()','execute') or has_function_privilege('authenticated','public.email_event_is_eligible(uuid)','execute') then raise exception 'Public RPC exposure'; end if;
 if not has_function_privilege('service_role','public.claim_email_events()','execute') then raise exception 'Worker cannot claim'; end if;
end $$;
-- Decline and cancellation never create successful-connection notifications.
update public.profiles set is_visible=true where id='33000000-0000-0000-0000-000000000002';
insert into public.mentorship_requests(id,mentee_id,mentor_id) values
 ('33000000-0000-0000-0000-000000000011','33000000-0000-0000-0000-000000000003','33000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"33000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select public.respond_to_request('33000000-0000-0000-0000-000000000011',false);
reset role;
insert into public.mentorship_requests(id,mentee_id,mentor_id) values
 ('33000000-0000-0000-0000-000000000012','33000000-0000-0000-0000-000000000003','33000000-0000-0000-0000-000000000002');
update public.mentorship_requests set status='cancelled' where id='33000000-0000-0000-0000-000000000012';
set local role service_role;
select count(*) from public.claim_email_events();
do $$ begin
 if not exists(select 1 from public.email_outbox where request_id='33000000-0000-0000-0000-000000000011' and kind='request_declined' and recipient_id='33000000-0000-0000-0000-000000000003' and public.email_event_is_eligible(id)) then raise exception 'Decline recipient incorrect'; end if;
 if exists(select 1 from public.email_outbox where request_id='33000000-0000-0000-0000-000000000012' and public.email_event_is_eligible(id)) then raise exception 'Cancelled request eligible'; end if;
end $$;
-- Crashed worker lease can be reclaimed, preserving the event UUID/key.
update public.email_outbox set available_at=now()-interval '1 second' where request_id='33000000-0000-0000-0000-000000000011';
do $$ begin
 if not exists(select 1 from public.claim_email_events() where request_id='33000000-0000-0000-0000-000000000011' and attempts=2) then raise exception 'Lease recovery failed'; end if;
end $$;
reset role;
rollback;
