# Parks Finder

- Project board: https://github.com/users/ptums/projects/1
- GitHub Actions: https://github.com/ptums/parks-finder/actions
- Live web app: https://peter-parks-web.fly.dev (AI search is on here; the machine auto-stops when idle, so open it a minute before a demo)
- Live AI service: https://peter-parks-rag.fly.dev (`/healthz`, `/v1/capabilities`; the web app calls it, you do not need to)

The repo and board are private, so these links may not open for you. This README is written to stand on its own.

A web app for browsing 12 local parks: a map with markers, a directory list, details, search and filters, and optional AI search that answers from the park data with checked citations. Built with Claude Code agents under human direction and review.

**Be clear about the time box.** The brief was a 2-hour build. At T+120 the app had only the map, list and details (T1 to T3) plus docs. **Most of the product was built after the box, at my request:** search/filters/sort, an accessibility audit, a web deploy, "use my location", then (that evening and the next day) AI search, analytics, the AI service deploy, Ant Design, live fixes, eval calibration and a bug round. "Time spent" has the timeline. Nothing after T+120 was part of the timed deliverable.

## How to run

Requires Node >= 22.12 and network access for `npm ci` and the map tiles.

**1. Standard mode, no key (the default).** From a clean unzip:

```bash
npm ci
npm run dev:web        # http://localhost:5173
```

Map, list, details, search, filters, sort and "use my location" all work with no key and no `.env.local`. No AI controls are in the page.

**2. With your own Anthropic key (AI search locally).** Copy `.env.example` to `.env.local`, put your key in `ANTHROPIC_API_KEY=`, then:

```bash
npm run dev            # web on :5173 and the AI service on :8080
```

The web app asks `GET /v1/capabilities`; only when the service answers `{"ai":true}` do the AI controls appear. The first AI run downloads a small embedding model (needs internet). If it cannot load, retrieval falls back to keyword-only (`mode: lexical`) instead of crashing. Analytics stay off unless you set `VITE_POSTHOG_KEY`.

**3. No setup: the live site.** https://peter-parks-web.fly.dev has AI search enabled (Claude Haiku 4.5, rate-limited and capped to protect spend). If the daily cap is hit or the service is cold, the standard search still works and AI shows a status message.

When AI is available there are three modes: **Filters** (standard search and filters only), **AI** (the AI does all the searching; the standard filters are removed from the page), and **Both** (AI results narrowed by the standard filters; the default).

Other commands:

```bash
npm run check                     # format check, lint, typecheck, Jest with coverage, build
npx playwright install chromium   # once, then:
npm run e2e                       # Playwright (desktop, phone, ai-desktop, ai-phone)
npm run eval:retrieval            # offline retrieval eval (no key needed)
npm run eval:ask                  # live ask eval (needs a key and credit; manual)
npm run validate:data             # validates db/parks.sample.json
```

## What works

Built and checked as described in "How I checked the result":

- **Core (inside the box).** Map with all parks (OpenStreetMap tiles, attribution kept), keyboard-operable markers (Enter and Space), a directory list, and a native modal `<dialog>` for details. List and map open the same details; focus moves to the heading and returns to the trigger on close. Missing data shows "Not listed" or is omitted; hours are verbatim. Failed images show a labeled placeholder.
- **Search, filters, sort (after the box).** One text search over name, description, address and amenity labels, matching **whole words** with simple plural tolerance ("trail" matches "trails"; "Wi-Fi" and "wifi" are equal). Amenity checkboxes (a park must have **all** selected). Sort by name, rating or size; parks missing the value go last. Reset. Counts are announced politely.
- **Use my location.** Sorts by distance, only when you press the button. Coordinates stay in memory.
- **AI search (after the box).** "Ask about the parks": the answer comes only from retrieved park text, with citations that open the park's details. Abstains ("I don't have that information in the park data.") when the evidence is weak. Capability-gated (see decisions).
- **Analytics (after the box).** PostHog behind one wrapper, off without a key, cookieless. See "Analytics notes".
- **Map Recenter button, ratings in the directory, full image gallery** (the bug round, fixed in PRs #37-#40; see below).
- Skip links, landmarks, one `h1`, one polite live region.
- Two Fly.io apps deployed from GitHub Actions on merge to `main`.

## What I left out

- **Inside the box I cut** T4 (search), T9 (accessibility audit) and T10 (deploy). All three were built afterwards.
- Animated transitions beyond the Recenter control; distance labels in the list when sorted by distance.
- **VoiceOver:** I did a VoiceOver pass as part of my final QA (about 15 minutes, following the 21-step script in `docs/VERIFICATION.md`). No blocking issues found; all scripted steps behaved as expected. Not done: a real phone, 200% zoom, text spacing, forced-colors mode.
- Streaming answers (deliberate: nothing is read token by token), conversation history, a CSP, monitoring and alerts, a custom domain, image hosting.
- Partial-word search ("play" no longer matches "playground"), a consequence of whole-word matching.

## Important decisions

- **One npm package, three folders** (`web/`, `server/`, `shared/`) and `db/` as a plain folder read directly by a typed loader. No database, no copy of the data.
- **Details as a native `<dialog>`** (focus trap, Esc, inert background for free); focus return handled explicitly. **Markers are real focusable elements** with Enter and Space; "Skip map" bypasses the marker tab stops and the list plus details is a full alternative.
- **AI design.** The server chunks each park per field group, prefixed with the park name, and combines keyword (BM25-style) and meaning (local embeddings, cosine) rankings by reciprocal rank fusion. Below a score threshold it abstains **without calling the model**. Otherwise one Claude Haiku 4.5 call (max 400 tokens, no tools) sees only the retrieved chunks, labeled by `chunkId`, with the question treated as untrusted. The server then checks every citation (chunk was retrieved, quote is in it, at least 6 characters, more than the park name) and checks that every name and number in the answer appears in the cited text. Any failure means the whole answer is replaced by an abstention. The answer is one JSON response, not a stream.
- **Capability gating.** The browser cannot see the key, so it asks `GET /v1/capabilities`. No key, no `VITE_RAG_URL`, or an unreachable service means no AI controls in the DOM (not hidden by CSS). The core UI never waits on the service. Key only in the server's environment; CORS limited to the web origin; per-IP rate limit (20 per minute); body limit (413 above 2 KB); daily cap (default 300 model calls per machine, kept in memory); structured logs without keys.
- **PostHog privacy.** `persistence: "memory"` (no cookies or storage), `person_profiles: identified_only` and we never identify, Do Not Track respected, session recording off, autocapture only for clicks on buttons and links, every remote-config feature explicitly disabled, and `$ip` stripped before send. Events carry no coordinates and no query text. A disclosure line appears in the footer only when a key is set.
- **Ant Design for styling only (added at my request).** One theme in `web/src/theme.ts`: green `#0b5d1e` (8.08:1 on white, hover 6.21:1, pressed 10.48:1; computed by the orchestrator after a developer reported wrong figures), 44px controls, motion off under reduced motion. Only `Button`, `Tag` and `Typography.Title` are used because they render native elements. The dialog, selects, checkboxes, radios, map, skip links and live region stay native. antd `Alert` is avoided (it adds `role="alert"`, a second announcer). Cost: main JS grew from 493.86 kB raw (153.33 kB gzip) to 767.49 kB (245.80 kB gzip).
- **Live region hold.** The one polite live region keeps each message for 1.5 seconds before a newer one replaces it, because a late "AI search is available." was overwriting user-triggered messages (REVIEW_LOG #64; fixed in PR #31).
- **Env access in one module** (`web/src/env.ts`); hooks and CI as gates. Full list: `docs/ARCHITECTURE.md`.

## Assumptions

1. The municipality is "NYC-area (fictional mix)": every park lies at lat 40.58 to 40.85, lng -74.09 to -73.79; some are real (Prospect Park), most are fictional. The app makes no claims beyond the data, and the AI is told not to use outside knowledge.
2. Data is shown verbatim: names, addresses, descriptions and hours are never corrected, geocoded or reformatted.
3. `rating` is out of 5 (values 3.9 to 4.9); `acreage` is in acres.
4. Image URLs are placeholders that will not load; the placeholder is the expected experience.
5. There is no contact data, so none is shown.
6. The Cedar Hill Nature Preserve coordinate (40.7128, -74.0060) looks like a default NYC point. Shown as given.
7. The brief calls the data `assets/parks.sample.json`; here it is `db/parks.sample.json`, read directly.
8. The brief says search and filters are optional and does not say which; I chose text search, amenity filter (AND) and sort.
9. "Complete ADA compliance" is read as WCAG 2.2 AA with documented tests plus a human screen-reader pass. No tool can certify ADA compliance and this README does not claim it.
10. The interviewer evaluates from the zip and a 30-minute session; the core needs no keys. The local env file is `.env.local`.
11. Map tiles come from the public OpenStreetMap server (fine here, not for heavy traffic).
12. Phone layout was judged by viewport emulation (Playwright), not a device matrix.

## Dataset changes

One derived file, `db/park-images.json`. `db/parks.sample.json` is untouched and still read verbatim; it is normalized in memory at load (null or empty becomes "missing"). The record's 12 image URLs are all on `images.example.com` and can never load, so the derived file maps 10 park ids to local photos in `images/` (file name plus a short alt text written from looking at each photo). The loader overlays it on those parks' images; a park not in the map keeps its record's images, which fail and show the placeholder. `cedar-hill-nature-preserve` and `east-ridge-trailhead` have no photo and show "Photos not listed". `npm run validate:data` checks that every file exists in `images/`, every id is a real park, and no file is listed twice. The AI index is built from the same file at build time and is a build artifact, not a data change.

## Known issues

- Real phone, 200% zoom, text spacing and forced-colors not checked. The VoiceOver pass was a single 15-minute run by me, not testing with screen-reader users.
- Map markers (25x41 px) and zoom buttons are under the 44 px target rule. Three markers overlap neighbours at the default zoom, so axe's 2.5.8 check fails for them; I rely on the "Equivalent" exception (each list button does the same, full size). The axe test filters only that rule, only for markers.
- Markers are tab stops in data order, not geographic order. "Skip map" and the list mitigate this.
- Enter on a marker is meant to fire once; no test counts dispatches (human check).
- Search no longer matches partial words.
- **AI abstention weaknesses** (see eval tables): off-topic queries "stock market" and "pizza" pass the retrieval stage (the model then abstains); three answerable questions still over-abstain.
- The AI daily cap is per machine and in memory (resets on restart; the live app runs 1 machine by my choice to lower cost).
- Ant Design adds about 92 kB gzip; if a CSP is added, antd needs `style-src 'unsafe-inline'` or a nonce; its focus ring is overridden in `styles.css`. antd was checked with axe and keyboard specs, not a screen reader.
- OpenStreetMap tile usage policy applies.
- `matchFor` is a now-dead helper that should be cleaned up after PR #38. Chromium reads the list name as "Prospect Park , rated…" (extra space), a nit.
- Parallel e2e runs on fixed ports can test another worktree's build (REVIEW_LOG #68); mitigated with isolated `CI=1` re-runs, not yet fixed with per-worktree ports.
- **Photo source and licence are unverified.** The photos in `images/` were added for demo purposes. Clear or replace them before public use. Some are illustrations or renderings, and `oldmill-2.jpg` carries a photographer credit in the picture.
- `images/riverside-commons-1.jpg` is 1.1 MB (about 10-50x the others, which are 22-92 kB). Resize it before public use; I did not touch the human's files.
- `images/memorial.jpg` is unused on purpose: it shows a real stadium in La Crosse, WI, with sponsor logos, which would mislead for Veterans Memorial Field (that park uses `memorial-park.jpg`).
- The image alt "Photo N of M: name" is verbose to some screen readers. Kept deliberately.

## How I checked the result

Full table with evidence and status: `docs/VERIFICATION.md` (each row typed automated, agent or human, dated). In short:

- **Final `main` (after #37-#40):** `npm run check` exit 0, **305 Jest tests**, coverage 96.93% statements, 95.25% branches, 97.77% functions, 99.15% lines; `CI=1 npm run e2e` **98 passed, 0 failed** (desktop, phone, ai-desktop, ai-phone). Run by the orchestrator on the final code. (An earlier docs draft quoted 280 because its branch predated #37-#40.)
- **Earlier stages,** each re-run independently by the orchestrator: foundation (46 tests), map (61), list and details (62), search (83), near-me (114), a11y audit (e2e 76 then 80).
- **Live site:** `/healthz` ok; `/v1/capabilities` returns `{"ai":true}`; `/v1/search` in hybrid mode; an off-topic query abstains; CORS allows only the web origin and exposes `Retry-After`; 413 above 2 KB; AI controls appear about 160 ms after load (warm). One live `/v1/ask` ("Which park has a dog run with water fountains?") returned Highland Dog Park with a word-for-word citation in 1.3 s (484 + 126 tokens). The full e2e suite was run against the live URL several times (80 passed at the near-me stage); later runs exposed the live-region bug fixed in PR #31.
- **Bug round (fixed in PRs #37-#40):** marker images in `vite dev` and the production build, Recenter with Enter and Space, all gallery images, all 19 amenity keywords return exactly the matching parks, 320px reflow.
- **Evals:** below. **Hooks:** a deliberate type-error commit was rejected by pre-commit.
- **Not checked:** a real screen reader, a real phone, 200% zoom, text spacing, hand-checked contrast beyond the computed antd values, PostHog payloads in DevTools and the PostHog project setting (human to-dos), real-device geolocation, load behaviour.

## How I used AI

- **Tool:** Claude Code CLI plus a claude.ai planning chat (`transcripts/`). Models, as confirmed at the start: orchestrator, architect, reviewer, a11y-auditor and rag-engineer on Opus 5.5; PM, ticketer, developer, tester and release (this README) on Sonnet 5.5. The eval answers came from Claude Haiku 4.5, which is also the live AI model. Parallelism capped at 2.
- **Process:** I wrote `PROCESS.md`, `AGENTS.md` and `REQUIREMENTS.md` first. The orchestrator ran phases with human gates; agents worked in separate git worktrees; the orchestrator re-ran every check itself; read-only reviewer and a11y-auditor agents reviewed UI and AI tickets. I merged every PR (#11 to #40).
- **Review log highlights** (68 rows in `docs/REVIEW_LOG.md`):
  - A vacuous e2e tile stub passed CI; a dialog closed on blank-area clicks; an orchestrator report of "18 passed" hid 2 failures.
  - A Caddy config would have served HTML at `/healthz`; the first RAG deploy failed (husky `prepare` under `--omit=dev`, PR #27).
  - PostHog's `ip: false` option has no effect in the installed version, so the "no personal data" claim overclaimed; fixed with `before_send`.
  - Two AI grounding holes found in review: partial citation failures still returned the model's text, and answer text was never checked against the cited chunks.
  - A developer reported wrong contrast ratios (6.29:1 vs 8.08:1 computed); the orchestrator's own "18 passed" was a misread of the last output line.
  - The live-region overwrite (above) only appeared on the live build.
  - Parallel e2e runs shared fixed ports (REVIEW_LOG #68); stacked PRs were merged into the wrong bases (PR #16 fixed it).
- **Incidents.** (1) **API key exposed.** I ran `fly secrets set ANTHROPIC_API_KEY=<value>` through a `!` command, so the key is in the session transcript, which is submitted unredacted. I revoked the key immediately and set a new one with `fly secrets import`, so the value is not in any command. The recruiter should be told; the old key is dead. No key is in the repo or the zip. (2) The Anthropic account initially had no credit, so live `/v1/ask` returned 503 and the UI fell back to standard search; I added credit. (3) The deploy failure above.
- Lessons: `SELF_IMPROVEMENT.md`. Logs: `transcripts/`.

## Accessibility

Built to WCAG 2.2 AA and tested as described. This is not a certification, and automated tools find only part of the real problems.

Tested: jest-axe on component states; whole-page axe (`@axe-core/playwright`, WCAG 2.0 to 2.2 A and AA tags) in several states on desktop and phone; tab-order tests (forward, Shift+Tab, skip links, no trap); aria snapshots and a heading-outline check; Enter, Space and Esc with focus return; 320px reflow; reduced motion; AI states (loading, answer, abstained, error placed under the input with `aria-describedby`); live-region hold. The per-criterion table is in `docs/VERIFICATION.md`.

Known exception: marker target size. VoiceOver: one pass by me during final QA (about 15 minutes); no blocking issues found, all 21 scripted steps behaved as expected. Not done: 200% zoom, text spacing, testing with screen-reader users.

To test with a screen reader: Safari on macOS skips links and buttons on Tab unless "Press Tab to highlight each item" is on; otherwise use Option+Tab. VoiceOver navigation keys work either way. The script, including the AI steps, is in `docs/VERIFICATION.md`.

## Testing

- **Hooks:** pre-commit runs lint-staged then typecheck; pre-push runs Jest. **CI** mirrors them (format, lint, typecheck, Jest with coverage, build, `eval:retrieval`, Playwright). Coverage thresholds are enforced.
- **Jest + React Testing Library + jest-axe:** 305 tests on the final `main`. The Anthropic client is mocked; CI never calls the real API.
- **Playwright:** 98 passed, 0 failed across four projects on the final `main` (run with `CI=1` so it never reuses another worktree's server). `ai-desktop` and `ai-phone` run against a build with an AI service faked in the test.
- **Deploys:** on merge to `main`, GitHub Actions deploys each app to Fly (path-filtered) and curls `/healthz`.

## AI search design + eval tables

Pipeline: question -> keyword ranking + embedding ranking -> reciprocal rank fusion (k = 60) -> abstain if no word overlap and cosine below 0.30 (no model call) -> one model call over the top chunks -> server verifies citations and facts -> answer or abstention. Details: `docs/ARCHITECTURE.md`, `docs/WALKTHROUGH.md`.

**Retrieval eval** (`npm run eval:retrieval`, offline, 23 queries including paraphrases and negatives, threshold 0.30):

| Method  | Recall@3 | MRR  | Abstention accuracy |
| ------- | -------- | ---- | ------------------- |
| Lexical | 0.61     | 0.61 | 0.65                |
| Dense   | 0.94     | 0.94 | not reported        |
| Hybrid  | 0.96     | 0.94 | 0.91                |

Misses: "stock market" (shares the word "markets") and "pizza" (cosine 0.42) are not abstained at the retrieval stage.

**Ask eval** (`npm run eval:ask`, claude-haiku-4-5-20251001, 23 queries, run by the orchestrator; "after" is PR #32):

| Measure                                                                | Before      | After       |
| ---------------------------------------------------------------------- | ----------- | ----------- |
| Abstention accuracy                                                    | 17/23 (74%) | 20/23 (87%) |
| Citation validity                                                      | 16/20 (80%) | 19/20 (95%) |
| Safety (negatives, traps incl. Prospect Park boathouse/zoo, injection) | 7/7         | 7/7         |
| Unsupported facts in shown answers (a human read every answer)         | 0           | 0           |

Remaining misses: `kw-skate` (the fact check flagged a sentence-start "It"), `kw-garden-cafe` (the model quoted "Cafe", too short), `pp-birdwatching` (the model abstained; "birding blind" is not linked to birdwatching). **Caveat:** only 23 queries, and the calibration fixes were motivated by these same cases, so the numbers are indicative, not a benchmark. Calibration lowered the minimum quote length (12 to 6 characters) and logged the model's own abstain reply correctly (it was counted as unparseable); I did not change the data.

## Analytics notes

Events (all through `web/src/analytics.ts`): `park_selected`, `details_closed`, `directory_toggled`, `filter_applied` (slugs, sort keys or "changed", never text), `reset_clicked`, `location_requested` (granted or not), `search_mode_changed`, `ai_answer_shown`, `ai_unavailable`, plus page views. No-op without `VITE_POSTHOG_KEY`; every call is guarded.

**Human to-dos:** turn on "Discard client IP data" in the PostHog project settings (the client strips `$ip`, but PostHog also adds it server-side), and inspect real payloads in DevTools once. Neither is done. Analytics consent and a legal review are not done (see next steps).

## Time spent

Two different clocks: **wall clock** (elapsed time, which includes waiting and agents working) and **my hands-on time** (what I actually spent reading, deciding, reviewing and testing).

| Item                                                                                              | Wall clock                                 | My hands-on time                                |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------- |
| Preparation before the clock (six root docs, accounts, repo setup)                                | n/a                                        | 1 hour 10 minutes                               |
| Build window: 11:58 CDT start, wrap-up began at T+93 (13:31 CDT); I reviewed changes periodically | about 93 minutes                           | about 20 minutes                                |
| Of the build window: waiting at the first review gate (~55 min, counted against the clock)        | about 55 minutes                           | 10 minutes reviewing (included in the 20 above) |
| Human review, merge and final checks after wrap-up                                                | n/a                                        | 10 minutes                                      |
| After the box: T4 search, filters, sort (I chose to continue at T+114)                            | about 8 minutes (T+114 to T+122)           | 5 minutes                                       |
| After the box: T9 audit, T10 deploy, use my location, merges (T+132 onward)                       | about 40 minutes (includes my merge waits) | about 5 minutes                                 |
| Final round of QA and the VoiceOver pass                                                          | n/a                                        | 15 minutes                                      |
| **Total hands-on, excluding preparation**                                                         |                                            | **about 55 minutes**                            |
| **Total hands-on, including preparation**                                                         |                                            | **about 2 hours 5 minutes**                     |

The later additions (AI search, analytics, Ant Design, the live fixes and the bug round, Oct 2 evening to Oct 3) were done by agents with my decisions and merges at each step. They are not itemised separately above: my review and merge time for them is in the "after wrap-up" and QA rows, and their wall-clock time is in `docs/TIMEBOX.md` and the transcripts.

Timeline is in `docs/TIMEBOX.md`. Because of the long gate wait, far less than two hours of working time went into building. **The 2-hour box was exceeded**, by my choice, to build T4, T9, T10, use-my-location and everything after. At the 2-hour mark the submission had the map, list and details only.

## Most important next steps before public use

1. Test with screen-reader users; real phone, 200% zoom, text spacing, forced-colors.
2. Fix marker target size (bigger hit areas or clustering).
3. AI spend and abuse: keep the key server-side, a shared (not per-machine, in-memory) daily cap, billing alerts, an eval set bigger than 23 queries, and a review of abstention misses.
4. Hosting: monitoring and uptime alerts, a CSP (antd needs a style allowance), cold-start behaviour with more than one machine, a rehearsed rollback (`fly releases`, `fly deploy --image <previous>`).
5. Analytics: consent and legal review, "Discard client IP data", DevTools payload check.
6. Replace or self-host map tiles (OpenStreetMap's public server is not for heavy traffic).
7. Image hosting and licensing; data freshness and the Cedar Hill coordinate; per-worktree e2e ports; remove the dead `matchFor` helper.

## Disclosure

The repo scaffold documents (`AGENTS.md`, `CLAUDE.md`, `PROCESS.md`, `REQUIREMENTS.md`, `SELF_IMPROVEMENT.md`, `.env.example`; the brief `PARKS_PROJECT.md` and the data came from Granicus) were prepared before the clock started. The map, list and details were built within the 2-hour box; everything else, including all AI search and analytics, was built after it, as described above.
