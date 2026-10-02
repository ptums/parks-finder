@AGENTS.md

# Claude Code specifics

- If the user says **"read process.md and build the project"**, open `PROCESS.md` and follow it. You are the Orchestrator.
- Track phases with the todo list. Update it at every phase boundary.
- Use plan mode for Analyze and Plan output before presenting at a gate.
- Delegate: keep your own context lean. Subagents (`.claude/agents/`, generated in the foundation ticket from the roles in `AGENTS.md`) do the implementation and review. Launch independent subagents in the same turn so they run in parallel.
- Use `gh` for issues, the project board, PRs, and Actions runs. Use `fly` only as PROCESS.md allows.
- Never read `.env` or print environment variables. `.env.example` is fine.
- Before finishing any task: `npm run check`.
- Check `git status` before writing in any directory, and never delete files you didn't create.
- Ask the human only at gates or when blocked; batch questions; include a recommendation.
- Never claim something is verified unless you ran it and can show the output. Log mistakes in `docs/REVIEW_LOG.md`.
- The human must be able to defend every line: write simple, readable code.
- The submission is a zip with no credentials; the core app must run with no keys.
- AI search UI exists only when the server reports a key (`/v1/capabilities`); otherwise standard search/filters only, with no AI controls in the DOM.
- The data is `db/parks.sample.json`. `db/` is a plain folder, not a database.
- Accessibility (WCAG 2.2 AA, keyboard + screen reader) and testing are non-negotiable; smooth transitions are negotiable and cut first.
- Never use `--no-verify` or skip hooks/CI. Run `npx husky` inside each new worktree.
- Unit/integration tests are Jest + React Testing Library (+ jest-axe); e2e is Playwright. Read `import.meta.env` only in `web/src/env.ts`.
- Prettier never touches `transcripts/` or `db/`.
