---
name: ship-feature
description: Run one piece of work through the full agent pipeline (product-manager, customer, tech-lead, engineer, qa, pr-reviewer) with a human checkpoint after planning. Use when the user says /ship-feature, "ship the next thing", or "run the pipeline" on a feature or bug.
---

# Ship one change through the pipeline

The main session is the orchestrator: subagents can't call each other, so you call each one in turn and pass the previous agent's output into the next prompt. Each agent starts with no memory of this conversation, so every prompt must include the file paths and text it needs.

Arguments: an optional feature or bug description. With none, the PM picks the top roadmap item.

## Before you start
- Check `git branch --show-current` and work on a fresh branch off `origin/main`. Other sessions share this checkout and may have switched branches.
- Dev and production share one Supabase project: every migration and every QA write is live.

## Steps

1. **product-manager**: "Pick the next item (or scope this request: <args>) and return a ticket." 
2. **customer** (only if the ticket has `ASK CUSTOMER` lines): pass each question plus the ticket. Always also ask the customer to walk the ticket's multi-item journey and react to its exact screen copy. Then send the answers back to **product-manager** to finalize the ticket.
3. **tech-lead**: pass the full ticket. It writes `docs/plans/<date>-<slug>.md`.
   - If the feature sends email or SMS, takes input without sign-in, or changes grants: send the plan to **pr-reviewer** for a plan review now, and fold its findings in before the checkpoint.
4. **Checkpoint: stop and show the user** the ticket and the plan summary (files, migration, risks), plus the walk-through (what a guest bringing two things receives) and every new screen's exact copy. Wait for an explicit go-ahead. Nothing gets implemented without it. (On the edit-link feature the owner caught "two emails for two items" and "way too much text" only after building; showing the walk-through and the copy here would have caught both.)
5. **engineer**: pass the plan path.
   - Migrations: read the SQL yourself, then apply them before QA. If `npm run db:migrate` is blocked for you, ask the user to run it and confirm the output.
6. **qa**: pass the plan path and the ticket's acceptance criteria.
   - FAIL: send the bug list to **engineer** with the plan path, then re-run **qa**. Max 2 loops, then stop and report to the user.
   - BLOCKED (e.g. no `.env.local`): tell the user what couldn't be tested and continue only if they agree.
7. **pr-reviewer**: "Review the uncommitted diff for <ticket title>."
   - REQUEST CHANGES: send blockers/majors to **engineer**, then re-run **qa** on the affected flows and **pr-reviewer** again. Max 2 loops.
8. **product-manager**: "This shipped: <title>. Update docs/ROADMAP.md."
9. Report to the user: what changed, QA result, review verdict, and ask whether to commit and push. Don't push to `main` without that yes, since it deploys production. Default to a branch plus a pull request (`gh` lives at `/opt/homebrew/bin/gh` if it's not on PATH).
10. **Real-phone check on the Vercel preview before merge.** Automation can't see the iOS keyboard, the AutoFill bar or date pickers, and all three caused bugs on the edit-link feature. Previews sit behind Vercel login: tell the user to make a Share link from the deployment page, sign in as host by typing the emailed code (the link redirects to production), and test on a sheet they host, since the demo sheet sends no email. Fix what they find on the same branch.

Keep your own messages between steps short: one line on which agent ran and its result.
If an agent's report doesn't arrive (it left background work running), start a fresh agent of that type with the same brief rather than waiting.
