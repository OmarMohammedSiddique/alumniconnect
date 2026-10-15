<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` - verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Git conventions

Use Gitmoji-prefixed commit messages, for example `✨ feat: ...`,
`🐛 fix: ...`, `♻️ refactor: ...`, and `📝 docs: ...`.

- Commit each completed and verified logical milestone before starting the next.
- Do not leave finished work accumulating as a large uncommitted backlog.
- Stage only explicit files or hunks belonging to the current milestone.
- Inspect `git diff --cached` before every commit.
- Run verification appropriate to the milestone before committing.
- Do not commit knowingly broken intermediate states or create empty commits.
- Do not split one trivial change into several commits merely to increase activity.
- Do not backdate commits, rewrite dates, pad history, or fabricate progress.
- Do not mix unrelated documentation, UI, database, ML, and authentication work in one commit.
- Preserve user-owned and unrelated working-tree changes.
- Do not push unless the current prompt explicitly authorizes pushing.

## OpenAI documentation

Always use the `openaiDeveloperDocs` MCP server when working with the OpenAI
API, plugins, ChatGPT, or Codex so guidance is checked against current official
documentation.
