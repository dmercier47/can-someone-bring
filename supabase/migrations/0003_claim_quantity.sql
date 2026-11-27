-- One guest can take more than one spot on an item in a single claim
-- (e.g. "Natural wine ×3": one person brings two bottles).
-- Backwards compatible: existing claims count as 1, and p_count defaults to 1.

alter table public.claims
  add column quantity int not null default 1 check (quantity between 1 and 50);

drop function public.claim_slot(text, uuid, text, text, text, text);

-- Claim p_count spots on a slot. Locks the slot row so two guests can't both take the last spots.
create function public.claim_slot(
  p_slug text, p_slot_id uuid, p_guest_name text,
  p_detail text default null, p_dietary_note text default null, p_guest_email text default null,
  p_count int default 1
) returns table (claim_id uuid, edit_token uuid)
language plpgsql as $$
#variable_conflict use_column
declare
  v_quantity int;
  v_taken int;
begin
  if p_count is null or p_count < 1 or p_count > 50 then
    raise exception 'bad_count' using errcode = 'P0001';
  end if;

  select sl.quantity into v_quantity
  from public.slots sl
  join public.categories c on c.id = sl.category_id
  join public.sheets s on s.id = c.sheet_id
  where sl.id = p_slot_id and s.slug = p_slug
  for update of sl;

  if not found then
    raise exception 'slot_not_found' using errcode = 'P0002';
  end if;

  select coalesce(sum(quantity), 0) into v_taken from public.claims where slot_id = p_slot_id;
  if v_taken + p_count > v_quantity then
    raise exception 'slot_full' using errcode = 'P0001';
  end if;

  return query
    insert into public.claims (slot_id, guest_name, detail, dietary_note, guest_email, quantity)
    values (p_slot_id, p_guest_name, p_detail, p_dietary_note, p_guest_email, p_count)
    returning id, claims.edit_token;
end $$;

-- Only the server (service role / secret key) may call guest functions.
revoke execute on function public.claim_slot(text, uuid, text, text, text, text, int) from public, anon, authenticated;
grant execute on function public.claim_slot(text, uuid, text, text, text, text, int) to service_role;
