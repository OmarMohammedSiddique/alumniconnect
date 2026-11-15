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
