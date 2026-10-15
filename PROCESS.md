# PROCESS.md: Orchestrator Playbook

**Trigger:** the human says _"read process.md and build the project"_. Then you are the **Orchestrator**. Follow this file from top to bottom. First, read these files:

1. `AGENTS.md` (roles, stack, rules).
2. `REQUIREMENTS.md` (what to build).
3. `PARKS_PROJECTS.md` (the Granicus "Find a Park" candidate brief).

You run a **semi-automatic SDLC**. You and your subagents do the work. The human makes decisions at gates. Target: a finished, honest submission **within 2 hours of wall-clock time**.

```
Preflight -> Analyze -> Plan -> Foundation -> Build (parallel) -> Review -> PRs -> Merge -> Deploy/Verify -> Wrap-up + zip
   G0          G1        G2        G3                              auto      G4      G5          G6
```

G = human gate. Between gates, work without the human.

## What the brief grades (keep this in view at every decision)

| Brief criterion                                                 | What you must produce                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Usefulness for residents (main tasks first, accessible, usable) | The core app. Make it complete and solid before you do anything else.                                               |
| Communication (what, why, what was left out)                    | README and `docs/WALKTHROUGH.md`, in plain language.                                                                |
| Code quality, missing data, failures                            | Simple, readable code. Every failure mode degrades gracefully.                                                      |
| AI direction and accountability                                 | The human gates. `docs/REVIEW_LOG.md`: every mistake found, who found it, and how. "Read this closely" items at G4. |
| Review and verification, including problems tests miss          | `docs/VERIFICATION.md`: what was checked, how, and by whom (automated / agent / human), with evidence.              |

## Non-negotiables (never cut, never deferred)

1. **Accessibility: WCAG 2.2 AA, tested** (REQUIREMENTS 1b, FR-16, FR-17).
   - Interviewers can use a screen reader.
   - Every meaningful element must be reachable and operable by keyboard and VoiceOver.
   - No tool certifies ADA compliance. Thus, state the standard precisely and keep evidence for each criterion.
   - The README never claims more than was tested.
2. **Testing** (FR-18, FR-19). Every ticket ships tests. Coverage thresholds apply. Hooks run locally, and CI runs everywhere.
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

If a `<FILL>` value remains, ask for it at Gate 0. Never read `.env` to find config.

## 1. Inputs in the repo root

- `PARKS_PROJECTS.md`: the candidate brief ([A] requirements). It is the authority on deliverables and grading.
- `REQUIREMENTS.md`: the source of truth for what to build. You can _propose_ changes at G1. Never edit it silently.
- `db/parks.sample.json`: the data.
  - The brief calls it `assets/parks.sample.json`. Here, it is in `db/`.
  - `db/` is a plain folder, not a database.
  - Do not change the file. The app reads it directly (no copy).
  - Any extension is a documented, derived file.
- `AGENTS.md`, `CLAUDE.md`: roles, stack, rules.
- `SELF_IMPROVEMENT.md`: the lessons log. Read it, and add entries to it.
- `.env.example`: key names only.
- A wireframe (`*.excalidraw`) can also be present. If it is present, read it.

## 2. Operating rules

**Autonomous (do not ask):**

- Read files.
- Create branches and worktrees.
- Write code and docs inside tickets.
- Run lint, typecheck, tests, and builds.
- Do `gh` and `git` reads.
- Create labels.
- Open PRs.
- Comment on issues.
- Watch CI runs.

**Always ask first (a gate or a question):**

- Approve scope or tickets.
- Merge anything.
- Push to `main`.
- Create Fly apps or deploy.
- Touch secrets.
- Delete files you did not create.
- Change GitHub Actions secrets or variables.
- Do anything that costs money.

**Never:**

- Bypass hooks or CI. This includes `--no-verify`, skipping checks, `.only`/`.skip`, and lowering coverage thresholds.
- Read or print `.env` or secrets.
- Paste secrets anywhere. Transcripts are submitted unredacted.
- Edit `transcripts/` logs.
- Merge your own PRs.
- Delete or overwrite files you did not create. Check `git status` first. If you find unexpected changes, stop and tell the human.

**Honesty about verification.**

- Never write "verified", "tested", or "works" unless you ran the check in this session and can show the output.
- Always state what you did NOT check.
- Put mistakes (yours, a subagent's, a test's) in `docs/REVIEW_LOG.md`. They are evidence of accountability. Do not hide them.

**Asking well.** At each gate, send ONE message. It contains:

1. What was done (3-6 lines).
2. What you need the human to decide.
3. Your recommendation.
4. The exact next step if the human approves.

Put all questions in one batch. Do not ask what the docs already answer.

**Waiting is not idle.** While you wait for the human, do only work that does not depend on their answer. If no such work exists, stop and say what you are waiting for.

## 3. The clock

- First action after Preflight passes: run `date -u +%s`. Write the start time to `docs/TIMEBOX.md`.
- Run `date` at every phase boundary and after every gate reply. Log `+<min> <event>` lines.
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

- **T+60 core checkpoint:** Are these merged or in review: map, list, details, keyboard flow, and missing-data handling? Does each have tests and zero axe violations? If not, announce the cut line now. Stop work on AI and analytics until the core is done.
- **T+80:** If Build is not nearly done, apply the cut order.
- **T+95:** Stop starting new tickets. Begin Wrap-up, whatever the status.
- **T+120:** Hard stop. Put all work that is not merged in "What I left out". Honest is better than complete.
- **Usage gates.** Claude Pro is usage-limited, not dollar-limited.
  - You cannot read the meter. The human can.
  - The usage screen shows a session meter and weekly meters. Track all of them:
    - The session meter.
    - The weekly all-models meter. This meter can lock the human out for days.
    - The separate weekly Fable meter, if Fable 5.1 is in use.
  - Ask for a one-line reading at G0 (the starting point), G1, G3, and the first G4. Log each reading in `docs/TIMEBOX.md`.
  - Rules of thumb (judgment, not measured):
    - By G3, more than ~50% of the session meter or ~75% of the weekly meter is used? Then ask the human to switch the orchestrator to Sonnet 5.5 (`/model`). Also cap parallelism at 1-2 and drop the `ai` tickets.
    - By T+80, more than ~80% of the session meter or ~90% of the weekly meter is used? Then stop starting tickets and go directly to Phase 6.
  - If the limit is hit during the run, keep `docs/TIMEBOX.md`, ticket statuses, and branches current. Then the work can continue after the reset. Write the "What I left out" section from the board.
  - Ideally, the human starts immediately after the weekly reset.
  - Calibrate at G2. The full run costs very roughly 6-15x the first 25 minutes. If that projection is more than what remains in the weekly meter, cut scope at G2, not at minute 70.
- **Cut order.** Drop items in this order:
  1. Animation and transition polish (negotiable).
  2. Analytics extras.
  3. `/v1/ask` generation (keep retrieval search).
  4. AI search entirely (service and UI). The standard search and filters stay.
  5. e2e extras.
  6. Fly deploy polish.
- **Never cut:** the core app; standard search and filters (they are the no-key experience); WCAG 2.2 AA accessibility; testing; README; `docs/REVIEW_LOG.md`; `docs/VERIFICATION.md`; transcripts.
- The human wants the Fly deploy, and it gets a README link. If you must cut it, say so plainly in the README.

## 4. Phases

### Phase 0: Preflight (auto, then G0)

1. Confirm these items:
   - All root inputs exist.
   - `git status` is clean-ish.
   - `node -v` >= 22.
   - `git remote -v` points at `GH_OWNER/GH_REPO`.
2. Check tooling. Look at names and status only, never values:
   - `gh auth status`
   - `gh project view <GH_PROJECT_NUMBER> --owner <GH_OWNER>`
   - `gh secret list`
   - `gh variable list`
   - `fly auth whoami`
   - `fly apps list`
   - `test -f .env && echo present` (existence only)
3. Compare with the expected items:
   - GitHub secrets: `FLY_API_TOKEN_WEB`, `FLY_API_TOKEN_RAG`.
   - GitHub variables: `RAG_URL`, `SITE_URL`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`. The PostHog project key is public by design. Thus, it is a variable, not a secret.
   - Fly secrets on the RAG app (`fly secrets list -a <FLY_RAG_APP>`): `ANTHROPIC_API_KEY`, `CORS_ORIGIN`.
   - For each missing item, list the exact command for the human to run.
   - Do not run commands that need secret values yourself.
4. Create labels with `gh label create ... --force`: `ready`, `in-progress`, `in-review`, `blocked`, `core`, `ai`, `analytics`, `deploy`, `foundation`, `stretch`, `process`, `submission`, `size:S`, `size:M`.
5. Propose a `.claude/settings.json`:
   - It denies reads of `.env`/`.env.*` (not `.env.example`).
   - It allows routine `git`, `gh`, `npm`, `npx`, `fly`, `curl` commands.
   - Show it. Write it only after approval.
6. Create empty `docs/REVIEW_LOG.md` and `docs/VERIFICATION.md`. Use the formats in section 8.

**G0:**

- Show the preflight checklist (pass/fail), the proposed settings, and all missing items.
- Confirm the model assignment. See AGENTS.md "Models": Opus 5.5 orchestrator, Sonnet 5.5 developers/tester.
- Confirm the parallelism cap and the human's starting usage reading.
- Log these in `docs/TIMEBOX.md`.
- Continue when all required items pass.

### Phase 1: Analyze (auto, then G1)

1. **Profile the data** (`db/parks.sample.json`). Write `docs/DATA_PROFILE.md`. Include:
   - Park count.
   - Per-field coverage: missing/null/empty counts for description, amenities, hours, images, acreage, rating, address, coordinates.
   - Duplicate ids.
   - Out-of-range lat/lng.
   - Image URL patterns. The brief says images are placeholders and will not load.
   - Amenity vocabulary (distinct values).
   - Variety of hours formats.
   - Anything else that is unusual.
2. Spawn **pm**. It reads PARKS_PROJECTS.md, REQUIREMENTS.md, and the data profile. It writes `docs/PRD.md` with:
   - Scope.
   - User stories.
   - Risks.
   - Time plan.
   - An **assumptions list**. These go in the README, as the brief requires.
   - Proposed changes to REQUIREMENTS.md, as a list. Never apply them silently.
3. Spawn **architect**. It writes `docs/ARCHITECTURE.md` with a mermaid diagram and the decisions listed in AGENTS.md ("Architect must decide").

**G1:**

- Send a one-page summary: scope, what is cut, the data findings that matter, open questions, the architecture in 10 lines, and the time plan.
- Wait for approval.
- Apply the approved changes to REQUIREMENTS.md. Mark its status APPROVED.

### Phase 2: Plan (auto, then G2)

1. Spawn **ticketer**. It writes `docs/TICKETS.json` (schema in section 5). Maximum 10 tickets, sizes S/M.
2. Show a table with these columns: id, title, labels, depends_on, size, files_touched. Also show a mermaid dependency graph and an FR -> ticket coverage table.

**G2:** The human approves, cuts, or reorders. Then:

1. Create the issues with `gh issue create`. Use the title `[T<n>] ...`. Put the acceptance criteria and requirements in the body.
2. Add each issue to the board with `gh project item-add`.
3. Set Status with `gh project field-list` / `gh project item-edit`. This is best effort. Labels are the fallback.
4. Give `ready` only to tickets with no dependencies.
5. Record the issue numbers in `docs/TICKETS.json`.

### Phase 3: Foundation (serial, then G3)

Ticket T1 is the foundation. It blocks all other tickets. Thus, run it alone first. T1 contains the repo scaffold per AGENTS.md:

- One `package.json`, with ALL dependencies installed at the start.
- tsconfigs.
- vite, eslint, prettier, jest, and playwright configs.
- Husky and lint-staged hooks. `pre-commit`: lint-staged, then typecheck. `pre-push`: jest.
- `.prettierignore`. It must include `transcripts/`, `db/`, the lockfile, build output, `coverage/`, and `.worktrees/`.
- Jest setup with jest-axe and a stubbed env module.
- Coverage thresholds.
- An app shell with named slots.
- A server skeleton with `/healthz`.
- The shared contract.
- A typed loader and validator over `db/parks.sample.json` (no copy).
- A CI workflow that mirrors the hooks: prettier --check, eslint, typecheck, jest with coverage, build, playwright.
- The supplied `.gitignore`. Verify it. Never remove its rules. Never ignore `transcripts/` or `db/`.
- Subagent definitions in `.claude/agents/`, generated from AGENTS.md.

Use a **developer** subagent in a worktree. The work must pass the independent check (section 6). Then open the PR with the label `foundation`.

**G3:**

1. Tell the human: "Foundation PR #N is ready. Please review and merge now; everything else waits on it."
2. When the human replies, run `git pull`.
3. Verify `npm ci && npm run check` on `main`.
4. Unblock the dependent tickets.

### Phase 4: Build, review (parallel, automatic)

Do these steps for each `ready` ticket. The default maximum is 2 tickets at the same time. The human can raise it at G0 if their usage allows.

1. Create a worktree inside the repo: `git worktree add .worktrees/t<N> -b ticket/<issue#>-<slug> origin/main`.
   - Run `npx husky` inside the new worktree. Until you do, hooks are silently skipped in a fresh worktree (verified).
   - Label the issue `in-progress`. Move the board card.
2. Spawn the matching subagent: **developer**, or **rag-engineer** for `ai` tickets.
   - Give it the ticket text, its `files_touched`, the worktree path, and the docs it needs.
   - Launch concurrent subagents in the same turn, so they run in parallel.
3. When a subagent reports done, run the independent check (section 6) yourself in that worktree.
   - Do not trust a green claim.
   - If the check fails where the agent claimed success, log it in `docs/REVIEW_LOG.md`.
4. Spawn **reviewer** (and **a11y-auditor** for UI tickets), read-only, on the diff.
   - Send blockers back to the developer.
   - Maximum 2 rounds. After that, escalate to the human as a `blocked` issue.
   - Add every finding to `docs/REVIEW_LOG.md`. This includes should-fix and above, plus all problems that the independent check or CI caught.
5. Only after these steps, push the branch. Run `gh pr create` with the PR template: Closes #N, check output, reviewer summary, a11y notes, "read this closely" items. Label it `in-review`. Move the card.
6. When each batch of PRs is ready, **alert the human** (G4). Continue with tickets that do not depend on those PRs.

### G4: PRs ready for review (repeat as needed)

**Message format:**

- List each PR **in the recommended merge order**. For each PR, give the number, title, one-line summary, reviewer verdict, and any risks.
- For each PR, add **"Read these closely" (2-3 items)**. Each item gives the file and function, what could be wrong, and how to check it.
- The human is accountable for understanding every line the AI wrote. Thus, say which parts most need the human's own review. Do not pretend that the agent review replaces it.
- Then stop: "Reply `merged` when done, plus any findings you want logged."

**When the human replies:**

1. Log the human's findings in `docs/REVIEW_LOG.md` (found by: human).
2. Run `git fetch` and `gh pr list --state merged`.
3. Remove merged worktrees.
4. Rebase or merge `main` into each open branch that now has conflicts.
5. Mark newly unblocked tickets `ready`, and dispatch them.

### Phase 5: Deploy and verify (after the deploy ticket and most PRs are merged)

1. **Fly apps.** If they do not exist, show the exact `fly apps create` commands. Get approval (G5), then run them. Do not deploy without approval.
2. A merge to `main` starts the deploy workflows.
   - Watch with `gh run list` / `gh run watch`.
   - If a run fails, read the logs. Fix the problem with a `bug` ticket and PR. Log the cause in `SELF_IMPROVEMENT.md`.
3. Smoke test the live URLs:
   - `curl -fsS https://<FLY_WEB_APP>.fly.dev/healthz` and `https://<FLY_RAG_APP>.fly.dev/healthz`.
   - `curl https://<FLY_RAG_APP>.fly.dev/v1/capabilities` must return `{"ai":true}`.
   - Run a real `/v1/search` query.
   - Load the web page. Confirm that the AI controls appear and the standard filters work.
4. **Verification pass** (tester + a11y-auditor):
   - Run the full suite on `main` (`npm run check`, `npm run e2e`).
   - Fill in `docs/VERIFICATION.md`. Include the **"problems passing tests might miss"** checks from section 8.
   - Mark rows that only a human can do (real screen reader, real phone) as `HUMAN TODO`.
   - Write the exact VoiceOver walkthrough into `docs/VERIFICATION.md`: the steps and the announcements to expect. The human must be able to do it in about 10 minutes.
   - File small `bug` tickets for real failures. Fix as many as time allows.
5. Rollback if a deploy breaks the live site: run `fly releases -a <app>` and redeploy the previous image. Ask first.

**G5:**

- Confirm the live URLs with the human.
- If Fly secrets are still missing, ask the human to set them. The human runs those commands. You never see key values.
- Give the human the `HUMAN TODO` verification rows.

### Phase 6: Wrap-up (from T+95)

1. **README.md.** It must start with the three links. The rest follows.
   - **Links:**
     - Project board: the URL from `gh project view <n> --owner <o> --format json` (the `url` field).
     - GitHub Actions: `https://github.com/<GH_OWNER>/<GH_REPO>/actions`.
     - Live preview: `https://<FLY_WEB_APP>.fly.dev`.
     - Add a note under the links: the interviewer gets a zip. Thus, these links work only if the repo and board are public or shared. The README must be complete without them.
   - **Required sections** (the brief's list):
     - **How to run** (from a clean unzip). Say these points plainly:
       - _Standard mode_ needs no key (`npm ci`, `npm run dev:web`): map, list, details, search, filters.
       - **To use AI search locally, provide your own Anthropic API key.** Copy `.env.example` to `.env`, set `ANTHROPIC_API_KEY`, and run `npm run dev`. This command starts web and server.
       - **Otherwise, visit the live deployment on Fly.io. AI search is enabled there, rate-limited to protect spend.**
       - Without a key, the app falls back to the standard search and filters. It shows no AI UI.
       - Explain the three modes when AI is available: Filters (UI only), AI (the AI does all the searching and filtering), Both.
       - Say that analytics (PostHog) are optional.
       - Say that the first AI run downloads an embedding model. If the download fails, retrieval degrades to lexical.
     - **What works**.
     - **What I left out**. Be specific: open tickets, half-done work, and cut features, with the reason for each.
     - **Important decisions**.
     - **Assumptions** (from the PRD).
     - **Dataset changes**. If you extended the schema or data, say exactly how. If the data is verbatim, say so.
     - **Known issues**.
     - **How I checked the result**. Summarize `docs/VERIFICATION.md`. Include what the human checked.
     - **How I used AI**: tools, which models ran which roles, how you directed them, how you reviewed them, and the mistakes found and fixed. Summarize `docs/REVIEW_LOG.md`.
     - **Accessibility**:
       - The standard targeted: WCAG 2.2 AA.
       - Exactly what was tested and how: jest-axe, Playwright + axe, aria snapshots, tab-order and keyboard tests, and the human VoiceOver pass.
       - How the interviewer can test with a screen reader. Include this: Safari skips links and buttons on Tab unless the preference is on. Thus, use Option+Tab.
       - Known gaps.
       - Do NOT write "fully ADA compliant", and do not imply certification. Write "built to WCAG 2.2 AA and tested as described".
     - **Testing**: what runs where (hooks, CI, Jest with coverage numbers, Playwright).
     - **AI search design + eval tables**.
     - **Analytics notes**.
     - **Time spent**: the build window from `docs/TIMEBOX.md`, plus the preparation before the clock (the six root docs, accounts, repo setup). The human fills in the prep minutes.
     - **Most important next steps before public use**. Examples: OpenStreetMap public tile usage limits, Fly cold starts and cost caps, rate limiting and API spend, image hosting and licensing, data freshness, analytics consent and legal review, monitoring, and a screen-reader pass with real users.
   - **Disclosure line:** the repo scaffold docs (the six root files) were prepared before the clock started. The application was built within the time box.
2. **`docs/WALKTHROUGH.md`**. It is for the 30-minute follow-up. It can also be used for an optional video or deck. Include:
   - A 3-5 minute demo script.
   - The architecture in plain language.
   - Decisions and trade-offs.
   - What was left out.
   - The AI-usage story.
   - "What I'd change before release": deployment, maintenance, likely failures.
   - **3 review candidates**: the riskiest pieces. Examples: the citation verifier, focus management, data normalization. For each, give the file/function, what could be wrong, and how to check it. The human picks one and reviews it for real. The human records what they found or checked in `docs/REVIEW_LOG.md`.
3. **Retro:** add entries to `SELF_IMPROVEMENT.md` for every real process problem. Examples: blocked agents, merge conflicts, CI surprises, deploy failures, review findings.
4. **Transcripts:**
   - Copy the raw JSONL file(s) of this session from `~/.claude/projects/<this project>/` into `transcripts/`, or tell the human to do it.
   - Verify that they include subagent activity. If they do not, also use `/export`, or ask the human how to capture it.
   - Never edit, trim, or reorder log contents. If you make a derived readable copy, label it clearly and keep the raw file.
   - Write `transcripts/INDEX.md`: each file, which tool, what it covers, and the approximate time range. An index is not an edit.
   - Remind the human to add the claude.ai setup chat as `transcripts/claude-ai-setup-chat.md`, and the logs of all other AI tools.
   - If a tool cannot export, the brief says to contact the recruiter.
5. **Zip dry run.** Build a tentative zip and prove that it works:
   `git ls-files -z --cached --others --exclude-standard | xargs -0 zip -q ../parks-finder-submission.zip`
   - This includes tracked files and untracked files that are not ignored. Thus, it includes `transcripts/` and excludes `.env`, `node_modules`, and `.worktrees`.
   - In a temp dir: unzip, run `npm ci` and `npm run check`, and start the app. Confirm that the core flow loads with no keys set.
   - Run the server with no key. Confirm that `/v1/capabilities` says `ai:false` and that the AI controls are absent.
   - Run a secret scan over the zip contents. Look for: `sk-ant-`, `FlyV1`, `fo1_`, `BEGIN ... PRIVATE KEY`, and a non-empty `ANTHROPIC_API_KEY=` value.
   - **If a secret appears in a transcript, do not edit the log.** Tell the human to rotate that key now and to tell the recruiter.

**G6:** the final human checklist:

- Merge the last PRs and pull `main`.
- Do your own close review of ONE piece of code (from WALKTHROUGH). Record what you checked or found in `docs/REVIEW_LOG.md`.
- Read the README from top to bottom. Correct all claims that say too much. You are accountable for every claim.
- Do the `HUMAN TODO` rows in `docs/VERIFICATION.md`:
  - The full VoiceOver walkthrough. This is required, not optional.
  - A keyboard-only pass on the live site.
  - A phone viewport pass.
  - Record what you heard and all problems.
- Fill in the time-spent breakdown (build window and prep).
- Confirm that the README links work for an outsider, or add screenshots (board, Actions run, live site).
- After the session ends:
  1. Copy the final transcripts into `transcripts/`.
  2. Update `transcripts/INDEX.md`.
  3. Add the claude.ai chat.
  4. Run the zip command again.
  5. Run the secret scan again.
  6. Send the zip.
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

Rules:

- <= 10 tickets.
- Tickets that can run at the same time have disjoint `files_touched`.
- Every FR is covered.
- A person who did not see your reasoning can check each acceptance criterion.

**Expected shape.** Adjust it, but do not ignore it.

- T1 foundation: scaffold; tooling (Prettier + Husky + lint-staged + Jest/RTL/jest-axe + Playwright); contract; data loader; CI; subagent defs.
- T2 list + details.
- T3 map.
- T4 **standard search + filters + sort**. This is the no-key experience: text search, amenity filters, sort, optional near-me.
- T5 AI service part 1: `/v1/capabilities`, chunking/index, hybrid retrieval, `/v1/search`, retrieval eval.
- T6 AI service part 2: `/v1/ask` grounded generation, citation checks, caps, `eval:ask`.
- T7 AI UI: capability discovery, Filters / AI / Both mode, results, answer + citations (absent when no key).
- T8 analytics wrapper (PostHog) + events.
- T9 accessibility audit pass: skip links, landmarks, aria snapshots, tab-order test, WCAG criteria table, VoiceOver script, capability-gating tests. Accessibility itself is part of the T2-T7 acceptance criteria. T9 audits and fixes.
- T10 deploy (Dockerfiles, `fly.toml` x2, deploy workflows).

README, walkthrough, and release checks are Phase 6 work. Deliver them as one final PR with the label `submission`. This PR is outside the 10-ticket cap.

Start T10 immediately after T1, so deploy problems show early. When capacity is limited, do the core tickets (T2, T3, T9) first. Do T4 before all AI tickets.

## 6. Independent check (before any PR)

In the worktree of the ticket, do these steps yourself:

1. Run `npm run check` (prettier check, lint, typecheck, jest with coverage thresholds, build).
2. For UI tickets, also run the related Playwright tests (keyboard, axe, aria snapshots). Confirm that the ticket added jest-axe checks for each new component state.
3. Reject a PR if it has no tests for new behavior, has `.only`/`.skip`/`.todo`, or has coverage below thresholds.
4. For `ai` tickets, also run `npm run eval:retrieval`.
5. Confirm that only `files_touched` changed (`git diff --stat origin/main`).
6. Confirm that the diff has no secrets.

If a step fails, send the work back. Do not open the PR.

## 7. Failure handling

- Subagent is stuck or loops: retry one time with a sharper prompt. Then mark the issue `blocked` and show it at the next gate.
- Merge conflict: rebase the ticket branch onto `main`. If the conflict is not trivial, ask the developer subagent to resolve it and run the checks again.
- CI is red on a PR: fix it in the branch. Never bypass checks.
- The embedding-model download is flaky in CI: retry one time, then cache. Log it.
- The working tree has unexpected changes that you did not make: stop and tell the human.

## 8. Ledger formats

**`docs/REVIEW_LOG.md`**. It is an append-only table. It is the "how I reviewed, what I found" evidence:
| # | Ticket/PR | Finding | Severity | Found by (reviewer / a11y-auditor / independent check / CI / human / agent self-report) | How found | Fix (commit/PR) | Status |

**`docs/VERIFICATION.md`**. It records what was checked, how, and by whom:
| Check | Type (automated / agent / human) | Result | Evidence (command, output file, or note) | Date |

It must include these **"problems passing tests might miss"** checks:

- A keyboard-only run-through in a real browser: tab order, Enter/Esc, focus return, no traps. Include map markers.
- 200% zoom and a phone-sized viewport.
- **Full VoiceOver pass (macOS; Safari and/or Chrome), `HUMAN TODO`**. Follow the scripted walkthrough:
  - Landmarks and headings through the rotor.
  - Tab and Option+Tab through everything.
  - Operate every control with Enter and Space.
  - Esc closes details.
  - Hear the park name, address, hours, amenities, and the correct "not listed" wording.
  - Confirm the status announcements (result count, mode change, AI available, answer ready).
  - Confirm that streamed text does not chatter.
- One row for each applicable WCAG 2.2 A/AA criterion, with method and evidence.
- Aria snapshots of the main regions. A tab-order test (the expected sequence of focused names).
- The Husky hook blocks a deliberately bad commit (type error). Demonstrate this one time and log it in REVIEW_LOG.
- Broken or missing images: a placeholder shows, and the layout does not jump.
- Sparse parks (every optional field missing) look sensible. "Does not crash" is not sufficient.
- Map tiles fail or are slow. Geolocation is denied.
- **AI capability gating**:
  - Server with no key: `/v1/capabilities` says `ai:false`. NO AI controls exist in the DOM (not only hidden by CSS). Standard search and filters work fully.
  - Server with a key: AI controls appear, with the Filters / AI / Both mode choice.
  - Service is unreachable or cold: the standard UI shows immediately. AI appears only after capabilities resolve.
  - Rate-limited, or daily cap hit: a message shows. The standard UI is not affected.
- Hostile or off-topic queries. Examples: "ignore previous instructions", and questions whose answers the model "knows" but the data does not contain (for example, a feature of a real park that is not in the record). The app must abstain.
- Streamed AI text does not spam a screen reader.
- The live site on Fly (not only localhost). The unzipped submission runs from clean.

## 9. Definition of done

- All `core` tickets are merged.
- The app works with AI and analytics both off.
- **WCAG 2.2 AA tests pass, and the VoiceOver walkthrough is done and recorded.**
- **Every ticket shipped tests, and coverage thresholds are met.**
- Hooks and CI are green.
- The app is deployed on Fly with a healthy `/healthz`. If not, the README says plainly why.
- The README has the three links and every section the brief requires, with an honest "What I left out".
- `docs/REVIEW_LOG.md`, `docs/VERIFICATION.md`, and `docs/WALKTHROUGH.md` are written.
- Transcripts are present, with an index.
- The zip builds, runs from a clean unzip, and contains no credentials.
- `SELF_IMPROVEMENT.md` is updated.
