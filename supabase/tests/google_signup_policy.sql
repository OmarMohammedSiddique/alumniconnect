-- Run against the local stack with psql -v ON_ERROR_STOP=1.
begin;

do $$
begin
  assert not has_schema_privilege('anon', 'auth_hooks', 'usage');
  assert not has_schema_privilege('authenticated', 'auth_hooks', 'usage');
  assert not has_function_privilege('anon', 'auth_hooks.reject_google_signup(jsonb)', 'execute');
  assert not has_function_privilege('authenticated', 'auth_hooks.reject_google_signup(jsonb)', 'execute');
  assert has_function_privilege('supabase_auth_admin', 'auth_hooks.reject_google_signup(jsonb)', 'execute');
end;
$$;

set local role supabase_auth_admin;
do $$
declare
  blocked jsonb;
begin
  blocked := auth_hooks.reject_google_signup('{"user":{"app_metadata":{"provider":"google"},"user_metadata":{"role":"mentor","provider":"email"}}}');
  assert blocked -> 'error' ->> 'http_code' = '403';
  assert blocked -> 'error' ->> 'message' = 'Register with AlumniConnect before signing in with Google.';
  -- User-editable metadata must not change the decision in either direction.
  assert auth_hooks.reject_google_signup('{"user":{"app_metadata":{"provider":"email"},"user_metadata":{"provider":"google"}}}') = '{}'::jsonb;
  assert auth_hooks.reject_google_signup('{"user":{"app_metadata":{"provider":"email"}}}') = '{}'::jsonb;
end;
$$;

rollback;
