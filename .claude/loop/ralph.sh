#!/usr/bin/env bash
# Overnight build and review loop. Each pass runs Claude Code headless with a
# fresh context and handles one acceptance criterion from .claude/loop/SPEC.md.
#
# Usage: .claude/loop/ralph.sh [max_passes]
#   max_passes        default 15
#   LOOP_BUDGET_USD   spending cap per pass in US dollars, default 8
#
# Run it from a separate git worktree so your own checkout stays untouched.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

MAX=${1:-15}
BUDGET=${LOOP_BUDGET_USD:-8}
DIR=".claude/loop"

# Keep the Mac awake for the whole run (the display may still sleep).
if [ "$(uname)" = "Darwin" ] && [ -z "${LOOP_CAFFEINATED:-}" ] && command -v caffeinate >/dev/null; then
  export LOOP_CAFFEINATED=1
  exec caffeinate -i "$0" "$@"
fi

[ -f "$DIR/SPEC.md" ] || { echo "No $DIR/SPEC.md found. Run /autopilot <issue> in Claude Code first."; exit 1; }

branch=$(git branch --show-current)
case "$branch" in
  feat/*|fix/*|chore/*|test/*|docs/*) ;;
  *) echo "Refusing to run on '$branch'. Use a feat/, fix/, chore/, test/ or docs/ branch."; exit 1 ;;
esac

if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Tracked files have uncommitted changes. Commit or stash them before starting."
  exit 1
fi

[ -f "$DIR/PROGRESS.md" ] || echo "# Loop progress" > "$DIR/PROGRESS.md"

for i in $(seq 1 "$MAX"); do
  echo "=== Pass $i of $MAX on $branch ($(date '+%Y-%m-%d %H:%M')) ===" | tee -a "$DIR/loop.log"
  claude -p "$(cat "$DIR/PROMPT.md")" \
    --settings "$DIR/settings.json" \
    --permission-mode auto \
    --permission-prompts none \
    --strict-mcp-config \
    --max-budget-usd "$BUDGET" 2>&1 | tee -a "$DIR/loop.log"
  status=${PIPESTATUS[0]}
  [ "$status" -eq 0 ] || echo "Pass $i exited with status $status." | tee -a "$DIR/loop.log"

  last=$(grep -v '^[[:space:]]*$' "$DIR/PROGRESS.md" | tail -n 1)
  case "$last" in
    LOOP_COMPLETE*) echo "Finished after $i passes." | tee -a "$DIR/loop.log"; exit 0 ;;
    LOOP_BLOCKED*)  echo "Blocked: $last" | tee -a "$DIR/loop.log"; exit 2 ;;
  esac
done

echo "Reached $MAX passes without finishing. See $DIR/PROGRESS.md." | tee -a "$DIR/loop.log"
exit 1
