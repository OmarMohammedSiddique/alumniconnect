-- OAuth authenticates an existing member; registration must use the signup flow.
-- Keep the hook outside the Data API and grant only Supabase Auth access.
create schema if not exists auth_hooks;
revoke all on schema auth_hooks from public, anon, authenticated;
grant usage on schema auth_hooks to supabase_auth_admin;

create function auth_hooks.reject_google_signup(event jsonb)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select case when event -> 'user' -> 'app_metadata' ->> 'provider' = 'google'
    then jsonb_build_object('error', jsonb_build_object(
      'http_code', 403,
      'message', 'Register with AlumniKonneQt before signing in with Google.'
    ))
    else '{}'::jsonb
  end;
$$;

revoke all on function auth_hooks.reject_google_signup(jsonb) from public, anon, authenticated;
grant execute on function auth_hooks.reject_google_signup(jsonb) to supabase_auth_admin;
