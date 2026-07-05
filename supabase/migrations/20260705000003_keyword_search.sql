-- Ranked full-text mentor search (the keyword half of the proposal's
-- "full-text + semantic" search, and the baseline the evaluation compares
-- semantic matching against). Results ordered by ts_rank.

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
as $$
  select p.id, p.full_name, p.headline, p.bio, p.skills, p.industry,
         p.graduation_year,
         ts_rank(p.fts, websearch_to_tsquery('english', search_query)) as rank
  from public.profiles p
  where p.role = 'mentor'
    and p.is_visible
    and p.fts @@ websearch_to_tsquery('english', search_query)
    and p.id is distinct from auth.uid()
  order by rank desc
  limit least(match_count, 50)
$$;

grant execute on function public.search_mentors(text, int) to authenticated;
