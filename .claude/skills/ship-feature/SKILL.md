---
name: ship-feature
description: Run one piece of work through the full agent pipeline (product-manager, customer, tech-lead, engineer, qa, pr-reviewer) with a human checkpoint after planning. Use when the user says /ship-feature, "ship the next thing", or "run the pipeline" on a feature or bug.
---

# Ship one change through the pipeline

The main session is the orchestrator: subagents can't call each other, so you call each one in turn and pass the previous agent's output into the next prompt. Each agent starts with no memory of this conversation, so every prompt must include the file paths and text it needs.

Arguments: an optional feature or bug description. With none, the PM picks the top roadmap item.

## Steps

1. **product-manager**: "Pick the next item (or scope this request: <args>) and return a ticket." 
2. **customer** (only if the ticket has `ASK CUSTOMER` lines): pass each question plus the ticket. Then send the answers back to **product-manager** to finalize the ticket.
3. **tech-lead**: pass the full ticket. It writes `docs/plans/<date>-<slug>.md`.
4. **Checkpoint: stop and show the user** the ticket and the plan summary (files, migration, risks). Wait for an explicit go-ahead. Nothing gets implemented without it.
5. **engineer**: pass the plan path.
6. **qa**: pass the plan path and the ticket's acceptance criteria.
   - FAIL: send the bug list to **engineer** with the plan path, then re-run **qa**. Max 2 loops, then stop and report to the user.
   - BLOCKED (e.g. no `.env.local`): tell the user what couldn't be tested and continue only if they agree.
7. **pr-reviewer**: "Review the uncommitted diff for <ticket title>."
   - REQUEST CHANGES: send blockers/majors to **engineer**, then re-run **qa** on the affected flows and **pr-reviewer** again. Max 2 loops.
8. **product-manager**: "This shipped: <title>. Update docs/ROADMAP.md."
9. Report to the user: what changed, QA result, review verdict, and ask whether to commit and push. Don't push to `main` without that yes, since it deploys production.

Keep your own messages between steps short: one line on which agent ran and its result.
