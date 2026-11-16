-- Connection contacts (#107): hosted projects grant new public tables to anon by
-- default. Row-level security already returns nothing to signed-out visitors;
-- revoking the grant as well matches the design and the local permission tests.
revoke all on public.connection_contacts from anon;
