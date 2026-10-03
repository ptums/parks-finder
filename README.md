# Parks Finder

- Project board: https://github.com/users/ptums/projects/1
- GitHub Actions: https://github.com/ptums/parks-finder/actions
- Live preview: https://peter-parks-web.fly.dev (web app only; the machine auto-stops when idle, so the first load after a pause can take a few seconds)

The repo and board are private, so these links may not open for you. This README is written to stand on its own.

A small web app for browsing 12 local parks: a map with markers, a directory list, and a details view. Built in a 2-hour time box with Claude Code agents, under human direction and review. The scope is modest on purpose: the core (map, list, details), search/filters/sort, "use my location" and an accessibility audit are built and deployed; **AI search and analytics were cut** (details below). Parts were finished after the 2-hour box at my request; "Time spent" says exactly which.

## How to run

Requires Node >= 22.12 and network access for `npm ci` and for the map tiles.

From a clean unzip:

```bash
npm ci
npm run dev:web        # http://localhost:5173
```

No API key and no `.env.local` file are needed. Everything that was built works without them. Map tiles come from OpenStreetMap, so they need internet.

Other commands:

```bash
npm run check          # format check, lint, typecheck, Jest with coverage, build
npx playwright install chromium   # once, then:
npm run e2e            # Playwright (desktop and phone projects)
npm run dev:server     # optional: the minimal server (see below)
npm run validate:data  # validates db/parks.sample.json
```

`npm run dev` currently starts the web app only. The server is started separately with `npm run dev:server`.

**AI search is not built in this submission.** The server exists as a skeleton (`/healthz`, and `/v1/capabilities` which returns `{"ai":false}` when there is no key). The web app renders no AI controls at all, with or without a key. `.env.local` (copy of `.env.example`) is optional and only affects code paths that are not used yet. The live deployment does not include AI search either.

## What works

Built and checked (see "How I checked the result" for the evidence and its limits):

- Map of all parks with OpenStreetMap tiles (attribution kept). Markers are keyboard operable: Tab to focus, Enter or Space to open details. The selected marker has an outline cue that does not rely on color alone.
- Park directory: a list of buttons, with a collapse toggle for small screens. List and map open the same details.
- Details in a native modal `<dialog>`: focus moves to the park heading on open; Esc, the Close button, or a click on the backdrop closes it; focus returns to whatever opened it, including a map marker.
- Missing data: only fields that exist are shown; missing ones show "Not listed" or are omitted. Hours are shown verbatim, never parsed.
- Images: all sample image URLs fail by design; a labeled placeholder is shown instead of a broken icon.
- Search, filters and sort (T4, built after the 2-hour box): one text search over name, description, address and amenity labels (every word must match); an amenity checkbox filter (a park must have **all** selected amenities); sort by name, rating or size, with parks missing the value listed last; a Reset button. The result count is announced politely about half a second after you stop typing, and a visible "No parks match" message appears when nothing matches.
- "Use my location": sorts parks by distance. The browser asks for location only when you press the button; if you refuse or it fails, a message says so and the list keeps its order. Coordinates stay in memory and are never stored or sent.
- Skip links ("Skip to results", "Skip map"), landmarks, one `h1`, a polite live region.
- Live on Fly.io: https://peter-parks-web.fly.dev (Caddy serving the static build; `/healthz`; security headers; HTTPS).
- Server skeleton: `/healthz` and `/v1/capabilities`.

## What I left out

- **Within the 2-hour box I cut** T4 (search/filters/sort), T9 (accessibility audit) and T10 (deploy). **All three were built afterwards** at my request (PRs #15, #19, #18, #17); see "Time spent". Not built from T4: the AI "best match" sort.
- **The RAG service is not deployed.** The Fly app `peter-parks-rag` exists but has no release; it would only serve AI search, which was cut.
- **T5-T7 AI search** (retrieval service, grounded answers, AI UI) and **T8 PostHog analytics.** Not started. The core ships with AI and analytics off, which is the intended fallback.
- Animated transitions (cut first, as planned).
- The list does not show the distance to each park when sorted by distance; only the order changes.

Why: roughly half the 2-hour box was spent waiting at the first human review gate (see "Time spent"). At the second gate I chose the strictest cut line (core only), then extended the work after the box.

## Important decisions

- **One npm package, three folders** (`web/`, `server/`, `shared/`) and `db/` as a plain folder. The data file is read directly by a typed loader in `shared/`; there is no database and no copy of the data.
- **Details as a native modal `<dialog>`** (`showModal`), giving focus trapping, Esc, and inert background for free. Focus return is handled explicitly because markers and list buttons both open it.
- **Markers as real focusable elements** with explicit Enter and Space handling (Leaflet only handles Enter by default). "Skip map" bypasses the 12 marker tab stops; the list plus details is a full alternative to the map.
- **Missing data is normalized at load**: null and empty strings become "missing", and the UI never invents a value.
- **Env access in one module** (`web/src/env.ts`), stubbed in Jest because Jest cannot run `import.meta`.
- **Hooks and CI as gates**: Husky pre-commit (lint-staged then typecheck) and pre-push (Jest); CI mirrors them.
- **Ant Design for styling only (added at the human's request, T12).** One `ConfigProvider` theme (`web/src/theme.ts`): park green `#0b5d1e` (8.08:1 on white, and white on it the same; hover 6.21:1, pressed 10.48:1), 8px radius, 16px base font, 44px control height, and `motion: false` plus no click ripple under `prefers-reduced-motion`. Only `Button`, `Tag` and `Typography.Title` are used, because they render native `<button>`, `<span>` and `<h1>`. Kept native: the details `<dialog>`, the `<select>`, checkboxes and radios, the map, skip links and the live region. antd `Alert` is not used because it adds `role="alert"`, a second announcer. Trade-off: the web JS grew from 493.86 kB (153.33 kB gzip) to 767.31 kB (245.72 kB gzip).
- Full list and trade-offs: `docs/ARCHITECTURE.md`.

## Assumptions

1. The municipality is "NYC-area (fictional mix)": every park lies at lat 40.58 to 40.85, lng -74.09 to -73.79; some are real (Prospect Park), most are fictional. The app makes no claims beyond the data.
2. The data is shown verbatim: names, addresses (including partial ones), descriptions, and hours are not corrected, geocoded, completed, or reformatted.
3. `rating` is assumed to be out of 5 (the brief does not state a scale; values range 3.9 to 4.9). It is displayed as a number, never as stars alone.
4. `acreage` is assumed to be in acres.
5. Image URLs are placeholders that will not load; the labeled "image unavailable" placeholder is the expected experience.
6. There is no contact data, so no contacts are shown ("Contact information not listed").
7. The coordinate for `cedar-hill-nature-preserve` (40.7128, -74.0060) looks like a default NYC point rather than a real preserve location. It is shown as given.
8. The brief says search and filters are optional and does not say which; the plan was text search, a multi-select amenity filter, and sort by name, rating, or acreage. This was built after the time box (PR #15).
9. "Complete ADA compliance" is interpreted as WCAG 2.2 Level AA with documented tests plus a human VoiceOver pass. No tool can certify ADA compliance and this README does not claim it.
10. The interviewer evaluates from the zip and a 30-minute session. The core needs no keys.
11. The brief calls the data file `assets/parks.sample.json`; here it lives at `db/parks.sample.json` and is read directly.
12. Map tiles come from the public OpenStreetMap server (attribution kept). Fine for this exercise, not for heavy public traffic.
13. The local environment file is `.env.local` at the repo root (not `.env`); a missing file never crashes either side.
14. Analytics, if it were enabled, would be PostHog only, anonymous, cookieless, with no PII. (Not built.)
15. Phone layout is judged by viewport emulation (Playwright) plus a planned human check; there was no physical device matrix.

## Dataset changes

None. `db/parks.sample.json` is used verbatim and read directly (no copy, no derived file). It is normalized in memory at load time (null or empty becomes "missing"). The file on disk is never edited.

## Known issues

- Map markers (25x41 px) and Leaflet zoom buttons (26-30 px) are below the project's own 44 px target rule. Three markers (Cedar Hill, Highland Dog Park, Old Mill) overlap their neighbours at the default zoom, so axe's WCAG 2.5.8 target-size check fails for them. I rely on 2.5.8's "Equivalent" exception (each park's list button does the same thing and is full size). The axe test filters out only that rule, only for markers, with a comment. A real fix would be bigger hit areas or clustering.
- The 12 markers are tab stops in data order, not geographic order. "Skip map" and the list mitigate this.
- Enter on a marker is meant to fire exactly once (the code suppresses Leaflet's keypress-to-click); no test counts dispatches. Needs a human check.
- The list button's accessible name joins several spans (for example name plus "Not shown on map"); whether a separator is read correctly is unverified with a real screen reader.
- The image alt text "Photo of X" is redundant to some screen readers ("image, Photo of X"). Kept deliberately.
- Cedar Hill Nature Preserve's coordinate looks like a placeholder (see Assumptions).
- No VoiceOver pass has been done yet (human to-do, 15-step script in `docs/VERIFICATION.md`).
- Tab-order expectations in `e2e/tab-order.spec.ts` are built from the DOM, so they catch traps and reversal problems but not a wrong DOM order. The aria snapshots match partially.
- Search is plain substring matching: "park" also matches any park with the "Skate park" amenity, and a one-letter query matches almost everything.
- The Playwright sort test uses `selectOption`; using arrow keys on the native sort `<select>` is a human check (Playwright can't drive the native popup).
- The live site auto-stops when idle; the first request after a pause is slower (cold start).
- `npm run dev` runs the web app only.
- OpenStreetMap tile usage policy applies.
- Ant Design adds about 273 kB raw (92 kB gzip) to the main bundle. antd's own focus ring is faint, so `web/src/styles.css` overrides it with the app's 3px ring (needs `!important`, because antd sets the outline colour with higher priority). Its CSS-in-JS injects style tags at run time. antd was checked only with jest-axe, Playwright axe and the keyboard specs, not with a screen reader.

## How I checked the result

Full table with evidence and honest status: `docs/VERIFICATION.md`. Summary, all from this session:

- **Foundation (T1):** the orchestrator ran `npm ci` and `npm run check` independently: exit 0, 46 tests, 98.25% statement coverage.
- **Map (T3):** `npm run check` exit 0, 61 tests; Playwright 12 passed.
- **List and details (T2):** `npm run check` exit 0, 62 tests; Playwright 10 passed.
- **Search, filters, sort (T4, after the box):** `npm run check` exit 0, 83 tests; Playwright 14 passed, 0 failed. A mutation check (removing the form's submit handler) made the "Enter does not submit" test fail, showing it isn't vacuous.
- **All four merged on an integration branch (T1-T4):** `npm run check` exit 0, 98 tests; Playwright 24 passed, 0 failed.
- **T1-T3 integration (earlier):** `npm run check` exit 0, 77 tests; Playwright 20 passed (after fixing a cross-ticket test locator; see REVIEW_LOG #19). The submission was also unzipped into a clean folder: `npm ci` + `npm run check` exit 0, and the server with no key returned `{"ai":false}`.
- **Focus return from a map marker:** an ad-hoc throwaway Playwright test (not committed) showed Enter on a marker opens the dialog, focus lands on the heading, Esc returns focus to the marker, and Space also opens it (2 passed, desktop and phone). Because it is not committed, it is not a regression test.
- **Hooks:** a deliberate type-error commit was rejected by the pre-commit hook (TS2322, "husky - pre-commit script failed (code 2)"). The pre-push hook ran Jest on each push. CI was green on the foundation PR.
- **Accessibility audit (T9):** whole-page axe in 6 states on desktop and phone, a tab-order test, aria snapshots, a 320px reflow check and a reduced-motion check with a positive control. With T9 merged: e2e 76 passed, 0 failed.
- **Use my location (#19, on top of T9):** `npm run check` exit 0, 114 tests; e2e 80 passed, 0 failed. Integrating it with T9 first gave 2 failures (T9's tab-order list didn't know the new button; REVIEW_LOG #35), fixed before the PR.
- **Deploy (T10):** the GitHub Actions deploy ran and its health check passed. Against the live URL: `/healthz` returns `ok`, unknown paths serve the app, security headers are present, HTTP redirects to HTTPS, and the full e2e suite (accessibility specs included) passed against the live site after the final deploy: 80 passed, 0 failed. The Docker image was never built locally (Docker wasn't running); the first real build was on Fly.
- **Not checked:** a real screen reader, a real phone, 200% zoom, text spacing, colour contrast by hand, real-device geolocation, any AI behaviour.

## How I used AI

- **Tool:** Claude Code CLI, plus a claude.ai planning chat (`transcripts/project-planning.md`).
- **Models:** orchestrator Opus 5.5; architect, reviewer and a11y-auditor Opus 5.5; PM, ticketer, developers and this README (release role) Sonnet 5.5. Parallelism was capped at 2 agents.
- **How directed:** I wrote the process, requirements and stack docs first (`PROCESS.md`, `AGENTS.md`, `REQUIREMENTS.md`). The orchestrator ran the phases with human gates; agents did analysis, tickets and implementation in separate git worktrees. I merged every PR myself: #11 foundation, #12 map, #13 list and details, #15 search, #14 docs, #16 (brings stacked PRs to `main`; see REVIEW_LOG #27), #17 deploy, #18 accessibility audit, #19 use my location.
- **How reviewed:** the orchestrator re-ran each check itself rather than trusting agent claims; read-only reviewer and a11y-auditor agents reviewed T2, T3, T4 and use-my-location. T1 had no separate reviewer pass because of the clock; T9 (tests only) and T10 (deploy config) were reviewed by the orchestrator (logged).
- **What the reviews found** (35 rows in `docs/REVIEW_LOG.md`), for example:
  - The e2e OSM tile stub glob never matched the real tile URL, so the "tiles fail" test was vacuous and passing CI hid it. Sent back to be fixed with an intercept-count assertion.
  - Clicking blank space inside the details dialog closed it (the click hit the `<dialog>` and was treated as a backdrop click). It affects every phone. A unit test could not tell the difference. Sent back for a coordinate-based check and a Playwright test.
  - `aria-pressed` on markers announced a toggle that does not toggle. Removed.
  - Two vacuous T4 tests (an e2e step that silently fell back to `selectOption`, and a unit test whose own listener did the work). Both fixed; one confirmed by a mutation check.
  - The orchestrator reported "18 passed" from the last output line, which hid 2 failures; the clean-room run caught it (#19).
  - The Caddy config would have served the HTML page at `/healthz` (Caddy runs `try_files` before `respond`), so the health check would have passed while checking nothing. Fixed before deploy; the live `/healthz` returns `ok`.
  - "Use my location" started two requests on a double press and always announced "listed by name" even when sorted by rating. Fixed.
  - Stacked PRs were merged into their stacked bases instead of `main`; one extra PR fixed it (#27).
  - The orchestrator's own `.env` deny rule also blocked `.env.example`. Fixed at G1.
  - Smaller items: a developer's wrong "no origin remote" claim, a developer editing a file outside the ticket, issues mislabeled `blocked`.
- Process lessons are in `SELF_IMPROVEMENT.md`. Logs are in `transcripts/`.

## Accessibility

Built to WCAG 2.2 AA and tested as described below. This is not a certification, and automated tools find only part of the real problems.

Tested: jest-axe on every component state; whole-page axe (`@axe-core/playwright`, WCAG 2.0/2.1/2.2 A and AA tags) in 6 states on desktop and phone; a tab-order test (forward and Shift+Tab, skip links, no trap); aria snapshots of the main regions plus an exact heading-outline check; Enter/Space/Esc and focus return from list items and markers; 320px reflow; reduced motion. A per-criterion WCAG 2.2 table with evidence is in `docs/VERIFICATION.md`.

Known exception: map-marker target size (see Known issues).

Not done: the **human VoiceOver pass (required; still to do)**, 200% zoom, text spacing, and hand contrast checks (marked HUMAN TODO in the table).

To test with a screen reader: Safari on macOS skips links and buttons on Tab unless "Press Tab to highlight each item" is on in Safari settings; otherwise use Option+Tab. VoiceOver navigation keys work either way. The script is in `docs/VERIFICATION.md`.

## Testing

- **Hooks:** pre-commit runs lint-staged then a full typecheck; pre-push runs Jest.
- **CI** (GitHub Actions) mirrors them: format check, lint, typecheck, Jest with coverage, build, Playwright.
- **Jest + React Testing Library + jest-axe**: 114 tests; coverage thresholds enforced (about 98.6% statements, 96% branches).
- **Playwright** (desktop and phone): 80 passed, 0 failed, including the accessibility audit specs.
- **Deploy workflow**: on merge to `main`, GitHub Actions deploys the web app to Fly and curls `/healthz`.
- CI never calls an AI API (none is called at all).

## Time spent

| Item                                                                                   | Minutes                            |
| -------------------------------------------------------------------------------------- | ---------------------------------- |
| Preparation before the clock (six root docs, accounts, repo setup)                     | ____ (human to fill in)            |
| Build window: 11:58 CDT start, wrap-up began at T+93 (13:31 CDT)                       | about 93 (see below)               |
| Of the build window, waiting for the human at the first review gate (~55 min, counted) | about 55                           |
| Human review, merge and final checks after wrap-up                                     | ____ (human to fill in)            |
| After the box: T4 search, filters, sort (I chose to continue at T+114)                 | about 8 (T+114 to T+122)           |
| After the box: T9 audit, T10 deploy, use my location, merges (T+132 onward)            | about 40 (includes my merge waits) |

Timeline is in `docs/TIMEBOX.md`. Because of the long gate wait, far less than two hours of working time went into building. **The 2-hour box was exceeded**, by my choice, to build T4, T9, T10 and use-my-location. At the 2-hour mark the submission had the map, list and details only. Everything after that is listed above.

## Most important next steps before public use

1. Run the full VoiceOver pass, a real phone pass, 200% zoom and text-spacing checks; test with screen-reader users.
2. Fix map-marker target size properly (bigger hit areas or clustering) instead of relying on the "Equivalent" exception.
3. Hosting: monitoring and uptime alerts, a minimum of 1 machine (or accept cold starts), a Content-Security-Policy, and a tested rollback (`fly releases`, then `fly deploy --image <previous>`).
4. If AI search is added: server-side key only, per-IP rate limit, daily cap, grounded answers verified against the data, offline evals.
5. Replace or self-host the map tiles (OpenStreetMap's public server is not for heavy traffic).
6. Image hosting and licensing; data freshness and the suspect Cedar Hill coordinate.
7. If analytics is added: consent and legal review.

## Disclosure

The repo scaffold documents (`AGENTS.md`, `CLAUDE.md`, `PROCESS.md`, `REQUIREMENTS.md`, `SELF_IMPROVEMENT.md`, `.env.example`; the brief `PARKS_PROJECT.md` and the data came from Granicus) were prepared before the clock started. The core app was built within the time box; the rest was built after it, as described in "Time spent".
