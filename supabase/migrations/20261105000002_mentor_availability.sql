-- Migration: Mentor availability (Issue #16, criterion 3)
--
-- Agreed meaning of availability:
--   accepting_requests = true  -> the Mentor is open to NEW mentorship requests.
--   accepting_requests = false -> the Mentor stays discoverable (if visible) but
--                                 new requests are rejected by the database.
--   Existing pending requests and accepted connections are NOT affected; the
--   Mentor can still respond to pending requests.
-- Only the profile owner (or the service role / an admin) may change it.

alter table public.profiles
  add column if not exists accepting_requests boolean not null default true;

-- ---------------------------------------------------------------------------
-- Ownership guard: moderators may only moderate visibility, never availability.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_availability()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_service boolean := coalesce(auth.role(), '') = 'service_role'
                        or auth.uid() is null; -- direct SQL (postgres) sessions
begin
  if new.accepting_requests is distinct from old.accepting_requests
     and not is_service
     and old.id is distinct from auth.uid()
     and public.current_user_role() is distinct from 'admin' then
    raise exception 'only the mentor can change their availability';
  end if;
  return new;
end;
$$;

revoke execute on function public.protect_profile_availability() from public, anon, authenticated;

drop trigger if exists protect_profile_availability on public.profiles;
create trigger protect_profile_availability
  before update on public.profiles
  for each row execute function public.protect_profile_availability();

-- ---------------------------------------------------------------------------
-- Discovery RPCs: return availability (return type changes, so drop first).
-- Visibility and bidirectional blocking stay enforced inside Postgres.
-- ---------------------------------------------------------------------------
drop function if exists public.match_mentors(extensions.vector, integer);
create function public.match_mentors(
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
    and (auth.uid() is null or not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    ))
  order by p.embedding <=> query_embedding
  limit least(match_count, 50)
$$;

revoke execute on function public.match_mentors(extensions.vector, integer) from public, anon;
grant execute on function public.match_mentors(extensions.vector, integer) to authenticated;

drop function if exists public.search_mentors(text, integer);
create function public.search_mentors(
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
    and (auth.uid() is null or not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    ))
  order by rank desc
  limit least(match_count, 50)
$$;

revoke execute on function public.search_mentors(text, integer) from public, anon;
grant execute on function public.search_mentors(text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- New requests require an available, visible, unblocked Mentor.
-- The original initial-schema INSERT policy is also permissive; Postgres ORs
-- permissive policies, so it must be removed or it bypasses these checks.
-- ---------------------------------------------------------------------------
drop policy if exists "requests: mentees create own, to visible mentors" on public.mentorship_requests;
drop policy if exists "requests: insert as mentee" on public.mentorship_requests;
create policy "requests: insert as mentee"
  on public.mentorship_requests for insert to authenticated
  with check (
    mentee_id = auth.uid()
    and status = 'pending'
    and public.current_user_role() = 'mentee'
    and exists (
      select 1 from public.profiles m
      where m.id = mentor_id
        and m.role = 'mentor'
        and m.is_visible
        and m.accepting_requests
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = mentor_id)
         or (b.blocker_id = mentor_id and b.blocked_id = auth.uid())
    )
  );
