# Overnight build and review loop

Claude Code can work through a GitHub issue unattended, one acceptance criterion at a time, with an independent reviewer checking each step. Nothing is pushed, merged or deployed: you review the branch in the morning and open the pull request yourself.

## Pieces

| File | Purpose |
| --- | --- |
| `.claude/commands/autopilot.md` | `/autopilot <issue>` reads the issue, creates a `feat/` branch and writes `.claude/loop/SPEC.md` with provable acceptance criteria. |
| `.claude/agents/reviewer.md` | Read-only reviewer subagent. Runs `npm run check` and returns APPROVE or REQUEST CHANGES. |
| `.claude/loop/PROMPT.md` | Instructions for one pass: pick the next unticked criterion, build it, test it, get it approved, commit it. |
| `.claude/loop/ralph.sh` | Runs passes back to back, each with a fresh context, until the spec is complete, blocked or out of passes. |
| `.claude/loop/settings.json` | Extra deny rules used only by the loop: no push, merge, tag, release, rebase, hard reset or Vercel commands. |
| `.claude/settings.json` | Project-wide: allows the check scripts and local git commands, denies production database pushes and reading local secrets. |

`SPEC.md`, `PROGRESS.md` and `loop.log` are run state and are ignored by git.

## Running it

Use a separate worktree so your own checkout and uncommitted work are never touched:

```bash
git fetch origin
git worktree add ../alumniconnect-loop-42 origin/main
cd ../alumniconnect-loop-42
npm ci
cp ../alumniconnect/.env.local .env.local
```

Then start Claude Code in that folder and run `/autopilot 42`. Read the spec it writes and correct anything vague. Each criterion must be provable by a command, a test or a specific file change.

Choose one way to run it:

- **Overnight in a terminal (recommended):** `.claude/loop/ralph.sh 15`. Each pass gets a fresh context, uses auto mode, refuses anything that would need a permission prompt, loads no MCP servers (which roughly halves the starting context) and is capped at `LOOP_BUDGET_USD` (default 8) per pass. On macOS the script keeps the machine awake with `caffeinate`. Leave the laptop plugged in with the lid open.
- **In a Claude Code session:** switch to auto mode and paste the `/goal` line that `/autopilot` prints. The goal ends when the condition is met or the turn limit in it is reached. `/goal` shows progress and `/goal clear` stops it. This route does not load the loop deny rules, so start the session with `claude --settings .claude/loop/settings.json` if you can.

## In the morning

1. Read the last lines of `.claude/loop/PROGRESS.md`: `LOOP_COMPLETE`, `LOOP_BLOCKED: <reason>` or neither (out of passes).
2. Review the branch yourself: `git log --oneline origin/main..HEAD` and `git diff origin/main...HEAD`.
3. Run `npm run check` once more, then push and open the pull request as usual.

## Choosing issues

Good candidates are code changes whose results a command can prove: evaluation scripts, benchmarks, model training runs with recorded metrics, tests, refactors. Poor candidates need human judgement or real people: report chapters, usability testing, presentations and analysis of other systems.
