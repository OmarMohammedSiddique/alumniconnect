-- Restrict SECURITY DEFINER helpers to the callers that need them and pin
-- every exposed SQL function to a trusted search path.

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_columns() from public, anon, authenticated;
revoke execute on function public.log_profile_changes() from public, anon, authenticated;
revoke execute on function public.log_request_changes() from public, anon, authenticated;

-- RLS policies call this helper for signed-in users.
revoke execute on function public.current_user_role() from public, anon;
grant execute on function public.current_user_role() to authenticated;

-- These two functions are the authenticated search API. Keep them out of the
-- anonymous API while retaining their existing signed-in behavior.
revoke execute on function public.match_mentors(extensions.vector, integer) from public, anon;
grant execute on function public.match_mentors(extensions.vector, integer) to authenticated;
revoke execute on function public.search_mentors(text, integer) from public, anon;
grant execute on function public.search_mentors(text, integer) to authenticated;

-- Explicitly pin the immutable generated-column helper to built-in functions.
alter function public.immutable_array_to_string(text[], text)
  set search_path = pg_catalog;

alter function public.match_mentors(extensions.vector, integer)
  set search_path = pg_catalog, public, extensions;
alter function public.search_mentors(text, integer)
  set search_path = pg_catalog, public, extensions;
