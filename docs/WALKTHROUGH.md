# Walkthrough (for the 30-minute follow-up)

## 1. Demo script (about 4 minutes)

Use the live site https://peter-parks-web.fly.dev (open it a minute early: the machine auto-stops when idle), or run `npm ci` then `npm run dev:web` and open http://localhost:5173. No keys needed.

1. **Core view (30s).** Map with 12 markers and the park directory. Say plainly: AI search and analytics were cut; within the 2-hour box only map, list and details were done, and the rest came after.
2. **List to details (45s).** Click a park in the directory. A modal dialog opens, focus moves to the park heading. Point out "Not listed" for missing fields, hours shown verbatim, and the "image unavailable" placeholder (all sample images fail by design).
3. **Close and focus return (30s).** Press Esc: dialog closes, focus is back on the list button. Reopen and click the backdrop, then click blank space inside the dialog (it must NOT close; this was a bug caught in review).
4. **Keyboard on the map (60s).** Use Tab from the top: "Skip to results", "Skip map", then the markers. Enter or Space on a marker opens the same details. Esc returns focus to that marker. Note the selected-marker outline.
5. **Sparse park (30s).** Open `old-mill-botanical-garden` (null description) and `cedar-hill-nature-preserve` (null rating, suspect coordinate).
6. **Search, filters, sort, near-me (45s).** Type "dog", tick an amenity with Space, sort by rating, press Reset; with a screen reader you hear one result count after typing stops. Press "Use my location" and deny it: a message appears and nothing breaks.
7. **Phone width (30s).** Narrow the window or use device emulation: directory collapses, details is a full-screen sheet.
8. **Gates (30s).** Show `docs/REVIEW_LOG.md` and `docs/VERIFICATION.md` (honest HUMAN TODO rows).

## 2. Architecture in plain language

- One npm package with `web/` (React 19, TypeScript, Vite, Leaflet), `server/` (a Fastify skeleton with `/healthz` and `/v1/capabilities`), and `shared/` (zod schemas and a loader). The data is `db/parks.sample.json`, read directly. No database.
- `shared/parks.ts` validates and normalizes each park (null or empty becomes "missing"); parks with no valid coordinate are listed but not mapped.
- The app shell has named slots (list, map, details, search bar) so tickets did not edit the same files. One selected-park state feeds the list, the map and the dialog, so any trigger opens the same details.
- Focus helpers in `web/src/a11y/focus.ts` return focus to the element that opened the dialog.
- The server reports `{ai:false}` without a key and the web app renders no AI UI at all. This part is a skeleton: no AI feature exists yet, and the server is not deployed.
- Deploy: a two-stage Docker image (Node builds the static site, Caddy serves it on 8080 with `/healthz` and security headers) on one auto-stopping Fly machine. GitHub Actions deploys on merge to `main` and curls `/healthz`. Rollback: `fly releases -a peter-parks-web --image`, then `fly deploy --image <previous>`.

## 3. Decisions and trade-offs

- Native `<dialog>` instead of a custom modal: less code and correct trapping, but backdrop clicks need care (see review candidate 1).
- Real focusable markers with Space handling, plus "Skip map": simple and testable, but 12 tab stops in data order.
- Read the data file directly and normalize in memory: no derived file to keep in sync, but every consumer must go through the normalizer.
- Gates and hooks over speed: the orchestrator re-ran every check itself. This cost time but caught real problems (REVIEW_LOG).
- Stacked PRs (#12 and #13 on #11) to save time: faster, but they were merged into their stacked bases instead of `main`, and one extra PR (#16) was needed. I'd avoid stacking next time.
- Accepting the WCAG 2.5.8 "Equivalent" exception for overlapping map markers instead of clustering: honest and documented, but a real fix is better.

## 4. What was left out

AI search (T5-T7), PostHog analytics (T8), the RAG service deployment, distance labels in the list, and transitions. Within the 2-hour box, T4, T9 and T10 were also cut (about 55 minutes went to waiting at the first human gate); I chose to build them afterwards, and the README's "Time spent" says so.

## 5. The AI-usage story

Claude Code orchestrated; Opus 5.5 handled orchestration, architecture and review; Sonnet 5.5 handled PRD, tickets, implementation and this documentation. Agents worked in separate worktrees under a documented process. The human approved at gates and merges. Real mistakes found: a vacuous e2e tile stub that passed CI, a dialog that closed on blank-area clicks, a misleading `aria-pressed`, two vacuous search tests, a Caddy config that would have served HTML at `/healthz`, a double-request bug in "use my location", two cross-ticket test collisions caught only by integration runs, the orchestrator's own misreported "18 passed", and an over-broad `.env` deny rule that blocked `.env.example`. See `docs/REVIEW_LOG.md` and `SELF_IMPROVEMENT.md`.

## 6. What I would change before release

- Do the VoiceOver, real-phone, 200% zoom and text-spacing passes; test with screen-reader users.
- Hosting: monitoring and alerts, a CSP, keep one machine warm (or accept cold starts), and rehearse the rollback.
- Fix marker target size with bigger hit areas or clustering.
- Replace the public OSM tiles; add real image hosting.
- Add a test that counts marker Enter dispatches (exactly once).
- Likely failures: tile server limits, the placeholder Cedar Hill coordinate, stale data, focus return if markers are re-rendered while the dialog is open.

## 7. Three review candidates

Pick one, review it for real, and record what you found in `docs/REVIEW_LOG.md`.

1. **Dialog backdrop and focus return.** File: `web/src/components/ParkDetails/ParkDetails.tsx` (the click handler using `getBoundingClientRect`, the `showModal` effect, and the focus-return effect near the end). Could be wrong: a click just inside the edge counted as outside; focus not returned if the trigger was removed or re-rendered; StrictMode double effect. Check: open from a list button and from a marker, then click blank dialog space (stays open), click the backdrop (closes), press Esc, and confirm where focus lands each time.
2. **Marker keyboard handling.** File: `web/src/components/ParkMap/ParkMap.tsx` (the `onKeyDown` listener added to each marker icon). Could be wrong: Enter firing twice (our handler plus Leaflet's click), Space scrolling the page, listener leaks when markers re-render. Check: add a counter on the select handler, press Enter and Space on a marker, confirm exactly one call each and no page scroll.
3. **Data normalization.** File: `shared/parks.ts`, `normalizePark` (and `cleanString`, `cleanCoords`). Could be wrong: a valid value dropped (for example a rating of 0, or coordinates 0), a placeholder treated as real, hours altered. Check: run `npm run validate:data`, then read `shared/parks.test.ts` and try a park with every optional field missing and one with odd values.
