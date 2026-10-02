# Parks Finder

- Project board: https://github.com/users/ptums/projects/1
- GitHub Actions: https://github.com/ptums/parks-finder/actions
- Live preview: **not deployed** (see "What I left out")

The repo and board are private, so these links may not open for you. This README is written to stand on its own.

A small web app for browsing 12 local parks: a map with markers, a directory list, and a details view. Built in a 2-hour time box with Claude Code agents, under human direction and review. The scope is modest on purpose: **the core works; search/filters, AI search, analytics and deployment were cut** (details below).

## How to run

Requires Node >= 22.12 and normal network access (`npm ci` installs `onnxruntime-node`, whose postinstall downloads a binary, even though the AI service is not used).

From a clean unzip:

```bash
npm ci
npm run dev:web        # http://localhost:5173
```

No API key and no `.env` file are needed. The core app (map, list, details) works without them. Map tiles come from OpenStreetMap, so they need internet.

Other commands:

```bash
npm run check          # format check, lint, typecheck, Jest with coverage, build
npx playwright install chromium   # once, then:
npm run e2e            # Playwright (desktop and phone projects)
npm run dev:server     # optional: the minimal server (see below)
npm run validate:data  # validates db/parks.sample.json
```

`npm run dev` currently starts the web app only. The server is started separately with `npm run dev:server`.

**AI search is not built in this submission.** The server exists as a skeleton (`/healthz`, and `/v1/capabilities` which returns `{"ai":false}` when there is no key). The web app renders no AI controls at all, with or without a key. `.env.local` (copy of `.env.example`) is optional and only affects code paths that are not used yet. There is no live deployment, so there is no hosted AI search either.

## What works

Built and checked (see "How I checked the result" for the evidence and its limits):

- Map of all parks with OpenStreetMap tiles (attribution kept). Markers are keyboard operable: Tab to focus, Enter or Space to open details. The selected marker has an outline cue that does not rely on color alone.
- Park directory: a list of buttons, with a collapse toggle for small screens. List and map open the same details.
- Details in a native modal `<dialog>`: focus moves to the park heading on open; Esc, the Close button, or a click on the backdrop closes it; focus returns to whatever opened it, including a map marker.
- Missing data: only fields that exist are shown; missing ones show "Not listed" or are omitted. Hours are shown verbatim, never parsed.
- Images: all sample image URLs fail by design; a labeled placeholder is shown instead of a broken icon.
- Search, filters and sort (T4, built after the 2-hour box at the human's request): one text search over name, description, address and amenity labels (every word must match); an amenity checkbox filter (a park must have **all** selected amenities); sort by name, rating or size, with parks missing the value listed last; a Reset button. The result count is announced politely about half a second after you stop typing, and a visible "No parks match" message appears when nothing matches.
- Skip links ("Skip to results", "Skip map"), landmarks, one `h1`, a polite live region.
- Server skeleton: `/healthz` and `/v1/capabilities`.

## What I left out

- **T4 search, filters and sort** were cut at the 2-hour mark, then built afterwards at the human's request (PR #15, see "Time spent"). Not built from that ticket: "near me" (sort by distance) and the AI "best match" sort.
- **T9 Accessibility audit pass.** Not done: no aria snapshots, no tab-order test, no whole-page axe run in Playwright, and no per-criterion WCAG table beyond `docs/VERIFICATION.md`. Only jest-axe per component state and the keyboard e2e tests exist.
- **T10 Fly.io deploy.** Cut. The Fly apps `peter-parks-web` and `peter-parks-rag` were created but never deployed. There is no live URL.
- **T5-T7 AI search** (retrieval service, grounded answers, AI UI) and **T8 PostHog analytics.** Not started. The core ships with AI and analytics off, which is the intended fallback.
- Near-me (geolocation), animated transitions.

Why: roughly half the 2-hour box was spent waiting at the first human review gate (see "Time spent"). At the second gate the human chose the strictest cut line (core only).

## Important decisions

- **One npm package, three folders** (`web/`, `server/`, `shared/`) and `db/` as a plain folder. The data file is read directly by a typed loader in `shared/`; there is no database and no copy of the data.
- **Details as a native modal `<dialog>`** (`showModal`), giving focus trapping, Esc, and inert background for free. Focus return is handled explicitly because markers and list buttons both open it.
- **Markers as real focusable elements** with explicit Enter and Space handling (Leaflet only handles Enter by default). "Skip map" bypasses the 12 marker tab stops; the list plus details is a full alternative to the map.
- **Missing data is normalized at load**: null and empty strings become "missing", and the UI never invents a value.
- **Env access in one module** (`web/src/env.ts`), stubbed in Jest because Jest cannot run `import.meta`.
- **Hooks and CI as gates**: Husky pre-commit (lint-staged then typecheck) and pre-push (Jest); CI mirrors them.
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

- Map markers (25x41 px) and Leaflet zoom buttons (26-30 px) are below the project's own 44 px target rule. They meet WCAG 2.5.8 (AA, 24 px minimum).
- The 12 markers are tab stops in data order, not geographic order. "Skip map" and the list mitigate this.
- Enter on a marker is meant to fire exactly once (the code suppresses Leaflet's keypress-to-click); no test counts dispatches. Needs a human check.
- The list button's accessible name joins several spans (for example name plus "Not shown on map"); whether a separator is read correctly is unverified with a real screen reader.
- The image alt text "Photo of X" is redundant to some screen readers ("image, Photo of X"). Kept deliberately.
- Cedar Hill Nature Preserve's coordinate looks like a placeholder (see Assumptions).
- No VoiceOver pass has been done yet (human to-do, script in `docs/VERIFICATION.md`).
- Search is plain substring matching: "park" also matches any park with the "Skate park" amenity, and a one-letter query matches almost everything.
- The Playwright sort test uses `selectOption` on desktop; using arrow keys on the sort `<select>` on desktop is a human check.
- `npm run dev` runs the web app only.
- OpenStreetMap tile usage policy applies.

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
- **Not checked:** a real screen reader, a real phone, 200% zoom, tile failure in a real browser, geolocation, any AI behavior, any deployment. (A clean-room dry run of T1-T3 plus these docs was done: unzip, `npm ci`, `npm run check` and e2e passed; it should be repeated on the final merged `main`.)

## How I used AI

- **Tool:** Claude Code CLI, plus a claude.ai planning chat (`transcripts/project-planning.md`).
- **Models:** orchestrator Opus 5.5; architect, reviewer and a11y-auditor Opus 5.5; PM, ticketer, developers and this README (release role) Sonnet 5.5. Parallelism was capped at 2 agents.
- **How directed:** I wrote the process, requirements and stack docs first (`PROCESS.md`, `AGENTS.md`, `REQUIREMENTS.md`). The orchestrator ran the phases with human gates; agents did analysis, tickets and implementation in separate git worktrees. The human merges every PR (#11 foundation, #12 map, #13 list and details, #15 search; #12 and #13 are stacked on #11, #15 on #13; #14 is these docs).
- **How reviewed:** the orchestrator re-ran each check itself rather than trusting agent claims; read-only reviewer and a11y-auditor agents reviewed T2, T3 and T4. T1 had no separate reviewer pass because of the clock (logged).
- **What the reviews found** (26 rows in `docs/REVIEW_LOG.md`), for example:
  - The e2e OSM tile stub glob never matched the real tile URL, so the "tiles fail" test was vacuous and passing CI hid it. Sent back to be fixed with an intercept-count assertion.
  - Clicking blank space inside the details dialog closed it (the click hit the `<dialog>` and was treated as a backdrop click). It affects every phone. A unit test could not tell the difference. Sent back for a coordinate-based check and a Playwright test.
  - `aria-pressed` on markers announced a toggle that does not toggle. Removed.
  - Two vacuous T4 tests (an e2e step that silently fell back to `selectOption`, and a unit test whose own listener did the work). Both fixed; one confirmed by a mutation check.
  - The orchestrator reported "18 passed" from the last output line, which hid 2 failures; the clean-room run caught it (#19).
  - The orchestrator's own `.env` deny rule also blocked `.env.example`. Fixed at G1.
  - Smaller items: a developer's wrong "no origin remote" claim, a developer editing a file outside the ticket, issues mislabeled `blocked`.
- Process lessons are in `SELF_IMPROVEMENT.md`. Logs are in `transcripts/`.

## Accessibility

Built to WCAG 2.2 AA and tested as described below. This is not a certification, and automated tools find only part of the real problems.

Tested: jest-axe on component states (per component; see the test files); Playwright keyboard tests (Tab, Enter, Space, Esc, focus return) on desktop and phone projects; native elements (`button`, `dialog`, `ul`), one `h1`, landmarks, skip links, labeled controls, image placeholders.

Not done: aria snapshots, a tab-order test, whole-page axe in Playwright, a WCAG criteria table, and the **human VoiceOver pass (required; still to do)**.

To test with a screen reader: Safari on macOS skips links and buttons on Tab unless "Press Tab to highlight each item" is on in Safari settings; otherwise use Option+Tab. VoiceOver navigation keys work either way. The script is in `docs/VERIFICATION.md`.

## Testing

- **Hooks:** pre-commit runs lint-staged then a full typecheck; pre-push runs Jest.
- **CI** (GitHub Actions) mirrors them: format check, lint, typecheck, Jest with coverage, build, Playwright.
- **Jest + React Testing Library + jest-axe**: 98 tests on the integration branch (T1-T4); coverage thresholds enforced (foundation measured 98.25% statements).
- **Playwright** (desktop and phone): 24 passed, 0 failed on the integration branch (T1-T4).
- CI never calls an AI API (none is called at all).

## Time spent

| Item                                                                                   | Minutes                  |
| -------------------------------------------------------------------------------------- | ------------------------ |
| Preparation before the clock (six root docs, accounts, repo setup)                     | ____ (human to fill in)  |
| Build window: 11:58 CDT start, wrap-up began at T+93 (13:31 CDT)                       | about 93 (see below)     |
| Of the build window, waiting for the human at the first review gate (~55 min, counted) | about 55                 |
| Human review, merge and final checks after wrap-up                                     | ____ (human to fill in)  |
| After the box: T4 search, filters, sort (human chose to continue at T+114)             | about 8 (T+114 to T+122) |

Timeline is in `docs/TIMEBOX.md`. Because of the long gate wait, far less than two hours of working time went into building. **The 2-hour box was exceeded for T4 only**, at the human's explicit choice. Everything else was finished inside it.

## Most important next steps before public use

1. Finish the accessibility audit (T9): aria snapshots, a tab-order test, whole-page axe in Playwright, and the WCAG criteria table.
2. Run the full VoiceOver pass and a real phone pass; add aria snapshots, a tab-order test, whole-page axe, and the WCAG criteria table.
3. Deploy (Fly.io): add cold-start handling, cost caps and monitoring.
4. If AI search is added: server-side key only, per-IP rate limit, daily cap, grounded answers verified against the data, offline evals.
5. Replace or self-host the map tiles (OpenStreetMap's public server is not for heavy traffic).
6. Image hosting and licensing; data freshness and the suspect Cedar Hill coordinate.
7. If analytics is added: consent and legal review.

## Disclosure

The repo scaffold documents (`AGENTS.md`, `CLAUDE.md`, `PROCESS.md`, `REQUIREMENTS.md`, `SELF_IMPROVEMENT.md`, `.env.example`; the brief `PARKS_PROJECT.md` and the data came from Granicus) were prepared before the clock started; the application was built within the time box.
