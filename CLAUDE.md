# Can Someone Bring

Signup sheets for dinner parties and house parties, shared via a link in a Partiful invite.

- Read `SPEC.md` first: product flow, v1 scope, data model, build order.
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind v4 + Supabase (hosted). Resend is planned, not wired up yet.
- Database: SQL migrations in `supabase/migrations/` (append new numbered files, never edit applied ones). `npm run db:migrate` applies them, `npm run db:seed` resets the demo sheet at `/s/demo`. Both use `DATABASE_URL` from `.env.local` (see `.env.example`). No Docker/Supabase CLI.
- Security model: RLS on every table; the browser (anon/publishable key) gets no table access. Guest reads/writes go through server code (`src/lib/sheets.ts`, `src/app/s/[slug]/actions.ts`) using the secret key in `src/lib/supabase/admin.ts` (server-only). Never send `edit_token` or `guest_email` to the client except a guest's own token right after they claim. New Supabase projects don't auto-grant table privileges: add explicit `grant`s for new tables (see `0002_grants.sql`).
- **Mobile web first**: design every screen at 375px wide, then scale up. Inputs use 16px text (prevents iOS zoom), tap targets ≥ 44px, no hover-only UI, respect `env(safe-area-inset-*)`.
- Visual identity is "Sentence Stack" (see SPEC.md). Light only, no dark mode for now.
- Colors are tokens in `src/app/globals.css` (`bg-bg`, `text-ink`, `text-faint`, `bg-pill`, `bg-cat-yellow`, …); don't hardcode hex values in components.
- Stickers: use `<Sticker name="pie" />` (`src/components/Sticker.tsx`); add new keys in `src/lib/stickers.ts` and check the URL returns 200.
- Guests never create accounts. Hosts sign in with email magic links.
- Run: `npm run dev` → http://localhost:3000. Check: `npx tsc --noEmit && npm run lint`.
