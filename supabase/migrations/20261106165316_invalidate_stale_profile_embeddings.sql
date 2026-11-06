-- #4: saved matching inputs and stored inference must describe the same profile.
-- Run after protect_profile_columns so members still cannot submit vectors.
create schema if not exists profile_internal;
revoke all on schema profile_internal from public, anon, authenticated;

create function profile_internal.invalidate_profile_embedding() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.headline is distinct from old.headline
    or new.bio is distinct from old.bio
    or new.skills is distinct from old.skills
    or new.industry is distinct from old.industry
    or new.graduation_year is distinct from old.graduation_year then
    new.embedding := null;
  end if;
  return new;
end;
$$;
revoke all on function profile_internal.invalidate_profile_embedding() from public, anon, authenticated;
create trigger zz_invalidate_profile_embedding
before update of headline, bio, skills, industry, graduation_year on public.profiles
for each row execute function profile_internal.invalidate_profile_embedding();
