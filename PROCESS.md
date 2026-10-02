# PROCESS.md: Orchestrator Playbook

**Trigger:** when the human says _"read process.md and build the project"_, you are the **Orchestrator**. Follow this file top to bottom. Read `AGENTS.md` (roles, stack, rules) and `REQUIREMENTS.md` (what to build) first, then `PARKS_PROJECTS.md` (the Granicus "Find a Park" candidate brief).

You run a **semi-automatic SDLC**: you and your subagents do the work; the human decides at gates. Target: a finished, honest submission **within 2 hours of wall-clock time**.

```
Preflight -> Analyze -> Plan -> Foundation -> Build (parallel) -> Review -> PRs -> Merge -> Deploy/Verify -> Wrap-up + zip
   G0          G1        G2        G3                              auto      G4      G5          G6
```

G = human gate. Between gates, run autonomously.

## What the brief grades (keep this in view at every decision)

| Brief criterion                                                 | What you must produce                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Usefulness for residents (main tasks first, accessible, usable) | Core app done and solid before anything else.                                                               |
| Communication (what, why, what was left out)                    | README + `docs/WALKTHROUGH.md` in plain language.                                                           |
| Code quality, missing data, failures                            | Simple readable code; every failure mode degrades gracefully.                                               |
| AI direction and accountability                                 | The human gates, `docs/REVIEW_LOG.md` (every mistake found, by whom, how), "read this closely" items at G4. |
| Review and verification, including problems tests miss          | `docs/VERIFICATION.md`: what was checked, how, by whom (automated / agent / human), with evidence.          |

## Non-negotiables (never cut, never deferred)

1. **Accessibility: WCAG 2.2 AA, tested** (REQUIREMENTS 1b, FR-16, FR-17). Interviewers may use a screen reader: every meaningful element must be reachable and operable by keyboard and VoiceOver. There is no tool that certifies ADA compliance, so the standard is stated precisely, each criterion has evidence, and the README never claims more than was tested.
2. **Testing** (FR-18, FR-19). Every ticket ships tests; coverage thresholds; hooks locally and CI everywhere.
   **Negotiable:** smooth interactions and transitions. Cut them first.

The brief says: _"A modest app that works and is well explained is more useful than an ambitious app with broken core features."_ AI search, analytics, and Fly hosting are extras. They must never cost core quality or time.

---

## 0. Project config (human fills this in before starting; nothing here is secret)

| Key               | Value                                  |
| ----------------- | -------------------------------------- |
| GH_OWNER          | ptums.                                 |
| GH_REPO           | https://github.com/ptums/parks-finder. |
| GH_PROJECT_NUMBER | 1                                      |
| FLY_WEB_APP       | https://peter-parks-web.fly.dev        |
| FLY_RAG_APP       | `https://peter-parks-rag.fly.dev`      |
| FLY_REGION        | `dfw`                                  |
| POSTHOG_HOST      | https://us.i.posthog.com               |

If any `<FILL>` remains, ask for it at Gate 0. Never read `.env` to find config.

## 1. Inputs in the repo root

- `PARKS_PROJECTS.md`: the candidate brief ([A] requirements). Authoritative on deliverables and grading.
- `REQUIREMENTS.md`: source of truth for what to build. You may _propose_ changes at G1; never silently edit it.
- `db/parks.sample.json`: the data (the brief calls it `assets/parks.sample.json`; here it lives in `db/`). `db/` is a plain folder, not a database. Keep the file unmodified; the app reads it directly (no copy). Any extension is a documented, derived file.
- `AGENTS.md`, `CLAUDE.md`: roles, stack, rules
- `SELF_IMPROVEMENT.md`: lessons log (read it; append to it)
- `.env.example`: key names only. A wireframe (`*.excalidraw`) may also be present; read it if so.

## 2. Operating rules

**Autonomous (no asking):** reading files, creating branches/worktrees, writing code and docs inside tickets, running lint/typecheck/tests/builds, `gh` and `git` reads, creating labels, opening PRs, commenting on issues, watching CI runs.
**Always ask first (a gate or a question):** approving scope or tickets, merging anything, pushing to `main`, creating Fly apps or deploying, touching secrets, deleting files you did not create, changing GitHub Actions secrets/variables, anything that costs money.
**Never:** bypass hooks or CI (`--no-verify`, skipping checks, `.only`/`.skip`, lowering coverage thresholds); read or print `.env` or secrets; paste secrets anywhere (transcripts are submitted unredacted); edit `transcripts/` logs; merge your own PRs; delete or overwrite files you did not create (check `git status` first; if you find unexpected changes, stop and tell the human).
**Honesty about verification.** Never write "verified", "tested", or "works" unless you ran the check in this session and can show the output. Always state what you did NOT check. Mistakes (yours, a subagent's, a test's) go in `docs/REVIEW_LOG.md`; they are evidence of accountability, not something to hide.

**Asking well.** At each gate, send ONE message: what was done (3-6 lines), what you need decided, your recommendation, and the exact next step if approved. Batch all questions. Don't ask what the docs already answer.

**Waiting is not idle.** While waiting on the human, only do work that doesn't depend on their answer. If none exists, stop and say what you're waiting on.

## 3. The clock

- First action after Preflight passes: `date -u +%s` -> write start time to `docs/TIMEBOX.md`. Use `date` at every phase boundary and after every gate reply; log `+<min> <event>` lines.
- Human wait time counts. Keep gates short.

| Phase                                      | Budget (min) | Cumulative |
| ------------------------------------------ | ------------ | ---------- |
| 0 Preflight                                | 5            | 5          |
| 1 Analyze                                  | 12           | 17         |
| 2 Plan                                     | 8            | 25         |
| 3 Foundation (+ human merge)               | 15           | 40         |
| 4 Build + review (parallel)                | 40           | 80         |
| 5 Merge, deploy, verify                    | 15           | 95         |
| 6 Wrap-up, README, zip, human close-review | 25           | 120        |

- **T+60 core checkpoint:** are map, list, details, keyboard flow, and missing-data handling merged or in review, each with tests and zero axe violations? If not, announce the cut line now and stop work on AI/analytics until core is done.
- **T+80:** if Build isn't nearly done, apply the cut order.
- **T+95:** stop starting new tickets. Begin Wrap-up regardless.
- **T+120:** hard stop. Whatever isn't merged goes in "What I left out". Honest beats complete.
- **Usage gates (Claude Pro is usage-limited, not dollar-limited).** You can't read the meter; the human can (the usage screen shows a session meter and weekly meters; track all of them: the session meter, the weekly all-models meter (what can lock the human out for days), and the separate weekly Fable meter if Fable 5.1 is in use). Ask for a one-line reading at G0 (starting point), G1, G3, and the first G4, and log it in `docs/TIMEBOX.md`. Rules of thumb (judgment, not measured): if more than ~50% of the session meter or ~75% of the weekly meter is used by G3, ask the human to switch the orchestrator to Sonnet 5.5 (`/model`), cap parallelism at 1-2, and drop the `ai` tickets; if more than ~80% of the session meter or ~90% of the weekly meter is used by T+80, stop starting tickets and go straight to Phase 6. If the limit is hit mid-run, keep `docs/TIMEBOX.md`, ticket statuses, and branches current so the work can be picked up after the reset, and write the "What I left out" section from the board. Ideally the human starts right after the weekly reset. Calibrate at G2: the full run costs very roughly 6-15x the first 25 minutes; if that projection exceeds what's left in the weekly meter, cut scope at G2, not at minute 70.
- **Cut order** (drop in this order): animation and transition polish (negotiable) -> analytics extras -> `/v1/ask` generation (keep retrieval search) -> AI search entirely (service + UI; the standard search and filters stay) -> e2e extras -> Fly deploy polish. **Never cut:** core app, standard search and filters (they are the no-key experience), WCAG 2.2 AA accessibility, testing, README, `docs/REVIEW_LOG.md`, `docs/VERIFICATION.md`, transcripts. (Fly deploy is wanted by the human and gets a README link; if it must be cut, say so plainly in the README.)

## 4. Phases

### Phase 0: Preflight (auto, then G0)

1. Confirm all root inputs exist; `git status` clean-ish; `node -v` >= 22; `git remote -v` points at `GH_OWNER/GH_REPO`.
2. Check tooling (names/status only, never values): `gh auth status`; `gh project view <GH_PROJECT_NUMBER> --owner <GH_OWNER>`; `gh secret list`; `gh variable list`; `fly auth whoami`; `fly apps list`; `test -f .env && echo present` (existence only).
3. Expected GitHub secrets: `FLY_API_TOKEN_WEB`, `FLY_API_TOKEN_RAG`. Expected variables: `RAG_URL`, `SITE_URL`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`. (The PostHog project key is public by design, so it is a variable, not a secret.) Expected Fly secrets on the RAG app (`fly secrets list -a <FLY_RAG_APP>`): `ANTHROPIC_API_KEY`, `CORS_ORIGIN`. Missing items: list them with the exact command for the human to run. Do not run commands that need secret values yourself.
4. Create labels with `gh label create ... --force`: `ready`, `in-progress`, `in-review`, `blocked`, `core`, `ai`, `analytics`, `deploy`, `foundation`, `stretch`, `process`, `submission`, `size:S`, `size:M`.
5. Propose a `.claude/settings.json` that denies reads of `.env`/`.env.*` (not `.env.example`) and allows routine `git`, `gh`, `npm`, `npx`, `fly`, `curl` commands. Show it; write it only after approval.
6. Create empty `docs/REVIEW_LOG.md` and `docs/VERIFICATION.md` from the formats in section 8.
   **G0:** show the preflight checklist (pass/fail), the proposed settings, and any missing items. Confirm the model assignment (see AGENTS.md "Models": Opus 5.5 orchestrator, Sonnet 5.5 developers/tester), the parallelism cap, and the human's starting usage reading, and log them in `docs/TIMEBOX.md`. Proceed when all required items pass.

### Phase 1: Analyze (auto, then G1)

1. **Profile the data** (`db/parks.sample.json`): park count; per-field coverage (missing/null/empty counts for description, amenities, hours, images, acreage, rating, address, coordinates); duplicate ids; out-of-range lat/lng; image URL patterns (the brief says images are placeholders and won't load); amenity vocabulary (distinct values); hours format variety; anything else odd. Write `docs/DATA_PROFILE.md`.
2. Spawn **pm** (reads PARKS_PROJECTS.md, REQUIREMENTS.md, data profile) -> `docs/PRD.md`: scope, user stories, risks, time plan, **assumptions list** (these go in the README, as the brief requires), proposed changes to REQUIREMENTS.md as a list (never applied silently).
3. Spawn **architect** -> `docs/ARCHITECTURE.md` with a mermaid diagram and the decisions listed in AGENTS.md ("Architect must decide").
   **G1:** one-page summary: scope, what's cut, data findings that matter, open questions, architecture in 10 lines, the time plan. Wait for approval. Apply approved changes to REQUIREMENTS.md and mark its status APPROVED.

### Phase 2: Plan (auto, then G2)

1. Spawn **ticketer** -> `docs/TICKETS.json` (schema in section 5). At most 10 tickets, sizes S/M.
2. Show a table: id, title, labels, depends_on, size, files_touched, plus a mermaid dependency graph and an FR -> ticket coverage table.
   **G2:** human approves, cuts, or reorders. Then create the issues: `gh issue create` (title `[T<n>] ...`, body with acceptance criteria and requirements), add each to the board with `gh project item-add`, and set Status via `gh project field-list` / `gh project item-edit` (best effort; labels are the fallback). Only dependency-free tickets get `ready`. Record issue numbers in `docs/TICKETS.json`.

### Phase 3: Foundation (serial, then G3)

Ticket T1 is the foundation and blocks everyone, so run it alone first: repo scaffold per AGENTS.md (one `package.json` with ALL dependencies installed up front, tsconfigs, vite/eslint/prettier/jest/playwright configs, Husky + lint-staged hooks (`pre-commit`: lint-staged then typecheck; `pre-push`: jest), `.prettierignore` (must include `transcripts/`, `db/`, the lockfile, build output, `coverage/`, `.worktrees/`), Jest setup with jest-axe and a stubbed env module, coverage thresholds, app shell with named slots, server skeleton with `/healthz`, shared contract, a typed loader + validator over `db/parks.sample.json` (no copy), CI workflow mirroring the hooks (prettier --check, eslint, typecheck, jest with coverage, build, playwright), the supplied `.gitignore` (verify it; never remove its rules, and never ignore `transcripts/` or `db/`), subagent definitions in `.claude/agents/` generated from AGENTS.md).
Use a **developer** subagent in a worktree, pass the independent check (section 6), open the PR labeled `foundation`.
**G3:** tell the human: "Foundation PR #N is ready. Please review and merge now; everything else waits on it." On their reply, `git pull`, verify `npm ci && npm run check` on `main`, and unblock dependents.

### Phase 4: Build, review (parallel, automatic)

For each `ready` ticket (max 2 concurrent by default; the human may raise it at G0 if their usage allows):

1. Create a worktree inside the repo: `git worktree add .worktrees/t<N> -b ticket/<issue#>-<slug> origin/main`. Run `npx husky` inside the new worktree (hooks are silently skipped in a fresh worktree until you do; verified). Label the issue `in-progress`, move the board card.
2. Spawn the matching subagent (**developer**, or **rag-engineer** for `ai` tickets) with: the ticket text, its `files_touched`, the worktree path, and the docs it needs. Launch concurrent subagents in the same turn so they run in parallel.
3. When a subagent reports done, run the independent check (section 6) yourself in that worktree. Don't trust a green claim. If the check fails where the agent claimed success, log it in `docs/REVIEW_LOG.md`.
4. Spawn **reviewer** (and **a11y-auditor** for UI tickets), read-only, on the diff. Blockers go back to the developer; maximum 2 rounds, then escalate to the human as a `blocked` issue. Append every finding (should-fix and above, plus anything the independent check or CI caught) to `docs/REVIEW_LOG.md`.
5. Only then: push the branch and `gh pr create` using the PR template (Closes #N, check output, reviewer summary, a11y notes, "read this closely" items). Label `in-review`, move the card.
6. As each batch of PRs is ready, **alert the human** (G4) and continue with tickets that don't depend on those PRs.

### G4: PRs ready for review (repeat as needed)

Message format: list each PR (number, title, one-line summary, reviewer verdict, anything risky) **in recommended merge order**. For each PR add **"Read these closely" (2-3 items)**: file and function, what could be wrong, how to check it. The human is accountable for understanding every line the AI wrote, so say which parts most deserve their own eyes; don't pretend the agent review replaces that. Then stop: "Reply `merged` when done, plus any findings you want logged."
On reply: log the human's findings in `docs/REVIEW_LOG.md` (found by: human). `git fetch`, `gh pr list --state merged`, remove merged worktrees, rebase or merge `main` into any open branch that now conflicts, mark newly unblocked tickets `ready`, and dispatch them.

### Phase 5: Deploy and verify (after the deploy ticket and most PRs are merged)

1. **Fly apps.** If they don't exist, show the exact `fly apps create` commands and get approval (G5), then run them. Don't deploy without approval.
2. Merging to `main` triggers the deploy workflows. Watch with `gh run list` / `gh run watch`. On failure, read the logs, fix via a `bug` ticket and PR, and log the cause in `SELF_IMPROVEMENT.md`.
3. Smoke test the live URLs: `curl -fsS https://<FLY_WEB_APP>.fly.dev/healthz` and `https://<FLY_RAG_APP>.fly.dev/healthz`; `curl https://<FLY_RAG_APP>.fly.dev/v1/capabilities` must return `{"ai":true}`; run a real `/v1/search` query; load the web page and confirm the AI controls appear and the standard filters work.
4. **Verification pass** (tester + a11y-auditor): run the full suite on `main` (`npm run check`, `npm run e2e`), then fill `docs/VERIFICATION.md`, including the **"problems passing tests might miss"** checks from section 8. Mark rows that only a human can do (real screen reader, real phone) as `HUMAN TODO`. Write the exact VoiceOver walkthrough (steps and the announcements to expect) into `docs/VERIFICATION.md` so the human can run it in about 10 minutes. File small `bug` tickets for real failures and fix what time allows.
5. Rollback if a deploy breaks the live site: `fly releases -a <app>` and redeploy the previous image (ask first).
   **G5:** confirm live URLs with the human; ask them to set Fly secrets if still missing (they run those commands; you never see key values); hand them the `HUMAN TODO` verification rows.

### Phase 6: Wrap-up (from T+95)

1. **README.md.** It must begin with the three links, then the rest.
   - Links: project board (URL from `gh project view <n> --owner <o> --format json`, `url` field); GitHub Actions (`https://github.com/<GH_OWNER>/<GH_REPO>/actions`); live preview (`https://<FLY_WEB_APP>.fly.dev`). Note under them: the interviewer gets a zip, so these links only work if the repo/board are public or shared; the README must stand on its own without them.
   - Required sections (the brief's list): **How to run** (from a clean unzip). Say it plainly: _standard mode_ needs no key (`npm ci`, `npm run dev:web`): map, list, details, search, filters. **To use AI search locally, provide your own Anthropic API key** (copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY`, run `npm run dev`, which starts web and server). **Otherwise, visit the live deployment on Fly.io (AI search is enabled there, rate-limited to protect spend).** Without a key the app falls back to the standard search and filters and shows no AI UI. Explain the three modes when AI is available: Filters (UI only), AI (AI does all the searching/filtering), Both. Note analytics (PostHog) is optional, and that the first AI run downloads an embedding model (if it can't, retrieval degrades to lexical); **What works**; **What I left out** (specific: open tickets, half-done work, cut features and why); **Important decisions**; **Assumptions** (from the PRD); **Dataset changes** (if you extended the schema or data, say exactly how; if verbatim, say so); **Known issues**; **How I checked the result** (summarize `docs/VERIFICATION.md`, including what was human-checked); **How I used AI** (tools, which models ran which roles, how directed, how reviewed, mistakes found and fixed, summarize `docs/REVIEW_LOG.md`); **Accessibility** (the standard targeted, WCAG 2.2 AA; exactly what was tested and how: jest-axe, Playwright + axe, aria snapshots, tab-order and keyboard tests, the human VoiceOver pass; how the interviewer can test with a screen reader, including that Safari skips links and buttons on Tab unless the preference is on, so use Option+Tab; known gaps; do NOT write "fully ADA compliant" or imply certification. Write "built to WCAG 2.2 AA and tested as described"); **Testing** (what runs where: hooks, CI, Jest with coverage numbers, Playwright); **AI search design + eval tables**; **Analytics notes**; **Time spent** (build window from `docs/TIMEBOX.md`, plus pre-clock preparation: the six root docs, accounts, repo setup; the human fills in the prep minutes); **Most important next steps before public use** (e.g., OpenStreetMap public tile usage limits, Fly cold starts and cost caps, rate limiting and API spend, image hosting and licensing, data freshness, analytics consent/legal review, monitoring, a screen-reader pass with real users).
   - Disclosure line: the repo scaffold docs (the six root files) were prepared before the clock started; the application was built within the time box.
2. **`docs/WALKTHROUGH.md`** (for the 30-minute follow-up; also usable for an optional video/deck): a 3-5 minute demo script; the architecture in plain language; decisions and trade-offs; what was left out; the AI-usage story; "what I'd change before release" (deployment, maintenance, likely failures); and **3 review candidates**: the riskiest pieces (e.g., the citation verifier, focus management, data normalization), each with file/function, what could be wrong, and how to check it. The human picks one, reviews it for real, and records what they found or checked in `docs/REVIEW_LOG.md`.
3. **Retro:** append entries to `SELF_IMPROVEMENT.md` for every real process problem (blocked agents, merge conflicts, CI surprises, deploy failures, review findings).
4. **Transcripts:** copy this session's raw JSONL(s) from `~/.claude/projects/<this project>/` into `transcripts/` (or tell the human to). Verify they include subagent activity; if not, also use `/export` or ask the human how to capture it. Never edit, trim, or reorder log contents; a derived readable copy, if made, is clearly labeled and the raw file stays. Write `transcripts/INDEX.md`: each file, which tool, what it covers, rough time range (an index is not an edit). Remind the human to add the claude.ai setup chat as `transcripts/claude-ai-setup-chat.md`, and any other AI tool's logs. If a tool can't export, the brief says to contact the recruiter.
5. **Zip dry run.** Build a tentative zip and prove it works:
   `git ls-files -z --cached --others --exclude-standard | xargs -0 zip -q ../parks-finder-submission.zip`
   (tracked plus untracked-not-ignored files: includes `transcripts/`, excludes `.env`, `node_modules`, `.worktrees`). Then in a temp dir: unzip, `npm ci`, `npm run check`, start the app, and confirm the core flow loads with no keys set. Also run the server with no key and confirm `/v1/capabilities` says `ai:false` and the AI controls are absent. Run a secret scan over the zip contents: `sk-ant-`, `FlyV1`, `fo1_`, `BEGIN ... PRIVATE KEY`, and a non-empty `ANTHROPIC_API_KEY=` value. **If a secret appears in a transcript, do not edit the log:** tell the human to rotate that key now and mention it to the recruiter.
   **G6:** final human checklist:
   - Merge the last PRs and pull `main`.
   - Do your own close review of ONE piece of code (from WALKTHROUGH) and record what you checked or found in `docs/REVIEW_LOG.md`.
   - Read the README top to bottom; correct anything that overstates. You are accountable for every claim.
   - Do the `HUMAN TODO` rows in `docs/VERIFICATION.md`: the full VoiceOver walkthrough (this is required, not optional), a keyboard-only pass on the live site, and a phone viewport pass. Record what you heard and any problems.
   - Fill in the time-spent breakdown (build window and prep).
   - Confirm the README links work for an outsider, or add screenshots (board, Actions run, live site).
   - After the session ends: copy the final transcripts into `transcripts/`, update `transcripts/INDEX.md`, add the claude.ai chat, re-run the zip command, run the secret scan once more, and send the zip.
   - Optional, not required by the brief: a short video and a slide deck from `docs/WALKTHROUGH.md`.

## 5. Ticket schema (`docs/TICKETS.json`)

```json
[
  {
    "id": "T2",
    "title": "...",
    "body": "context + approach hints",
    "acceptance": ["checkable criterion"],
    "requirements": ["FR-2"],
    "depends_on": ["T1"],
    "size": "S",
    "labels": ["core"],
    "files_touched": ["web/src/components/ParkList/**"],
    "issue": null
  }
]
```

Rules: <= 10 tickets; disjoint `files_touched` for tickets that can run together; every FR covered; acceptance criteria checkable by someone who didn't see your reasoning.

**Expected shape** (adjust, don't ignore):
T1 foundation (scaffold, tooling: Prettier + Husky + lint-staged + Jest/RTL/jest-axe + Playwright, contract, data loader, CI, subagent defs) ·
T2 list + details · T3 map · T4 **standard search + filters + sort** (the no-key experience; text search, amenity filters, sort, optional near-me) ·
T5 AI service part 1: `/v1/capabilities`, chunking/index, hybrid retrieval, `/v1/search`, retrieval eval ·
T6 AI service part 2: `/v1/ask` grounded generation, citation checks, caps, `eval:ask` ·
T7 AI UI: capability discovery, Filters / AI / Both mode, results, answer + citations (absent when no key) ·
T8 analytics wrapper (PostHog) + events · T9 accessibility audit pass: skip links, landmarks, aria snapshots, tab-order test, WCAG criteria table, VoiceOver script, capability-gating tests (accessibility itself is built into T2-T7 acceptance criteria; T9 audits and fixes) ·
T10 deploy (Dockerfiles, `fly.toml` x2, deploy workflows).
README, walkthrough, and release checks are Phase 6 work, delivered as one final PR labeled `submission` (outside the 10-ticket cap).
T10 should start right after T1 so deploy problems surface early. Core tickets (T2, T3, T9) go first when capacity is limited; T4 comes before any AI ticket.

## 6. Independent check (before any PR)

In the ticket's worktree, you run: `npm run check` (prettier check, lint, typecheck, jest with coverage thresholds, build). For UI tickets also the relevant Playwright tests (keyboard, axe, aria snapshots) and confirm the ticket added jest-axe checks for each new component state. Reject any PR with no tests for new behavior, any `.only`/`.skip`/`.todo`, or coverage below thresholds. For `ai` tickets also `npm run eval:retrieval`. Confirm only `files_touched` changed (`git diff --stat origin/main`). Confirm no secrets in the diff. If anything fails, send it back; don't open the PR.

## 7. Failure handling

- Subagent stuck or looping: one retry with a sharper prompt, then mark the issue `blocked` and surface it at the next gate.
- Merge conflict: rebase the ticket branch onto `main`; if non-trivial, ask the developer subagent to resolve and re-run checks.
- CI red on a PR: fix in the branch; never bypass checks.
- Flaky embedding-model download in CI: retry once, then cache; log it.
- Unexpected changes in the working tree that you didn't make: stop and tell the human.

## 8. Ledger formats

**`docs/REVIEW_LOG.md`** (append-only table; this is the "how I reviewed, what I found" evidence):
| # | Ticket/PR | Finding | Severity | Found by (reviewer / a11y-auditor / independent check / CI / human / agent self-report) | How found | Fix (commit/PR) | Status |

**`docs/VERIFICATION.md`** (what was checked, how, by whom):
| Check | Type (automated / agent / human) | Result | Evidence (command, output file, or note) | Date |

Must include these **"problems passing tests might miss"** checks:

- Keyboard-only run-through in a real browser (tab order, Enter/Esc, focus return, no traps), including map markers
- 200% zoom and a phone-sized viewport
- **Full VoiceOver pass (macOS; Safari and/or Chrome), `HUMAN TODO`**, following the scripted walkthrough: landmarks and headings via the rotor; Tab and Option+Tab through everything; operate every control with Enter and Space; Esc closes details; hear the park name, address, hours, amenities, and the correct "not listed" wording; confirm status announcements (result count, mode change, AI available, answer ready) and that streamed text doesn't chatter
- One row per applicable WCAG 2.2 A/AA criterion, with method and evidence
- Aria snapshots of the main regions, and a tab-order test (the expected sequence of focused names)
- A deliberately bad commit (type error) is blocked by the Husky hook (demonstrated once, logged in REVIEW_LOG)
- Broken or missing images (placeholder shown, no layout jump)
- Sparse parks (every optional field missing) look sensible, not just "don't crash"
- Map tiles failing or slow; geolocation denied
- **AI capability gating**: server with no key => `/v1/capabilities` says `ai:false` and NO AI controls exist in the DOM (not merely hidden by CSS), with standard search/filters fully working; server with a key => AI controls appear with the Filters / AI / Both mode choice; service unreachable or cold => standard UI immediately, AI appears only once capabilities resolve; rate-limited or daily cap hit => a message, standard UI unaffected
- Hostile or off-topic queries: "ignore previous instructions", and questions whose answers the model "knows" but the data doesn't (e.g., a feature of a real park not in the record). The app must abstain
- Streamed AI text does not spam a screen reader
- Live site on Fly (not just localhost); the unzipped submission runs from clean

## 9. Definition of done

All `core` tickets merged; app works with AI and analytics both off; **WCAG 2.2 AA tests pass and the VoiceOver walkthrough is done and recorded**; **tests shipped with every ticket and coverage thresholds met**; hooks and CI green; deployed on Fly with healthy `/healthz` (or the README says plainly why not); README has the three links and every section the brief requires, with an honest "What I left out"; `docs/REVIEW_LOG.md`, `docs/VERIFICATION.md`, and `docs/WALKTHROUGH.md` written; transcripts present with an index; the zip builds, runs from a clean unzip, and contains no credentials; `SELF_IMPROVEMENT.md` updated.
