-- AlumniConnect - Sprint 1: schema, RBAC via RLS, pgvector + full-text search.
-- Approved schema: one role per account; all authenticated users can browse
-- visible profiles; embeddings written server-side only (service role).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('mentee', 'mentor', 'moderator', 'admin');
create type public.request_status as enum ('pending', 'accepted', 'declined', 'cancelled');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- array_to_string is only STABLE, which generated columns reject; this
-- immutable wrapper is safe because text[] -> text has no config dependence.
create or replace function public.immutable_array_to_string(arr text[], sep text)
returns text
language sql
immutable
as $$ select array_to_string(arr, sep) $$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'mentee',
  full_name text not null default '',
  headline text not null default '',
  bio text not null default '',
  skills text[] not null default '{}',
  industry text not null default '',
  graduation_year int,
  is_visible boolean not null default true,
  embedding extensions.vector(384),
  fts tsvector generated always as (
    to_tsvector('english',
      coalesce(full_name, '') || ' ' ||
      coalesce(headline, '')  || ' ' ||
      coalesce(bio, '')       || ' ' ||
      public.immutable_array_to_string(skills, ' ') || ' ' ||
      coalesce(industry, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ivfflat per proposal sections 3.6.1 / 3.7.3.
create index profiles_embedding_idx on public.profiles
  using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 100);
create index profiles_fts_idx on public.profiles using gin (fts);
create index profiles_skills_idx on public.profiles using gin (skills);
create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- Role helper (security definer avoids recursive RLS on profiles)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

-- ---------------------------------------------------------------------------
-- Auto-create profile on sign-up. Role comes from sign-up metadata but is
-- clamped to mentee/mentor - staff roles are only assignable by an admin.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := coalesce(new.raw_user_meta_data ->> 'role', 'mentee');
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when requested in ('mentee', 'mentor')
         then requested::public.user_role
         else 'mentee'::public.user_role end,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Column protection: RLS is row-level, so privileged columns are guarded by
-- a trigger. Embeddings: service role only (non-negotiable: server-side only).
-- Role: admin only. Visibility: moderator/admin.
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  caller_role public.user_role := public.current_user_role();
  is_service boolean := coalesce(auth.role(), '') = 'service_role'
                        or auth.uid() is null; -- direct SQL (postgres) sessions
begin
  if new.role is distinct from old.role
     and not (is_service or caller_role = 'admin') then
    raise exception 'only admins can change roles';
  end if;
  if new.embedding is distinct from old.embedding and not is_service then
    raise exception 'embeddings are written server-side only';
  end if;
  if new.is_visible is distinct from old.is_visible
     and not (is_service or caller_role in ('moderator', 'admin')) then
    raise exception 'only moderators or admins can change visibility';
  end if;
  -- Moderators editing someone else's profile may ONLY toggle visibility.
  if caller_role = 'moderator' and old.id <> auth.uid() and (
       new.full_name is distinct from old.full_name
    or new.headline is distinct from old.headline
    or new.bio is distinct from old.bio
    or new.skills is distinct from old.skills
    or new.industry is distinct from old.industry
    or new.graduation_year is distinct from old.graduation_year
  ) then
    raise exception 'moderators may only change visibility on other profiles';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------------
-- mentorship_requests
-- ---------------------------------------------------------------------------
create table public.mentorship_requests (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  message text not null default '',
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint no_self_request check (mentee_id <> mentor_id)
);

create unique index one_pending_request_per_pair
  on public.mentorship_requests (mentee_id, mentor_id)
  where status = 'pending';
create index requests_mentor_idx on public.mentorship_requests (mentor_id);
create index requests_mentee_idx on public.mentorship_requests (mentee_id);

-- ---------------------------------------------------------------------------
-- connections (created only by accept_mentorship_request)
-- ---------------------------------------------------------------------------
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.mentorship_requests (id),
  mentee_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (mentee_id, mentor_id)
);

-- ---------------------------------------------------------------------------
-- Respond to a request: only the recipient mentor, only while pending.
-- Accepting atomically creates the connection.
-- ---------------------------------------------------------------------------
create or replace function public.respond_to_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.mentorship_requests;
begin
  select * into req from public.mentorship_requests
    where id = p_request_id for update;
  if req.id is null then
    raise exception 'request not found';
  end if;
  if req.mentor_id <> auth.uid() then
    raise exception 'only the recipient mentor can respond';
  end if;
  if req.status <> 'pending' then
    raise exception 'request is not pending';
  end if;

  update public.mentorship_requests
    set status = case when p_accept then 'accepted'::public.request_status
                      else 'declined'::public.request_status end,
        responded_at = now()
    where id = p_request_id;

  if p_accept then
    insert into public.connections (request_id, mentee_id, mentor_id)
    values (req.id, req.mentee_id, req.mentor_id)
    on conflict (mentee_id, mentor_id) do nothing;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Matching RPC: cosine similarity over visible mentors (security invoker,
-- so RLS applies to the caller). Skill-overlap explainability lands in
-- build-order step 5; similarity score is the Sprint 1 proof of concept.
-- ---------------------------------------------------------------------------
create or replace function public.match_mentors(
  query_embedding extensions.vector(384),
  match_count int default 10
)
returns table (
  id uuid,
  full_name text,
  headline text,
  skills text[],
  industry text,
  similarity float
)
language sql
stable
as $$
  select p.id, p.full_name, p.headline, p.skills, p.industry,
         1 - (p.embedding <=> query_embedding) as similarity
  from public.profiles p
  where p.role = 'mentor'
    and p.is_visible
    and p.embedding is not null
  order by p.embedding <=> query_embedding
  limit least(match_count, 50)
$$;

-- ---------------------------------------------------------------------------
-- audit_logs (proposal ERD 3.5.3). Also captures the conceptual framework's
-- feedback loop: accept/decline decisions are recorded for later analysis.
-- Rows are written only by triggers (security definer); staff-readable.
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target_table text not null,
  target_id uuid,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_logs_target_idx on public.audit_logs (target_table, target_id);
create index audit_logs_created_idx on public.audit_logs (created_at);

create or replace function public.log_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into public.audit_logs (actor_id, action, target_table, target_id, detail)
    values (auth.uid(), 'role_changed', 'profiles', new.id,
            jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  if new.is_visible is distinct from old.is_visible then
    insert into public.audit_logs (actor_id, action, target_table, target_id, detail)
    values (auth.uid(), 'visibility_changed', 'profiles', new.id,
            jsonb_build_object('is_visible', new.is_visible));
  end if;
  return new;
end;
$$;

create trigger log_profile_changes
  after update on public.profiles
  for each row execute function public.log_profile_changes();

create or replace function public.log_request_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (actor_id, action, target_table, target_id, detail)
    values (auth.uid(), 'request_created', 'mentorship_requests', new.id,
            jsonb_build_object('mentee_id', new.mentee_id, 'mentor_id', new.mentor_id));
  elsif new.status is distinct from old.status then
    insert into public.audit_logs (actor_id, action, target_table, target_id, detail)
    values (auth.uid(), 'request_' || new.status, 'mentorship_requests', new.id,
            jsonb_build_object('mentee_id', new.mentee_id, 'mentor_id', new.mentor_id));
  end if;
  return new;
end;
$$;

create trigger log_request_changes
  after insert or update on public.mentorship_requests
  for each row execute function public.log_request_changes();

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.mentorship_requests enable row level security;
alter table public.connections enable row level security;
alter table public.audit_logs enable row level security;

-- audit_logs ------------------------------------------------------------------
create policy "audit: staff read"
  on public.audit_logs for select to authenticated
  using (public.current_user_role() in ('moderator', 'admin'));
-- No INSERT/UPDATE/DELETE policies: rows come only from triggers.

-- profiles ------------------------------------------------------------------
create policy "profiles: read visible, own, or staff"
  on public.profiles for select to authenticated
  using (
    is_visible
    or id = auth.uid()
    or public.current_user_role() in ('moderator', 'admin')
  );

-- Moderators get row access so they can toggle is_visible; the
-- protect_profile_columns trigger stops them changing anything else
-- on profiles that are not their own.
create policy "profiles: update own or staff"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.current_user_role() in ('moderator', 'admin'))
  with check (id = auth.uid() or public.current_user_role() in ('moderator', 'admin'));

create policy "profiles: admin delete"
  on public.profiles for delete to authenticated
  using (public.current_user_role() = 'admin');

-- No INSERT policy: rows are created by the on_auth_user_created trigger.

-- mentorship_requests ---------------------------------------------------------
create policy "requests: parties and staff read"
  on public.mentorship_requests for select to authenticated
  using (
    mentee_id = auth.uid()
    or mentor_id = auth.uid()
    or public.current_user_role() in ('moderator', 'admin')
  );

create policy "requests: mentees create own, to visible mentors"
  on public.mentorship_requests for insert to authenticated
  with check (
    mentee_id = auth.uid()
    and status = 'pending'
    and public.current_user_role() = 'mentee'
    and exists (
      select 1 from public.profiles m
      where m.id = mentor_id and m.role = 'mentor' and m.is_visible
    )
  );

-- Mentors respond via respond_to_request(); the only direct update allowed
-- is a mentee cancelling their own pending request.
create policy "requests: mentee cancels own pending"
  on public.mentorship_requests for update to authenticated
  using (mentee_id = auth.uid() and status = 'pending')
  with check (mentee_id = auth.uid() and status = 'cancelled');

-- connections -----------------------------------------------------------------
create policy "connections: parties and staff read"
  on public.connections for select to authenticated
  using (
    mentee_id = auth.uid()
    or mentor_id = auth.uid()
    or public.current_user_role() in ('moderator', 'admin')
  );

-- No INSERT/UPDATE policies: connections are created only by
-- respond_to_request() (security definer).

create policy "connections: admin delete"
  on public.connections for delete to authenticated
  using (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Table privileges are the coarse layer; RLS policies + the column-protection
-- trigger do the fine-grained work.
grant select, update, delete on public.profiles to authenticated;
grant select, insert, update on public.mentorship_requests to authenticated;
grant select, delete on public.connections to authenticated;
grant select on public.audit_logs to authenticated;
grant all on public.profiles, public.mentorship_requests, public.connections to service_role;

grant execute on function public.respond_to_request(uuid, boolean) to authenticated;
grant execute on function public.match_mentors(extensions.vector, int) to authenticated;
grant execute on function public.current_user_role() to authenticated;
revoke execute on function public.handle_new_user() from authenticated, anon;
