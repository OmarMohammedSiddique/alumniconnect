-- Connection journey permissions (#107). Disposable rows, rolled back at the end.
begin;
insert into auth.users(id, email, raw_user_meta_data) values
 ('44400000-0000-0000-0000-000000000001','journey-mentor@example.test','{"role":"mentor","full_name":"Journey Mentor"}'),
 ('44400000-0000-0000-0000-000000000002','journey-mentee@example.test','{"role":"mentee","full_name":"Journey Mentee"}'),
 ('44400000-0000-0000-0000-000000000003','journey-other@example.test','{"role":"mentee","full_name":"Journey Outsider"}'),
 ('44400000-0000-0000-0000-000000000004','journey-staff@example.test','{"role":"mentee","full_name":"Journey Staff"}'),
 ('44400000-0000-0000-0000-000000000005','journey-mentee2@example.test','{"role":"mentee","full_name":"Journey Second Mentee"}');
update public.profiles set role = 'admin' where id = '44400000-0000-0000-0000-000000000004';
insert into public.mentorship_requests(id, mentor_id, mentee_id, status) values
 ('44400000-0000-0000-0000-000000000010','44400000-0000-0000-0000-000000000001','44400000-0000-0000-0000-000000000002','accepted');
insert into public.mentorship_requests(id, mentor_id, mentee_id, status) values
 ('44400000-0000-0000-0000-000000000011','44400000-0000-0000-0000-000000000001','44400000-0000-0000-0000-000000000005','accepted');
insert into public.connections(id, request_id, mentor_id, mentee_id) values
 ('44400000-0000-0000-0000-000000000020','44400000-0000-0000-0000-000000000010','44400000-0000-0000-0000-000000000001','44400000-0000-0000-0000-000000000002'),
 ('44400000-0000-0000-0000-000000000021','44400000-0000-0000-0000-000000000011','44400000-0000-0000-0000-000000000001','44400000-0000-0000-0000-000000000005');

-- TEST 0: signed-out callers cannot use the journey functions or read contacts.
do $$ begin
  if has_function_privilege('anon', 'public.set_first_conversation(uuid, boolean)', 'execute')
     or has_function_privilege('anon', 'public.is_connection_participant(uuid)', 'execute')
     or has_table_privilege('anon', 'public.connection_contacts', 'select')
     or has_table_privilege('anon', 'public.connection_contacts', 'insert') then
    raise exception 'FAIL 0: anon can reach the connection journey';
  end if;
end $$;

create function pg_temp.act_as(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

-- TEST 1: each participant shares their own contact, and both can read both.
set local role authenticated;
select pg_temp.act_as('44400000-0000-0000-0000-000000000002');
insert into public.connection_contacts(connection_id, user_id, contact)
values ('44400000-0000-0000-0000-000000000020', auth.uid(), '  mentee@example.test  ');
select pg_temp.act_as('44400000-0000-0000-0000-000000000001');
insert into public.connection_contacts(connection_id, user_id, contact)
values ('44400000-0000-0000-0000-000000000020', auth.uid(), 'https://meet.example.test/mentor');
do $$ begin
  if (select count(*) from public.connection_contacts) <> 2 then
    raise exception 'FAIL 1: mentor cannot read both shared contacts';
  end if;
  if not exists (select 1 from public.connection_contacts where contact = 'mentee@example.test') then
    raise exception 'FAIL 1: contact was not trimmed';
  end if;
end $$;

-- TEST 2: nobody can share a contact on someone else's behalf.
do $$ begin
  begin
    update public.connection_contacts set contact = 'hijacked@example.test'
     where user_id = '44400000-0000-0000-0000-000000000002';
    if exists (select 1 from public.connection_contacts where contact = 'hijacked@example.test') then
      raise exception 'FAIL 2: mentor changed the mentee contact';
    end if;
  end;
  -- The second mentee has no row yet, so only the policy can stop this.
  begin
    insert into public.connection_contacts(connection_id, user_id, contact)
    values ('44400000-0000-0000-0000-000000000021', '44400000-0000-0000-0000-000000000005', 'forged@example.test');
    raise exception 'FAIL 2: mentor inserted a contact for the mentee';
  exception when insufficient_privilege then null; end;
  delete from public.connection_contacts where user_id = '44400000-0000-0000-0000-000000000002';
  if not exists (select 1 from public.connection_contacts where user_id = '44400000-0000-0000-0000-000000000002') then
    raise exception 'FAIL 2: mentor deleted the mentee contact';
  end if;
  begin
    update public.connection_contacts set user_id = '44400000-0000-0000-0000-000000000005'
     where user_id = auth.uid();
    raise exception 'FAIL 2: mentor reassigned their contact to someone else';
  exception when insufficient_privilege then null; end;
  begin
    update public.connection_contacts set contact = E'disguised\u202emoc.live@x' where user_id = auth.uid();
    raise exception 'FAIL 2: hidden characters were stored';
  exception when check_violation then null; end;
end $$;

-- TEST 3: an outsider and staff cannot read or add contacts.
select pg_temp.act_as('44400000-0000-0000-0000-000000000003');
do $$ begin
  if exists (select 1 from public.connection_contacts) then
    raise exception 'FAIL 3: outsider read shared contacts';
  end if;
  begin
    insert into public.connection_contacts(connection_id, user_id, contact)
    values ('44400000-0000-0000-0000-000000000020', auth.uid(), 'outsider@example.test');
    raise exception 'FAIL 3: outsider shared a contact on a connection';
  exception when insufficient_privilege then null; end;
  begin
    perform public.set_first_conversation('44400000-0000-0000-0000-000000000020', true);
    raise exception 'FAIL 3: outsider marked the first conversation';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.act_as('44400000-0000-0000-0000-000000000004');
do $$ begin
  if not exists (select 1 from public.connections where id = '44400000-0000-0000-0000-000000000020') then
    raise exception 'FAIL 3: staff lost moderation read access to connections';
  end if;
  if exists (select 1 from public.connection_contacts) then
    raise exception 'FAIL 3: staff read shared contacts';
  end if;
end $$;

-- TEST 4: a participant records the first conversation; the time is the server's.
select pg_temp.act_as('44400000-0000-0000-0000-000000000002');
do $$
declare v timestamptz;
begin
  v := public.set_first_conversation('44400000-0000-0000-0000-000000000020', true);
  if v is null or v > now() + interval '1 second' then
    raise exception 'FAIL 4: first conversation not stamped by the server';
  end if;
  begin
    update public.connections set first_conversation_at = now() - interval '1 year';
    if exists (select 1 from public.connections where first_conversation_at < now() - interval '1 day') then
      raise exception 'FAIL 4: participant backdated the first conversation directly';
    end if;
  exception when insufficient_privilege then null; end;
  if public.set_first_conversation('44400000-0000-0000-0000-000000000020', false) is not null then
    raise exception 'FAIL 4: participant could not undo the marker';
  end if;
end $$;

-- TEST 5: blocking pauses contact access and journey changes for both people.
insert into public.blocks(blocker_id, blocked_id)
values ('44400000-0000-0000-0000-000000000002', '44400000-0000-0000-0000-000000000001');
select pg_temp.act_as('44400000-0000-0000-0000-000000000001');
do $$ begin
  if exists (select 1 from public.connection_contacts where user_id <> auth.uid()) then
    raise exception 'FAIL 5: blocked mentor still reads the mentee contact';
  end if;
  begin
    perform public.set_first_conversation('44400000-0000-0000-0000-000000000020', true);
    raise exception 'FAIL 5: blocked mentor changed the journey';
  exception when insufficient_privilege then null; end;
  update public.connection_contacts set contact = 'changed@example.test'
   where connection_id = '44400000-0000-0000-0000-000000000020' and user_id = auth.uid();
  if exists (select 1 from public.connection_contacts where contact = 'changed@example.test') then
    raise exception 'FAIL 5: blocked mentor updated their shared contact';
  end if;
end $$;

-- TEST 6: a member can always remove their own contact, even after blocking.
select pg_temp.act_as('44400000-0000-0000-0000-000000000002');
delete from public.connection_contacts where user_id = auth.uid();
reset role;
do $$ begin
  if exists (select 1 from public.connection_contacts where user_id = '44400000-0000-0000-0000-000000000002') then
    raise exception 'FAIL 6: member could not remove their own contact';
  end if;
end $$;

select 'ALL CONNECTION JOURNEY TESTS PASSED' as result;
rollback;
