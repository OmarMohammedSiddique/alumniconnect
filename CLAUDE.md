@AGENTS.md

## Project handover (read first)
- This project was migrated from Codex on 2026-11-10. Before starting work, read `docs/handover/HANDOVER.md` (nine-section brief: overview, decisions, current status, open issues, technical details, preferences).
- Appendices: `docs/handover/ISSUE-REGISTER.md` (all GitHub issues with acceptance criteria), `docs/handover/FILES.md` (file descriptions), `docs/handover/CHAT-INDEX.md` (source Codex chats).
- Full package incl. combined `COMPLETE-HANDOVER.md` and the 36,698-row `ALL-FILES.tsv` inventory: `~/Documents/AlumniKonneQt-Handover-2026-11-10/` (outside the repo).
- The handover is a snapshot; verify current git state, deployments and issues before relying on it.
- If `docs/handover/` is not on your branch yet, use `gh issue view` for acceptance criteria instead.

## Git attribution
- Never add Co-Authored-By lines, Claude-Session links, "Generated with Claude Code" footers or any other Claude/AI attribution to commit messages, PR titles or PR descriptions.

## Build and review loop
- Before saying any task is finished, use the `reviewer` subagent on the diff and fix every REQUEST CHANGES point.
- `/autopilot <issue>` prepares a looped task. `.claude/loop/ralph.sh` runs it unattended. See `docs/guides/overnight-loop.md`.

## Documentation backlog
- GitHub issue 122 ("Bring the report up to date with features added since the Chapter 5 draft") is the running list of finished work the capstone report does not yet describe.
- Whenever the task touches the report or other documentation (`docs/report-chapter-*.md`, the README, `docs/`), read issue 122 first with `gh issue view 122` and tell Omar which unticked items apply to what he is editing, before starting.
- When a feature, service or architecture change is merged that the report should describe, add a checklist item to issue 122 with the PR number and the section it belongs in. Tick an item only once the report covers it, and post a dated comment saying where.
