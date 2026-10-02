# PRD: Parks Finder

Status: DRAFT for Gate 1. Author: pm role. Sources: `PARKS_PROJECT.md` (brief), `REQUIREMENTS.md`, `AGENTS.md`, `PROCESS.md`, `docs/DATA_PROFILE.md`, `SELF_IMPROVEMENT.md`.
Limits of this review: I could not read `.env.example` (blocked by permissions) and had no shell, so line references for it are unchecked; see section 8.

## 1. Goal and audience

**Goal.** A small, polished, accessible web app where a resident can see local parks on a map, browse them in a list, and open details for one park. It must work with no location access, no AI service, and no analytics.

**Audience.**

- Primary: residents of a NYC-area municipality (fictional mix), on a phone or desktop, some using a keyboard or screen reader.
- Secondary: the Granicus interviewer, who gets a zip, spends 30 minutes in a follow-up, and grades usefulness, communication, code quality, AI accountability, and verification. A modest app that works and is well explained beats an ambitious broken one (the brief says so).

**Success looks like.** A resident finds a park and reads its details, by mouse, keyboard, or VoiceOver, in under a minute. The interviewer unzips, runs `npm ci` and `npm run dev:web`, and sees the whole core with no keys.

## 2. Scope

Time box: 120 minutes. Cut order from PROCESS.md: transition polish, analytics extras, `/v1/ask` generation, AI search entirely, e2e extras, Fly polish. Never cut: core, standard search and filters, WCAG 2.2 AA, tests, README, REVIEW_LOG, VERIFICATION, transcripts.

### MUST (the product; T+60 checkpoint)

- Map with a marker per park (FR-1), list (FR-2), details opened from either (FR-3). Same details component for both.
- Missing-data handling: render only what exists, "Not listed" or hide the section, never invent (data rules in REQUIREMENTS section 3). Component tests include a synthetic park with every optional field missing.
- Image failure shows a labeled placeholder (normal path, see section 4).
- No geolocation needed or requested on load (FR-6).
- Keyboard and screen reader operable, WCAG 2.2 AA, tested (FR-4, FR-5, FR-16, FR-17): skip links, landmarks, one h1, focus into details and back to trigger, Enter and Space on markers, Esc closes, live region for result counts.
- Phone and desktop layouts; collapsible directory; details usable at 320px.
- Standard search, amenity filters, and sort (FR-9). This is the no-key experience, so it is MUST here (REQUIREMENTS marks it "should"; see change 4).
- Tests (FR-18) and gates (FR-19): Jest + RTL + jest-axe, Playwright keyboard/axe/aria snapshots, Husky, CI.
- Deliverables: README (FR-11), VERIFICATION (FR-12), REVIEW_LOG (FR-13), WALKTHROUGH (FR-14), transcripts (FR-7), zip with no credentials (FR-15), time-box honesty (FR-8), board and PRs (FR-41).

### SHOULD (only after core is merged with tests and zero axe violations)

- AI search behind capability gating (FR-20 to FR-28), retrieval first (`/v1/capabilities`, `/v1/search`, retrieval eval), then UI with Filters / AI / Both modes. `/v1/ask` generation and citations last.
- Fly.io deploy of web and server (FR-40) with health checks. The human wants it and the README links it. Start the deploy ticket early so problems surface early, but it does not block core.

### COULD

- Analytics via PostHog (FR-30 to FR-34), wrapper only plus a handful of events.
- "Near me" sort (FR-10), button only, coordinates stay in the browser.

### Cut / not building (say so in the README)

- Slides, video (optional extras only).
- Accounts, a database server, user content, conversation memory, vector database, reranker, PWA/offline, i18n.
- Parsing hours, "open now", any reformatting of hours.
- Map clustering (unless trivial), fly-to animation and other transition polish (first to go).
- PostHog dashboard (FR-34) as a build task: the human builds it in PostHog if time allows; README screenshot optional.
- Any contact-info data (none exists); Contacts block shows "Contact information not listed" or is omitted.
- Legal ADA certification claims. The README says "built to WCAG 2.2 AA and tested as described".

## 3. User stories

Each story lists acceptance hints, not full criteria (the ticketer writes those).

| #   | As a...                       | I want...                                           | Acceptance hints                                                                                                                                           | FR                     |
| --- | ----------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| U1  | Resident                      | to see all parks on a map                           | 12 markers; each has an accessible name (park name); tile failure leaves list usable                                                                       | FR-1, NFR-2            |
| U2  | Resident                      | to click a marker and see details                   | Same details panel as the list; marker opens on Enter and Space                                                                                            | FR-1, FR-3             |
| U3  | Resident                      | to browse a list without the map                    | All parks listed; selecting one opens the same details                                                                                                     | FR-2                   |
| U4  | Resident                      | to read a park's information                        | Name, address, description, amenities (human labels), hours verbatim, images, plus acreage and rating when numeric                                         | FR-3                   |
| U5  | Resident                      | missing data to be handled honestly                 | Null description, absent address, empty images, null rating show "Not listed" or are hidden; nothing invented                                              | FR-3, section 3        |
| U6  | Resident on a phone           | a usable layout                                     | Directory collapsed by default; details as bottom sheet or dialog; no horizontal scroll at 320px; targets >= 44px                                          | FR-4, NFR-1            |
| U7  | Keyboard user                 | to tab to a list item, open details, close with Esc | Visible focus, logical tab order, focus moves into details and returns to trigger, no trap                                                                 | FR-5, FR-17            |
| U8  | Screen reader user            | landmarks, headings, skip links, announced status   | Skip to results / Skip map; one h1; polite live region says "N parks found"; aria snapshots; human VoiceOver pass                                          | FR-16, FR-17           |
| U9  | Resident                      | to search by text and filter by amenity             | Text over name, description, amenities, address; multi-select amenity filter (AND semantics, architect confirms); count announced; Reset clears everything | FR-9                   |
| U10 | Resident                      | to sort by name, rating, or acreage                 | Null ratings sort last, never as zero                                                                                                                      | FR-9                   |
| U11 | Resident with no location     | everything to work without sharing location         | No prompt on load; test with geolocation denied                                                                                                            | FR-6                   |
| U12 | Resident (optional)           | to sort by distance                                 | Button, permission on click, denial handled, coordinates never leave the browser                                                                           | FR-10 (could)          |
| U13 | Resident, AI available        | to ask in natural language and get matching parks   | Mode radios Filters / AI / Both (default Both); matched text shown; absent from the DOM with no key                                                        | FR-25, FR-27, FR-28    |
| U14 | Resident, AI cold or capped   | the standard UI to work immediately                 | Status message in live region; standard search unaffected                                                                                                  | FR-28, NFR-2, NFR-5    |
| U15 | Resident asking AI            | answers grounded in the data, with citations        | Abstains when evidence is weak; citations link to details                                                                                                  | FR-21, FR-22 (should)  |
| U16 | Interviewer                   | to run the app from a zip                           | `npm ci`, `npm run dev:web` works with no keys; README explains the key route                                                                              | FR-11, FR-15           |
| U17 | Interviewer                   | to see how it was checked and how AI was directed   | VERIFICATION, REVIEW_LOG, WALKTHROUGH with 3 review candidates, transcripts                                                                                | FR-7, FR-12 to FR-14   |
| U18 | Site owner (analytics, could) | anonymous usage counts without privacy cost         | No-op without key; no cookies; no PII; never throws                                                                                                        | FR-30 to FR-33 (could) |

## 4. Data-driven decisions (from `docs/DATA_PROFILE.md`)

1. **Images always fail.** All 12 URLs are on `images.example.com`. The placeholder is the normal path, not an edge case. It must be labeled ("Image unavailable for <park name>"), have a fixed aspect ratio so there is no layout jump, and be tested. Parks with empty `images` (`cedar-hill-nature-preserve`, `east-ridge-trailhead`) show the same placeholder or "No photos listed". Pick one wording and keep it consistent. Alt text is park name + "photo" while an image is shown.
2. **Hours are free text.** `6:00 AM - 1:00 AM` (crosses midnight), `Dawn to dusk`, `24 hours`, and others. Show verbatim. No parsing, no "open now", no reformatting.
3. **Addresses are partial.** Most are street-only ("Ridge Rd", "44th St & 7th Ave"); `highland-dog-park` has no `address` key. Show verbatim; absent shows "Address not listed". Do not geocode or append "NYC".
4. **Null description and null rating.** `old-mill-botanical-garden` has a null description; `cedar-hill-nature-preserve` has a null rating. Hide or "Not listed". Never show 0 stars. Sorting by rating puts nulls last. Rating is shown as a number ("4.7 out of 5" is an assumption, see A-3).
5. **Suspicious coordinate.** `cedar-hill-nature-preserve` sits at 40.7128, -74.0060 (the common "NYC" default). Show it as given. Record it in README assumptions and Known issues. Do not move or hide the marker.
6. **No single record is fully sparse.** Component tests need a synthetic "everything missing" fixture in addition to the real sparse parks.
7. **26 amenity slugs.** Needs a slug to label map ("dog-run" to "Dog run"). Unknown slugs fall back to mechanical title case and are never dropped. Filter list is built from the data, not hard-coded.
8. **Map defaults.** Initial view fits the bounds of all parks (NYC area, lat 40.58 to 40.85). Parks with invalid coordinates are listed but not mapped (none today; keep the guard and a test).
9. **Descriptions repeat acreage** (e.g. "526-acre"). Not a conflict; show both as given.
10. **Dataset is unmodified.** No derived file is planned, so README "Dataset changes" says: none, read verbatim from `db/parks.sample.json`.

## 5. Assumptions (copy verbatim into the README)

1. The municipality is "NYC-area (fictional mix)": every park lies at lat 40.58 to 40.85, lng -74.09 to -73.79; some are real (Prospect Park), most are fictional. The app makes no claims beyond the data.
2. The data is shown verbatim: names, addresses (including partial ones), descriptions, and hours are not corrected, geocoded, completed, or reformatted.
3. `rating` is assumed to be out of 5 (the brief does not state a scale; values range 3.9 to 4.9). It is displayed as a number, never as stars alone.
4. `acreage` is assumed to be in acres.
5. Image URLs are placeholders that will not load; the labeled "image unavailable" placeholder is the expected experience.
6. There is no contact data, so no contacts are shown ("Contact information not listed").
7. The coordinate for `cedar-hill-nature-preserve` (40.7128, -74.0060) looks like a default NYC point rather than a real preserve location. It is shown as given.
8. The brief says search and filters are optional and does not say which; we chose text search, a multi-select amenity filter, and sort by name, rating, or acreage.
9. "Complete ADA compliance" is interpreted as WCAG 2.2 Level AA with documented automated and manual tests plus a human VoiceOver pass. No tool can certify ADA compliance, and the README does not claim it.
10. The interviewer evaluates from the zip and a 30-minute session. The core and standard search/filters need no keys. AI search needs the interviewer's own Anthropic API key locally, or the Fly.io deployment where it is enabled; with no key there is no AI UI.
11. The brief calls the data file `assets/parks.sample.json`; in this repo it lives at `db/parks.sample.json` and is read directly.
12. Map tiles come from the public OpenStreetMap server (attribution kept). It is fine for this exercise but not for heavy public traffic.
13. The local environment file is `.env.local` at the repo root (not `.env`); a missing file never crashes either side.
14. Analytics, if enabled, is PostHog only, anonymous, cookieless, with no PII.
15. The repo scaffold documents (the six root files) were prepared before the 2-hour clock started; the application was built inside the time box. The human fills in the prep minutes.
16. Phone layout is judged by viewport emulation (Playwright) plus a human check; no physical device matrix.

## 6. Risks

| #   | Risk                                                                             | Likelihood | Impact | Mitigation                                                                                                                                           |
| --- | -------------------------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Scope exceeds 2 hours (full WCAG table, AI service, analytics, Fly, hooks, e2e)  | High       | High   | Core first; T+60 checkpoint; follow cut order; cap parallelism at 2; AI and analytics are tickets that can be dropped whole.                         |
| R2  | Foundation ticket (T1) is too big and blocks everyone for more than 15 minutes   | High       | High   | Ticketer keeps T1 to scaffold + configs only; Fly files and CI deploy go to T10; ask architect to pin dependencies up front.                         |
| R3  | Leaflet marker keyboard access is wrong (Space not handled, default icons break) | Medium     | High   | Marker strategy decided by the architect; unit test Enter and Space; Playwright test; skip link "Skip map"; list + details are the full alternative. |
| R4  | Axe passes but real screen-reader use is poor                                    | Medium     | High   | Aria snapshots, tab-order test, scripted human VoiceOver pass (required); README never says "fully compliant".                                       |
| R5  | AI work consumes core time or usage budget (embedding model download, evals)     | Medium     | High   | AI tickets start only after T+60 core checkpoint is met; lexical fallback; drop `/v1/ask` first, then AI entirely; usage readings at G0/G1/G3/G4.    |
| R6  | Parallel agents collide on files or the lockfile                                 | Medium     | Medium | Disjoint `files_touched`, named slots in the app shell, `package.json` frozen after foundation, `npx husky` in each worktree.                        |
| R7  | Secrets leak into transcripts, zip, or CI                                        | Low        | High   | Never read `.env.local`; deny rule in `.claude/settings.json`; secret scan on the zip; key only in Fly secrets and server `process.env`.             |
| R8  | Fly deploy problems (cold starts, model baked in image, region, card on file)    | Medium     | Medium | Start deploy ticket right after T1; UI treats the service as optional; README states plainly if cut. Fly config values need cleanup (see change 11). |
| R9  | Jest cannot run `import.meta.env`; ESM-only deps break tests                     | Medium     | Medium | Single `web/src/env.ts` mapped to a stub; `.cjs` Jest config; mock `@huggingface/transformers`.                                                      |
| R10 | Placeholder images everywhere make the UI look broken or jump                    | High       | Medium | Designed placeholder with fixed aspect ratio, labeled text, tested; screenshot in README so the interviewer knows it is deliberate.                  |

## 7. Time plan (120 minutes, from PROCESS.md section 3)

| Window (min) | Phase                 | Output                                                                                                                                   |
| ------------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 0 to 5       | Preflight (G0)        | Tooling checks, labels, settings, usage reading                                                                                          |
| 5 to 17      | Analyze (G1)          | DATA_PROFILE (done), this PRD, ARCHITECTURE                                                                                              |
| 17 to 25     | Plan (G2)             | TICKETS.json (max 10), issues on board                                                                                                   |
| 25 to 40     | Foundation (G3)       | T1 merged: scaffold, hooks, CI, Jest, shared contract, app shell                                                                         |
| 40 to 60     | Build core            | T2 list + details, T3 map (2 in parallel), then T4 standard search/filters                                                               |
| **T+60**     | **Core checkpoint**   | Map, list, details, keyboard flow, missing-data handling merged or in review, tests and zero axe violations. If not: cut line announced. |
| 60 to 80     | Build rest            | T4 if not done, T9 a11y audit, T10 deploy; then T5/T7 AI only if core is green                                                           |
| **T+80**     | **Cut check**         | Apply cut order if behind. Stop AI generation work.                                                                                      |
| 80 to 95     | Merge, deploy, verify | Fly smoke test, full suite on `main`, VERIFICATION rows, VoiceOver script written                                                        |
| **T+95**     | **Stop new tickets**  | Begin wrap-up regardless                                                                                                                 |
| 95 to 120    | Wrap-up (G6)          | README, WALKTHROUGH, transcripts index, zip dry run, secret scan, human close review and VoiceOver pass                                  |
| **T+120**    | **Hard stop**         | Unmerged work goes under "What I left out"                                                                                               |

Realistic note: 40 minutes of build for core plus a11y-tested standard search, with two parallel Sonnet developers, is tight. Recommend the ticketer put AI and analytics tickets last and mark them `stretch`.

## 8. Proposed changes to REQUIREMENTS.md (not applied)

### 8a. Human decisions made at Gate 0 (must include)

1. **Env file is `.env.local`, not `.env`.** The server loader and Vite both read `.env.local` from the repo root (Vite `envDir` = repo root; server uses `--env-file-if-exists=.env.local` or a tiny loader). A missing file never crashes either side; it just means no key and no AI UI. REQUIREMENTS.md itself contains no `.env` reference, but these conflicting lines exist in other docs and need the same change when the human approves:
   - `AGENTS.md`: "One root `.env` must serve both sides" (Known gotchas); ground rule 9 "Never read or print `.env`".
   - `CLAUDE.md`: "Never read `.env` or print environment variables. `.env.example` is fine."
   - `PROCESS.md` section 1 (`.env.example`: key names only), Phase 0 step 2 (`test -f .env && echo present`), step 5 (deny reads of `.env`/`.env.*`), section 2 "Never" list, Phase 6 README line ("copy `.env.example` to `.env`"), and the Phase 0 "Never read `.env`" in section 0.
   - `.env.example`: could not read it. Check that it tells users to copy to `.env.local`.
   - `.claude/settings.json` deny rule should cover `.env.local` (and `.env.*`), not just `.env`.
   - Also add `.env.local` (and `.env`) to `.gitignore` and keep `.env.example` tracked. Vite already loads `.env.local` by default but the server must be told explicitly.
2. **Analytics is PostHog only.** REQUIREMENTS.md section 6 already says PostHog everywhere and I found no "Simple Analytics" or `SA_` line in it. `SELF_IMPROVEMENT.md` lesson 17 records the history (PostHog, then Simple Analytics, then PostHog), which is accurate and needs no change. I could not search or read `.env.example` (blocked), so the orchestrator must run `grep -n -i "simple\|SA_" .env.example REQUIREMENTS.md AGENTS.md PROCESS.md CLAUDE.md` and replace any hit with `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST` (value `https://us.i.posthog.com`), and `VITE_ANALYTICS_CAPTURE_QUERY_TEXT`. In `.env.example` the expected analytics names are exactly those three.

### 8b. Conflicts and ambiguities found

3. **Brief filename.** REQUIREMENTS.md line 4 and PROCESS.md lines 3 and 50 say `PARKS_PROJECTS.md`; the real file is `PARKS_PROJECT.md`. Fix all references.
4. **FR-9 priority.** FR-9 (standard search/filters/sort) is "should" in REQUIREMENTS, but PROCESS.md says never cut ("they are the no-key experience") and AGENTS.md calls them the whole experience without a key. Change FR-9 to **must**. (The brief calls search optional, so this is a deliberate scope choice; keep A-7.)
5. **FR-40 priority.** FR-40 (two Fly apps deployed by Actions) is "must", but PROCESS.md calls Fly an extra that must never cost core quality, and its cut order drops "Fly deploy polish" last. Change to **should**, and keep the README rule "if cut, say so plainly". Same for FR-42 links: keep must for the README link block but allow "not deployed" wording.
6. **Data path.** The brief says `assets/parks.sample.json`; repo uses `db/parks.sample.json`. REQUIREMENTS covers this in the Sources line; add it to Assumptions (done in A-11 here). Not a real conflict, just keep it documented.
7. **Fly config values in PROCESS.md section 0.** `FLY_WEB_APP` and `FLY_RAG_APP` are full URLs, but PROCESS.md Phase 5 uses `https://<FLY_WEB_APP>.fly.dev` and `fly secrets list -a <FLY_RAG_APP>`, which expect an app name (`peter-parks-web`). `GH_OWNER` has a trailing period ("ptums.") and `GH_REPO` is a URL where the workflow expects a name (`parks-finder`). Recommend the human clean these to bare names before G0 closes.
8. **README run instructions.** FR-11 and PROCESS.md Phase 6 say "provide your own key"; the standard-mode command is `npm run dev:web`. FR-15's clean-room test says `npm ci` then `npm run check`, which also builds the server and installs `onnxruntime-node` (network-dependent postinstall). State in the README that `npm ci` needs normal network access, even for standard mode.
9. **AI mode default.** AGENTS.md says default is Both; FR-25 says Both; REQUIREMENTS section 4 header text is consistent. FR-25 option A says standard filters are "hidden" in AI mode; for accessibility, hidden must mean absent from the DOM and tab order (not CSS-hidden). Clarify in FR-25.
10. **FR-33 event list is "only these"** but FR-31 also allows autocapture of clicks. Clarify that autocapture is off, or limited to clicks with no text capture, to match FR-32 and AGENTS product rule 7. (Recommend: autocapture off; explicit events only, since fewer moving parts.)
11. **Capability URL.** FR-28 says no `VITE_RAG_URL` means no AI UI, but the Fly web build passes `VITE_RAG_URL` as a build arg (AGENTS.md). Fine, but `.env.example` should list `VITE_RAG_URL` as blank by default so a clean unzip has no AI UI.
12. **Section 10 numbering.** A-7 and A-8 appear before A-5 and A-6. Cosmetic; renumber.
13. **Coverage numbers.** FR-18 sets statements/lines 80% and branches 70%. Reasonable for core; with a 40-minute build window the architect's exclusions list matters. No change, but flag that thresholds apply to `web/` and `shared/` from T1 and `server/` only once AI tickets exist (otherwise T1 fails its own gate).

### 8c. Too big for 2 hours (recommend cuts)

14. **FR-16 "one row per applicable WCAG criterion"** with a full evidence table plus FR-17 aria snapshots on every state in two projects. Recommend: criteria table for the ~25 criteria named in FR-16 only; aria snapshots for four regions (header, directory, map region, details); Playwright axe on 5 states (default, details open, filters active, no results, sparse park) in desktop and phone.
15. **FR-26 evals** (~20 queries, lexical vs dense vs hybrid, in CI). Recommend 12 to 15 queries, `eval:retrieval` offline only, and `eval:ask` as a manual script with results reported honestly. Embedding model download in CI is a flake risk (PROCESS.md section 7); allow lexical-only in CI.
16. **FR-21/22 streaming `/v1/ask` with citation and quote verification.** Biggest AI risk. Recommend the first AI release be `/v1/search` + UI only; `/v1/ask` is the first thing cut after transitions and analytics.
17. **FR-34 PostHog dashboard and FR-33's 13 events.** Recommend 5 events (`park_selected`, `search_submitted`, `filter_applied`, `search_mode_changed`, `ai_unavailable`) and no dashboard task.
18. **FR-19 "demonstrate a blocked bad commit"** is cheap (one try) and valuable evidence; keep it.
19. **NFR-1 forced-colors spot check** and 200% zoom: keep as a single manual row each in VERIFICATION, not automated.
20. **Ten-ticket cap with T1 doing all tooling** (PROCESS.md): T1 alone could eat the 15-minute foundation budget. Recommend moving CI deploy workflows and Dockerfiles to T10 (already expected) and Husky/CI to T1 but only the minimum.

## 9. Open questions for the human (max 5)

1. **Promote FR-9 (standard search/filters/sort) to must, and demote FR-40 (Fly) to should?** Recommendation: yes to both. It matches PROCESS.md cut order and keeps the no-key experience first-class.
2. **Do we ship AI search at all if T+60 core checkpoint slips?** Recommendation: no. If core is not merged by T+60, drop AI service and UI entirely and use the time on a11y evidence and the README. Retrieval-only (`/v1/search`) is the minimum AI release; generation (`/v1/ask`) is optional.
3. **Details presentation: non-modal region/panel on desktop and modal dialog on phone, or a modal dialog everywhere?** Recommendation: modal dialog on phone (bottom sheet), non-modal side panel on desktop so the map and list stay reachable; the architect makes the final call at G1 with focus-return behavior as the deciding criterion.
4. **Amenity filter semantics: AND (park must have all selected) or OR?** Recommendation: AND, with a visible count so empty results are explained. With 26 slugs and only 12 parks, AND will often produce zero; the "no results" state and Reset must be clear.
5. **Clean the PROCESS.md config values (trailing period on `GH_OWNER`, URLs in `GH_REPO`, `FLY_WEB_APP`, `FLY_RAG_APP`) before G0 closes?** Recommendation: yes, change to bare names (`ptums`, `parks-finder`, `peter-parks-web`, `peter-parks-rag`), because Phase 5 builds URLs and `fly -a` commands from them and a wrong value would fail late.
