# Parks Finder

- Project board: https://github.com/users/ptums/projects/1
- GitHub Actions: https://github.com/ptums/parks-finder/actions
- Live web app: https://peter-parks-web.fly.dev. AI search is on here. The machine stops automatically when idle. Open it one minute before a demo.
- Live AI service: https://peter-parks-rag.fly.dev (`/healthz`, `/v1/capabilities`). The web app calls it. You do not need to call it.

The repo and the board are private, so these links possibly do not open for you. This README is written to stand on its own.

Parks Finder is a web app to browse 12 local parks. It has a map with markers, a directory list, details, and search and filters. It also has optional AI search. The AI search answers from the park data, with checked citations. Claude Code agents built it under human direction and review.

**Be clear about the time box.** The brief was a 2-hour build. At T+120, the app had only the map, the list and the details (T1 to T3), plus docs. **I asked for most of the product after the box:**

- Search, filters and sort.
- An accessibility audit.
- A web deploy.
- "Use my location".
- Then, that evening and the next day: AI search, analytics, the AI service deploy, Ant Design, live fixes, eval calibration and a bug round.

"Time spent" has the timeline. Nothing after T+120 was part of the timed deliverable.

## How to run

You need Node >= 22.12. You also need network access for `npm ci` and the map tiles.

**1. Standard mode, no key (the default).** From a clean unzip:

```bash
npm ci
npm run dev:web        # http://localhost:5173
```

The map, list, details, search, filters, sort and "use my location" all work with no key and no `.env.local`. The page has no AI controls.

**2. With your own Anthropic key (AI search locally).**

1. Copy `.env.example` to `.env.local`.
2. Put your key in `ANTHROPIC_API_KEY=`.
3. Run:

```bash
npm run dev            # web on :5173 and the AI service on :8080
```

The web app asks `GET /v1/capabilities`. The AI controls appear only when the service answers `{"ai":true}`. The first AI run downloads a small embedding model. This needs internet. If the model cannot load, retrieval falls back to keyword-only (`mode: lexical`). It does not crash. Analytics stay off unless you set `VITE_POSTHOG_KEY`.

**3. No setup: the live site.** https://peter-parks-web.fly.dev has AI search on. It uses Claude Haiku 4.5, with a rate limit and a cap to protect spend. If the service hits the daily cap or is cold, the standard search still works. The AI shows a status message.

When AI is available, there are three modes:

- **Filters**: standard search and filters only.
- **AI**: the AI does all the searching. The standard filters are removed from the page.
- **Both**: the standard filters narrow the AI results. This is the default.

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

I built and checked these items as "How I checked the result" describes:

- **Core (inside the box).**
  - A map with all parks. It uses OpenStreetMap tiles and keeps the attribution.
  - Map markers that you can operate with the keyboard (Enter and Space).
  - A directory list.
  - A native modal `<dialog>` for details.
  - The list and the map open the same details. Focus moves to the heading. Focus returns to the trigger on close.
  - Missing data shows "Not listed" or is omitted. Hours are shown verbatim.
  - Failed images show a labeled placeholder.
- **Search, filters, sort (after the box).**
  - One text search over name, description, address and amenity labels.
  - It matches **whole words** with simple plural tolerance. "trail" matches "trails". "Wi-Fi" and "wifi" are equal.
  - Amenity checkboxes. A park must have **all** selected amenities.
  - Sort by name, rating or size. Parks without the value go last.
  - Reset.
  - The app announces counts politely.
- **Use my location.** It sorts by distance, only when you push the button. Coordinates stay in memory.
- **AI search (after the box).**
  - "Ask about the parks": the answer comes only from retrieved park text.
  - Citations open the park's details.
  - When the evidence is weak, it abstains ("I don't have that information in the park data.").
  - It is capability-gated (see decisions).
- **Analytics (after the box).** PostHog behind one wrapper. It is off without a key, and it uses no cookies. See "Analytics notes".
- **Map Recenter button, ratings in the directory, full image gallery.** These came from the bug round and were fixed in PRs #37-#40 (see below).
- Skip links, landmarks, one `h1`, one polite live region.
- Two Fly.io apps. GitHub Actions deploys them on merge to `main`.

## What I left out

- **Inside the box, I cut** T4 (search), T9 (accessibility audit) and T10 (deploy). I built all three after the box.
- Animated transitions, other than the Recenter control.
- Distance labels in the list when it is sorted by distance.
- **VoiceOver:** I did a VoiceOver pass as part of my final QA. It took about 15 minutes and followed the 21-step script in `docs/VERIFICATION.md`. I found no blocking issues. All scripted steps behaved as expected. Not done: a real phone, 200% zoom, text spacing, forced-colors mode.
- Streaming answers. This is deliberate: nothing is read token by token.
- Conversation history, a CSP, monitoring and alerts, a custom domain, image hosting.
- Partial-word search. "play" no longer matches "playground". This is a result of whole-word matching.

## Important decisions

- **One npm package, three folders** (`web/`, `server/`, `shared/`). `db/` is a plain folder. A typed loader reads it directly. There is no database and no copy of the data.
- **Details as a native `<dialog>`.** The dialog gives the focus trap, Esc and an inert background for free. The code handles focus return explicitly.
- **Markers are real focusable elements** with Enter and Space. "Skip map" bypasses the marker tab stops. The list plus details is a full alternative to the markers.
- **AI design.**
  - The server chunks each park per field group. It prefixes each chunk with the park name.
  - It combines two rankings by reciprocal rank fusion: keyword (BM25-style) and meaning (local embeddings, cosine).
  - Below a score threshold, it abstains **without calling the model**.
  - Otherwise, it makes one Claude Haiku 4.5 call (max 400 tokens, no tools). The model sees only the retrieved chunks, labeled by `chunkId`. The question is treated as untrusted.
  - The server then checks every citation. The chunk must be retrieved. The quote must be in it. The quote must be at least 6 characters and more than the park name.
  - It also checks that every name and number in the answer appears in the cited text.
  - Any failure replaces the whole answer with an abstention.
  - The answer is one JSON response, not a stream.
- **Capability gating.**
  - The browser cannot see the key, so it asks `GET /v1/capabilities`.
  - No key, no `VITE_RAG_URL`, or an unreachable service means no AI controls in the DOM. They are not hidden by CSS.
  - The core UI never waits on the service.
  - The key is only in the server's environment.
  - CORS is limited to the web origin.
  - Per-IP rate limit: 20 per minute.
  - Body limit: 413 above 2 KB.
  - Daily cap: default 300 model calls per machine, kept in memory.
  - Structured logs contain no keys.
- **PostHog privacy.**
  - `persistence: "memory"`: no cookies or storage.
  - `person_profiles: identified_only`, and we never identify.
  - Do Not Track is respected.
  - Session recording is off.
  - Autocapture is only for clicks on buttons and links.
  - Every remote-config feature is explicitly disabled.
  - `$ip` is stripped before send.
  - Events carry no coordinates and no query text.
  - A disclosure line appears in the footer only when a key is set.
- **Ant Design for styling only (added at my request).**
  - One theme in `web/src/theme.ts`.
  - Green `#0b5d1e`: 8.08:1 on white, hover 6.21:1, pressed 10.48:1. The orchestrator computed these values after a developer reported wrong figures.
  - 44px controls. Motion is off under reduced motion.
  - Only `Button`, `Tag` and `Typography.Title` are used, because they render native elements.
  - The dialog, selects, checkboxes, radios, map, skip links and live region stay native.
  - We avoid antd `Alert`. It adds `role="alert"`, which is a second announcer.
  - Cost: main JS grew from 493.86 kB raw (153.33 kB gzip) to 767.49 kB (245.80 kB gzip).
- **Live region hold.** The one polite live region keeps each message for 1.5 seconds before a newer message replaces it. We did this because a late "AI search is available." overwrote messages that the user caused (REVIEW_LOG #64; fixed in PR #31).
- **Env access in one module** (`web/src/env.ts`). Hooks and CI are gates. Full list: `docs/ARCHITECTURE.md`.

## Assumptions

1. The municipality is "NYC-area (fictional mix)". Every park is at lat 40.58 to 40.85, lng -74.09 to -73.79. Some parks are real (Prospect Park). Most are fictional. The app makes no claims beyond the data. The AI is told not to use outside knowledge.
2. Data is shown verbatim. Names, addresses, descriptions and hours are never corrected, geocoded or reformatted.
3. `rating` is out of 5 (values 3.9 to 4.9). `acreage` is in acres.
4. Image URLs are placeholders that will not load. The placeholder is the expected experience.
5. There is no contact data, so none is shown.
6. The Cedar Hill Nature Preserve coordinate (40.7128, -74.0060) looks like a default NYC point. It is shown as given.
7. The brief calls the data `assets/parks.sample.json`. Here it is `db/parks.sample.json`, read directly.
8. The brief says search and filters are optional, and does not say which. I chose text search, amenity filter (AND) and sort.
9. I read "Complete ADA compliance" as WCAG 2.2 AA with documented tests plus a human screen-reader pass. No tool can certify ADA compliance. This README does not claim it.
10. The interviewer evaluates from the zip and a 30-minute session. The core needs no keys. The local env file is `.env.local`.
11. Map tiles come from the public OpenStreetMap server. This is fine here, but not for heavy traffic.
12. I judged the phone layout by viewport emulation (Playwright), not by a device matrix.

## Dataset changes

There is one derived file, `db/park-images.json`.

- `db/parks.sample.json` is untouched. The app still reads it verbatim.
- The loader normalizes it in memory at load. Null or empty becomes "missing".
- The record has 12 image URLs. All are on `images.example.com` and can never load.
- So the derived file maps 10 park ids to local photos in `images/`. Each entry has a file name plus a short alt text. I wrote the alt text from looking at each photo.
- The loader overlays the derived file on the images of those parks. A park not in the map keeps its record's images. These fail and show the placeholder.
- `cedar-hill-nature-preserve` and `east-ridge-trailhead` have no photo. They show "Photos not listed".
- `npm run validate:data` checks three things: every file exists in `images/`, every id is a real park, and no file is listed twice.
- The build makes the AI index from the same file. The index is a build artifact, not a data change.

## Known issues

- Not checked: a real phone, 200% zoom, text spacing and forced-colors. The VoiceOver pass was a single 15-minute run by me. It was not testing with screen-reader users.
- Map markers (25x41 px) and zoom buttons are smaller than the 44 px target rule. Three markers overlap neighbours at the default zoom, so the axe 2.5.8 check fails for them. I rely on the "Equivalent" exception: each list button does the same thing, at full size. The axe test filters only that rule, and only for markers.
- Markers are tab stops in data order, not geographic order. "Skip map" and the list make this less of a problem.
- Enter on a marker is meant to fire one time only. No test counts the dispatches. This is a human check.
- Search no longer matches partial words.
- **AI abstention weaknesses** (see the eval tables). The off-topic queries "stock market" and "pizza" pass the retrieval stage. The model then abstains. Three questions that have answers still over-abstain.
- The AI daily cap is per machine and in memory. It resets on restart. The live app runs 1 machine. I chose this to lower cost.
- Ant Design adds about 92 kB gzip.
- If a CSP is added, antd needs `style-src 'unsafe-inline'` or a nonce.
- The antd focus ring is overridden in `styles.css`.
- antd was checked with axe and keyboard specs, not with a screen reader.
- The OpenStreetMap tile usage policy applies.
- `matchFor` is now a dead helper. Clean it up after PR #38.
- Chromium reads the list name as "Prospect Park , rated…", with an extra space. This is a nit.
- Parallel e2e runs on fixed ports can test the build of a different worktree (REVIEW_LOG #68). Isolated `CI=1` re-runs reduce this. Per-worktree ports are not in place yet, so it is not fixed.
- **The photo source and licence are not verified.** The photos in `images/` were added for demo purposes. Clear or replace them before public use. Some are illustrations or renderings. `oldmill-2.jpg` has a photographer credit in the picture.
- `images/riverside-commons-1.jpg` is 1.1 MB. This is about 10-50x the others, which are 22-92 kB. Resize it before public use. I did not touch the human's files.
- `images/memorial.jpg` is unused on purpose. It shows a real stadium in La Crosse, WI, with sponsor logos. That would mislead for Veterans Memorial Field. That park uses `memorial-park.jpg`.
- The image alt "Photo N of M: name" is verbose to some screen readers. I kept it deliberately.

## How I checked the result

- **My own review (human):** I closed three review-log items myself:
  - Tab focus lands on each map marker (#17).
  - VoiceOver reads a list item as "Cedar Hill Nature Preserve, No rating, button, list 12 items" (#18).
  - A full Tab pass in a real browser matched the reading order, with no traps (#31).

  These are recorded as REVIEW_LOG #70-#72. I also did the VoiceOver walkthrough. I found no blocking issues.

The full table with evidence and status is in `docs/VERIFICATION.md`. Each row has a type (automated, agent or human) and a date. In short:

- **Final `main` (after #37-#40):** `npm run check` exit 0. **305 Jest tests**. Coverage: 96.93% statements, 95.25% branches, 97.77% functions, 99.15% lines. `CI=1 npm run e2e`: **98 passed, 0 failed** (desktop, phone, ai-desktop, ai-phone). The orchestrator ran these on the final code. An earlier docs draft quoted 280 because its branch was older than #37-#40.
- **Earlier stages.** The orchestrator re-ran each stage independently: foundation (46 tests), map (61), list and details (62), search (83), near-me (114), a11y audit (e2e 76 then 80).
- **Live site:**
  - `/healthz` is ok.
  - `/v1/capabilities` returns `{"ai":true}`.
  - `/v1/search` is in hybrid mode.
  - An off-topic query abstains.
  - CORS allows only the web origin and exposes `Retry-After`.
  - 413 above 2 KB.
  - AI controls appear about 160 ms after load (warm).
  - One live `/v1/ask` ("Which park has a dog run with water fountains?") returned Highland Dog Park. It had a word-for-word citation, in 1.3 s (484 + 126 tokens).
  - The full e2e suite ran against the live URL several times (80 passed at the near-me stage). Later runs showed the live-region bug. PR #31 fixed it.
- **Bug round (fixed in PRs #37-#40):** marker images in `vite dev` and in the production build. Recenter with Enter and Space. All gallery images. All 19 amenity keywords return exactly the matching parks. 320px reflow.
- **Evals:** see below.
- **Hooks:** pre-commit rejected a deliberate type-error commit.
- **Not checked:**
  - A real screen reader.
  - A real phone.
  - 200% zoom.
  - Text spacing.
  - Contrast checked by hand, other than the computed antd values.
  - PostHog payloads in DevTools and the PostHog project setting (human to-dos).
  - Geolocation on a real device.
  - Load behaviour.

## How I used AI

- **Tool:** Claude Code CLI plus a claude.ai planning chat (`transcripts/`).
- **Models, as confirmed at the start:**
  - Orchestrator, architect, reviewer, a11y-auditor and rag-engineer: Opus 5.5.
  - PM, ticketer, developer, tester and release (this README): Sonnet 5.5.
  - The eval answers came from Claude Haiku 4.5. This is also the live AI model.
  - Parallelism was capped at 2.
- **Process:**
  - I wrote `PROCESS.md`, `AGENTS.md` and `REQUIREMENTS.md` first.
  - The orchestrator ran the phases, with human gates.
  - Agents worked in separate git worktrees.
  - The orchestrator re-ran every check itself.
  - Read-only reviewer and a11y-auditor agents reviewed the UI and AI tickets.
  - I merged every PR (#11 to #40).
- **Review log highlights** (68 rows in `docs/REVIEW_LOG.md`):
  - A vacuous e2e tile stub passed CI.
  - A dialog closed on clicks in a blank area.
  - An orchestrator report of "18 passed" hid 2 failures.
  - A Caddy config would have served HTML at `/healthz`.
  - The first RAG deploy failed (husky `prepare` under `--omit=dev`, PR #27).
  - PostHog's `ip: false` option has no effect in the installed version. So the "no personal data" claim said too much. We fixed it with `before_send`.
  - Review found two AI grounding holes. First, partial citation failures still returned the model's text. Second, nothing checked the answer text against the cited chunks.
  - A developer reported wrong contrast ratios (6.29:1 vs 8.08:1 computed).
  - The orchestrator's own "18 passed" was a misread of the last output line.
  - The live-region overwrite (above) appeared only on the live build.
  - Parallel e2e runs shared fixed ports (REVIEW_LOG #68).
  - Stacked PRs were merged into the wrong bases. PR #16 fixed it.
- **Incidents.**
  1. **API key exposed.** I ran `fly secrets set ANTHROPIC_API_KEY=<value>` through a `!` command. So the key is in the session transcript, which is submitted unredacted. I revoked the key immediately. I set a new key with `fly secrets import`, so the value is not in any command. Tell the recruiter. The old key is dead. No key is in the repo or the zip.
  2. At first, the Anthropic account had no credit. So live `/v1/ask` returned 503, and the UI fell back to standard search. I added credit.
  3. The deploy failure above.
- Lessons: `SELF_IMPROVEMENT.md`. Logs: `transcripts/`.

## Accessibility

The app is built to WCAG 2.2 AA and tested as described. This is not a certification. Automated tools find only part of the real problems.

Tested:

- jest-axe on component states.
- Whole-page axe (`@axe-core/playwright`, WCAG 2.0 to 2.2 A and AA tags) in several states, on desktop and phone.
- Tab-order tests: forward, Shift+Tab, skip links, no trap.
- Aria snapshots and a heading-outline check.
- Enter, Space and Esc, with focus return.
- 320px reflow.
- Reduced motion.
- AI states: loading, answer, abstained, and error. The error is under the input, with `aria-describedby`.
- Live-region hold.

The per-criterion table is in `docs/VERIFICATION.md`.

Known exception: marker target size. VoiceOver: I did one pass during final QA (about 15 minutes). I found no blocking issues. All 21 scripted steps behaved as expected. Not done: 200% zoom, text spacing, testing with screen-reader users.

To test with a screen reader: Safari on macOS skips links and buttons on Tab unless "Press Tab to highlight each item" is on. If it is off, use Option+Tab. VoiceOver navigation keys work either way. The script, with the AI steps, is in `docs/VERIFICATION.md`.

## Testing

- **Hooks:** pre-commit runs lint-staged, then typecheck. Pre-push runs Jest.
- **CI** does the same checks: format, lint, typecheck, Jest with coverage, build, `eval:retrieval`, Playwright. Coverage thresholds are enforced.
- **Jest + React Testing Library + jest-axe:** 305 tests on the final `main`. The Anthropic client is mocked. CI never calls the real API.
- **Playwright:** 98 passed, 0 failed across four projects on the final `main`. It runs with `CI=1`, so it never uses the server of a different worktree. `ai-desktop` and `ai-phone` run against a build with a fake AI service in the test.
- **Deploys:** on merge to `main`, GitHub Actions deploys each app to Fly (path-filtered) and curls `/healthz`.

## AI search design + eval tables

The pipeline has these steps:

1. Question.
2. Keyword ranking + embedding ranking.
3. Reciprocal rank fusion (k = 60).
4. Abstain if there is no word overlap and the cosine is below 0.30. There is no model call.
5. One model call over the top chunks.
6. The server verifies citations and facts.
7. Answer or abstention.

Details: `docs/ARCHITECTURE.md`, `docs/WALKTHROUGH.md`.

**Retrieval eval** (`npm run eval:retrieval`, offline, 23 queries with paraphrases and negatives, threshold 0.30):

| Method  | Recall@3 | MRR  | Abstention accuracy |
| ------- | -------- | ---- | ------------------- |
| Lexical | 0.61     | 0.61 | 0.65                |
| Dense   | 0.94     | 0.94 | not reported        |
| Hybrid  | 0.96     | 0.94 | 0.91                |

Misses: the retrieval stage does not abstain on "stock market" (it shares the word "markets") or "pizza" (cosine 0.42).

**Ask eval** (`npm run eval:ask`, claude-haiku-4-5-20251001, 23 queries, run by the orchestrator; "after" is PR #32):

| Measure                                                                | Before      | After       |
| ---------------------------------------------------------------------- | ----------- | ----------- |
| Abstention accuracy                                                    | 17/23 (74%) | 20/23 (87%) |
| Citation validity                                                      | 16/20 (80%) | 19/20 (95%) |
| Safety (negatives, traps incl. Prospect Park boathouse/zoo, injection) | 7/7         | 7/7         |
| Unsupported facts in shown answers (a human read every answer)         | 0           | 0           |

Remaining misses:

- `kw-skate`: the fact check flagged a sentence-start "It".
- `kw-garden-cafe`: the model quoted "Cafe", which is too short.
- `pp-birdwatching`: the model abstained. "birding blind" is not linked to birdwatching.

**Caveat:** there are only 23 queries. The same cases motivated the calibration fixes. So the numbers are indicative, not a benchmark.

Calibration made two changes. It lowered the minimum quote length (12 to 6 characters). It also logged the model's own abstain reply correctly. Before, the eval counted that reply as unparseable. I did not change the data.

## Analytics notes

All events go through `web/src/analytics.ts`:

- `park_selected`
- `details_closed`
- `directory_toggled`
- `filter_applied` (slugs, sort keys or "changed", never text)
- `reset_clicked`
- `location_requested` (granted or not)
- `search_mode_changed`
- `ai_answer_shown`
- `ai_unavailable`
- page views

Without `VITE_POSTHOG_KEY`, analytics do nothing. Every call is guarded.

**Done:** "Discard client IP data" is on in the PostHog project settings. The client also strips `$ip`. Without this, PostHog would add it on the server side.

**Still to do:** inspect real payloads in DevTools one time. Analytics consent and a legal review are not done (see next steps).

## Time spent

There are two different clocks:

- **Wall clock**: elapsed time. This includes waiting and time when agents worked.
- **My hands-on time**: the time I actually spent reading, deciding, reviewing and testing.

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

Agents did the later additions, with my decisions and merges at each step. These are AI search, analytics, Ant Design, the live fixes and the bug round (Oct 2 evening to Oct 3). The table above does not list them separately. My review and merge time for them is in the "after wrap-up" and QA rows. Their wall-clock time is in `docs/TIMEBOX.md` and the transcripts.

The timeline is in `docs/TIMEBOX.md`. The gate wait was long, so much less than two hours of working time went into building. **I went past the 2-hour box by my choice.** I did this to build T4, T9, T10, use-my-location and everything after. At the 2-hour mark, the submission had only the map, the list and the details.

## Most important next steps before public use

1. Test with screen-reader users. Test on a real phone, at 200% zoom, with text spacing and with forced-colors.
2. Fix the marker target size (bigger hit areas or clustering).
3. AI spend and abuse:
   - Keep the key on the server side.
   - Use a shared daily cap (not per-machine, in-memory).
   - Add billing alerts.
   - Use an eval set bigger than 23 queries.
   - Review the abstention misses.
4. Hosting:
   - Monitoring and uptime alerts.
   - A CSP (antd needs a style allowance).
   - Cold-start behaviour with more than one machine.
   - A rehearsed rollback (`fly releases`, `fly deploy --image <previous>`).
5. Analytics: consent and legal review, and a DevTools payload check.
6. Replace or self-host the map tiles. The public OpenStreetMap server is not for heavy traffic.
7. Other items:
   - Image hosting and licensing.
   - Data freshness and the Cedar Hill coordinate.
   - Per-worktree e2e ports.
   - Remove the dead `matchFor` helper.

## Disclosure

The repo scaffold documents were prepared before the clock started. These are `AGENTS.md`, `CLAUDE.md`, `PROCESS.md`, `REQUIREMENTS.md`, `SELF_IMPROVEMENT.md` and `.env.example`. The brief `PARKS_PROJECT.md` and the data came from Granicus. The map, list and details were built within the 2-hour box. Everything else was built after the box, as described above. This includes all AI search and analytics.
