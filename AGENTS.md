# AGENTS.md: Roles, Stack, and Rules

This file is tool-agnostic. It applies to the Orchestrator and to every subagent. `PROCESS.md` tells _when_ to do work. This file tells _who_ does the work and _how_.

## Ground rules

1. `REQUIREMENTS.md` is the source of truth. [A] means the original assignment. [H] means a human addition. Flag conflicts. Do not resolve them silently.
2. One ticket = one branch (`ticket/<issue#>-<slug>`) = one PR. Each ticket has its own worktree under `.worktrees/`. Stay inside the ticket's `files_touched`.
3. Never push to `main`. Never merge. The human merges.
4. Every PR links its issue (`Closes #N`). Every PR passes `npm run check` and includes the output.
5. Keep PRs small (approximately 300 changed lines). If a PR is bigger, ask the ticketer to split it.
6. After the foundation PR merges, do not edit `package.json` or the lockfile in feature tickets. If you need a dependency, comment on the issue and add the label `blocked`.
7. Build the core first, then AI, then analytics. The core must ship with AI and analytics off.
8. If a ticket is blocked or ambiguous, comment on the issue, add the label `blocked`, and stop. Do not guess on requirements.
9. **Secrets and transcripts.** The transcripts are submitted unredacted. Never read or print `.env`, tokens, or keys. Never put secrets in prompts, issues, commits, PRs, or logs. Never edit `transcripts/`.
10. Check `git status` before you write. Never delete or overwrite files that you did not create.
11. Log real process problems in `SELF_IMPROVEMENT.md`.
12. **Honesty about verification.** Never say "verified", "tested", or "works" unless you ran the check in this session and can show the output. State what you did NOT check. Log mistakes in `docs/REVIEW_LOG.md`. This includes your mistakes, other agents' mistakes, and test mistakes. Do not hide them.
13. **Modest and working beats ambitious and broken.** The brief says this. If an extra feature threatens core quality or time, cut the extra feature.
14. **The human must be able to defend every line.** Write simple, readable code:
    - Use small functions and plain names.
    - Write comments only where the _why_ is not obvious.
    - Do not use clever abstractions.

    In PR descriptions, point out the risky parts and tell how to check them.

15. **Accessibility and testing are non-negotiable.** Every ticket ships tests. Every UI ticket ships accessibility behavior as acceptance criteria, with jest-axe checks. The accessibility behavior includes keyboard, labels, focus, and announcements. Smooth interactions and transitions are negotiable. Cut them first.
16. **Never bypass the gates.**
    - Do not use `--no-verify`.
    - Do not skip hooks or CI.
    - Do not put `.only`, `.skip`, or `.todo` in merged tests.
    - Do not lower coverage thresholds to pass.

    If a hook fails, fix the cause.

## Roles

The foundation ticket turns each role into `.claude/agents/<name>.md`. Each file has the frontmatter `name`, `description`, and `tools`.

| Role             | Tools                               | Job                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **orchestrator** | all                                 | Runs PROCESS.md. Owns the board, the worktrees, the gates, and the clock. Does not write feature code.                                                                                                                                                                                                                                                                                                           |
| **pm**           | Read, Write, Edit, Grep, Glob       | Writes the PRD from the assignment, the requirements, and the data profile. Cuts scope. Lists assumptions and risks. Proposes requirement changes but never applies them.                                                                                                                                                                                                                                        |
| **architect**    | Read, Write, Edit, Grep, Glob, Bash | Writes `docs/ARCHITECTURE.md` within the fixed stack. States tradeoffs. States what was deliberately not built.                                                                                                                                                                                                                                                                                                  |
| **ticketer**     | Read, Write, Edit, Grep, Glob       | Writes `docs/TICKETS.json`. Tickets are small and parallelizable, touch disjoint files, and have checkable acceptance criteria.                                                                                                                                                                                                                                                                                  |
| **developer**    | Read, Write, Edit, Grep, Glob, Bash | Implements exactly one ticket in its worktree. Writes tests alongside the code. Reports done with the check output. Does not open the PR.                                                                                                                                                                                                                                                                        |
| **rag-engineer** | Read, Write, Edit, Grep, Glob, Bash | Owns `server/`: chunking, index, hybrid retrieval, grounded generation, citation verification, and evals.                                                                                                                                                                                                                                                                                                        |
| **reviewer**     | Read, Grep, Glob, Bash              | Does a read-only diff review. Checks that criteria are met, correctness, edge cases, meaningful tests, security and privacy, and scope creep. Ranks findings blocker, should-fix, or nit. Lists 2-3 "read this closely" items for the human. Each item gives the file, the function, what could be wrong, and how to check. Reports findings in a form that the orchestrator can append to `docs/REVIEW_LOG.md`. |
| **a11y-auditor** | Read, Grep, Glob, Bash              | Read-only. Checks keyboard flow, tab order, focus, labels, contrast, semantics, live regions, and reduced motion. Runs Playwright, axe, and aria snapshots. Keeps the WCAG 2.2 criteria table current. Blocker findings must be fixed before a UI PR opens. Writes the scripted VoiceOver walkthrough for the human.                                                                                             |
| **tester**       | Read, Write, Edit, Grep, Glob, Bash | Keeps the FR -> test coverage table. Adds missing tests in tests-only PRs. Smoke-tests live URLs. Maintains `docs/VERIFICATION.md`. In that file, every check has a label (automated, agent, or human) and evidence. The file includes the "problems passing tests might miss" list in PROCESS.md.                                                                                                               |
| **release**      | Read, Write, Edit, Grep, Glob, Bash | Writes the README with every section that the brief requires. Writes `docs/WALKTHROUGH.md` and the transcripts index. Runs the zip dry run, the clean-room check, and the secret scan. Writes the unfinished list. Merges nothing.                                                                                                                                                                               |

## Models

The human runs Claude Code on a Claude Pro plan. The plan is usage-limited, not dollar-limited, so tokens matter.

- **Orchestrator and judgment roles** (architect, reviewer, a11y-auditor, rag-engineer) use Opus 5.5. Start the session on Opus 5.5. These subagents use `model: inherit`.
- **developer and tester** use Sonnet 5.5. Put `model: claude-sonnet-5-5` in their frontmatter. If Claude Code does not offer it yet, use `model: sonnet`. A weaker implementer is acceptable because the independent check and the reviewers catch problems. A weaker reviewer is not acceptable.
- Do not use Fable 5.1 unless the human explicitly opts in after a usage reading. Fable 5.1 uses up the plan fastest.
- The default parallelism is **2** concurrent subagents. The human may raise it at G0.
- Never state a model name that you have not confirmed. The human says which models were used, or the orchestrator reads them from the session. Record them in the README ("How I used AI") and in `transcripts/INDEX.md`.

**Architect must decide** (and document) these items:

- The shared selection state.
- The component tree with named slots (ParkList, ParkMap, ParkDetails, SearchBar), so that parallel tickets do not touch the same file.
- The details presentation: popup vs dialog semantics, focus handling, and mobile.
- Map keyboard accessibility and the tab-stop budget: skip links, marker strategy, and Enter and Space on markers.
- The landmark map and the heading outline.
- The live-region plan: what is announced, when, and how politely.
- The reduced-motion policy.
- Coverage exclusions.
- The amenity slug -> label mapping and the filter design.
- Image-failure behavior.
- The service contract in `shared/`: schemas, SSE events, and error shape.
- The capability model (`GET /v1/capabilities`; no AI UI without a key).
- The fallback matrix: service cold, down, rate-limited, key missing, and daily cap hit.
- The search-mode model (Filters / AI / Both). It includes the default, the state, how AI and standard filters combine, amenity filter AND vs OR semantics, reset behavior, and announcements when modes change.
- The standard search/filter/sort set.
- The analytics wrapper.
- Chunking and the abstention threshold.
- The test strategy.
- The Fly topology and rollback.

## Stack (fixed)

- **One npm package** at the repo root, Node >= 22, with three folders:
  - `web/`: React 19 + TypeScript + Vite. Leaflet + react-leaflet with OpenStreetMap tiles. Keep the attribution. Static build.
  - `server/`: the RAG microservice. Fastify + zod + `@anthropic-ai/sdk` + `@fastify/cors` + `@fastify/rate-limit` + local embeddings through `@huggingface/transformers`. Build with tsup. Run dev with tsx.
  - `shared/`: zod schemas and types (Park, API requests, responses, and events). It also has a typed loader and validator for `db/parks.sample.json`.
  - `db/`: a plain folder that holds `parks.sample.json`, the data of record. **There is no database server. Do not add one.** Never hand-edit the file. The brief allows you to extend the schema or the data. Any change must be a documented derived file. Describe it in the README under "Dataset changes".
- Tests:
  - Unit and integration: **Jest + React Testing Library** (+ jest-dom, user-event, jest-axe), with `@swc/jest` and `jest-environment-jsdom`. This setup is verified to work with TS and JSX.
  - e2e: **Playwright** + `@axe-core/playwright` + `toMatchAriaSnapshot`, with desktop and phone projects.
  - Coverage thresholds are enforced (see REQUIREMENTS FR-18).
- Lint and format:
  - ESLint 9 flat config with typescript-eslint, `eslint-plugin-jsx-a11y` (rules as errors), `eslint-plugin-react-hooks`, and `eslint-config-prettier`. Prettier.
  - **Husky 9 + lint-staged**. `pre-commit` = lint-staged (eslint --fix, prettier --write on staged files), then a full typecheck. `pre-push` = Jest.
  - CI mirrors all of it.
- Analytics: `posthog-js` behind one wrapper module (`web/src/analytics.ts`). The project key (`VITE_POSTHOG_KEY`, starts with `phc_`) is public by design. The host is `VITE_POSTHOG_HOST`. Privacy settings follow REQUIREMENTS FR-32.
- Deploy:
  - **Fly.io only. Never Vercel, never Cloudflare.** The human uses those accounts for other things. This rule applies even if an installed plugin or skill offers them. Ignore such skills.
  - **Fly.io, two apps.**
  - Web = multi-stage Docker: Node build -> Caddy with `auto_https off` on 8080. SPA fallback. `/healthz`.
  - Server = Node 22 slim image, approximately 1GB VM, with the model and the index baked in.
  - The region comes from the PROCESS.md config.
  - GitHub Actions run `flyctl deploy --remote-only` per app on merge to `main` (path-filtered). They use `FLY_API_TOKEN_WEB` / `FLY_API_TOKEN_RAG`. The web build args are `VITE_RAG_URL`, `VITE_POSTHOG_KEY`, and `VITE_POSTHOG_HOST`.
  - A post-deploy `curl` does a health check.
  - Fly needs a card on file (as far as I know).
  - Machines can auto-stop, so cold starts are expected. The UI handles them.

### Known gotchas

We learned these during setup. The foundation ticket must respect them.

- `eslint-plugin-jsx-a11y` supports ESLint <= 9. Pin `eslint@^9` and `@eslint/js@^9`.
- `typescript-eslint` caps TypeScript below 6.1. Pin `typescript@~6.0` at the root.
- `@huggingface/transformers` pulls in `onnxruntime-node`. Its postinstall downloads a binary, so it needs normal network access. Do not use `--ignore-scripts` for the real install.
- `.worktrees/` is inside the repo, so worktrees find the root `node_modules` through normal parent lookup. Exclude `.worktrees/**` from ESLint, Prettier, Jest, tsconfig, and Vite. Do not run `npm install` in a worktree unless the ticket changes `package.json`.
- Playwright: run `npx playwright install chromium` once on the machine that runs e2e.
- **Jest and Vite's `import.meta.env`.**
  - Jest runs CommonJS and cannot execute `import.meta`. This is verified: it fails with an ESM-syntax error.
  - Read `import.meta.env` in exactly one module (`web/src/env.ts`).
  - In Jest, map that module to a stub with `moduleNameMapper`. Tests can also override the stub per test.
  - CSS imports also need a stub mapper.
  - `jest.config` must be `.cjs` because the package is `"type": "module"`.
  - Unit tests mock ESM-only dependencies (for example, `@huggingface/transformers`).
- **Husky hooks are silently skipped in a fresh git worktree.** This is verified: a commit with a type error went through. The orchestrator runs `npx husky` inside every new worktree. CI is the backstop.
- **Prettier must never touch `transcripts/` or `db/`.** It would rewrite the logs and the dataset. Put both in `.prettierignore`. Also keep them out of the lint-staged globs.
- **Screen-reader reality**:
  - Safari on macOS skips links and buttons on Tab unless the "Press Tab to highlight each item" preference is on. Otherwise, use Option+Tab. VoiceOver navigation keys work either way.
  - Leaflet markers respond to Enter by default, but not to Space. Add Space handling and test both keys.
  - Axe finds only a fraction of real issues. Thus the VoiceOver walkthrough is required, and "axe passes" is never the claim.
- Leaflet's default marker icons break under bundlers. Fix the icon URLs explicitly. Test marker keyboard support. Do not assume it works.
- Real data has surprises: placeholder image hosts, missing fields, and free-text hours. Never parse or reformat hours. Show them verbatim.
- One root `.env` must serve both sides:
  - Set Vite's `envDir` to the repo root. Only `VITE_*` vars reach the browser.
  - Load the same file in the server (for example, with Node's `--env-file` or a tiny loader).
  - A missing `.env` must never crash either side. It only means no key, so no AI UI.
- OpenStreetMap's public tile server has a usage policy. It is not for heavy production traffic. It is fine for this exercise. List it under "next steps before public use" in the README.
- The interviewer runs the app from a zip. The core and the standard search/filters must work with no keys and no `.env`. Apart from map tiles, they must need no special setup. The interviewer can opt into AI search with their own key, or see it on the Fly deployment. With a key set, the first run downloads an embedding model. If the model cannot load, retrieval degrades to lexical (`mode: lexical`). It does not crash.

## Commands (root `package.json` is the interface)

`npm run dev` (web + server together) · `dev:web` · `dev:server` · `check` (format:check + lint + typecheck + test with coverage + build) · `format` · `format:check` · `lint` · `typecheck` · `test` · `test:coverage` · `build` · `e2e` · `validate:data` · `build:index` · `eval:retrieval` · `eval:ask`

## Product rules

1. **Core**: a map with markers, a list, and details. A selection from the map or the list opens the same details. The core works with no geolocation, no AI service, and no analytics.
2. **Missing data**: render only what exists. Show "Not listed" or hide the section. Never default, guess, or invent. Component tests cover a park with every optional field missing.
3. **Accessibility (non-negotiable; WCAG 2.2 AA, tested).**
   - Use real elements first: `<button>`, `<a>`, `<input>`, `<ul>`. Never use a clickable `div`.
   - Use one `h1`, a logical heading outline, landmarks, `lang`, and a descriptive title.
   - Add **skip links** ("Skip to results", "Skip map").
   - Label every control. Accessible names contain the visible text.
   - Make everything operable by Tab/Shift+Tab, Enter and Space (markers included), Esc (closes details), and arrows in radio groups.
   - Do not make a keyboard trap.
   - Focus is always visible and never obscured.
   - Focus moves into details on open. Focus returns to the trigger on close.
   - Tab order matches reading order, and reading order matches visual order.
   - Use AA contrast and targets >= 44px. Do not give information by color or hover alone. Support 200% zoom and 320px reflow.
   - A polite live region announces result counts, mode changes, AI availability, "answer ready", and errors. Streamed AI text is never read token by token.
   - Failed images show an accessible placeholder.
   - Respect `prefers-reduced-motion`.
   - The list + details are a full alternative to map markers.
   - Everything above has a test (jest-axe, Playwright keyboard/tab-order/aria-snapshot) or a documented human check.
4. **Responsive**: phone and desktop. The directory is collapsible. Details are usable on small screens.
5. **Images** that fail to load show a labeled placeholder, never a broken icon. Every image has alt text.
6. **AI is additive and capability-gated.**
   - The AI search UI exists only when the service reports `ai: true`. This is true when the `ANTHROPIC_API_KEY` is present in the _server's_ `process.env`. The browser cannot see the key, so the web app asks `GET /v1/capabilities`.
   - No key, no `VITE_RAG_URL`, or an unreachable service means the standard search/filters are the whole experience. In that case, NO AI controls are rendered. They are not CSS-hidden. They are absent from the DOM and the tab order.
   - With AI available, the user picks a mode: **Filters** (standard UI only), **AI** (the AI does all searching/filtering), or **Both** (AI results narrowed by the standard filters; the default).
   - If the service is cold, slow, rate-limited, or capped, the standard UI works immediately and AI shows a status message.
   - The core UI never waits on the service.
7. **Analytics are additive and private.**
   - Use one wrapper module. It is a no-op without `VITE_POSTHOG_KEY`.
   - It never throws and never adds focus stops.
   - Guard every call, because blockers can stop the script.
   - Configure PostHog for no cookies (`persistence: "memory"`), no person profiles, Do Not Track respected, and no session recording.
   - Limit autocapture to clicks plus explicit semantic events.
   - By default, send no PII, no coordinates, and no raw query text.
8. **Grounding.** Anything that the app or the AI says about a park comes from that park's record in the data. Use no outside knowledge about real places. These are real parks, so the model will "know" things. It must not use them.

## RAG rules (for `server/`)

- Chunk per park per field group. Prefix each chunk with the park name. Missing fields yield no chunk.
- Use hybrid retrieval: BM25-style lexical + cosine on local embeddings, fused with reciprocal rank fusion. Abstain below a score threshold without calling the LLM.
- Generation sees only retrieved chunks. The chunks are delimited and labeled by `chunkId`. The user query is untrusted text. Use no tools. Use a low `max_tokens`.
- The server verifies citations and quotes against the retrieved chunks. If a citation is invalid, drop it. If none are left, abstain.
- API key:
  - The API key is server-side only. Read it from the server's `process.env`.
  - `GET /v1/capabilities` returns `{ ai: boolean }`. It is true only when the key is set (non-empty).
  - With no key, `/v1/search` and `/v1/ask` answer `503 ai_unavailable`.
- Protection and logs:
  - An optional `AI_DAILY_REQUEST_CAP` protects spend on the public deployment.
  - Limit CORS to the web origin.
  - Use a per-IP rate limit, a query length cap, and timeouts.
  - Write structured logs: request id, latency, tokens, and retrieved ids. Never log keys or full headers.
- Evals:
  - `eval:retrieval` runs offline, in CI. It compares lexical vs dense vs hybrid.
  - `eval:ask` runs manually. It measures citation validity, abstention accuracy, and unsupported-fact count.
  - Include paraphrase and negative queries.
  - Never tune data to pass. Report misses.
- Unit tests mock the Anthropic client. CI never calls the real API.

## Submission (what the brief requires)

The submission is a zip. It contains:

- The source code.
- A README with these sections: run instructions, what works, what was left out, important decisions, known issues, how it was checked, approximate time spent, most important next steps before public use, assumptions, and dataset changes.
- The full, unredacted AI logs from every tool.

**No credentials, ever.** If a service needs a key, the README explains how the interviewer supplies their key. See PROCESS.md Phase 6 for the packaging and the clean-room check.

## Definition of done (per ticket)

A ticket is done when all of these are true:

- The acceptance criteria are met.
- `npm run check` is green. The orchestrator checks this independently.
- Tests are shipped, and the coverage thresholds are met.
- UI: keyboard- and screen-reader-operable per product rule 3. jest-axe and Playwright axe are clean.
- The hooks passed without bypass.
- Missing data is handled.
- The docs are updated.
- The reviewer approved. For UI, the a11y-auditor also approved.
- The PR is open with Closes #N and with "read this closely" items.
- The findings are logged in `docs/REVIEW_LOG.md`.
- The human merged.
