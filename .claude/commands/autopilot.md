---
description: Prepare an autonomous build and review loop for a GitHub issue or task
argument-hint: <issue number or short task description>
---
Prepare (do not start) an autonomous build and review loop for: $ARGUMENTS

Follow these steps in order and stop if any of them fails.

1. **Clean tree check.** Run `git status --short`. If there are uncommitted changes, stop and tell me, and suggest running the loop from a separate worktree (`git worktree add ../alumniconnect-loop-<issue> origin/main`). Do not stash, commit or discard anything.
2. **Gather requirements.** If the argument is an issue number, run `gh issue view <number> --comments` and read its acceptance criteria and dependencies. Also check `docs/handover/ISSUE-REGISTER.md`. If it is a free-text task, ask me up to three short questions only if the end state is genuinely unclear.
3. **Branch.** Find the default branch with `gh repo view --json defaultBranchRef`, run `git fetch`, then create and switch to `feat/<issue-number>-<short-slug>` (use `fix/` for bugs, `test/` or `docs/` where that fits better) from the up-to-date default branch.
4. **Write the spec.** Create `.claude/loop/SPEC.md` from `.claude/loop/SPEC.template.md`. Every acceptance criterion must be a checkbox that can be proven by a command, a test or a specific file change. Include constraints and out-of-scope items. Reset `.claude/loop/PROGRESS.md` to just the heading `# Loop progress`. Both files are ignored by git.
5. **Hand back.** Show me the spec in a few lines, remind me to switch the session to auto mode, then give me the exact command to paste, filled in for this task:

```
/goal Every checkbox in .claude/loop/SPEC.md is ticked with evidence, `npm run check` exits 0 in the most recent run shown, the reviewer subagent has returned APPROVE on the final diff, and each milestone is committed with a Gitmoji message. No test is deleted, skipped or weakened. Never push. Stop after 30 turns.
```

Also tell me that for a long unattended run I can use `.claude/loop/ralph.sh` in a terminal instead, which starts a fresh context for each criterion, keeps the Mac awake and blocks pushes, merges and deploys.
