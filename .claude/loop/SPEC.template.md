# Loop spec: <title>

**Issue:** #<number> (or "none")
**Branch:** loop/<slug>

## Goal
One or two sentences describing the finished state.

## Acceptance criteria
Each item must be provable by a command, a test or a specific file change.
- [ ] ...
- [ ] ...
- [ ] `npm run check` exits 0

## Constraints
- Do not edit existing migrations; add new ones in `supabase/migrations`.
- Do not delete, skip or weaken existing tests.
- Do not push, merge, deploy or touch production data.
- Keep changes limited to this task.

## Out of scope
- ...

## Verification
- `npm run check`
- Any extra script relevant to this task (for example `npm run test:otp`)
