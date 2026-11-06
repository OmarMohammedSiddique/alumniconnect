-- Rolled-back stale-vector lifecycle and write-authorization regression.
begin;
insert into auth.users(id,email,raw_user_meta_data) values
 ('44000000-0000-0000-0000-000000000001','cold-vector@example.test','{"role":"mentee","full_name":"Cold Vector Fixture"}');
update public.profiles set headline='First goal',skills=array['Python'] where id='44000000-0000-0000-0000-000000000001';
update public.profiles set embedding=array_fill(0.1::real,array[384])::extensions.vector where id='44000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"44000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
do $$ begin
 begin
  update public.profiles set embedding=array_fill(0.2::real,array[384])::extensions.vector where id=auth.uid();
  raise exception 'Member vector write allowed';
 exception when raise_exception then
  if SQLERRM <> 'embeddings are written server-side only' then raise; end if;
 end;
end $$;
-- Name and availability/privacy changes do not change embedded text.
update public.profiles set full_name='Renamed Fixture' where id=auth.uid();
do $$ begin if not exists(select 1 from public.profiles where id=auth.uid() and embedding is not null) then raise exception 'Unrelated name edit invalidated vector'; end if; end $$;
update public.profiles set headline='Changed goal' where id=auth.uid();
do $$ begin if exists(select 1 from public.profiles where id=auth.uid() and embedding is not null) then raise exception 'Stale headline vector retained'; end if; end $$;
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$ declare field_name text; begin
 foreach field_name in array array['bio','skills','industry','graduation_year'] loop
  update public.profiles set embedding=array_fill(0.1::real,array[384])::extensions.vector where id='44000000-0000-0000-0000-000000000001';
  if field_name='bio' then update public.profiles set bio='Changed bio' where id='44000000-0000-0000-0000-000000000001';
  elsif field_name='skills' then update public.profiles set skills=array['SQL'] where id='44000000-0000-0000-0000-000000000001';
  elsif field_name='industry' then update public.profiles set industry='Technology' where id='44000000-0000-0000-0000-000000000001';
  else update public.profiles set graduation_year=2025 where id='44000000-0000-0000-0000-000000000001'; end if;
  if exists(select 1 from public.profiles where id='44000000-0000-0000-0000-000000000001' and embedding is not null) then raise exception 'Stale % vector retained',field_name; end if;
 end loop;
end $$;
-- A same-value save keeps an already valid vector; inference writes survive.
update public.profiles set embedding=array_fill(0.1::real,array[384])::extensions.vector where id='44000000-0000-0000-0000-000000000001';
update public.profiles set headline='Changed goal' where id='44000000-0000-0000-0000-000000000001';
do $$ begin
 if not exists(select 1 from public.profiles where id='44000000-0000-0000-0000-000000000001' and embedding is not null) then raise exception 'Same-value save invalidated vector'; end if;
 if has_function_privilege('authenticated','profile_internal.invalidate_profile_embedding()','execute') then raise exception 'Trigger function exposed'; end if;
end $$;
rollback;
