-- AlumniConnect — RLS test suite (Sprint 1).
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

-- TEST 5: privilege escalation blocked — mentee cannot change own role.
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

-- TEST 7: mentee cannot toggle own visibility.
do $$ begin
  begin
    update public.profiles set is_visible = false where id = auth.uid();
    raise exception 'FAIL 7: mentee changed visibility';
  exception when others then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
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

-- TEST 9: mentee creates a request to a mentor; cannot forge mentee_id;
-- cannot request a non-mentor.
select pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
insert into public.mentorship_requests (mentee_id, mentor_id, message)
values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Please mentor me');
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

-- TEST 10: request visibility — parties yes, third parties no.
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
do $$ begin
  begin
    perform public.respond_to_request(
      (select id from public.mentorship_requests limit 1), true);
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

select 'ALL RLS TESTS PASSED' as result;

rollback;
