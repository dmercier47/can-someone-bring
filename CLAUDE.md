# Can Someone Bring

Signup sheets for dinner parties and house parties, shared via a link in a Partiful invite.

- Read `SPEC.md` first: product flow, v1 scope, data model, build order.
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind v4. Supabase and Resend are planned, not wired up yet.
- Data is mocked in `src/lib/mock.ts` until Supabase lands. Demo sheet: `/s/demo`.
- **Mobile web first**: design every screen at 375px wide, then scale up. Inputs use 16px text (prevents iOS zoom), tap targets ≥ 44px, no hover-only UI, respect `env(safe-area-inset-*)`.
- Visual identity is "Sentence Stack" (see SPEC.md). Light only, no dark mode for now.
- Colors are tokens in `src/app/globals.css` (`bg-bg`, `text-ink`, `text-faint`, `bg-pill`, `bg-cat-yellow`, …); don't hardcode hex values in components.
- Stickers: use `<Sticker name="pie" />` (`src/components/Sticker.tsx`); add new keys in `src/lib/stickers.ts` and check the URL returns 200.
- Guests never create accounts. Hosts sign in with email magic links.
- Run: `npm run dev` → http://localhost:3000. Check: `npx tsc --noEmit && npm run lint`.
