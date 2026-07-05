-- Sprint 3: skill-overlap explainability for the matching engine.
-- match_mentors now returns the skills each mentor shares with the caller
-- (case-insensitive), the interpretable half of the match explanation,
-- and excludes the caller from their own results.

drop function public.match_mentors(extensions.vector, int);

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
  order by p.embedding <=> query_embedding
  limit least(match_count, 50)
$$;

grant execute on function public.match_mentors(extensions.vector, int) to authenticated;
