# Can Someone Bring — Product Spec

> A signup sheet for dinner parties and house parties. Hosts list what's needed; guests claim it in two taps. Built to pair with Partiful.

## The core flow

1. Host drafts a Partiful event.
2. Host creates a **Can Someone Bring** sheet (title, date, items needed).
3. Host copies the sheet link and pastes it into the Partiful event description.
4. Host sends the Partiful invite.
5. Guests tap the link from Partiful / iMessage, claim something, done.

Everything about the product should serve that flow: the host's job is fast setup, the guest's job is a 10-second claim.

## Principles

- **Mobile web first.** Designed for a phone in a mobile browser; scales up to desktop, never the reverse. Big tap targets, thumb-reachable actions, no hover-only UI.
- **Guests never make an account.** Name is required; phone/email optional (for reminders and recovery).
- **Fast.** Guest page should be usable in under a second on 4G. Minimal JS on the guest page.
- **Looks good when shared.** Every sheet link has a rich preview (Open Graph image with title + date).
- **Friendly, not corporate.** Casual copy ("Someone's on dessert 🎉"), warm visual style.

## Visual identity — "Sentence Stack"

- **Light only**: cream paper (`#f6f1e7`), near-black ink, one hot accent (`#ff5a36`, the `?` in the wordmark).
- **Wordmark**: lowercase `can someone bring?` with the `?` in accent.
- **Type**: Bricolage Grotesque everywhere; extra-bold for emphasis, regular in a faint warm gray for connective text.
- **Header as a sentence**: "Sam's hosting **Friendsgiving** Saturday at 6pm. Can someone bring **stuffing** 🍞, **a pie** 🥧 and **ice** 🧊?" — bold words are live open items with inline stickers; it updates as things get claimed.
- **Big number**: "11 still needed" plus avatar initials of who's in.
- **Category cards**: saturated, rounded, overlapping stack. Every card is always expanded — guests scroll one list, no tapping to open categories. Default palette by position: yellow, pink, blue, mint, tomato. Hosts may optionally override per category; never required.
- **Stickers**: Microsoft Fluent 3D emoji (MIT), pinned CDN commit, see `src/lib/stickers.ts`. Each category has one; slots may have one (used in the header sentence).
- **Controls**: black pill buttons, round icon buttons, a floating black pill at the bottom ("Bring something else" / "You're bringing…").

## Users

| Who   | Account?            | Needs |
|-------|---------------------|-------|
| Host  | Yes (email magic link) | Create sheets fast, see what's covered, nudge people |
| Guest | No                  | See what's needed, claim it, change their mind later |

## v1 scope

### Host
- Sign in with email magic link.
- **Create sheet**: title, date/time, location (optional), note from host (optional), Partiful URL (optional).
- **Start from a template**: Dinner Party, Friendsgiving, BBQ, House Party, Blank.
- **Edit items**: categories (e.g. Mains, Sides, Desserts, Drinks, Supplies, Help) containing slots. A slot has a name, optional quantity ("Sides ×4" = 4 claimable spots), optional note.
- Toggle "guests can add their own items" (default on).
- **Share**: short link (`/s/k3x9ab`) + "Copy for Partiful" button that copies a ready-made line, e.g. `🍽 Can someone bring something? Claim a dish here: https://…/s/k3x9ab`.
- **Host board**: live view of covered vs. open, who's bringing what, dietary notes. "Copy nudge message" for open items.
- Dashboard listing the host's sheets (upcoming / past). Duplicate a past sheet.

### Guest
- Opens link → sees party header (title, date, host note, "Back to Partiful invite" if set).
- Items grouped by category; each slot shows **open** or **claimed by <first name>**.
- Tap an open slot → bottom sheet: name (remembered on the device), optional "what exactly?" note (e.g. "mac & cheese"), optional email for reminder → Claim.
- "Bring something else" → free-text item in a chosen category.
- Optional dietary note per guest ("vegetarian", "nut allergy").
- After claiming: confirmation, plus a private **edit link** (also stored on the device) to change or drop their claim.
- Duplicate nudge: when a guest adds a free-text item similar to an existing one, gently mention it.

### Notifications (v1)
- Day-before email reminder to guests who left an email ("You're on dessert for Sam's Friendsgiving tomorrow!").
- Optional email to host when someone claims something (off by default, daily digest later).

### Out of scope for v1
- Native mobile app
- SMS reminders (later via Twilio)
- Partiful API / importing guest list (no public API; link-in-description only)
- Cost splitting / Venmo links
- Headcount-based quantity suggestions
- Multiple co-hosts

## Data model (initial)

```
hosts        id, email, name, created_at
sheets       id, host_id, slug (short, unique), title, starts_at, location,
             host_note, partiful_url, allow_guest_items, created_at
categories   id, sheet_id, name, sticker, color (nullable → default palette), position
slots        id, category_id, name, quantity (default 1), note, sticker (nullable),
             position, created_by_guest (bool)
claims       id, slot_id, guest_name, guest_email, detail, dietary_note,
             edit_token (secret), created_at
```

- A slot is "full" when `count(claims) >= quantity`.
- Guests are identified by `edit_token` (stored in localStorage + sent in their edit link). No guest table in v1.

## Tech stack

- **Next.js (App Router) + TypeScript + Tailwind CSS**
- **Supabase**: Postgres, host auth (magic link), realtime for the host board. Row-level security on every table.
- **Vercel** hosting; preview deploy per change.
- **Resend** for transactional email.
- **Vercel OG** (`next/og`) for share-preview images.

## Screens

| Route                 | Who   | Purpose |
|-----------------------|-------|---------|
| `/`                   | All   | Landing: what it is, "Start a sheet" |
| `/login`              | Host  | Magic link sign-in |
| `/dashboard`          | Host  | List of sheets |
| `/new`                | Host  | Pick template → create sheet |
| `/sheets/[id]/edit`   | Host  | Edit details + items |
| `/sheets/[id]`        | Host  | Live board + share tools |
| `/s/[slug]`           | Guest | Public signup page |
| `/s/[slug]/me?t=…`    | Guest | Edit my claim |

## Build order

1. ✅ Guest signup page (`/s/[slug]`) with mock data — nail the mobile feel first.
2. ✅ Supabase schema + real data for the guest page; claiming works.
3. Host auth, create-from-template, edit items.
4. Host board with realtime + share/copy tools.
5. OG preview images.
6. Email reminders.
7. Landing page, polish, launch to friends.
