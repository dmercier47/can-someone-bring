-- Hosts could read guest_email and edit_token through the API. Grant only the columns hosts need.
revoke select on public.claims from authenticated;
grant select (id, slot_id, guest_name, quantity, detail, dietary_note, created_at) on public.claims to authenticated;
-- delete stays granted (0002); its RLS check only reads slot_id, granted above.
