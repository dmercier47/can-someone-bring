-- One private link per guest email per sheet. Emailed once; resolves to that email's claims on the sheet at open time.

-- Same normalization everywhere: trim + lowercase the whole address, sha256 hex (core function, no pgcrypto).
create function public.email_key(p text) returns text
language sql immutable as $$ select encode(sha256(convert_to(lower(btrim(p)), 'UTF8')), 'hex') $$;

create table public.guest_links (
  id                uuid primary key default gen_random_uuid(),
  sheet_id          uuid not null references public.sheets (id) on delete cascade,
  email_hash        text not null,                       -- email_key(address); the address stays only in claims
  token             uuid not null unique default gen_random_uuid(),
  send_attempted_at timestamptz,                         -- set when the one send is reserved
  sent_at           timestamptz,                         -- set after Resend accepted it
  created_at        timestamptz not null default now(),
  unique (sheet_id, email_hash)
);
create index on public.guest_links (sheet_id, created_at);
alter table public.guest_links enable row level security;   -- no policies
grant select, insert, update, delete on public.guest_links to service_role;
revoke all on public.guest_links from anon, authenticated;

-- Called after a claim with an email is saved. Decides whether to send the guest-link email.
create function public.claim_guest_link(p_slug text, p_claim_id uuid, p_edit_token uuid)
returns table (status text, link_id uuid, link_token uuid, guest_email text,
               sheet_title text, host_name text, starts_at timestamptz, time_zone text)
language plpgsql as $$
#variable_conflict use_column
declare v record; l record; v_hash text;
begin
  select cl.guest_email, s.id as sheet_id, s.title, s.host_name, s.starts_at, s.time_zone into v
  from public.claims cl
  join public.slots sl on sl.id = cl.slot_id
  join public.categories c on c.id = sl.category_id
  join public.sheets s on s.id = c.sheet_id
  where cl.id = p_claim_id and cl.edit_token = p_edit_token and s.slug = p_slug and cl.guest_email is not null;
  if not found then return query select 'none', null::uuid, null::uuid, null, null, null, null::timestamptz, null; return; end if;

  v_hash := public.email_key(v.guest_email);
  perform pg_advisory_xact_lock(hashtextextended(v.sheet_id::text, 0));   -- serialize per sheet

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

  insert into public.guest_links (sheet_id, email_hash, send_attempted_at)
  values (v.sheet_id, v_hash, now()) returning id, token into l;
  return query select 'send', l.id, l.token, v.guest_email, v.title, v.host_name, v.starts_at, v.time_zone;
end $$;

create function public.mark_guest_link_sent(p_link_id uuid) returns void
language sql as $$ update public.guest_links set sent_at = now() where id = p_link_id and sent_at is null $$;

-- Opening ?g=: every current claim on this sheet saved under that email. Doesn't require sent_at,
-- so a delivered email still works even if mark_guest_link_sent failed.
create function public.resolve_guest_link(p_slug text, p_token uuid)
returns table (claim_id uuid, edit_token uuid)
language sql stable as $$
  select cl.id, cl.edit_token
  from public.guest_links gl
  join public.sheets s on s.id = gl.sheet_id
  join public.categories c on c.sheet_id = s.id
  join public.slots sl on sl.category_id = c.id
  join public.claims cl on cl.slot_id = sl.id
  where s.slug = p_slug and gl.token = p_token
    and cl.guest_email is not null and public.email_key(cl.guest_email) = gl.email_hash
$$;

revoke execute on function public.email_key(text) from public, anon, authenticated;
revoke execute on function public.claim_guest_link(text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.mark_guest_link_sent(uuid) from public, anon, authenticated;
revoke execute on function public.resolve_guest_link(text, uuid) from public, anon, authenticated;
grant execute on function public.email_key(text) to service_role;
grant execute on function public.claim_guest_link(text, uuid, uuid) to service_role;
grant execute on function public.mark_guest_link_sent(uuid) to service_role;
grant execute on function public.resolve_guest_link(text, uuid) to service_role;
