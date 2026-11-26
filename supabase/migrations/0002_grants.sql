-- Newer Supabase projects don't auto-grant table privileges, so grant them explicitly.
--   service_role  → full access (Next.js server, secret key). Bypasses RLS.
--   authenticated → table access for hosts, still limited row-by-row by the RLS policies in 0001.
--   anon          → nothing. Guests only reach data through the server.

grant usage on schema public to service_role, authenticated;

grant select, insert, update, delete on public.sheets, public.categories, public.slots, public.claims
  to service_role;

grant select, insert, update, delete on public.sheets, public.categories, public.slots to authenticated;
grant select, delete on public.claims to authenticated;

revoke all on public.sheets, public.categories, public.slots, public.claims from anon;
revoke all on public._migrations from anon, authenticated;
