-- AlumniKonneQt - RLS test suite (Sprint 1).
-- Run with: psql <local db url> -v ON_ERROR_STOP=1 -f supabase/tests/rls_tests.sql
-- Impersonates each role by setting the JWT claims RLS policies read.
-- Every scenario raises an exception (failing the run) if a policy misbehaves.

begin;

-- Seed users directly in auth.users; the on_auth_user_created trigger builds profiles.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mentee@test.local',  '{"role":"mentee","full_name":"Mia Mentee"}',   now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mentor@test.local',  '{"role":"mentor","full_name":"Max Mentor"}',   now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mentor2@test.local', '{"role":"mentor","full_name":"Nina Mentor"}',  now(), now()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mod@test.local',     '{"role":"moderator","full_name":"Moe Mod"}',   now(), now()),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local',   '{"role":"admin","full_name":"Ada Admin"}',     now(), now()),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'evil@test.local',    '{"role":"mentee","full_name":"Eve Attacker"}', now(), now());

-- TEST 0: sign-up metadata cannot self-assign staff roles (clamped to mentee).
do $$ begin
  if (select role from public.profiles where id = '00000000-0000-0000-0000-000000000004') <> 'mentee' then
    raise exception 'FAIL 0: moderator self-assignment was not clamped';
  end if;
  if (select role from public.profiles where id = '00000000-0000-0000-0000-000000000005') <> 'mentee' then
    raise exception 'FAIL 0: admin self-assignment was not clamped';
  end if;
end $$;

-- Promote staff the legitimate way (superuser/service context).
update public.profiles set role = 'moderator' where id = '00000000-0000-0000-0000-000000000004';
update public.profiles set role = 'admin'     where id = '00000000-0000-0000-0000-000000000005';
-- Hide one mentor to test visibility.
update public.profiles set is_visible = false where id = '00000000-0000-0000-0000-000000000003';

-- Helper to impersonate a user for the rest of the transaction block.
create or replace function pg_temp.impersonate(uid text)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.reset_role()
returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- ---------------------------------------------------------------------------
-- TEST 1: mentee sees visible profiles but not the hidden mentor.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
do $$ begin
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000003') then
    raise exception 'FAIL 1: mentee can see a hidden profile';
  end if;
  if not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000002') then
    raise exception 'FAIL 1: mentee cannot see a visible mentor';
  end if;
end $$;

-- TEST 2: hidden mentor can still see their own profile.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
do $$ begin
  if not exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'FAIL 2: hidden user cannot see own profile';
  end if;
end $$;

-- TEST 3: moderator sees hidden profiles.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000004');
do $$ begin
  if not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000003') then
    raise exception 'FAIL 3: moderator cannot see hidden profile';
  end if;
end $$;

-- TEST 4: user can update own bio, but NOT another user's profile.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
update public.profiles set bio = 'Aspiring data engineer' where id = auth.uid();
do $$ begin
  if (select bio from public.profiles where id = auth.uid()) <> 'Aspiring data engineer' then
    raise exception 'FAIL 4: user could not update own bio';
  end if;
end $$;
update public.profiles set bio = 'hacked' where id = '00000000-0000-0000-0000-000000000002';
select pg_temp.reset_role();
do $$ begin
  if (select bio from public.profiles where id = '00000000-0000-0000-0000-000000000002') = 'hacked' then
    raise exception 'FAIL 4: user updated someone else''s profile';
  end if;
end $$;

-- TEST 5: privilege escalation blocked - mentee cannot change own role.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
do $$ begin
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'FAIL 5: mentee changed own role to admin';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if; -- expected: trigger rejects
  end;
end $$;

-- TEST 6: embedding writes blocked for normal users (server-side only).
do $$ begin
  begin
    update public.profiles set embedding = array_fill(0.1, array[384])::extensions.vector(384)
      where id = auth.uid();
    raise exception 'FAIL 6: client wrote an embedding';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if; -- expected: trigger rejects
  end;
end $$;

-- TEST 7: member self-service visibility vs staff moderation priority.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
-- Mentee can hide own profile:
update public.profiles set member_visible = false where id = auth.uid();
do $$ begin
  if (select is_visible from public.profiles where id = auth.uid()) is not false then
    raise exception 'FAIL 7: setting member_visible=false did not make is_visible false';
  end if;
end $$;
-- Mentee can restore own profile visibility:
update public.profiles set member_visible = true where id = auth.uid();
do $$ begin
  if (select is_visible from public.profiles where id = auth.uid()) is not true then
    raise exception 'FAIL 7: setting member_visible=true did not make is_visible true';
  end if;
end $$;
-- Mentee cannot tamper with staff_hidden moderation flag:
do $$ begin
  begin
    update public.profiles set staff_hidden = true where id = auth.uid();
    raise exception 'FAIL 7: mentee altered staff_hidden';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
select pg_temp.reset_role();
-- Staff moderates mentee profile:
select pg_temp.impersonate('00000000-0000-0000-0000-000000000004');
update public.profiles set is_visible = false where id = '00000000-0000-0000-0000-000000000006';
select pg_temp.reset_role();
-- Mentee attempts to toggle member_visible = true while staff-hidden:
select pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
update public.profiles set member_visible = true where id = auth.uid();
do $$ begin
  if (select is_visible from public.profiles where id = auth.uid()) is not false then
    raise exception 'FAIL 7: member visibility preference overrode staff moderation';
  end if;
  if (select staff_hidden from public.profiles where id = auth.uid()) is not true then
    raise exception 'FAIL 7: staff_hidden was unexpectedly cleared';
  end if;
end $$;
select pg_temp.reset_role();
-- Staff un-moderates mentee:
select pg_temp.impersonate('00000000-0000-0000-0000-000000000004');
update public.profiles set is_visible = true where id = '00000000-0000-0000-0000-000000000006';
select pg_temp.reset_role();
do $$ begin
  if (select is_visible from public.profiles where id = '00000000-0000-0000-0000-000000000006') is not true then
    raise exception 'FAIL 7: unhiding by staff did not restore profile visibility';
  end if;
end $$;
select pg_temp.reset_role();

-- TEST 8: moderator CAN toggle visibility; admin CAN change roles.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000004');
update public.profiles set is_visible = true where id = '00000000-0000-0000-0000-000000000003';
select pg_temp.reset_role();
do $$ begin
  if not (select is_visible from public.profiles where id = '00000000-0000-0000-0000-000000000003') then
    raise exception 'FAIL 8: moderator could not toggle visibility';
  end if;
end $$;
-- TEST 8b: moderator cannot edit another user's content fields.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000004');
do $$ begin
  begin
    update public.profiles set bio = 'moderator overreach'
      where id = '00000000-0000-0000-0000-000000000001';
    raise exception 'FAIL 8b: moderator edited another profile''s bio';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
select pg_temp.reset_role();
select pg_temp.impersonate('00000000-0000-0000-0000-000000000005');
update public.profiles set role = 'mentor' where id = '00000000-0000-0000-0000-000000000006';
select pg_temp.reset_role();
do $$ begin
  if (select role from public.profiles where id = '00000000-0000-0000-0000-000000000006') <> 'mentor' then
    raise exception 'FAIL 8: admin could not change a role';
  end if;
end $$;
-- put Eve back to mentee for later tests
update public.profiles set role = 'mentee' where id = '00000000-0000-0000-0000-000000000006';

-- TEST 8c: outcomes the admin page relies on (#22). The app maps these exact
-- trigger messages to a permission denial and treats zero affected rows as a
-- stale or inaccessible target rather than success.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000004');
do $$ begin
  begin
    update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000006';
    raise exception 'FAIL 8c: moderator changed a role';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
    if sqlerrm <> 'only admins can change roles' then
      raise exception 'FAIL 8c: unexpected moderator role error: %', sqlerrm;
    end if;
  end;
end $$;
select pg_temp.reset_role();
select pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
do $$
declare affected integer;
begin
  update public.profiles set is_visible = false where id = '00000000-0000-0000-0000-000000000002';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL 8c: member changed another profile''s visibility';
  end if;
end $$;
select pg_temp.reset_role();
select pg_temp.impersonate('00000000-0000-0000-0000-000000000005');
do $$
declare affected integer;
begin
  update public.profiles set role = 'mentor' where id = '00000000-0000-0000-0000-0000000000ff';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'FAIL 8c: update of a missing profile reported affected rows';
  end if;
end $$;
select pg_temp.reset_role();
do $$ begin
  if (select is_visible from public.profiles where id = '00000000-0000-0000-0000-000000000002') is not true then
    raise exception 'FAIL 8c: rejected visibility change mutated data';
  end if;
  if (select role from public.profiles where id = '00000000-0000-0000-0000-000000000006') <> 'mentee' then
    raise exception 'FAIL 8c: rejected role change mutated data';
  end if;
  if not exists (
    select 1 from public.audit_logs
    where action = 'role_changed'
      and actor_id = '00000000-0000-0000-0000-000000000005'
      and target_id = '00000000-0000-0000-0000-000000000006'
      and detail ->> 'to' = 'mentor'
  ) then
    raise exception 'FAIL 8c: admin role change was not audited';
  end if;
end $$;

-- TEST 9: mentee creates a request to a mentor; cannot forge mentee_id;
-- cannot request a non-mentor.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
insert into public.mentorship_requests (mentee_id, mentor_id, message)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Please mentor me');
select set_config('test.request_id', (select id::text from public.mentorship_requests
  where mentee_id = auth.uid() and status = 'pending'), true);
do $$ begin
  begin
    insert into public.mentorship_requests (mentee_id, mentor_id, message)
    values ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', 'forged');
    raise exception 'FAIL 9: mentee forged another mentee_id';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  begin
    insert into public.mentorship_requests (mentee_id, mentor_id, message)
    values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'not a mentor');
    raise exception 'FAIL 9: request created to a non-mentor';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- TEST 10: request visibility - parties yes, third parties no.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
do $$ begin
  if not exists (select 1 from public.mentorship_requests where mentor_id = auth.uid()) then
    raise exception 'FAIL 10: mentor cannot see incoming request';
  end if;
end $$;
select pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
do $$ begin
  if exists (select 1 from public.mentorship_requests) then
    raise exception 'FAIL 10: third party can see others'' requests';
  end if;
end $$;

-- TEST 11: only the recipient mentor can accept; accept creates connection.
-- Use a known request ID so this exercises authorization rather than an empty
-- RLS-filtered subquery. Anonymous and missing-subject contexts must fail too.
select pg_temp.reset_role();
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin
    perform public.respond_to_request(current_setting('test.request_id')::uuid, true);
    raise exception 'FAIL 11a: anonymous caller accepted a known request';
  exception when insufficient_privilege then null;
  end;
end $$;
select pg_temp.reset_role();
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
do $$ begin
  begin
    perform public.respond_to_request(current_setting('test.request_id')::uuid, false);
    raise exception 'FAIL 11b: caller without a subject declined a known request';
  exception when insufficient_privilege then null;
  end;
end $$;
select pg_temp.reset_role();
do $$ begin
  if (select status from public.mentorship_requests
      where id = current_setting('test.request_id')::uuid) <> 'pending'
     or exists (select 1 from public.connections
                where request_id = current_setting('test.request_id')::uuid) then
    raise exception 'FAIL 11: unauthorized response changed the request or connections';
  end if;
end $$;
select pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
do $$ begin
  begin
    perform public.respond_to_request(
      current_setting('test.request_id')::uuid, true);
    raise exception 'FAIL 11: non-recipient responded to request';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
select pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
select public.respond_to_request(
  (select id from public.mentorship_requests where mentor_id = auth.uid()), true);
do $$ begin
  if not exists (select 1 from public.connections
                 where mentor_id = auth.uid()
                   and mentee_id = '00000000-0000-0000-0000-000000000001') then
    raise exception 'FAIL 11: accept did not create connection';
  end if;
end $$;

-- TEST 12: connection visible to parties, hidden from third parties;
-- direct inserts into connections are blocked.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
do $$ begin
  if exists (select 1 from public.connections) then
    raise exception 'FAIL 12: third party sees others'' connections';
  end if;
  begin
    insert into public.connections (request_id, mentee_id, mentor_id)
    values ((select id from public.mentorship_requests limit 1),
            '00000000-0000-0000-0000-000000000006',
            '00000000-0000-0000-0000-000000000002');
    raise exception 'FAIL 12: direct connection insert allowed';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
select pg_temp.reset_role();

-- TEST 13: match_mentors returns visible mentors ranked by cosine similarity.
update public.profiles set embedding = (
  select array_agg(case when i = 1 then 1.0 else 0.0 end)::extensions.vector(384)
  from generate_series(1, 384) i) where id = '00000000-0000-0000-0000-000000000002';
update public.profiles set embedding = (
  select array_agg(case when i = 2 then 1.0 else 0.0 end)::extensions.vector(384)
  from generate_series(1, 384) i) where id = '00000000-0000-0000-0000-000000000003';
select pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
do $$
declare
  top uuid;
  sim float;
begin
  select id, similarity into top, sim from public.match_mentors(
    (select array_agg(case when i = 1 then 1.0 else 0.0 end)::extensions.vector(384)
     from generate_series(1, 384) i), 5) limit 1;
  if top <> '00000000-0000-0000-0000-000000000002' then
    raise exception 'FAIL 13: wrong top match';
  end if;
  if abs(sim - 1.0) > 0.001 then
    raise exception 'FAIL 13: identical vectors should have similarity ~1, got %', sim;
  end if;
end $$;
select pg_temp.reset_role();

-- TEST 14: full-text search over profile fields works.
update public.profiles set skills = '{Python,"Machine Learning"}' where id = '00000000-0000-0000-0000-000000000002';
do $$ begin
  if not exists (select 1 from public.profiles
                 where fts @@ websearch_to_tsquery('english', 'machine learning')) then
    raise exception 'FAIL 14: full-text search found nothing';
  end if;
end $$;

-- TEST 15: audit trail exists for role/visibility/request events;
-- readable by staff, invisible to regular users, not writable by clients.
do $$ begin
  if not exists (select 1 from public.audit_logs where action = 'role_changed') then
    raise exception 'FAIL 15: role change was not audited';
  end if;
  if not exists (select 1 from public.audit_logs where action = 'visibility_changed') then
    raise exception 'FAIL 15: visibility change was not audited';
  end if;
  if not exists (select 1 from public.audit_logs where action = 'request_created') then
    raise exception 'FAIL 15: request creation was not audited';
  end if;
  if not exists (select 1 from public.audit_logs where action = 'request_accepted') then
    raise exception 'FAIL 15: request acceptance was not audited';
  end if;
end $$;
select pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
do $$ begin
  if exists (select 1 from public.audit_logs) then
    raise exception 'FAIL 15: regular user can read audit logs';
  end if;
  begin
    insert into public.audit_logs (action, target_table) values ('forged', 'profiles');
    raise exception 'FAIL 15: client wrote an audit log';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
select pg_temp.impersonate('00000000-0000-0000-0000-000000000004');
do $$ begin
  if not exists (select 1 from public.audit_logs) then
    raise exception 'FAIL 15: moderator cannot read audit logs';
  end if;
end $$;
select pg_temp.reset_role();

-- ---------------------------------------------------------------------------
-- TEST 16: blocking controls, private block list, and self-block prevention.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
-- Mentee 1 blocks Mentor Nina (00000000-0000-0000-0000-000000000003)
insert into public.blocks (blocker_id, blocked_id)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003');

-- Blocker can see own block and retrieve blocked details via get_my_blocks():
do $$ begin
  if not exists (select 1 from public.blocks
                 where blocker_id = auth.uid() and blocked_id = '00000000-0000-0000-0000-000000000003') then
    raise exception 'FAIL 16: blocker cannot see their own block';
  end if;
  if not exists (select 1 from public.get_my_blocks()
                 where blocked_id = '00000000-0000-0000-0000-000000000003' and full_name = 'Nina Mentor') then
    raise exception 'FAIL 16: get_my_blocks did not return blocked profile info';
  end if;
end $$;

-- Cannot self-block:
do $$ begin
  begin
    insert into public.blocks (blocker_id, blocked_id)
    values (auth.uid(), auth.uid());
    raise exception 'FAIL 16: self-block was permitted';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- Blocked member NEVER sees who blocked them:
select pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
do $$ begin
  if exists (select 1 from public.blocks) then
    raise exception 'FAIL 16: blocked member sees block records';
  end if;
end $$;
select pg_temp.reset_role();

-- ---------------------------------------------------------------------------
-- TEST 17: blocking impact across discovery, profiles, requests, and connections.
-- Ensure Nina's profile is visible in database so only blocking hides it from Mentee 1
update public.profiles set is_visible = true, member_visible = true, staff_hidden = false
where id = '00000000-0000-0000-0000-000000000003';

select pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
-- Mentee 1 cannot see blocked Mentor Nina in profile queries:
do $$ begin
  if exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000003') then
    raise exception 'FAIL 17: blocked user profile is visible in direct queries';
  end if;
end $$;

-- Mentee 1 does not see blocked Mentor Nina in match_mentors:
do $$ begin
  if exists (
    select 1 from public.match_mentors(
      (select array_agg(case when i = 2 then 1.0 else 0.0 end)::extensions.vector(384)
       from generate_series(1, 384) i), 10
    ) where id = '00000000-0000-0000-0000-000000000003'
  ) then
    raise exception 'FAIL 17: blocked user appears in match_mentors';
  end if;
end $$;

-- Mentee 1 does not see blocked Mentor Nina in search_mentors:
do $$ begin
  if exists (
    select 1 from public.search_mentors('Nina', 10)
    where id = '00000000-0000-0000-0000-000000000003'
  ) then
    raise exception 'FAIL 17: blocked user appears in search_mentors';
  end if;
end $$;

-- Mentee 1 cannot create a mentorship request to blocked Nina:
do $$ begin
  begin
    insert into public.mentorship_requests (mentee_id, mentor_id, message)
    values (auth.uid(), '00000000-0000-0000-0000-000000000003', 'Should fail due to block');
    raise exception 'FAIL 17: request was created to blocked mentor';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- Unblocking restores visibility:
delete from public.blocks where blocker_id = auth.uid() and blocked_id = '00000000-0000-0000-0000-000000000003';
do $$ begin
  if not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-000000000003') then
    raise exception 'FAIL 17: unblocking did not restore profile visibility';
  end if;
end $$;
select pg_temp.reset_role();

-- ---------------------------------------------------------------------------
-- TEST 18: reporting system (public.reports) & staff review workflow.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
-- Submit report:
insert into public.reports (reporter_id, reported_id, reason, details)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'spam', 'Sending spam');

select set_config('test.report_id', (
  select id::text from public.reports
  where reporter_id = auth.uid() and reported_id = '00000000-0000-0000-0000-000000000002' and status = 'pending'
), true);

-- Reporter can see their own report:
do $$ begin
  if not exists (select 1 from public.reports where id = current_setting('test.report_id')::uuid) then
    raise exception 'FAIL 18: reporter cannot see their submitted report';
  end if;
end $$;

-- Cannot submit duplicate pending report:
do $$ begin
  begin
    insert into public.reports (reporter_id, reported_id, reason, details)
    values (auth.uid(), '00000000-0000-0000-0000-000000000002', 'harassment', 'Duplicate report');
    raise exception 'FAIL 18: duplicate pending report was permitted';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- Cannot self-report:
do $$ begin
  begin
    insert into public.reports (reporter_id, reported_id, reason, details)
    values (auth.uid(), auth.uid(), 'other', 'Self report');
    raise exception 'FAIL 18: self-report was permitted';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- Reported target CANNOT see report against them:
select pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
do $$ begin
  if exists (select 1 from public.reports where reported_id = auth.uid()) then
    raise exception 'FAIL 18: reported target can see reports against them';
  end if;
end $$;

-- Normal user cannot call review_report:
do $$ begin
  begin
    perform public.review_report(current_setting('test.report_id')::uuid, 'dismiss', 'Not allowed');
    raise exception 'FAIL 18: non-staff reviewed report';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
select pg_temp.reset_role();

-- Staff reviews report with hide_profile:
select pg_temp.impersonate('00000000-0000-0000-0000-000000000004'); -- Moderator
do $$
declare res jsonb;
begin
  res := public.review_report(current_setting('test.report_id')::uuid, 'hide_profile', 'Spam confirmed');
  if res ->> 'status' <> 'actioned' then
    raise exception 'FAIL 18: review_report hide_profile did not return actioned status';
  end if;
end $$;
select pg_temp.reset_role();

-- Check that target profile is now staff_hidden and is_visible = false:
do $$ begin
  if (select is_visible from public.profiles where id = '00000000-0000-0000-0000-000000000002') is not false
     or (select staff_hidden from public.profiles where id = '00000000-0000-0000-0000-000000000002') is not true then
    raise exception 'FAIL 18: review_report did not set staff_hidden and hide profile';
  end if;
  if not exists (
    select 1 from public.audit_logs
    where action = 'report_actioned_hide_profile'
      and target_id = current_setting('test.report_id')::uuid
  ) then
    raise exception 'FAIL 18: staff review action was not recorded in audit log';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- TEST 19: Mentor availability (#16). Mentor 3 (Nina) is visible again.
update public.profiles set is_visible = true, member_visible = true, staff_hidden = false,
  skills = '{Nina,Python}'
where id = '00000000-0000-0000-0000-000000000003';

-- Only the mentor may change their availability; moderators and other members may not.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000004');
do $$ begin
  begin
    update public.profiles set accepting_requests = false
      where id = '00000000-0000-0000-0000-000000000003';
    raise exception 'FAIL 19: moderator changed mentor availability';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;
select pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
update public.profiles set accepting_requests = false where id = auth.uid();
select pg_temp.reset_role();
do $$ begin
  if (select accepting_requests from public.profiles
      where id = '00000000-0000-0000-0000-000000000003') is not false then
    raise exception 'FAIL 19: mentor could not pause availability';
  end if;
end $$;

-- Unavailable mentors stay discoverable, report availability, and reject new requests.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
do $$ begin
  if (select accepting_requests from public.search_mentors('Nina', 10)
      where id = '00000000-0000-0000-0000-000000000003') is not false then
    raise exception 'FAIL 19: search_mentors did not report the mentor as unavailable';
  end if;
  if (select accepting_requests from public.match_mentors(
        (select array_agg(case when i = 2 then 1.0 else 0.0 end)::extensions.vector(384)
         from generate_series(1, 384) i), 10)
      where id = '00000000-0000-0000-0000-000000000003') is not false then
    raise exception 'FAIL 19: match_mentors did not report the mentor as unavailable';
  end if;
  begin
    insert into public.mentorship_requests (mentee_id, mentor_id, message)
    values (auth.uid(), '00000000-0000-0000-0000-000000000003', 'should be rejected');
    raise exception 'FAIL 19: request created to an unavailable mentor';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- Re-opening availability allows requests again.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
update public.profiles set accepting_requests = true where id = auth.uid();
select pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
insert into public.mentorship_requests (mentee_id, mentor_id, message)
values (auth.uid(), '00000000-0000-0000-0000-000000000003', 'now accepted');
select pg_temp.reset_role();

-- ---------------------------------------------------------------------------
-- TEST 20: Hidden mentors are excluded by both discovery RPCs in the database (#16).
update public.profiles set is_visible = false where id = '00000000-0000-0000-0000-000000000003';
select pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
do $$ begin
  if exists (select 1 from public.search_mentors('Nina', 10)
             where id = '00000000-0000-0000-0000-000000000003') then
    raise exception 'FAIL 20: hidden mentor returned by search_mentors';
  end if;
  if exists (select 1 from public.match_mentors(
        (select array_agg(case when i = 2 then 1.0 else 0.0 end)::extensions.vector(384)
         from generate_series(1, 384) i), 10)
      where id = '00000000-0000-0000-0000-000000000003') then
    raise exception 'FAIL 20: hidden mentor returned by match_mentors';
  end if;
end $$;
select pg_temp.reset_role();

select 'ALL RLS TESTS PASSED' as result;

rollback;
