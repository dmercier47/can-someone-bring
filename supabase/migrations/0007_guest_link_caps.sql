-- Abuse caps: no emails for host-less sheets (the demo), plus a global 100 new links per hour.

create or replace function public.claim_guest_link(p_slug text, p_claim_id uuid, p_edit_token uuid)
returns table (status text, link_id uuid, link_token uuid, guest_email text,
               sheet_title text, host_name text, starts_at timestamptz, time_zone text)
language plpgsql as $$
#variable_conflict use_column
declare v record; l record; v_hash text;
begin
  select cl.guest_email, s.host_id, s.id as sheet_id, s.title, s.host_name, s.starts_at, s.time_zone into v
  from public.claims cl
  join public.slots sl on sl.id = cl.slot_id
  join public.categories c on c.id = sl.category_id
  join public.sheets s on s.id = c.sheet_id
  where cl.id = p_claim_id and cl.edit_token = p_edit_token and s.slug = p_slug and cl.guest_email is not null;
  if not found then return query select 'none', null::uuid, null::uuid, null, null, null, null::timestamptz, null; return; end if;

  if v.host_id is null then return query select 'none', null::uuid, null::uuid, null, null, null, null::timestamptz, null; return; end if;  -- seeded demo sheet

  v_hash := public.email_key(v.guest_email);
  perform pg_advisory_xact_lock(hashtextextended('guest_links', 0));   -- one global lock keeps the global cap race-safe

  select gl.id, gl.sent_at into l from public.guest_links gl
  where gl.sheet_id = v.sheet_id and gl.email_hash = v_hash;
  if found then   -- one send per guest link, ever
    return query select case when l.sent_at is not null then 'linked' else 'none' end,
                        null::uuid, null::uuid, null, null, null, null::timestamptz, null;
    return;
  end if;

  if (select count(*) from public.guest_links gl
      where gl.sheet_id = v.sheet_id and gl.created_at > now() - interval '1 hour') >= 30 then
    return query select 'none', null::uuid, null::uuid, null, null, null, null::timestamptz, null; return;
  end if;

  if (select count(*) from public.guest_links gl where gl.created_at > now() - interval '1 hour') >= 100 then
    return query select 'none', null::uuid, null::uuid, null, null, null, null::timestamptz, null; return;
  end if;

  insert into public.guest_links (sheet_id, email_hash, send_attempted_at)
  values (v.sheet_id, v_hash, now()) returning id, token into l;
  return query select 'send', l.id, l.token, v.guest_email, v.title, v.host_name, v.starts_at, v.time_zone;
end $$;


revoke execute on function public.claim_guest_link(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_guest_link(text, uuid, uuid) to service_role;
