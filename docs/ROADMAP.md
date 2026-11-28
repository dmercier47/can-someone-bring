# Roadmap

Owned by the `product-manager` agent. Scope comes from `SPEC.md`; this file tracks order and status. Plans for in-flight work live in `docs/plans/`.

## Now
- _Nothing in flight._

## Next (v1 build order, in priority)
1. **Host board refreshes on open and focus**: numbers are right whenever the host opens or returns to `/sheets/[id]`. Customer says this is about 90% of the realtime value (hosts peek a couple of times, they don't watch). Cheap first slice of SPEC build step 4.
2. **Copy nudge message** for open items on the host board.
3. **OG preview images**: every `/s/[slug]` link unfurls in iMessage/Partiful with title and date. (Step 5)
4. **Day-before email reminders** to guests who left an email, via Resend. Reuses the guest email and private edit link (shipped), so every reminder says "change or drop it here". When it ships, restore the claim-sheet label to "Email · for your reminder and a link to change this", and retry guest-link emails where `sent_at` is null (today each gets one send attempt). (Step 6)
5. **Optional host email on claim** (off by default). (Notifications v1)
6. **Duplicate a past sheet** from the dashboard.
7. **Live host board (realtime)**: claims appear while the board is open, no focus change needed. The rest of SPEC step 4. Customer calls it a small nice-to-have once item 1 ships, so it sits here. It can drop below launch if the user agrees.
8. **Landing page polish and launch to friends.** (Step 7)

## Later / ideas
- **Change a claim in place** (quantity, "what exactly?", dietary note) from the edit link, instead of drop and reclaim. Only if guests ask.
- **"I'll bring it" button is 36px tall**, below the 44px tap-target rule. Guests notice it at 375px.
- **Name input has no maxlength**; the server quietly trims to 60, so a long name gets cut off without the guest seeing it.
- **"Copy" buttons show "Copied" even when both clipboard paths fail**, so the guest thinks they saved a link they didn't.
- **Proper nouns get lowercased mid-sentence** ("You're on jules's lasagna"), which reads as sloppy in the confirmation copy.
- _Add ideas here with one line on why. The PM promotes them to Next._

## Done
- Guest signup page (`/s/[slug]`), mobile first. (Step 1)
- Supabase schema, real data, claiming. (Step 2)
- Host auth, create from template, inline item editing. (Step 3)
- One-button "Copy sign-up link" share card and basic host board. (Step 4, partial)
- Guest can claim more than one spot on an item. (e064744)
- "Bring something else" guest items with duplicate nudge. (Step 2)
- "Invite" link back to Partiful in the guest page header when the host set a Partiful URL.
- Guest edit link, emailed or copied (`/s/[slug]/me?t=…`): optional email on the claim sheet, one email per guest per sheet whose link covers all their claims there, "Copy my link" backup, links reopen claims in any browser. No emails for sheets without a host (the demo). Caps: 30 new guest links per sheet per hour, 100 site-wide per hour. (SPEC v1 guest scope)
