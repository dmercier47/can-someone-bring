-- Can Someone Bring: initial schema.
--
-- Security model:
--   * Row Level Security is ON for every table.
--   * Guests never talk to the database directly. All guest reads/writes go through
--     Next.js server code using the secret key, which validates input and calls the
--     functions below. The anon/publishable key gets NO access to these tables, so
--     nobody can list every party (and its address) from the browser.
--   * Hosts (Supabase Auth users) can read and manage only their own sheets.

create extension if not exists pgcrypto;

-- ---------- Tables ----------

create table public.sheets (
  id                uuid primary key default gen_random_uuid(),
  host_id           uuid references auth.users (id) on delete cascade,
  slug              text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  title             text not null check (char_length(title) between 1 and 80),
  host_name         text not null check (char_length(host_name) between 1 and 60),
  starts_at         timestamptz not null,
  time_zone         text not null default 'America/New_York',
  location          text check (char_length(location) <= 120),
  host_note         text check (char_length(host_note) <= 500),
  partiful_url      text check (partiful_url ~ '^https://'),
  allow_guest_items boolean not null default true,
  created_at        timestamptz not null default now()
);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  sheet_id   uuid not null references public.sheets (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 40),
  sticker    text not null default 'plate',
  color      text check (color in ('yellow', 'pink', 'blue', 'mint', 'tomato')),
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
create index on public.categories (sheet_id, position);

create table public.slots (
  id               uuid primary key default gen_random_uuid(),
  category_id      uuid not null references public.categories (id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 80),
  quantity         int  not null default 1 check (quantity between 1 and 50),
  note             text check (char_length(note) <= 140),
  sticker          text,
  position         int  not null default 0,
  created_by_guest boolean not null default false,
  created_at       timestamptz not null default now()
);
create index on public.slots (category_id, position);

create table public.claims (
  id           uuid primary key default gen_random_uuid(),
  slot_id      uuid not null references public.slots (id) on delete cascade,
  guest_name   text not null check (char_length(guest_name) between 1 and 60),
  guest_email  text check (char_length(guest_email) <= 254),
  detail       text check (char_length(detail) <= 80),
  dietary_note text check (char_length(dietary_note) <= 120),
  -- Secret that lets a guest edit/undo their own claim. Never sent to other guests.
  edit_token   uuid not null default gen_random_uuid(),
  created_at   timestamptz not null default now()
);
create index on public.claims (slot_id);

-- ---------- Row Level Security ----------

alter table public.sheets     enable row level security;
alter table public.categories enable row level security;
alter table public.slots      enable row level security;
alter table public.claims     enable row level security;

create policy "hosts manage own sheets" on public.sheets
  for all to authenticated
  using (host_id = auth.uid()) with check (host_id = auth.uid());

create policy "hosts manage own categories" on public.categories
  for all to authenticated
  using (exists (select 1 from public.sheets s where s.id = sheet_id and s.host_id = auth.uid()))
  with check (exists (select 1 from public.sheets s where s.id = sheet_id and s.host_id = auth.uid()));

create policy "hosts manage own slots" on public.slots
  for all to authenticated
  using (exists (
    select 1 from public.categories c join public.sheets s on s.id = c.sheet_id
    where c.id = category_id and s.host_id = auth.uid()))
  with check (exists (
    select 1 from public.categories c join public.sheets s on s.id = c.sheet_id
    where c.id = category_id and s.host_id = auth.uid()));

-- Hosts can see and remove claims on their sheets (but not impersonate guests).
create policy "hosts read claims on own sheets" on public.claims
  for select to authenticated
  using (exists (
    select 1 from public.slots sl
    join public.categories c on c.id = sl.category_id
    join public.sheets s on s.id = c.sheet_id
    where sl.id = slot_id and s.host_id = auth.uid()));

create policy "hosts delete claims on own sheets" on public.claims
  for delete to authenticated
  using (exists (
    select 1 from public.slots sl
    join public.categories c on c.id = sl.category_id
    join public.sheets s on s.id = c.sheet_id
    where sl.id = slot_id and s.host_id = auth.uid()));

-- ---------- Guest functions (server-only) ----------

-- Claim one spot on a slot. Locks the slot row so two guests can't both take the last spot.
create or replace function public.claim_slot(
  p_slug text, p_slot_id uuid, p_guest_name text,
  p_detail text default null, p_dietary_note text default null, p_guest_email text default null
) returns table (claim_id uuid, edit_token uuid)
language plpgsql as $$
#variable_conflict use_column
declare
  v_quantity int;
  v_taken int;
begin
  select sl.quantity into v_quantity
  from public.slots sl
  join public.categories c on c.id = sl.category_id
  join public.sheets s on s.id = c.sheet_id
  where sl.id = p_slot_id and s.slug = p_slug
  for update of sl;

  if not found then
    raise exception 'slot_not_found' using errcode = 'P0002';
  end if;

  select count(*) into v_taken from public.claims where slot_id = p_slot_id;
  if v_taken >= v_quantity then
    raise exception 'slot_full' using errcode = 'P0001';
  end if;

  return query
    insert into public.claims (slot_id, guest_name, detail, dietary_note, guest_email)
    values (p_slot_id, p_guest_name, p_detail, p_dietary_note, p_guest_email)
    returning id, claims.edit_token;
end $$;

-- Add a guest's own item to a category and claim it, in one step.
create or replace function public.add_guest_item(
  p_slug text, p_category_id uuid, p_item_name text, p_guest_name text,
  p_dietary_note text default null, p_guest_email text default null
) returns table (slot_id uuid, claim_id uuid, edit_token uuid)
language plpgsql as $$
#variable_conflict use_column
declare
  v_slot_id uuid;
  v_pos int;
begin
  perform 1
  from public.categories c join public.sheets s on s.id = c.sheet_id
  where c.id = p_category_id and s.slug = p_slug and s.allow_guest_items;

  if not found then
    raise exception 'category_not_found' using errcode = 'P0002';
  end if;

  select coalesce(max(position), 0) + 1 into v_pos from public.slots where category_id = p_category_id;

  insert into public.slots (category_id, name, quantity, position, created_by_guest)
  values (p_category_id, p_item_name, 1, v_pos, true)
  returning id into v_slot_id;

  return query
    insert into public.claims (slot_id, guest_name, dietary_note, guest_email)
    values (v_slot_id, p_guest_name, p_dietary_note, p_guest_email)
    returning v_slot_id, id, claims.edit_token;
end $$;

-- Undo a claim. Requires the guest's secret edit token.
-- If the slot was added by a guest and is now empty, remove it too.
create or replace function public.drop_claim(p_claim_id uuid, p_edit_token uuid)
returns boolean
language plpgsql as $$
#variable_conflict use_column
declare
  v_slot_id uuid;
begin
  delete from public.claims
  where id = p_claim_id and edit_token = p_edit_token
  returning slot_id into v_slot_id;

  if v_slot_id is null then
    return false;
  end if;

  delete from public.slots sl
  where sl.id = v_slot_id and sl.created_by_guest
    and not exists (select 1 from public.claims where slot_id = v_slot_id);

  return true;
end $$;

-- Only the server (service role / secret key) may call guest functions.
revoke execute on function public.claim_slot(text, uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.add_guest_item(text, uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.drop_claim(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_slot(text, uuid, text, text, text, text) to service_role;
grant execute on function public.add_guest_item(text, uuid, text, text, text, text) to service_role;
grant execute on function public.drop_claim(uuid, uuid) to service_role;
