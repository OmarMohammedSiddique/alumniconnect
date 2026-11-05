-- Migration: System-wide security hardening, trigger fixes, and performance indexes
-- 1. Bidirectional block helper (security definer) so blocked users cannot bypass block checks
-- 2. Restore updated_at timestamp maintenance and staff un-moderation in protect_profile_columns()
-- 3. Auto-cancel pending mentorship requests when either participant blocks the other
-- 4. Tighten profile-photos Storage read policy against hidden or blocked profiles
-- 5. Add missing foreign-key/filter indexes and column length/cardinality constraints

-- ---------------------------------------------------------------------------
-- 1. Bidirectional block helper (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
-- Because RLS on public.blocks only permits reading rows where blocker_id = auth.uid()
-- (so blocked members cannot enumerate who blocked them), any SECURITY INVOKER
-- policy or function checking (blocker_id = other_id and blocked_id = auth.uid())
-- directly against public.blocks would see zero rows for the blocked party.
-- This SECURITY DEFINER helper evaluates both directions without exposing the
-- underlying public.blocks rows to the blocked user.
create or replace function public.is_blocked_with(other_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when auth.uid() is null or other_user_id is null then false
    else exists (
      select 1
      from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = other_user_id)
         or (b.blocker_id = other_user_id and b.blocked_id = auth.uid())
    )
  end;
$$;

revoke execute on function public.is_blocked_with(uuid) from public, anon;
grant execute on function public.is_blocked_with(uuid) to authenticated, service_role;

-- Update profiles SELECT policy to enforce bidirectional blocking for both parties
drop policy if exists "profiles: read visible, own, or staff" on public.profiles;
create policy "profiles: read visible, own, or staff"
  on public.profiles for select to authenticated
  using (
    (
      is_visible
      and not public.is_blocked_with(id)
    )
    or id = auth.uid()
    or public.current_user_role() in ('moderator', 'admin')
  );

-- Update mentorship_requests INSERT policy to enforce bidirectional blocking for both parties
drop policy if exists "requests: insert as mentee" on public.mentorship_requests;
create policy "requests: insert as mentee"
  on public.mentorship_requests for insert to authenticated
  with check (
    mentee_id = auth.uid()
    and status = 'pending'
    and public.current_user_role() = 'mentee'
    and not public.is_blocked_with(mentor_id)
    and exists (
      select 1 from public.profiles m
      where m.id = mentor_id
        and m.role = 'mentor'
        and m.is_visible
        and m.accepting_requests
    )
  );

-- Update match_mentors RPC to enforce bidirectional blocking via is_blocked_with()
create or replace function public.match_mentors(
  query_embedding extensions.vector(384),
  match_count int default 10
)
returns table (
  id uuid,
  full_name text,
  headline text,
  bio text,
  skills text[],
  industry text,
  graduation_year int,
  accepting_requests boolean,
  similarity float,
  shared_skills text[]
)
language sql
stable
set search_path = pg_catalog, public, extensions
as $$
  with caller as (
    select coalesce(c.skills, '{}') as skills
    from public.profiles c
    where c.id = auth.uid()
  )
  select p.id, p.full_name, p.headline, p.bio, p.skills, p.industry,
         p.graduation_year, p.accepting_requests,
         1 - (p.embedding <=> query_embedding) as similarity,
         coalesce(
           (select array_agg(ps order by ps)
            from unnest(p.skills) ps
            where exists (
              select 1 from caller, unnest(caller.skills) cs
              where lower(cs) = lower(ps)
            )),
           '{}'
         ) as shared_skills
  from public.profiles p
  where p.role = 'mentor'
    and p.is_visible
    and p.embedding is not null
    and p.id is distinct from auth.uid()
    and not public.is_blocked_with(p.id)
  order by p.embedding <=> query_embedding
  limit least(match_count, 50)
$$;

revoke execute on function public.match_mentors(extensions.vector, integer) from public, anon;
grant execute on function public.match_mentors(extensions.vector, integer) to authenticated;

-- Update search_mentors RPC to enforce bidirectional blocking via is_blocked_with()
create or replace function public.search_mentors(
  search_query text,
  match_count int default 10
)
returns table (
  id uuid,
  full_name text,
  headline text,
  bio text,
  skills text[],
  industry text,
  graduation_year int,
  accepting_requests boolean,
  rank real
)
language sql
stable
set search_path = pg_catalog, public, extensions
as $$
  select p.id, p.full_name, p.headline, p.bio, p.skills, p.industry,
         p.graduation_year, p.accepting_requests,
         ts_rank(p.fts, websearch_to_tsquery('english', search_query)) as rank
  from public.profiles p
  where p.role = 'mentor'
    and p.is_visible
    and p.fts @@ websearch_to_tsquery('english', search_query)
    and p.id is distinct from auth.uid()
    and not public.is_blocked_with(p.id)
  order by rank desc
  limit least(match_count, 50)
$$;

revoke execute on function public.search_mentors(text, integer) from public, anon;
grant execute on function public.search_mentors(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Restore updated_at maintenance & staff un-moderation in protect_profile_columns()
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  caller_role public.user_role := public.current_user_role();
  is_service boolean := coalesce(auth.role(), '') = 'service_role'
                        or auth.uid() is null; -- direct SQL (postgres) sessions
begin
  -- Role changes remain admin-only
  if new.role is distinct from old.role and not (is_service or caller_role = 'admin') then
    raise exception 'only admins can change roles';
  end if;

  -- Embeddings remain server-only
  if new.embedding is distinct from old.embedding and not is_service then
    raise exception 'embeddings are written server-side only';
  end if;

  -- Staff moderation flag can only be altered by moderators, admins or service role
  if new.staff_hidden is distinct from old.staff_hidden and not (is_service or caller_role in ('moderator', 'admin')) then
    raise exception 'only moderators or admins can change staff moderation status';
  end if;

  -- Normal members cannot edit someone else's profile
  if old.id <> auth.uid() and not (is_service or caller_role in ('moderator', 'admin')) then
    raise exception 'cannot edit another member profile';
  end if;

  -- Moderators editing another user's profile may ONLY toggle staff moderation / visibility
  if caller_role = 'moderator' and old.id <> auth.uid() and (
    new.role            is distinct from old.role or
    new.full_name       is distinct from old.full_name or
    new.headline        is distinct from old.headline or
    new.bio             is distinct from old.bio or
    new.skills          is distinct from old.skills or
    new.industry        is distinct from old.industry or
    new.graduation_year is distinct from old.graduation_year or
    new.member_visible  is distinct from old.member_visible
  ) then
    raise exception 'moderators may only change visibility on other profiles';
  end if;

  -- Compute effective is_visible and enforce staff moderation priority:
  if caller_role in ('moderator', 'admin') or is_service then
    if new.is_visible is distinct from old.is_visible then
      if new.is_visible = false then
        new.staff_hidden := true;
      else
        new.staff_hidden := false;
        if new.member_visible is not distinct from old.member_visible then
          new.member_visible := true;
        end if;
        new.is_visible := new.member_visible;
      end if;
    elsif new.staff_hidden is distinct from old.staff_hidden then
      new.is_visible := new.member_visible and not new.staff_hidden;
    else
      new.is_visible := new.member_visible and not new.staff_hidden;
    end if;
  else
    -- Member self-service update: cannot override staff moderation
    new.staff_hidden := old.staff_hidden;
    if new.member_visible is distinct from old.member_visible then
      new.is_visible := new.member_visible and not new.staff_hidden;
    elsif new.is_visible is distinct from old.is_visible then
      new.member_visible := new.is_visible;
      new.is_visible := new.member_visible and not new.staff_hidden;
    else
      new.is_visible := new.member_visible and not new.staff_hidden;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.protect_profile_columns() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Cancel pending mentorship requests when a block is created
-- ---------------------------------------------------------------------------
create or replace function public.cancel_requests_on_block()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.mentorship_requests
  set status = 'cancelled',
      responded_at = coalesce(responded_at, now())
  where status = 'pending'
    and (
      (mentee_id = new.blocker_id and mentor_id = new.blocked_id)
      or (mentee_id = new.blocked_id and mentor_id = new.blocker_id)
    );
  return new;
end;
$$;

revoke execute on function public.cancel_requests_on_block() from public, anon, authenticated;

drop trigger if exists on_block_cancel_pending_requests on public.blocks;
create trigger on_block_cancel_pending_requests
  after insert on public.blocks
  for each row execute function public.cancel_requests_on_block();

-- ---------------------------------------------------------------------------
-- 4. Tighten Storage read policy on profile-photos against hidden/blocked profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profile photos: members read" on storage.objects;
create policy "profile photos: members read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'profile-photos'
    and (
      name = (select auth.uid())::text || '/avatar'
      or public.current_user_role() in ('moderator', 'admin')
      or exists (
        select 1 from public.profiles p
        where p.id::text || '/avatar' = storage.objects.name
          and p.is_visible
          and not public.is_blocked_with(p.id)
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Performance indexes & data-integrity constraints
-- ---------------------------------------------------------------------------
create index if not exists idx_connections_mentor_id
  on public.connections (mentor_id);

create index if not exists idx_reports_reporter_id
  on public.reports (reporter_id);

create index if not exists idx_reports_reviewed_by
  on public.reports (reviewed_by)
  where reviewed_by is not null;

create index if not exists idx_profiles_visible_mentors
  on public.profiles (role)
  where is_visible = true and role = 'mentor';

alter table public.profiles
  drop constraint if exists profiles_full_name_length,
  add constraint profiles_full_name_length check (char_length(full_name) <= 200) not valid,
  drop constraint if exists profiles_headline_length,
  add constraint profiles_headline_length check (char_length(headline) <= 120) not valid,
  drop constraint if exists profiles_bio_length,
  add constraint profiles_bio_length check (char_length(bio) <= 2000) not valid,
  drop constraint if exists profiles_industry_length,
  add constraint profiles_industry_length check (char_length(industry) <= 100) not valid,
  drop constraint if exists profiles_skills_cardinality,
  add constraint profiles_skills_cardinality check (cardinality(skills) <= 20) not valid;

alter table public.profiles
  validate constraint profiles_full_name_length,
  validate constraint profiles_headline_length,
  validate constraint profiles_bio_length,
  validate constraint profiles_industry_length,
  validate constraint profiles_skills_cardinality;

alter table public.mentorship_requests
  drop constraint if exists mentorship_requests_message_length,
  add constraint mentorship_requests_message_length check (char_length(message) <= 500) not valid;

alter table public.mentorship_requests
  validate constraint mentorship_requests_message_length;
