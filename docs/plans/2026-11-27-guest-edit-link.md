# Guest edit link: optional email on the claim (main fix) plus copy-link (backup)

Ticket (revised twice; acceptance criteria, phone at 375px unless noted):

**Claim sheet** (both "I'll bring it" and "Bring something else"):
- One quiet optional field above the claim button, below name and dietary note.
- Label "Email · for your reminder and a link to change this", placeholder "you@email.com", helper "Only used for this sheet. No account."
- 16px text, `type=email`, `autocomplete=email`.
- Blank = the same two taps as today, and no email.
- The email is remembered in this browser (next to `csb:name`) and pre-filled on the next claim on any sheet. The guest can clear it.

**Validation**:
- Malformed input ("jules@") shows "That email looks off." inline and blocks until it's fixed or cleared.
- Common domain typos show a tappable, non-blocking "Did you mean you@gmail.com?".
- The server also trims, lowercases the domain, checks the format and enforces max 254.

**One email per guest per sheet**:
- The first claim on a sheet with a given email sends one email from hello@mail.cansomeonebring.com (Resend REST via `fetch`, `RESEND_API_KEY`, `RESEND_FROM`): "You're on the list for <host>'s <title>, <when>. Change what you're bringing here." plus that guest's **guest link**.
- The guest link resolves when it's opened to every current claim on that sheet whose saved email matches, including claims made after the email was sent.
- Later claims on the same sheet with the same email send nothing.
- A different email, or a different sheet, gets its own link and email.
- Sent after the claim is saved. A send error or a slow send never fails or noticeably delays the claim.
- The future day-before reminder sends one email per guest link and reuses it.

**Confirmation** (the bottom sheet stays open after success):
- "Iconic. You're on <item>." / "Your private link. Open it anywhere to undo." / a "Copy my link" pill that changes to "Copied".
- Then either "It's in your inbox too." (an email just went out) or "Your link in your inbox has this too." (this guest's link already exists and was sent), or nothing.
- Close via Done, the backdrop or the close icon.
- The copied link is the claim-token bundle from this browser's storage, covering all its claims on the sheet. The floating bar also offers "Copy my link".

**Opening any link** (guest link or copied link):
- Claims are marked "You" with Undo.
- Toast "Welcome back. You're on <item>."
- The claims merge into `csb:mine:<slug>`.
- The address bar ends on `/s/<slug>`.

**Dead link** (dropped, deleted, other sheet, garbled): the sheet opens normally, toast "That one's already off the list.", nothing marked "You".

**Abuse caps**: one send per guest link ever, plus a per-sheet cap on new guest links per hour (30). Past the caps, skip silently; the claim still succeeds.

**Security gap**: a signed-in host calling the Supabase API directly with their own session cannot read `guest_email` or `edit_token`. `getHostSheet` and `listHostSheets` still work.

Old claims still work in their original browser. Visual rules: 16px+ inputs, ≥44px tap targets, pill radius for the copy action, no emoji, no em dashes, 4.5:1 contrast.

Out of scope: guest accounts, SMS, day-before reminders, editing in place, host resend/reset, expiring links, unsubscribe/preferences, a live guest page.

## Approach

**Two link forms, both under `/s/<slug>/me`:**
- Copied link: `?t=<hex32>.<hex32>…`. Each part is one claim's `edit_token` with dashes removed, lowercased, joined by `.`, max 20. It's built in the browser from `csb:mine:<slug>`.
- Guest link (emailed): `?g=<hex32>`, the `token` of a `guest_links` row for (sheet, email hash). It only ever exists server-side and in that guest's inbox.

`/s/[slug]/me` is a dynamic server page. It resolves both forms server-side, scoped to the slug:
- `resolve_edit_tokens(slug, tokens[])` returns the claims whose `edit_token` is in the list.
- `resolve_guest_link(slug, token)` finds the guest link, then every current claim on that sheet where `email_key(claims.guest_email) = guest_links.email_hash`.

Both return only `(claim_id, edit_token)` pairs. The page then renders a tiny client step (`RestoreClaims`) that:
- merges them into `csb:mine:<slug>`,
- leaves a one-shot flash in sessionStorage for the toast,
- `router.replace`s to `/s/<slug>`.

Undo then uses the existing `drop_claim(claim_id, edit_token)`.

Why the hop instead of rendering the board on `/me`: after `history.replaceState`, the next `router.refresh()` (which runs after every claim and on refocus) fetches the `/s/[slug]` page segment. React would then remount the board, close the confirmation sheet and drop the toast. The owner accepted that `?t=` / `?g=` appear in Vercel's owner-only request logs.

**Why a separate guest-link token instead of emailing claim tokens:** the PO wants one email per guest per sheet that keeps covering later claims. A stable random token per (sheet, email) does that. Because the link resolves by email match at open time, claims made later under the same address join automatically.

**Email off the critical path: two server actions.**
- `claimSlot` / `addGuestItem` save the claim with `p_guest_email` (the RPCs already accept it). They return as fast as today and never call Resend.
- If an email was given, the client shows the confirmation at once and, in the same tick, fires `sendClaimEmail(slug, claimId, editToken)` without awaiting it.
- That action calls `claim_guest_link` (one atomic DB call). The function:
  - proves claim ownership with the token,
  - reads the address server-side,
  - takes a per-sheet lock,
  - then returns one of `send` (a new guest link was created and the send reserved), `linked` (this guest's link already exists and was sent) or `none`.
- On `send`, the action calls Resend with a 5s timeout and `Idempotency-Key: guest-link/<link id>`. On success it calls `mark_guest_link_sent(link_id)`.
- It returns `{ status: "sent" | "linked" | "none" }` and **never** the guest-link token or URL. Whoever typed the address may not own it.
- The confirmation line updates when the action resolves.
- Why not `after()`: the client couldn't learn whether the send was accepted. Why not await Resend in the claim action: a slow Resend would slow the claim.

**Caps, stored in `guest_links`:**
- One send per guest link ever: the row is created with `send_attempted_at = now()` and never re-sent, even if Resend failed. The copy link is the backup, and the reminder ticket will reuse the link.
- New guest links per sheet per hour are capped at 30 (`count(*) where created_at > now() - 1h`). Over the cap, no row is created and the result is `none`, so a later claim with that email can try again once under the cap.
- The per-claim send log from the previous plan is dropped.

**Security gap.** In a new migration, replace the table-wide `select` on `claims` for `authenticated` with a column-level grant that leaves out `guest_email` and `edit_token`. Host code only ever selects named columns (`SHEET_SELECT`, and `claims ( quantity )` in `listHostSheets`).

## Files

New:
- `supabase/migrations/0004_hide_claim_secrets.sql`, `0005_guest_edit_link.sql`, `0006_guest_links.sql` (outlined below).
- `src/lib/edit-link.ts` (isomorphic, pure):
  - `editLinkUrl(origin, slug, tokens[])` builds `?t=` (strips dashes, lowercases, joins with `.`, caps at 20).
  - `guestLinkUrl(origin, slug, token)` builds `?g=`.
  - `parseEditTokens(raw: unknown): string[]`: first value if an array, slice to 1000 chars, split on `.`, strip `-`, keep `/^[0-9a-f]{32}$/`, re-dash, dedupe, cap 20.
  - `parseGuestToken(raw: unknown): string | null`: the same rules for one token.
  - Neither parser ever throws.
- `src/lib/email.ts` (isomorphic, pure):
  - `normalizeEmail(raw): string | null` trims, lowercases the domain only, checks `^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$`, and returns null past 254.
  - `suggestEmail(raw): string | null` uses a typo map: gmial/gmal/gmai/gnail.com → gmail.com, hotmial/hotmal.com → hotmail.com, yaho/yahooo.com → yahoo.com, icloud.co/iclod.com → icloud.com, outlok.com → outlook.com, and `.con`/`.cmo` → `.com`.
  - Matching guest links uses SQL `email_key()` (lowercases the whole address), so "Jules@gmail.com" and "jules@gmail.com" are the same guest.
- `src/lib/guest-storage.ts` (browser helpers):
  - Moves `mineKey` / `MyTokens` / `loadTokens` out of `SignupBoard.tsx` unchanged: key `csb:mine:<slug>`, shape claimId → token.
  - `addTokens(slug, add)` / `removeToken(slug, id)` read the current localStorage value, change it and write it back, so they never overwrite.
  - `NAME_KEY` plus a new `EMAIL_KEY = "csb:email"` with `loadEmail` / `saveEmail` (empty removes the key).
  - `setFlash(slug, ids)` / `takeFlash(slug)` on sessionStorage `csb:flash:<slug>`.
  - Every storage call is wrapped in try/catch.
- `src/lib/clipboard.ts`: `copyText(text)` lifted from `ShareTools.tsx`, with the iOS fallback hardened: `readonly`, `position: fixed`, `opacity: 0`, `font-size: 16px`, `setSelectionRange(0, len)`.
- `src/lib/mail.ts` (`server-only`):
  - `sendEmail({ to, subject, text, html, idempotencyKey }): Promise<boolean>` POSTs to `https://api.resend.com/emails` with `Authorization: Bearer ${RESEND_API_KEY}`, `from: RESEND_FROM`, `AbortSignal.timeout(5000)`.
  - It returns `res.ok` and never throws.
  - On failure it logs only `resend ${status}`, never the body, address or link.
  - `guestLinkEmail({ title, hostName, when, url })` builds:
    - subject "You're on the list for <title>",
    - text "You're on the list for <host>'s <title>, <when>. Change what you're bringing here." plus the URL,
    - minimal HTML with every interpolated value escaped.
  - CR/LF are stripped from the subject. No images, no footer. No guest-entered text in the email at all.
- `src/app/s/[slug]/me/page.tsx` (server):
  - `export const dynamic = "force-dynamic"`.
  - Metadata `{ title: "Can Someone Bring", robots: { index: false, follow: false }, referrer: "no-referrer" }`.
  - Slug regex check, otherwise `notFound()`. `supplied = t !== undefined || g !== undefined`.
  - `Promise.all([resolveEditTokens(slug, parseEditTokens(t)), resolveGuestLink(slug, parseGuestToken(g))])`, merged into `mine`.
  - Renders the guest nav wordmark, `<RestoreClaims slug mine supplied />` and a `<noscript>` "Open the sheet" link (`ui.pillOutline`).
  - No `<Sticker>` or other third-party resources.
- `src/app/s/[slug]/me/RestoreClaims.tsx` (client):
  - Runs once (ref guard as in `ConfirmSignIn`).
  - `addTokens(slug, mine)`; `if (supplied) setFlash(slug, Object.keys(mine))`; `router.replace(\`/s/${slug}\`)`.
  - Renders `<p role="status" className="text-muted">One sec.</p>`.

Changed:
- `src/lib/sheets.ts` (admin client RPCs; every one returns empty/null on error and never logs):
  - `resolveEditTokens(slug, tokens): Promise<Record<string,string>>`
  - `resolveGuestLink(slug, token | null): Promise<Record<string,string>>`
  - `claimGuestLink(slug, claimId, editToken)`: returns `{ status: "send", linkId, linkToken, guestEmail, title, hostName, startsAt, timeZone } | { status: "linked" | "none" }`.
  - `markGuestLinkSent(linkId)`.
  - `SHEET_SELECT` and its "never select" comment stay untouched.
- `src/app/s/[slug]/actions.ts`:
  - Add `guestEmail?: string` to `GuestInput`. In `claimSlot` / `addGuestItem`: if it's non-blank and invalid, return `{ ok: false, error: "That email looks off." }`. Otherwise pass `p_guest_email: normalized ?? null`.
  - Return `emailed: boolean`.
  - New `sendClaimEmail(slug, claimId, editToken): Promise<ActionResult<{ status: "sent" | "linked" | "none" }>>`:
    - Validate the inputs; `r = await claimGuestLink(...)`; if `r.status !== "send"`, return `r.status`.
    - Otherwise build `url = guestLinkUrl(origin, slug, r.linkToken)`, with origin = `process.env.NEXT_PUBLIC_SITE_URL ??` the forwarded headers (same as `/sheets/[id]/page.tsx`).
    - `ok = await sendEmail(...)`; if ok, `await markGuestLinkSent(r.linkId)`.
    - Return `ok ? "sent" : "none"`.
    - Never return `linkToken` or `url`.
  - `dropClaim` is unchanged.
- `src/app/sheets/[id]/ShareTools.tsx`: uses `copyText`. No visible change.
- `src/components/SignupBoard.tsx`:
  - Storage: use the helpers. `setTokens(addTokens(...))` / `setTokens(removeToken(...))` replace the `{...tokens}` spreads, which fixes a stale-closure overwrite. Load and pass `defaultEmail`. On a successful claim, `saveEmail(given ?? "")`.
  - New `EmailField`, rendered after `<NameAndDiet>` and before `<SubmitButton>` in both `ClaimForm` and `CustomForm`:
    - `ui.label` with the ticket's label; `<input className={ui.input} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" spellCheck={false} placeholder="you@email.com" enterKeyHint="done">`.
    - Helper `text-[13px] text-faint`.
    - The error "That email looks off." (`text-[13px] text-accent`, `aria-live="polite"`) appears after blur or a submit attempt.
    - The typo hint is a button `h-11 text-[14px] text-accent` "Did you mean <x>?". It fills the field and doesn't block.
    - Submit is disabled while the email is non-blank and invalid. Add `noValidate` on the forms.
  - Panel: `{ kind: "done"; claimId; title; sticker; email: "none" | "sending" | "sent" | "linked" }`.
    - On success, show it instead of closing with a toast.
    - If `emailed`, `void sendClaimEmail(...).then(r => r.ok && setPanel(p => p?.kind === "done" && p.claimId === claimId ? { ...p, email: r.data.status } : p))`.
    - Keep `router.refresh()`. Error paths stay as they are.
  - Done panel inside the existing `BottomSheet`:
    - The line "Your private link. Open it anywhere to undo." (`text-[15px] text-muted`).
    - The `CopyMyLinkButton` pill (`ui.pill w-full mt-5`, `LinkIcon` → `CheckIcon` "Copied" for 2.5s, `aria-live`, `autoFocus`).
    - `<p role="status" className="mt-3 text-center text-[14px] text-muted">`: "It's in your inbox too." for `sent`, "Your link in your inbox has this too." for `linked`, nothing otherwise.
    - "Done" as a text button `h-12 w-full text-[16px] text-muted`.
  - `CopyMyLinkButton` builds `editLinkUrl(location.origin, slug, myClaims.map(c => tokens[c.id]))` synchronously in the tap handler, then calls `copyText`.
  - Floating bar: when `myClaims.length > 0`, show the compact pill `h-11 shrink-0 rounded-full border border-pill-ink/25 px-4 text-[14px] text-pill-ink`, text only, with a fixed min-width. The plus button goes `size-10` → `size-11`.
  - `SlotRow` Undo: `h-9` → `h-11`.
  - Mount: `takeFlash(slug)` into a ref, then an effect builds the toast:
    - restored claims present: `Welcome back. You're on ${labels}.`
    - otherwise: `That one's already off the list.`
    - Keep lint clean.
- `next.config.ts`: `async headers()` for `/s/:slug/me` sets `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex, nofollow`. Cache-Control comes from `force-dynamic`.

Not changed: `src/app/s/[slug]/page.tsx`, `src/lib/supabase/*`, `src/middleware.ts`, `HostBoard.tsx`, the host actions.

## Data/migration

Three new files, applied in order by `npm run db:migrate`.

`0004_hide_claim_secrets.sql`:

```sql
-- Hosts could read guest_email and edit_token through the API. Grant only the columns hosts need.
revoke select on public.claims from authenticated;
grant select (id, slot_id, guest_name, quantity, detail, dietary_note, created_at) on public.claims to authenticated;
-- delete stays granted (0002); its RLS check only reads slot_id, granted above.
```

`0005_guest_edit_link.sql`:

```sql
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
```

`0006_guest_links.sql`:

```sql
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
```

- No change to `claim_slot` / `add_guest_item`: they already store `p_guest_email`.
- The future reminder ticket can add `reminded_at` to `guest_links` and send one reminder per row.

## Security notes

- Which client is used where:
  - Guest reads and writes (`/me`, both resolvers, `claimGuestLink`, `markGuestLinkSent`, `sendClaimEmail`) use `supabaseAdmin()` in server code only.
  - Hosts keep `supabaseServer()`. After 0004, their sessions can't select `guest_email` / `edit_token` through the raw API (`select=*` on claims now errors for hosts, as intended). Hosts have no access to `guest_links`.
- What must not leak:
  - The guest-link token reaches only the inbox. `sendClaimEmail` returns a status, never the token or URL. Whoever types an address may not own it, so claims made under someone else's address only join that person's link, and the person who typed it never gets the link.
  - `/me` returns only `(claim_id, edit_token)` pairs for that slug: for `?t=`, only the tokens the request supplied; for `?g=`, that guest's own claims.
  - Cross-sheet, unknown, dropped and garbled tokens give the identical empty result and the same toast.
  - The address leaves the browser once, in the claim action, and is never returned to any client.
  - `RESEND_API_KEY` is server-only.
  - No logging of addresses, tokens, links or Resend bodies. No analytics.
- `/me`: `no-referrer` as a header and a meta tag, noindex, dynamic (not CDN-cached), no third-party resources, `router.replace` keeps it out of history.
- Email links use a fixed origin in production (`NEXT_PUBLIC_SITE_URL`), not the request `Host` header.
- Threat model as in SPEC: anyone holding a link can drop the claims it resolves to. No claim rate limit in v1.

## Risks

- **Grant change (0004) applies to production the moment it runs**: dev and production share one Supabase project.
  - Any host query that touches claims without naming columns now fails. Today there are none.
  - Future `claims` columns need explicit host grants.
  - Future host-board realtime must be checked against column grants.
- **Small information signal.** If someone enters an address that already has a sent guest link on this sheet, they see "Your link in your inbox has this too." That tells them the address was used on this sheet before. They gain no access. PM to accept, or use "It's in your inbox too." for both cases.
- **One attempt ever.** If Resend is down or the request times out on a guest's first emailed claim, that guest gets no email for that sheet, and later claims show no inbox line. The copy pill is the backup, and the reminder ticket can retry where `sent_at is null`. If Resend actually accepted a send that we timed out on, the link still works, because resolution doesn't require `sent_at`.
- **Two claims in quick succession with the same email**: the second one sees an existing link that isn't sent yet and shows no inbox line. This is cosmetic only.
- **Server actions run one at a time per browser.** An Undo tapped during a send waits up to 5s.
- Deliverability: the first sends from a new domain may land in spam. The email contains no guest-entered text, so the item-name spam vector is gone.
- The pre-filled email on a shared device belongs to the last person. The guest can clear it.
- `SignupBoard.tsx` is the whole guest page. The storage refactor must keep `csb:mine:<slug>` byte-identical. The taller forms need a check at 375px with the keyboard open.
- `ShareTools` (the host's main CTA) moves onto `copyText`. In-app browsers can refuse `navigator.clipboard`.
- Hosts can't delete a single claim in the UI. QA covers that case by deleting the item or a claim row in SQL.
- Pre-existing, not fixed here: the "I'll bring it" button is `h-9` (36px). Follow-up.

## Steps

1. Write the three migrations, run `npm run db:migrate` and the privilege checks. Load `/dashboard`, `/sheets/<id>` and `/s/demo` signed in to confirm hosts still work after 0004.
2. Add `src/lib/edit-link.ts` and `src/lib/email.ts`. Sanity-check them in a scratch script:
   - token round-trips; garbage, empty, `undefined` and array input; the cap of 20;
   - `jules@` invalid; `Jules@Gmail.COM` → `Jules@gmail.com`; the gmial suggestion.
3. Add the four RPC wrappers to `src/lib/sheets.ts`, and add `src/lib/mail.ts`.
4. Extend `claimSlot` / `addGuestItem` with `guestEmail`, and add `sendClaimEmail`.
5. Add `src/lib/clipboard.ts` and switch `ShareTools.tsx` to it.
6. Add `src/lib/guest-storage.ts` and switch `SignupBoard` to it with no behavior change. Check that existing claims still show "You"/Undo.
7. Add `/s/[slug]/me` (page + `RestoreClaims`) and the headers. Test hand-built `?t=` and `?g=` links.
8. Add `EmailField` to both forms.
9. Add the done panel, `CopyMyLinkButton`, the inbox lines and the bar button. Bump Undo and the bar plus to 44px.
10. Run `npx tsc --noEmit && npm run lint`, then the QA flows at 375px.

## Verification

Commands:
- `npx tsc --noEmit && npm run lint`
- `npm run db:migrate` (expect 0004, 0005 and 0006 to be applied), then `npm run db:seed`.
- Privileges:
  `node --env-file=.env.local -e "const s=require('postgres')(process.env.DATABASE_URL,{ssl:'require'});s\`select has_column_privilege('authenticated','public.claims','guest_email','select') email, has_column_privilege('authenticated','public.claims','edit_token','select') token, has_column_privilege('authenticated','public.claims','guest_name','select') name, has_table_privilege('authenticated','public.guest_links','select') auth_links, has_function_privilege('anon','public.resolve_guest_link(text, uuid)','execute') anon_g, has_function_privilege('authenticated','public.claim_guest_link(text, uuid, uuid)','execute') auth_claim\`.then(x=>{console.log(x);s.end()})"`
  Expect everything false except `name`.
- Host session against the raw API:
  1. Sign in with `npm run dev:login -- host@example.test 3000`.
  2. Copy `access_token` from the `sb-<ref>-auth-token` cookie.
  3. `curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/claims?select=guest_email,edit_token" -H "apikey: $NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" -H "Authorization: Bearer <access_token>"` should be denied (42501).
  4. `select=*` should also be denied.
  5. `select=id,guest_name` works.
  6. `rest/v1/guest_links?select=*` should be denied.
- The publishable key against `rpc/resolve_guest_link`, `rpc/claim_guest_link` and `rpc/resolve_edit_tokens` should be denied.
- Headers: `curl -sI "http://localhost:3000/s/demo/me?g=zz"` shows `Referrer-Policy: no-referrer`, `X-Robots-Tag` and `no-store`. For production-mode headers, stop `npm run dev` first, then `npm run build && npm start`. Repeat against production after deploy.
- No leak:
  - After an emailed claim, the Network tab response of `sendClaimEmail` contains only the status.
  - `curl -s http://localhost:3000/s/demo | grep -c <token-hex>` gives 0.
  - Host board view source has no token and no address.
- Caps:
  - Claim, undo and claim again with the same email: exactly 1 email, and `select count(*) from guest_links` stays at 1.
  - Insert 30 recent `guest_links` rows for the sheet in SQL, then claim with a new email: no email, the claim succeeds, and no inbox line appears.

QA flows (phone at 375px via `http://<mac>.local:3000`, Safari private as Browser B, real inboxes you control):
1. Blank email: the same two taps, a confirmation with the copy pill and Done, no inbox line, no email.
2. First claim with an email: the confirmation appears as fast as in flow 1, then "It's in your inbox too.". One email arrives with "You're on the list for <host>'s <title>, <when>. Change what you're bringing here." and one link.
3. A second claim on the same sheet with the same email (including via "Bring something else"): no new email, and the line reads "Your link in your inbox has this too.". Open the emailed link in Browser B: both claims are "You", including the one made after the email.
4. A different email on the same sheet gets its own email; its link shows only that email's claims. The same email on another sheet gets that sheet's own email.
5. Validation: `jules@` blocks with "That email looks off."; clearing it unblocks. `you@gmial.com` shows the tappable suggestion; submitting without tapping still works.
6. Remembered email: it's pre-filled on another sheet. Clear it and claim: no email, and the field stays empty next time.
7. A bad `RESEND_API_KEY` in `.env.local` (restart dev): the claim succeeds at normal speed with no inbox line. Restore the key: a second claim with that email on that sheet still sends nothing (one attempt ever).
8. Copy link: the floating bar offers "Copy my link" only when this browser has claims. Two claims, copied after the second: both show as "You" in B. If B holds its own claim, the result is merged.
9. After any link: the address bar shows `/s/<slug>` and the toast says "Welcome back. You're on …". Undo in B reopens the slot in B, on the host board after reload, and in A after refresh.
10. Dead links: a guest link whose claims were all dropped, a host-deleted item, a swapped slug (both `?t=` and `?g=`) and garbage values all open the sheet with "That one's already off the list." and nothing marked "You". With no params the page opens normally with no toast.
11. A pre-deploy claim still shows "You"/Undo, and "Copy my link" works for it.
12. Copy in the iMessage and Partiful in-app browsers. Host "Copy sign-up link" still works.
13. Visual: 16px email input, 44px+ tap targets, a pill-shaped copy action, no emoji or em dashes, `text-faint` helper, the bar doesn't overflow at 375px, and the field and button stay reachable with the keyboard open.
