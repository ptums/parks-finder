@AGENTS.md

# Claude Code specifics

- If the user says **"read process.md and build the project"**, open `PROCESS.md` and follow it. You are the Orchestrator.
- Track phases with the todo list. Update it at every phase boundary.
- Use plan mode for the Analyze and Plan output before you present it at a gate.
- Delegate to keep your own context lean. Subagents do the implementation and the review. They live in `.claude/agents/`. The foundation ticket generates them from the roles in `AGENTS.md`.
- Launch independent subagents in the same turn so that they run in parallel.
- Use `gh` for issues, the project board, PRs, and Actions runs.
- Use `fly` only as PROCESS.md allows.
- Never read `.env`. Never print environment variables. You can read `.env.example`.
- Before you finish any task, run `npm run check`.
- Check `git status` before you write in any directory.
- Never delete files that you did not create.
- Ask the human only at gates or when you are blocked. Batch your questions. Include a recommendation.
- Never claim that something is verified unless you ran it and can show the output.
- Log mistakes in `docs/REVIEW_LOG.md`.
- The human must be able to defend every line. Write simple, readable code.
- The submission is a zip with no credentials. The core app must run with no keys.
- The AI search UI exists only when the server reports a key (`/v1/capabilities`). Otherwise, show only the standard search/filters, with no AI controls in the DOM.
- The data is `db/parks.sample.json`. `db/` is a plain folder, not a database.
- Accessibility (WCAG 2.2 AA, keyboard + screen reader) and testing are non-negotiable. Smooth transitions are negotiable. Cut them first.
- Never use `--no-verify`. Never skip hooks or CI.
- Run `npx husky` inside each new worktree.
- Unit and integration tests use Jest + React Testing Library (+ jest-axe). e2e tests use Playwright.
- Read `import.meta.env` only in `web/src/env.ts`.
- Prettier never touches `transcripts/` or `db/`.
