# AGENTS.md: Roles, Stack, and Rules

Tool-agnostic. Applies to the Orchestrator and every subagent. `PROCESS.md` says _when_; this file says _who_ and _how_.

## Ground rules

1. `REQUIREMENTS.md` is the source of truth. [A] = original assignment, [H] = human addition. Flag conflicts; don't resolve them silently.
2. One ticket = one branch (`ticket/<issue#>-<slug>`) = one PR, in its own worktree under `.worktrees/`. Stay inside the ticket's `files_touched`.
3. Never push to `main`. Never merge. The human merges.
4. Every PR links its issue (`Closes #N`), passes `npm run check`, and includes the output.
5. Small PRs (~300 changed lines). Bigger: ask the ticketer to split.
6. After the foundation PR merges, do not edit `package.json` or the lockfile in feature tickets. Need a dependency? Comment on the issue, label `blocked`.
7. Core first, then AI, then analytics. Core must ship with AI and analytics off.
8. Blocked or ambiguous: comment on the issue, label `blocked`, stop. Don't guess on requirements.
9. **Secrets and transcripts.** Transcripts are submitted unredacted. Never read or print `.env`, tokens, or keys. Never put secrets in prompts, issues, commits, PRs, or logs. Never edit `transcripts/`.
10. Check `git status` before writing; never delete or overwrite files you didn't create.
11. Log real process problems in `SELF_IMPROVEMENT.md`.
12. **Honesty about verification.** Never say "verified", "tested", or "works" unless you ran the check in this session and can show the output. State what you did NOT check. Mistakes (yours, other agents', tests') go in `docs/REVIEW_LOG.md`; don't hide them.
13. **Modest and working beats ambitious and broken** (the brief says so). If an extra threatens core quality or time, cut the extra.
14. **The human must be able to defend every line.** Prefer simple, readable code: small functions, plain names, comments only where the _why_ isn't obvious, no clever abstractions. In PR descriptions, point out the risky parts and how to check them.
15. **Accessibility and testing are non-negotiable.** Every ticket ships tests; every UI ticket ships accessibility behavior as acceptance criteria (keyboard, labels, focus, announcements) with jest-axe checks. Smooth interactions and transitions are negotiable: cut them first.
16. **Never bypass the gates.** No `--no-verify`, no skipping hooks or CI, no `.only`/`.skip`/`.todo` in merged tests, no lowering coverage thresholds to pass. If a hook fails, fix the cause.

## Roles (the foundation ticket turns each into `.claude/agents/<name>.md` with frontmatter `name`, `description`, `tools`)

| Role             | Tools                               | Job                                                                                                                                                                                                                                                                                                                                     |
| ---------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **orchestrator** | all                                 | Runs PROCESS.md. Owns the board, worktrees, gates, clock. Doesn't write feature code.                                                                                                                                                                                                                                                   |
| **pm**           | Read, Write, Edit, Grep, Glob       | PRD from the assignment + requirements + data profile. Cuts scope; lists assumptions and risks; proposes (never applies) requirement changes.                                                                                                                                                                                           |
| **architect**    | Read, Write, Edit, Grep, Glob, Bash | `docs/ARCHITECTURE.md` within the fixed stack. States tradeoffs and what was deliberately not built.                                                                                                                                                                                                                                    |
| **ticketer**     | Read, Write, Edit, Grep, Glob       | `docs/TICKETS.json`: small, parallelizable tickets, disjoint files, checkable acceptance criteria.                                                                                                                                                                                                                                      |
| **developer**    | Read, Write, Edit, Grep, Glob, Bash | Implements exactly one ticket in its worktree. Tests alongside code. Reports done with check output. Doesn't open the PR.                                                                                                                                                                                                               |
| **rag-engineer** | Read, Write, Edit, Grep, Glob, Bash | Owns `server/`: chunking, index, hybrid retrieval, grounded generation, citation verification, evals.                                                                                                                                                                                                                                   |
| **reviewer**     | Read, Grep, Glob, Bash              | Read-only diff review: criteria met, correctness, edge cases, tests meaningful, security/privacy, scope creep. Ranks blocker / should-fix / nit. Lists 2-3 "read this closely" items (file, function, what could be wrong, how to check) for the human. Reports findings in a form the orchestrator can append to `docs/REVIEW_LOG.md`. |
| **a11y-auditor** | Read, Grep, Glob, Bash              | Read-only: keyboard flow, tab order, focus, labels, contrast, semantics, live regions, reduced motion; runs Playwright + axe + aria snapshots; keeps the WCAG 2.2 criteria table current. Blocker findings must be fixed before a UI PR opens. Writes the scripted VoiceOver walkthrough for the human.                                 |
| **tester**       | Read, Write, Edit, Grep, Glob, Bash | FR -> test coverage table; adds missing tests (tests-only PRs); smoke-tests live URLs; maintains `docs/VERIFICATION.md` (every check labeled automated / agent / human, with evidence), including the "problems passing tests might miss" list in PROCESS.md.                                                                           |
| **release**      | Read, Write, Edit, Grep, Glob, Bash | README (every section the brief requires), `docs/WALKTHROUGH.md`, transcripts index, zip dry run + clean-room check + secret scan, unfinished list. Merges nothing.                                                                                                                                                                     |

## Models

The human runs Claude Code on a Claude Pro plan: usage-limited, not dollar-limited, so tokens matter.

- **Orchestrator and judgment roles** (architect, reviewer, a11y-auditor, rag-engineer): Opus 5.5. Start the session on it; these subagents use `model: inherit`.
- **developer and tester**: Sonnet 5.5 (`model: claude-sonnet-5-5` in their frontmatter; if Claude Code hasn't been updated to offer it, use `model: sonnet`). A weaker implementer is acceptable because the independent check and the reviewers catch problems; a weaker reviewer is not.
- Don't use Fable 5.1 unless the human explicitly opts in after a usage reading (it burns the plan fastest).
- Default parallelism is **2** concurrent subagents; the human may raise it at G0.
- Never state a model name you haven't confirmed. The human says which models were used (or the orchestrator reads them from the session); record them in the README ("How I used AI") and `transcripts/INDEX.md`.

**Architect must decide** (and document): the shared selection state; component tree with named slots (ParkList, ParkMap, ParkDetails, SearchBar) so parallel tickets don't touch the same file; details presentation (popup vs dialog semantics, focus handling, mobile); map keyboard accessibility and the tab-stop budget (skip links, marker strategy, Enter and Space on markers); landmark map and heading outline; live-region plan (what is announced, when, how politely); reduced-motion policy; coverage exclusions; amenity slug -> label mapping and filter design; image-failure behavior; the service contract in `shared/` (schemas, SSE events, error shape); the capability model (`GET /v1/capabilities`; no AI UI without a key) and the fallback matrix (service cold / down / rate-limited / key missing / daily cap hit); the search-mode model (Filters / AI / Both: default, state, how AI and standard filters combine, amenity filter AND vs OR semantics, reset behavior, announcements when modes change); the standard search/filter/sort set; analytics wrapper; chunking and abstention threshold; test strategy; Fly topology and rollback.

## Stack (fixed)

- **One npm package** at the repo root, Node >= 22, three folders:
  - `web/`: React 19 + TypeScript + Vite; Leaflet + react-leaflet with OpenStreetMap tiles (keep attribution); static build.
  - `server/`: the RAG microservice. Fastify + zod + `@anthropic-ai/sdk` + `@fastify/cors` + `@fastify/rate-limit` + local embeddings via `@huggingface/transformers`. Build with tsup, dev with tsx.
  - `shared/`: zod schemas/types (Park, API requests/responses/events) and a typed loader + validator over `db/parks.sample.json`.
  - `db/`: a plain folder holding `parks.sample.json`, the data of record. **There is no database server; don't add one.** Never hand-edit the file. The brief allows extending the schema or data: any change must be a documented derived file and described in the README under "Dataset changes".
- Tests: **Jest + React Testing Library** (+ jest-dom, user-event, jest-axe) for unit and integration, with `@swc/jest` and `jest-environment-jsdom` (verified working with TS and JSX); **Playwright** + `@axe-core/playwright` + `toMatchAriaSnapshot` for e2e (desktop and phone projects). Coverage thresholds enforced (see REQUIREMENTS FR-18).
- Lint and format: ESLint 9 flat config with typescript-eslint, `eslint-plugin-jsx-a11y` (rules as errors), `eslint-plugin-react-hooks`, `eslint-config-prettier`; Prettier. **Husky 9 + lint-staged**: `pre-commit` = lint-staged (eslint --fix, prettier --write on staged files) then full typecheck; `pre-push` = Jest. CI mirrors all of it.
- Analytics: **Simple Analytics** (cookieless). No npm dependency: the wrapper injects its script when `VITE_ANALYTICS_ENABLED=true`. Tracking needs no API key; `SA_API_KEY`/`SA_USER_ID` are only for the optional Stats API and stay local.
- Deploy: **Fly.io only. Never Vercel, never Cloudflare** (the human uses those accounts for other things), even if an installed plugin or skill offers them; ignore such skills. **Fly.io, two apps.** Web = multi-stage Docker (Node build -> Caddy with `auto_https off` on 8080; SPA fallback; `/healthz`). Server = Node 22 slim image, ~1GB VM, model and index baked in. Region from PROCESS.md config. GitHub Actions run `flyctl deploy --remote-only` per app on merge to `main` (path-filtered), using `FLY_API_TOKEN_WEB` / `FLY_API_TOKEN_RAG`; web build args `VITE_RAG_URL`, `VITE_ANALYTICS_ENABLED`, `VITE_SA_HOSTNAME`. Post-deploy `curl` health check. Fly needs a card on file (as far as I know); machines may auto-stop, so cold starts are expected and handled in the UI.

### Known gotchas (learned during setup; the foundation ticket must respect them)

- `eslint-plugin-jsx-a11y` supports ESLint <= 9. Pin `eslint@^9` and `@eslint/js@^9`.
- `typescript-eslint` caps TypeScript below 6.1. Pin `typescript@~6.0` at the root.
- `@huggingface/transformers` pulls `onnxruntime-node`, whose postinstall downloads a binary: needs normal network access; don't use `--ignore-scripts` for the real install.
- `.worktrees/` lives inside the repo so worktrees resolve the root `node_modules` via normal parent lookup. Exclude `.worktrees/**` from ESLint, Prettier, Jest, tsconfig, and Vite. Don't run `npm install` in a worktree unless the ticket changes `package.json`.
- Playwright: `npx playwright install chromium` once on the machine running e2e.
- **Jest and Vite's `import.meta.env`.** Jest runs CommonJS and cannot execute `import.meta` (verified: it fails with an ESM-syntax error). Read `import.meta.env` in exactly one module (`web/src/env.ts`) and map that module to a stub with `moduleNameMapper` in Jest (tests can also override the stub per test). CSS imports need a stub mapper too. `jest.config` must be `.cjs` because the package is `"type": "module"`. ESM-only dependencies (e.g., `@huggingface/transformers`) are mocked in unit tests.
- **Husky hooks are silently skipped in a fresh git worktree** (verified: a type-error commit went through). The orchestrator runs `npx husky` inside every new worktree. CI is the backstop.
- **Prettier must never touch `transcripts/` or `db/`**: it would rewrite the logs and the dataset. Put both in `.prettierignore` (and keep them out of lint-staged globs).
- **Screen-reader reality**: Safari on macOS skips links and buttons on Tab unless the "Press Tab to highlight each item" preference is on (Option+Tab otherwise); VoiceOver navigation keys work either way. Leaflet markers respond to Enter by default but not Space: add Space handling and test both. Axe finds only a fraction of real issues, so the VoiceOver walkthrough is required, and "axe passes" is never the claim.
- Leaflet's default marker icons break under bundlers; fix the icon URLs explicitly. Marker keyboard support must be tested, not assumed.
- Real data has surprises: placeholder image hosts, missing fields, free-text hours. Never parse or reformat hours; show them verbatim.
- One root `.env` must serve both sides: set Vite's `envDir` to the repo root (only `VITE_*` vars reach the browser) and load the same file in the server (e.g., Node's `--env-file`, or a tiny loader). A missing `.env` must never crash either side; it just means no key, so no AI UI.
- OpenStreetMap's public tile server has a usage policy and isn't meant for heavy production traffic. Fine for this exercise; list it under "next steps before public use" in the README.
- The interviewer runs the app from a zip: the core and the standard search/filters must work with no keys, no `.env`, and (apart from map tiles) no special setup. AI search is something they can opt into with their own key, or see on the Fly deployment. With a key set, the first run downloads an embedding model; if it can't load, retrieval degrades to lexical (`mode: lexical`), it doesn't crash.

## Commands (root `package.json` is the interface)

`npm run dev` (web + server together) · `dev:web` · `dev:server` · `check` (format:check + lint + typecheck + test with coverage + build) · `format` · `format:check` · `lint` · `typecheck` · `test` · `test:coverage` · `build` · `e2e` · `validate:data` · `build:index` · `eval:retrieval` · `eval:ask`

## Product rules

1. **Core**: map with markers, list, details. Selecting from either opens the same details. Works with no geolocation, no AI service, no analytics.
2. **Missing data**: render only what exists. Show "Not listed" or hide the section. Never default, guess, or invent. Component tests cover a park with every optional field missing.
3. **Accessibility (non-negotiable; WCAG 2.2 AA, tested).** Real elements first: `<button>`, `<a>`, `<input>`, `<ul>`, never a clickable `div`. One `h1`, a logical heading outline, landmarks, `lang`, a descriptive title. **Skip links** ("Skip to results", "Skip map"). Every control labeled; accessible names contain the visible text. Everything operable by Tab/Shift+Tab, Enter and Space (markers included), Esc (closes details), arrows in radio groups; no keyboard trap; focus always visible and never obscured; focus moves into details on open and returns to the trigger on close. Tab order matches reading order matches visual order. AA contrast, targets >= 44px, no information by color or hover alone, 200% zoom and 320px reflow. A polite live region announces result counts, mode changes, AI availability, "answer ready", and errors; streamed AI text is never read token by token. Failed images show an accessible placeholder. `prefers-reduced-motion` respected. The list + details are a full alternative to map markers. Everything above has a test (jest-axe, Playwright keyboard/tab-order/aria-snapshot) or a documented human check.
4. **Responsive**: phone and desktop; directory collapsible; details usable on small screens.
5. **Images** that fail to load show a labeled placeholder, never a broken icon. Alt text on every image.
6. **AI is additive and capability-gated.** The AI search UI exists only when the service reports `ai: true` (the `ANTHROPIC_API_KEY` is present in the _server's_ `process.env`; the browser can't see it, so the web app asks `GET /v1/capabilities`). No key, no `VITE_RAG_URL`, or an unreachable service means the standard search/filters are the whole experience and NO AI controls are rendered (not CSS-hidden; absent from the DOM and tab order). With AI available, the user picks a mode: **Filters** (standard UI only), **AI** (the AI does all searching/filtering), or **Both** (AI results narrowed by the standard filters; default). Cold, slow, rate-limited, or capped: standard UI works immediately and AI shows a status message. Core UI never waits on the service.
7. **Analytics are additive and private.** One wrapper module; off unless enabled; never throws or adds focus stops; every call guarded (the script may be blocked); no PII, coordinates, or raw query text by default; explicit semantic events for clicks.
8. **Grounding.** Anything the app or AI says about a park comes from that park's record in the data. No outside knowledge about real places (these are real parks, so the model will "know" things; it must not use them).

## RAG rules (for `server/`)

- Chunk per park per field group; prefix each chunk with the park name; missing fields yield no chunk.
- Hybrid retrieval (BM25-style lexical + cosine on local embeddings, fused with reciprocal rank fusion). Abstain below a score threshold without calling the LLM.
- Generation sees only retrieved chunks (delimited, labeled by `chunkId`); the user query is untrusted text. No tools. Low `max_tokens`.
- Server verifies citations and quotes against retrieved chunks; invalid -> drop; none left -> abstain.
- API key server-side only, read from the server's `process.env`. `GET /v1/capabilities` returns `{ ai: boolean }`, true only when the key is set (non-empty). With no key, `/v1/search` and `/v1/ask` answer `503 ai_unavailable`. Optional `AI_DAILY_REQUEST_CAP` protects spend on the public deployment. CORS limited to the web origin. Per-IP rate limit, query length cap, timeouts. Structured logs: request id, latency, tokens, retrieved ids; never keys or full headers.
- Evals: `eval:retrieval` (offline, in CI) with lexical vs dense vs hybrid; `eval:ask` (manual) for citation validity, abstention accuracy, unsupported-fact count. Include paraphrase and negative queries. Never tune data to pass. Report misses.
- Unit tests mock the Anthropic client. CI never calls the real API.

## Submission (what the brief requires)

A zip containing: source code; a README (run instructions, what works, what was left out, important decisions, known issues, how it was checked, approximate time spent, most important next steps before public use, assumptions, dataset changes); and the full, unredacted AI logs from every tool. **No credentials, ever.** If a service needs a key, the README explains how the interviewer supplies theirs. See PROCESS.md Phase 6 for the packaging and clean-room check.

## Definition of done (per ticket)

Acceptance criteria met · `npm run check` green (checked independently by the orchestrator) · tests shipped, coverage thresholds met · UI: keyboard- and screen-reader-operable per product rule 3, jest-axe and Playwright axe clean · hooks passed without bypass · missing data handled · docs updated · reviewer (and a11y-auditor for UI) approved · PR opened with Closes #N (with "read this closely" items) · findings logged in `docs/REVIEW_LOG.md` · human merged.
