# PRD: Parks Finder

Status: DRAFT for Gate 1. Author: pm role.
Sources: `PARKS_PROJECT.md` (brief), `REQUIREMENTS.md`, `AGENTS.md`, `PROCESS.md`, `docs/DATA_PROFILE.md`, `SELF_IMPROVEMENT.md`.

Limits of this review: I could not read `.env.example` because permissions blocked it. I also had no shell. Thus, the line references for `.env.example` are not checked. See section 8.

## 1. Goal and audience

**Goal.** A small, polished, accessible web app. A resident can see local parks on a map, browse them in a list, and open the details for one park. The app must work with no location access, no AI service, and no analytics.

**Audience.**

- Primary: residents of a NYC-area municipality (fictional mix). They use a phone or a desktop. Some of them use a keyboard or a screen reader.
- Secondary: the Granicus interviewer. The interviewer gets a zip and spends 30 minutes in a follow-up. The interviewer grades usefulness, communication, code quality, AI accountability, and verification. The brief says that a modest app that works and is well explained beats an ambitious broken one.

**Success looks like this.** A resident finds a park and reads its details in under a minute. This works by mouse, by keyboard, or with VoiceOver. The interviewer unzips the project, runs `npm ci` and `npm run dev:web`, and sees the whole core with no keys.

## 2. Scope

Time box: 120 minutes.

Cut order from PROCESS.md:

1. transition polish
2. analytics extras
3. `/v1/ask` generation
4. AI search entirely
5. e2e extras
6. Fly polish

Never cut: core, standard search and filters, WCAG 2.2 AA, tests, README, REVIEW_LOG, VERIFICATION, transcripts.

### MUST (the product; T+60 checkpoint)

- Map with a marker for each park (FR-1), list (FR-2), and details that open from either (FR-3). The map and the list use the same details component.
- Missing-data handling: render only what exists. Show "Not listed" or hide the section. Never invent data. The data rules are in REQUIREMENTS section 3. Component tests include a synthetic park with every optional field missing.
- When an image fails, show a labeled placeholder. This is the normal path (see section 4).
- The app does not need geolocation and does not request it on load (FR-6).
- The app is operable by keyboard and screen reader, meets WCAG 2.2 AA, and is tested (FR-4, FR-5, FR-16, FR-17). This includes:
  - skip links
  - landmarks
  - one h1
  - focus moves into details and back to the trigger
  - Enter and Space on markers
  - Esc closes details
  - a live region for result counts
- Phone and desktop layouts. The directory is collapsible. Details are usable at 320px.
- Standard search, amenity filters, and sort (FR-9). This is the no-key experience, so it is MUST here. REQUIREMENTS marks it "should" (see change 4).
- Tests (FR-18) and gates (FR-19): Jest + RTL + jest-axe, Playwright keyboard/axe/aria snapshots, Husky, CI.
- Deliverables: README (FR-11), VERIFICATION (FR-12), REVIEW_LOG (FR-13), WALKTHROUGH (FR-14), transcripts (FR-7), zip with no credentials (FR-15), time-box honesty (FR-8), board and PRs (FR-41).

### SHOULD (only after core is merged with tests and zero axe violations)

- AI search behind capability gating (FR-20 to FR-28). Order:
  1. Retrieval first: `/v1/capabilities`, `/v1/search`, retrieval eval.
  2. Then the UI with Filters / AI / Both modes.
  3. `/v1/ask` generation and citations last.
- Fly.io deploy of web and server (FR-40) with health checks. The human wants it, and the README links it. Start the deploy ticket early so that problems show early. The deploy does not block core.

### COULD

- Analytics with PostHog (FR-30 to FR-34): the wrapper only, plus a small number of events.
- "Near me" sort (FR-10): a button only. Coordinates stay in the browser.

### Cut / not building (say so in the README)

- Slides, video (optional extras only).
- Accounts, a database server, user content, conversation memory, vector database, reranker, PWA/offline, i18n.
- Parsing hours, "open now", any reformatting of hours.
- Map clustering (unless trivial), fly-to animation and other transition polish (first to go).
- PostHog dashboard (FR-34) as a build task. The human builds it in PostHog if time allows. A README screenshot is optional.
- Any contact-info data (none exists). The Contacts block shows "Contact information not listed", or it is omitted.
- Legal ADA certification claims. The README says "built to WCAG 2.2 AA and tested as described".

## 3. User stories

Each story lists acceptance hints, not full criteria. The ticketer writes the full criteria.

| #   | As a...                       | I want...                                           | Acceptance hints                                                                                                                                                | FR                     |
| --- | ----------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| U1  | Resident                      | to see all parks on a map                           | 12 markers. Each marker has an accessible name (park name). If tiles fail, the list stays usable.                                                               | FR-1, NFR-2            |
| U2  | Resident                      | to click a marker and see details                   | The same details panel as the list. A marker opens on Enter and on Space.                                                                                       | FR-1, FR-3             |
| U3  | Resident                      | to browse a list without the map                    | All parks are listed. Selecting one opens the same details.                                                                                                     | FR-2                   |
| U4  | Resident                      | to read a park's information                        | Name, address, description, amenities (human labels), hours verbatim, images. Also acreage and rating when they are numeric.                                    | FR-3                   |
| U5  | Resident                      | missing data to be handled honestly                 | A null description, absent address, empty images, or null rating shows "Not listed" or is hidden. Nothing is invented.                                          | FR-3, section 3        |
| U6  | Resident on a phone           | a usable layout                                     | Directory collapsed by default. Details as a bottom sheet or dialog. No horizontal scroll at 320px. Targets >= 44px.                                            | FR-4, NFR-1            |
| U7  | Keyboard user                 | to tab to a list item, open details, close with Esc | Visible focus. Logical tab order. Focus moves into details and returns to the trigger. No trap.                                                                 | FR-5, FR-17            |
| U8  | Screen reader user            | landmarks, headings, skip links, announced status   | Skip to results / Skip map. One h1. A polite live region says "N parks found". Aria snapshots. A human VoiceOver pass.                                          | FR-16, FR-17           |
| U9  | Resident                      | to search by text and filter by amenity             | Text search over name, description, amenities, address. Multi-select amenity filter (AND semantics; the architect confirms). Count announced. Reset clears all. | FR-9                   |
| U10 | Resident                      | to sort by name, rating, or acreage                 | Null ratings sort last. They never sort as zero.                                                                                                                | FR-9                   |
| U11 | Resident with no location     | everything to work without sharing location         | No prompt on load. Test with geolocation denied.                                                                                                                | FR-6                   |
| U12 | Resident (optional)           | to sort by distance                                 | A button. Permission is requested on click. Denial is handled. Coordinates never leave the browser.                                                             | FR-10 (could)          |
| U13 | Resident, AI available        | to ask in natural language and get matching parks   | Mode radios Filters / AI / Both (default Both). Matched text shown. With no key, the AI UI is absent from the DOM.                                              | FR-25, FR-27, FR-28    |
| U14 | Resident, AI cold or capped   | the standard UI to work immediately                 | A status message in the live region. Standard search is not affected.                                                                                           | FR-28, NFR-2, NFR-5    |
| U15 | Resident asking AI            | answers grounded in the data, with citations        | Abstains when the evidence is weak. Citations link to details.                                                                                                  | FR-21, FR-22 (should)  |
| U16 | Interviewer                   | to run the app from a zip                           | `npm ci`, `npm run dev:web` works with no keys. The README explains the key route.                                                                              | FR-11, FR-15           |
| U17 | Interviewer                   | to see how it was checked and how AI was directed   | VERIFICATION, REVIEW_LOG, WALKTHROUGH with 3 review candidates, transcripts.                                                                                    | FR-7, FR-12 to FR-14   |
| U18 | Site owner (analytics, could) | anonymous usage counts without privacy cost         | No-op without a key. No cookies. No PII. Never throws.                                                                                                          | FR-30 to FR-33 (could) |

## 4. Data-driven decisions (from `docs/DATA_PROFILE.md`)

1. **Images always fail.** All 12 URLs are on `images.example.com`. The placeholder is the normal path, not an edge case. The placeholder must:
   - be labeled ("Image unavailable for <park name>").
   - have a fixed aspect ratio, so that the layout does not jump.
   - be tested.

   Parks with empty `images` (`cedar-hill-nature-preserve`, `east-ridge-trailhead`) show the same placeholder or "No photos listed". Pick one wording and use it everywhere. While an image is shown, its alt text is the park name + "photo".

2. **Hours are free text.** Examples: `6:00 AM - 1:00 AM` (crosses midnight), `Dawn to dusk`, `24 hours`, and others. Show hours verbatim. Do not parse them, compute "open now", or reformat them.
3. **Addresses are partial.** Most are street-only ("Ridge Rd", "44th St & 7th Ave"). `highland-dog-park` has no `address` key. Show addresses verbatim. An absent address shows "Address not listed". Do not geocode. Do not append "NYC".
4. **Null description and null rating.** `old-mill-botanical-garden` has a null description. `cedar-hill-nature-preserve` has a null rating. Hide these or show "Not listed". Never show 0 stars. Sort by rating puts nulls last. The rating is shown as a number. The "4.7 out of 5" format is an assumption (see A-3).
5. **Suspicious coordinate.** `cedar-hill-nature-preserve` is at 40.7128, -74.0060 (the common "NYC" default). Show it as given. Record it in the README assumptions and Known issues. Do not move or hide the marker.
6. **No single record is fully sparse.** Component tests need a synthetic "everything missing" fixture, in addition to the real sparse parks.
7. **26 amenity slugs.** The app needs a slug to label map ("dog-run" to "Dog run"). Unknown slugs fall back to mechanical title case. Unknown slugs are never dropped. Build the filter list from the data. Do not hard-code it.
8. **Map defaults.** The initial view fits the bounds of all parks (NYC area, lat 40.58 to 40.85). Parks with invalid coordinates are listed but not mapped. No park has invalid coordinates today. Keep the guard and a test.
9. **Descriptions repeat acreage** (for example, "526-acre"). This is not a conflict. Show both as given.
10. **The dataset is not modified.** No derived file is planned. Thus, the README "Dataset changes" says: none, read verbatim from `db/parks.sample.json`.

## 5. Assumptions (copy verbatim into the README)

1. The municipality is "NYC-area (fictional mix)". Every park is at lat 40.58 to 40.85, lng -74.09 to -73.79. Some parks are real (Prospect Park). Most are fictional. The app makes no claims beyond the data.
2. The data is shown verbatim. Names, addresses (also partial ones), descriptions, and hours are not corrected, geocoded, completed, or reformatted.
3. `rating` is assumed to be out of 5. The brief does not state a scale. The values range from 3.9 to 4.9. The rating is displayed as a number, never as stars alone.
4. `acreage` is assumed to be in acres.
5. Image URLs are placeholders that will not load. The labeled "image unavailable" placeholder is the expected experience.
6. There is no contact data. Thus, no contacts are shown ("Contact information not listed").
7. The coordinate for `cedar-hill-nature-preserve` (40.7128, -74.0060) looks like a default NYC point, not a real preserve location. It is shown as given.
8. The brief says that search and filters are optional. It does not say which ones. We chose text search, a multi-select amenity filter, and sort by name, rating, or acreage.
9. We interpret "Complete ADA compliance" as WCAG 2.2 Level AA, with documented automated and manual tests and a human VoiceOver pass. No tool can certify ADA compliance. The README does not claim it.
10. The interviewer evaluates from the zip and a 30-minute session. The core and the standard search/filters need no keys. AI search needs one of these:
    - the interviewer's own Anthropic API key, locally.
    - the Fly.io deployment, where AI search is enabled.

    With no key, there is no AI UI.

11. The brief calls the data file `assets/parks.sample.json`. In this repo, the file is at `db/parks.sample.json`, and the app reads it directly.
12. Map tiles come from the public OpenStreetMap server (attribution kept). This is fine for this exercise, but not for heavy public traffic.
13. The local environment file is `.env.local` at the repo root (not `.env`). A missing file never crashes either side.
14. Analytics, if enabled, is PostHog only: anonymous, cookieless, with no PII.
15. The repo scaffold documents (the six root files) were prepared before the 2-hour clock started. The application was built inside the time box. The human fills in the prep minutes.
16. The phone layout is judged by viewport emulation (Playwright) and a human check. There is no physical device matrix.

## 6. Risks

| #   | Risk                                                                               | Likelihood | Impact | Mitigation                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R1  | Scope exceeds 2 hours (full WCAG table, AI service, analytics, Fly, hooks, e2e)    | High       | High   | Core first. T+60 checkpoint. Follow the cut order. Cap parallelism at 2. AI and analytics are tickets that can be dropped whole.                                   |
| R2  | The foundation ticket (T1) is too big and blocks everyone for more than 15 minutes | High       | High   | The ticketer keeps T1 to scaffold + configs only. Fly files and CI deploy go to T10. Ask the architect to pin dependencies up front.                               |
| R3  | Leaflet marker keyboard access is wrong (Space not handled, default icons break)   | Medium     | High   | The architect decides the marker strategy. Unit test Enter and Space. Playwright test. Skip link "Skip map". List + details are the full alternative.              |
| R4  | Axe passes, but real screen-reader use is poor                                     | Medium     | High   | Aria snapshots, tab-order test, scripted human VoiceOver pass (required). The README never says "fully compliant".                                                 |
| R5  | AI work uses up core time or usage budget (embedding model download, evals)        | Medium     | High   | AI tickets start only after the T+60 core checkpoint is met. Lexical fallback. Drop `/v1/ask` first, then AI entirely. Usage readings at G0/G1/G3/G4.              |
| R6  | Parallel agents collide on files or the lockfile                                   | Medium     | Medium | Disjoint `files_touched`. Named slots in the app shell. `package.json` frozen after foundation. `npx husky` in each worktree.                                      |
| R7  | Secrets leak into transcripts, zip, or CI                                          | Low        | High   | Never read `.env.local`. Deny rule in `.claude/settings.json`. Secret scan on the zip. The key is only in Fly secrets and the server `process.env`.                |
| R8  | Fly deploy problems (cold starts, model baked in image, region, card on file)      | Medium     | Medium | Start the deploy ticket right after T1. The UI treats the service as optional. If cut, the README says so plainly. Fly config values need cleanup (see change 11). |
| R9  | Jest cannot run `import.meta.env`; ESM-only deps break tests                       | Medium     | Medium | A single `web/src/env.ts` mapped to a stub. `.cjs` Jest config. Mock `@huggingface/transformers`.                                                                  |
| R10 | Placeholder images everywhere make the UI look broken or make the layout jump      | High       | Medium | A designed placeholder with a fixed aspect ratio, labeled text, tested. A screenshot in the README, so the interviewer knows it is deliberate.                     |

## 7. Time plan (120 minutes, from PROCESS.md section 3)

| Window (min) | Phase                 | Output                                                                                                                                           |
| ------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0 to 5       | Preflight (G0)        | Tooling checks, labels, settings, usage reading                                                                                                  |
| 5 to 17      | Analyze (G1)          | DATA_PROFILE (done), this PRD, ARCHITECTURE                                                                                                      |
| 17 to 25     | Plan (G2)             | TICKETS.json (max 10), issues on board                                                                                                           |
| 25 to 40     | Foundation (G3)       | T1 merged: scaffold, hooks, CI, Jest, shared contract, app shell                                                                                 |
| 40 to 60     | Build core            | T2 list + details and T3 map (2 in parallel). Then T4 standard search/filters.                                                                   |
| **T+60**     | **Core checkpoint**   | Map, list, details, keyboard flow, missing-data handling merged or in review, with tests and zero axe violations. If not: announce the cut line. |
| 60 to 80     | Build rest            | T4 if not done, T9 a11y audit, T10 deploy. Then T5/T7 AI, only if core is green.                                                                 |
| **T+80**     | **Cut check**         | Apply the cut order if behind. Stop AI generation work.                                                                                          |
| 80 to 95     | Merge, deploy, verify | Fly smoke test, full suite on `main`, VERIFICATION rows, VoiceOver script written                                                                |
| **T+95**     | **Stop new tickets**  | Begin wrap-up in all cases                                                                                                                       |
| 95 to 120    | Wrap-up (G6)          | README, WALKTHROUGH, transcripts index, zip dry run, secret scan, human close review and VoiceOver pass                                          |
| **T+120**    | **Hard stop**         | Unmerged work goes under "What I left out"                                                                                                       |

Realistic note: the plan gives 40 minutes of build for core plus a11y-tested standard search, with two parallel Sonnet developers. This is tight. Recommendation: the ticketer puts the AI and analytics tickets last and marks them `stretch`.

## 8. Proposed changes to REQUIREMENTS.md (not applied)

### 8a. Human decisions made at Gate 0 (must include)

1. **The env file is `.env.local`, not `.env`.**
   - The server loader and Vite both read `.env.local` from the repo root. Vite `envDir` = repo root. The server uses `--env-file-if-exists=.env.local` or a tiny loader.
   - A missing file never crashes either side. It only means no key and no AI UI.
   - REQUIREMENTS.md itself has no `.env` reference. But other docs have these conflicting lines. Give them the same change when the human approves:
     - `AGENTS.md`: "One root `.env` must serve both sides" (Known gotchas); ground rule 9 "Never read or print `.env`".
     - `CLAUDE.md`: "Never read `.env` or print environment variables. `.env.example` is fine."
     - `PROCESS.md`: section 1 (`.env.example`: key names only), Phase 0 step 2 (`test -f .env && echo present`), step 5 (deny reads of `.env`/`.env.*`), the section 2 "Never" list, the Phase 6 README line ("copy `.env.example` to `.env`"), and the Phase 0 "Never read `.env`" in section 0.
     - `.env.example`: I could not read it. Check that it tells users to copy to `.env.local`.
     - `.claude/settings.json`: the deny rule should cover `.env.local` (and `.env.*`), not only `.env`.
   - Also add `.env.local` (and `.env`) to `.gitignore`. Keep `.env.example` tracked.
   - Vite already loads `.env.local` by default. The server must be told to load it explicitly.
2. **Analytics is PostHog only.**
   - REQUIREMENTS.md section 6 already says PostHog everywhere. I found no "Simple Analytics" or `SA_` line in it.
   - `SELF_IMPROVEMENT.md` lesson 17 records the history (PostHog, then Simple Analytics, then PostHog). This is accurate and needs no change.
   - I could not search or read `.env.example` (blocked). Thus, the orchestrator must run `grep -n -i "simple\|SA_" .env.example REQUIREMENTS.md AGENTS.md PROCESS.md CLAUDE.md`. Replace any hit with `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` (value `https://us.i.posthog.com`), and `VITE_ANALYTICS_CAPTURE_QUERY_TEXT`.
   - In `.env.example`, the expected analytics names are exactly those three.

### 8b. Conflicts and ambiguities found

3. **Brief filename.** REQUIREMENTS.md line 4 and PROCESS.md lines 3 and 50 say `PARKS_PROJECTS.md`. The real file is `PARKS_PROJECT.md`. Fix all references.
4. **FR-9 priority.** FR-9 (standard search/filters/sort) is "should" in REQUIREMENTS. But PROCESS.md says never cut them ("they are the no-key experience"). AGENTS.md calls them the whole experience without a key. Change FR-9 to **must**. The brief calls search optional, so this is a deliberate scope choice. Keep A-7.
5. **FR-40 priority.** FR-40 (two Fly apps deployed by Actions) is "must". But PROCESS.md calls Fly an extra that must never cost core quality. Its cut order drops "Fly deploy polish" last. Change FR-40 to **should**. Keep the README rule "if cut, say so plainly". Do the same for the FR-42 links: keep must for the README link block, but allow "not deployed" wording.
6. **Data path.** The brief says `assets/parks.sample.json`. The repo uses `db/parks.sample.json`. REQUIREMENTS covers this in the Sources line. Add it to Assumptions (done in A-11 here). This is not a real conflict. Just keep it documented.
7. **Fly config values in PROCESS.md section 0.**
   - `FLY_WEB_APP` and `FLY_RAG_APP` are full URLs. But PROCESS.md Phase 5 uses `https://<FLY_WEB_APP>.fly.dev` and `fly secrets list -a <FLY_RAG_APP>`. These expect an app name (`peter-parks-web`).
   - `GH_OWNER` has a trailing period ("ptums.").
   - `GH_REPO` is a URL, but the workflow expects a name (`parks-finder`).
   - Recommendation: the human cleans these to bare names before G0 closes.
8. **README run instructions.** FR-11 and PROCESS.md Phase 6 say "provide your own key". The standard-mode command is `npm run dev:web`. The FR-15 clean-room test says `npm ci` then `npm run check`. This also builds the server and installs `onnxruntime-node`, which has a network-dependent postinstall. State in the README that `npm ci` needs normal network access, also for standard mode.
9. **AI mode default.** AGENTS.md says the default is Both. FR-25 says Both. The REQUIREMENTS section 4 header text agrees. FR-25 option A says that standard filters are "hidden" in AI mode. For accessibility, hidden must mean absent from the DOM and the tab order (not CSS-hidden). Clarify this in FR-25.
10. **The FR-33 event list is "only these"**, but FR-31 also allows autocapture of clicks. Clarify one of these, to match FR-32 and AGENTS product rule 7:
    - autocapture is off, or
    - autocapture is limited to clicks with no text capture.

    Recommendation: autocapture off, explicit events only, because there are fewer moving parts.

11. **Capability URL.** FR-28 says that no `VITE_RAG_URL` means no AI UI. But the Fly web build passes `VITE_RAG_URL` as a build arg (AGENTS.md). This is fine. But `.env.example` should list `VITE_RAG_URL` as blank by default, so that a clean unzip has no AI UI.
12. **Section 10 numbering.** A-7 and A-8 come before A-5 and A-6. This is cosmetic. Renumber them.
13. **Coverage numbers.** FR-18 sets statements/lines 80% and branches 70%. This is reasonable for core. With a 40-minute build window, the architect's exclusions list matters. No change. But flag this: the thresholds apply to `web/` and `shared/` from T1, and to `server/` only when AI tickets exist. Otherwise, T1 fails its own gate.

### 8c. Too big for 2 hours (recommend cuts)

14. **FR-16 "one row per applicable WCAG criterion"** asks for a full evidence table. FR-17 adds aria snapshots on every state in two projects. Recommendation:
    - a criteria table for only the ~25 criteria named in FR-16.
    - aria snapshots for four regions (header, directory, map region, details).
    - Playwright axe on 5 states (default, details open, filters active, no results, sparse park), on desktop and phone.
15. **FR-26 evals** (~20 queries, lexical vs dense vs hybrid, in CI). Recommendation:
    - 12 to 15 queries.
    - `eval:retrieval` offline only.
    - `eval:ask` as a manual script, with results reported honestly.

    The embedding model download in CI is a flake risk (PROCESS.md section 7). Allow lexical-only in CI.

16. **FR-21/22 streaming `/v1/ask` with citation and quote verification.** This is the biggest AI risk. Recommendation: the first AI release is `/v1/search` + UI only. `/v1/ask` is the first thing cut after transitions and analytics.
17. **FR-34 PostHog dashboard and the 13 events in FR-33.** Recommendation: 5 events (`park_selected`, `search_submitted`, `filter_applied`, `search_mode_changed`, `ai_unavailable`) and no dashboard task.
18. **FR-19 "demonstrate a blocked bad commit"** is cheap (one try) and is valuable evidence. Keep it.
19. **NFR-1 forced-colors spot check** and 200% zoom: keep each as a single manual row in VERIFICATION. Do not automate them.
20. **Ten-ticket cap with T1 doing all tooling** (PROCESS.md). T1 alone could use up the 15-minute foundation budget. Recommendation: move the CI deploy workflows and Dockerfiles to T10 (already expected). Keep Husky/CI in T1, but only the minimum.

## 9. Open questions for the human (max 5)

1. **Promote FR-9 (standard search/filters/sort) to must, and demote FR-40 (Fly) to should?** Recommendation: yes to both. This matches the PROCESS.md cut order and keeps the no-key experience first-class.
2. **Do we ship AI search at all if the T+60 core checkpoint slips?** Recommendation: no. If core is not merged by T+60, drop the AI service and UI entirely. Use the time on a11y evidence and the README. Retrieval-only (`/v1/search`) is the minimum AI release. Generation (`/v1/ask`) is optional.
3. **Details presentation: a non-modal region/panel on desktop and a modal dialog on phone, or a modal dialog everywhere?** Recommendation: a modal dialog on phone (bottom sheet) and a non-modal side panel on desktop, so that the map and list stay reachable. The architect makes the final decision at G1. Focus-return behavior is the deciding criterion.
4. **Amenity filter semantics: AND (a park must have all selected) or OR?** Recommendation: AND, with a visible count so that empty results are explained. With 26 slugs and only 12 parks, AND will often give zero results. The "no results" state and Reset must be clear.
5. **Clean the PROCESS.md config values before G0 closes?** These are the trailing period on `GH_OWNER` and the URLs in `GH_REPO`, `FLY_WEB_APP`, and `FLY_RAG_APP`. Recommendation: yes. Change them to bare names (`ptums`, `parks-finder`, `peter-parks-web`, `peter-parks-rag`). Phase 5 builds URLs and `fly -a` commands from these values, and a wrong value would fail late.
