You are working one pass of an automated build and review loop on AlumniKonneQt. You start with no memory of earlier passes, so the files below are your only state.

1. Read `CLAUDE.md`, `AGENTS.md`, `.claude/loop/SPEC.md` and `.claude/loop/PROGRESS.md`.
2. Confirm with `git branch --show-current` that you are on a `feat/`, `fix/`, `chore/`, `test/` or `docs/` branch and not on `main`. If not, write `LOOP_BLOCKED: wrong branch` at the end of PROGRESS.md and stop.
3. Pick the single next unticked acceptance criterion. Do only that one in this pass.
4. Implement it, with tests for new behaviour.
5. Run `npm run check`. Fix failures until it passes. Never delete, skip or weaken a test to get there.
6. Ask the `reviewer` subagent to review the diff for this criterion. Fix every real problem it raises and ask again, until it replies APPROVE.
7. Stage only the files for this criterion (SPEC.md and PROGRESS.md are ignored by git and never staged), inspect `git diff --cached`, and commit with a Gitmoji message that references the issue. Never push, merge, tag, deploy or touch production data.
8. Tick the criterion in SPEC.md and append a short entry to PROGRESS.md: what changed, commit hash, check result, reviewer verdict.
9. If every criterion is now ticked, run `npm run check` once more and get a final reviewer APPROVE on the whole branch (`git diff <default-branch>...HEAD`). If both pass, write `LOOP_COMPLETE` as the last line of PROGRESS.md.
10. If you are stuck on the same criterion after three attempts, write `LOOP_BLOCKED: <reason>` as the last line of PROGRESS.md and stop.
