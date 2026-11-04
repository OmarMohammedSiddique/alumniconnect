-- Migration: Member profile privacy, reporting and blocking controls (Issue #19)
-- 1. Member self-service visibility vs staff moderation flag on public.profiles
-- 2. Bidirectional blocking table (public.blocks) with private blocker-only reads
-- 3. Safety reporting table (public.reports) with duplicate-pending prevention & staff review
-- 4. Audit logging and discovery/search/request exclusion for blocked participants

-- ---------------------------------------------------------------------------
-- 1. Profiles: separate self-service visibility preference from staff moderation
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists member_visible boolean not null default true,
  add column if not exists staff_hidden boolean not null default false;

-- Update protect_profile_columns trigger first so search_path includes extensions for vectors
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
    -- Staff update: setting is_visible = false or staff_hidden = true moderates the user
    if new.is_visible is distinct from old.is_visible then
      if new.is_visible = false then
        new.staff_hidden := true;
      else
        new.staff_hidden := false;
        new.is_visible := new.member_visible;
      end if;
    elsif new.staff_hidden is distinct from old.staff_hidden then
      new.is_visible := new.member_visible and not new.staff_hidden;
    else
      new.is_visible := new.member_visible and not new.staff_hidden;
    end if;
  else
    -- Member self-service update:
    -- Cannot override staff moderation
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

  return new;
end;
$$;

-- Backfill existing rows so staff-hidden status aligns with existing is_visible
update public.profiles
set staff_hidden = true, member_visible = false
where is_visible = false;

update public.profiles
set staff_hidden = false, member_visible = true
where is_visible = true;

-- Update log_profile_changes trigger to audit staff moderation and visibility changes
create or replace function public.log_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
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
            jsonb_build_object('is_visible', new.is_visible, 'member_visible', new.member_visible, 'staff_hidden', new.staff_hidden));
  end if;

  if new.staff_hidden is distinct from old.staff_hidden then
    insert into public.audit_logs (actor_id, action, target_table, target_id, detail)
    values (auth.uid(), 'staff_moderation_changed', 'profiles', new.id,
            jsonb_build_object('staff_hidden', new.staff_hidden));
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Member blocking: public.blocks table & private RLS
-- ---------------------------------------------------------------------------
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_no_self_block check (blocker_id <> blocked_id)
);

create index if not exists idx_blocks_blocker_id on public.blocks (blocker_id);
create index if not exists idx_blocks_blocked_id on public.blocks (blocked_id);

alter table public.blocks enable row level security;

-- Members can only view the users they have personally blocked.
-- Blocked members NEVER see who blocked them.
drop policy if exists "blocks: read own" on public.blocks;
create policy "blocks: read own"
  on public.blocks for select to authenticated
  using (blocker_id = auth.uid());

-- Members can block others (bounded to 100 per user to prevent table abuse)
drop policy if exists "blocks: insert own" on public.blocks;
create policy "blocks: insert own"
  on public.blocks for insert to authenticated
  with check (
    blocker_id = auth.uid()
    and blocker_id <> blocked_id
    and (
      select count(*) from public.blocks where blocker_id = auth.uid()
    ) < 100
  );

-- Members can unblock someone they blocked
drop policy if exists "blocks: delete own" on public.blocks;
create policy "blocks: delete own"
  on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

grant select, insert, delete on public.blocks to authenticated;
grant all on public.blocks to service_role;

-- Helper to safely retrieve blocked member profiles for the current user's block list
create or replace function public.get_my_blocks()
returns table (
  blocked_id uuid,
  full_name text,
  role public.user_role,
  blocked_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.blocked_id, p.full_name, p.role, b.created_at as blocked_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

revoke execute on function public.get_my_blocks() from public, anon;
grant execute on function public.get_my_blocks() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Member reporting: public.reports table & staff review workflow
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('harassment', 'inappropriate_content', 'impersonation', 'spam', 'other')),
  details text not null default '',
  status text not null default 'pending' check (status in ('pending', 'dismissed', 'actioned')),
  action_taken text not null default 'none' check (action_taken in ('none', 'profile_hidden', 'dismissed')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_no_self_report check (reporter_id <> reported_id),
  constraint reports_details_length check (length(details) <= 1000)
);

-- Unique index stops duplicate pending reports against the same target from the same member
create unique index if not exists idx_reports_unique_pending
  on public.reports (reporter_id, reported_id)
  where (status = 'pending');

create index if not exists idx_reports_status on public.reports (status);
create index if not exists idx_reports_reported_id on public.reports (reported_id);
create index if not exists idx_reports_created_at on public.reports (created_at desc);

alter table public.reports enable row level security;

-- Reporters can see their submitted reports; staff can view all reports.
-- Target users can NEVER see reports submitted about them.
drop policy if exists "reports: select reporter or staff" on public.reports;
create policy "reports: select reporter or staff"
  on public.reports for select to authenticated
  using (
    reporter_id = auth.uid()
    or public.current_user_role() in ('moderator', 'admin')
  );

-- Members can submit reports
drop policy if exists "reports: insert authenticated" on public.reports;
create policy "reports: insert authenticated"
  on public.reports for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and reporter_id <> reported_id
  );

-- Only staff can update reports (review, action, dismiss)
drop policy if exists "reports: update staff" on public.reports;
create policy "reports: update staff"
  on public.reports for update to authenticated
  using (public.current_user_role() in ('moderator', 'admin'))
  with check (public.current_user_role() in ('moderator', 'admin'));

grant select, insert, update on public.reports to authenticated;
grant all on public.reports to service_role;

-- Helper for staff to review reports and write audit log
create or replace function public.review_report(
  p_report_id uuid,
  p_action text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text := public.current_user_role();
  r record;
begin
  if caller_role not in ('moderator', 'admin') then
    raise exception 'only moderators or admins can review reports';
  end if;
  if p_action not in ('dismiss', 'hide_profile') then
    raise exception 'invalid review action';
  end if;

  select * into r from public.reports where id = p_report_id and status = 'pending';
  if not found then
    raise exception 'pending report not found';
  end if;

  if p_action = 'hide_profile' then
    update public.profiles
    set is_visible = false, staff_hidden = true
    where id = r.reported_id;

    update public.reports
    set status = 'actioned',
        action_taken = 'profile_hidden',
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = p_report_id;

    insert into public.audit_logs (actor_id, action, target_table, target_id, detail)
    values (auth.uid(), 'report_actioned_hide_profile', 'reports', p_report_id,
            jsonb_build_object('reported_id', r.reported_id, 'reason', r.reason, 'note', p_note));
  else
    update public.reports
    set status = 'dismissed',
        action_taken = 'dismissed',
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = p_report_id;

    insert into public.audit_logs (actor_id, action, target_table, target_id, detail)
    values (auth.uid(), 'report_dismissed', 'reports', p_report_id,
            jsonb_build_object('reported_id', r.reported_id, 'reason', r.reason, 'note', p_note));
  end if;

  return jsonb_build_object('ok', true, 'status', case when p_action = 'hide_profile' then 'actioned' else 'dismissed' end);
end;
$$;

revoke execute on function public.review_report(uuid, text, text) from public, anon;
grant execute on function public.review_report(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Enforce blocking in discovery, profiles, requests & connections
-- ---------------------------------------------------------------------------

-- Update match_mentors RPC
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
         p.graduation_year,
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

-- Update search_mentors RPC
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
  rank real
)
language sql
stable
set search_path = pg_catalog, public, extensions
as $$
  select p.id, p.full_name, p.headline, p.bio, p.skills, p.industry,
         p.graduation_year,
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

-- Update profiles RLS: exclude blocked users
drop policy if exists "profiles: read visible, own, or staff" on public.profiles;
create policy "profiles: read visible, own, or staff"
  on public.profiles for select to authenticated
  using (
    (
      is_visible
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = auth.uid() and b.blocked_id = id)
           or (b.blocker_id = id and b.blocked_id = auth.uid())
      )
    )
    or id = auth.uid()
    or public.current_user_role() in ('moderator', 'admin')
  );

-- Update mentorship_requests RLS: cannot insert if blocked
drop policy if exists "requests: insert as mentee" on public.mentorship_requests;
create policy "requests: insert as mentee"
  on public.mentorship_requests for insert to authenticated
  with check (
    mentee_id = auth.uid()
    and status = 'pending'
    and public.current_user_role() = 'mentee'
    and exists (
      select 1 from public.profiles m
      where m.id = mentor_id and m.role = 'mentor' and m.is_visible
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = mentor_id)
         or (b.blocker_id = mentor_id and b.blocked_id = auth.uid())
    )
  );

-- Update respond_to_request function: cannot accept if blocked
create or replace function public.respond_to_request(
  p_request_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.mentorship_requests;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into req from public.mentorship_requests
    where id = p_request_id for update;
  if req.id is null then
    raise exception 'request not found';
  end if;
  if req.mentor_id is distinct from auth.uid() then
    raise exception 'only the recipient mentor can respond';
  end if;
  if req.status <> 'pending' then
    raise exception 'request is not pending';
  end if;

  -- Block check: if either party blocked the other, cannot accept
  if p_accept and exists (
    select 1 from public.blocks b
    where (b.blocker_id = req.mentee_id and b.blocked_id = req.mentor_id)
       or (b.blocker_id = req.mentor_id and b.blocked_id = req.mentee_id)
  ) then
    raise exception 'cannot accept request between blocked participants';
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
