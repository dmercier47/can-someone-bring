# Retro: guest edit link (PRs #4, #5)

Shipped: optional guest email (one email per guest per sheet) plus a copy-link backup, a fix so hosts can no longer read guest emails or tokens, and abuse caps. Phone testing also turned up host-board bugs, fixed in #5.

## What the owner caught that the pipeline didn't
- One email per claim: a guest bringing two things would get two emails.
- Too much text on the claim confirmation; the email field didn't read as optional.
- iPhone only: the page showed through above the keyboard, Cancel and Delete did nothing (`confirm()` silently blocked), and the date field overflowed.

## What each role is changing
| Role | Miss | New habit |
| --- | --- | --- |
| Product manager | Followed build order past a broken v1 promise; per-claim email; wordy copy | Broken promise = priority 1; every ticket has a multi-item walk-through and exact screen copy |
| Customer | Judged the flow as one claim; approved copy it would skim | Claim 2-3 items and count emails, taps and lines; picture the keyboard; quote approved copy |
| Tech lead | Per-sheet cap only; reserved the send before checking config; iOS risk named but not explained | "Abuse and cost" and "Phone check" sections; check before reserving; list the iOS traps |
| Engineer | Missing `.catch`; send before env check; reused a casing helper untested | Re-read own diff for failure paths; no `confirm()` or `scrollIntoView` in overlays; "Not tested" list |
| QA | Table-wide delete on the shared DB; Chromium hid iOS bugs; auto-dismissed dialogs; stray background work lost a report | Delete only own rows by id; WebKit main pass; grep for `confirm(`; flag real-phone checks up top; no background work left running |
| PR reviewer | Abuse found after build; saw a `confirm()` nearby and skipped it | Offer a plan review for risky features; "Pre-existing" findings; iOS traps flagged as major |
| Orchestrator | Showed the plan without the walk-through or copy; no phone check step | Checkpoint shows walk-through and copy; plan review for risky features; real-phone check on the preview before merge |

Role files: `.claude/agents/*.md`. Pipeline: `.claude/skills/ship-feature/SKILL.md`.
