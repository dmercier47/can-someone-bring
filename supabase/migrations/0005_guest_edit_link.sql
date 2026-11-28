create index claims_edit_token_idx on public.claims (edit_token);

create function public.resolve_edit_tokens(p_slug text, p_tokens uuid[])
returns table (claim_id uuid, edit_token uuid)
language sql stable as $$
  select cl.id, cl.edit_token
  from public.claims cl
  join public.slots sl on sl.id = cl.slot_id
  join public.categories c on c.id = sl.category_id
  join public.sheets s on s.id = c.sheet_id
  where s.slug = p_slug and cl.edit_token = any(p_tokens) and cardinality(p_tokens) <= 20
$$;

revoke execute on function public.resolve_edit_tokens(text, uuid[]) from public, anon, authenticated;
grant execute on function public.resolve_edit_tokens(text, uuid[]) to service_role;
