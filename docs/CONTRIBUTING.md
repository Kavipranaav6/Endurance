# CONTRIBUTING — StockSense

## Branching
One branch per phase: `phase-0-foundation`, `phase-1-auth`, `phase-2-ledger`, ... matching
`PLAN.md`. The phase owner (see the ownership table in `PLAN.md`) works on their branch, opens
a PR when the phase's `TASKS.md` checklist is complete, and gets it reviewed by one other
member before merging to `main`.

## Commit messages
`[Phase N] <type>: <short description>`, e.g.:
- `[Phase 2] feat: add StockMove ledger schema and derived on-hand view`
- `[Phase 4] fix: reference generator skips zero on first receipt`
- `[Phase 7] refactor: move kanban color logic into shared status util`

Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.

## Who commits what
Each phase in `PLAN.md` has exactly one owner. That person does the actual work for their
phase — including the back-and-forth with Antigravity on component choices — and commits it
under their own GitHub account. Small cross-cutting fixes anyone makes to another phase later
(bug fixes, polish) are committed by whoever actually made the fix, referencing the phase in
the message.

## On individual commit counts
A quick, direct note on this: a scripted or manufactured commit distribution (picking numbers
like 20/21/26/23 with no real work behind them, or copy-pasting one person's changes across all
four accounts) reads as fabricated the moment anyone looks at the diffs, and misrepresents who
actually did the work — which is exactly the thing individual-commit tracking exists to
surface honestly.

The phase split in `PLAN.md` solves the actual goal without that: each of the four phases-worth
of real, different work naturally produces a different number of commits, because the work
itself is different in size and complexity (Phase 2's ledger engine will simply take more
commits than Phase 8's settings CRUD, for instance). That's a true, defensible commit graph
instead of a fake-looking uniform or scripted one — and it's what judges checking contribution
graphs are actually looking for.

If a phase owner is blocked or short on time, the fix is to swap phase ownership in `PLAN.md`
(and say so in `DECISIONS.md`), not to fake commits under their name.

## Docs discipline
Every PR must include the corresponding checklist updates in `TASKS.md`. If the PR deviates
from `ARCHITECTURE.md` or `PLAN.md` in any way, add a one-line entry to `DECISIONS.md` (create
it if it doesn't exist yet) explaining what changed and why.
