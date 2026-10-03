# Walkthrough (for the 30-minute follow-up)

Scope note: inside the 2-hour box only the map, list and details were built. Everything below that mentions search, AI, analytics, Ant Design, deploys or the bug round was built after the box, at my request.

## 1. Demo script (about 5 minutes)

Use the live site https://peter-parks-web.fly.dev. **Open it a minute early and run one AI question first:** the web and AI machines auto-stop when idle, and the AI service loads an embedding model on a cold start. Or run locally: `npm ci`, then `npm run dev:web` (standard mode) or `npm run dev` with your own key in `.env.local` (AI).

1. **Core view (30s).** Map with 12 markers, the directory, one h1. Say plainly what existed at T+120 (map, list, details) and what came after.
2. **List to details (30s).** Click a park. A modal dialog opens, focus on the park heading. Point out "Not listed", verbatim hours, and the "image unavailable" placeholders. Open Prospect Park: its gallery shows both images, each with its own placeholder.
3. **Ratings (15s).** Each list item shows "★ 4.7" next to the title (read as "rated 4.7 out of 5"); a park without a rating says "No rating".
4. **Keyboard on the map (45s).** Tab: "Skip to results", "Skip map", then markers. Enter or Space opens details; Esc returns focus to the marker. Zoom out and press **Recenter map** with Enter: the view returns to the starting bounds.
5. **Search and filters (30s).** Type "lake": only parks that list a lake match (Lakeshore Point no longer does; whole-word matching). Tick an amenity, sort by rating, Reset.
6. **AI search (90s).** The AI controls appear a moment after load because the page asked `/v1/capabilities`. Mode radios: Filters, AI, Both (default). Ask "Which park has a dog run with water fountains?": the answer names Highland Dog Park with a citation; activate the citation and the same details dialog opens. Ask something off-topic ("what is the stock market?"): it abstains. Switch to AI mode: the standard filters leave the page; switch to Filters: AI results clear. With a screen reader, "Answer ready." is announced once, not the streamed text (there is no streaming).
7. **Failure path (20s).** Say what happens cold, capped or rate-limited: an error appears under the Ask input and the standard search keeps working. The browser never needs the service.
8. **Phone width (20s).** Directory collapses, details is a full-screen sheet.
9. **Gates (20s).** `docs/REVIEW_LOG.md`, `docs/VERIFICATION.md` (honest HUMAN TODO rows, including VoiceOver and the PostHog checks).

## 2. Architecture in plain language

- One npm package: `web/` (React 19, TypeScript, Vite, Leaflet, Ant Design for styling), `server/` (Fastify RAG service), `shared/` (zod schemas, the API contract and a loader). The data is `db/parks.sample.json`, read directly. No database.
- `shared/parks.ts` validates and normalizes each park (null or empty becomes "missing"). One selected-park state feeds the list, the map and the dialog.
- **RAG pipeline in plain words.**
  1. At build time, each park is cut into small chunks by field group (description, amenities, address and so on). Each chunk starts with the park name; a missing field makes no chunk.
  2. A question is ranked two ways: by keywords (BM25-style) and by meaning (a small embedding model running on the server, cosine similarity). The two rankings are merged with reciprocal rank fusion.
  3. If the question shares no words with the data and nothing is close in meaning (cosine below 0.30), the server answers "I don't have that information" without calling the model.
  4. Otherwise one Claude Haiku 4.5 call (max 400 tokens, no tools) is given only the retrieved chunks, each labeled with a `chunkId`, and told to reply in JSON with an answer and quoted citations. The question is treated as untrusted text.
  5. The server checks the reply: every cited chunk was retrieved; every quote really appears in that chunk, is at least 6 characters and says more than the park name; every name and number in the answer appears in the cited text. One failure and the whole answer becomes an abstention. The browser gets one JSON response.
  6. Guards: key only in the server environment, CORS to the web origin, 20 requests per minute per IP, a 2 KB body limit (413), a daily cap of 300 model calls per machine, logs without keys.
- **Capability gating.** `GET /v1/capabilities` returns `{ai: true}` only with a non-empty key. The web app renders AI controls only after that answer; otherwise they are not in the DOM.
- **One polite live region** (`LiveRegion.tsx`) announces counts, mode changes, "AI search is available.", "Answer ready." and errors, holding each for 1.5 s so one does not overwrite another.
- **Analytics** go through one wrapper (`analytics.ts`), cookieless, no-op without a key.
- **Deploy:** two Fly apps. Web: Docker, Node build then Caddy on 8080 with `/healthz` and security headers. RAG: Node 22 slim, 1 GB, model and index baked in, one machine. GitHub Actions deploys each on merge to `main` and curls `/healthz`. Rollback: `fly releases -a <app> --image`, then `fly deploy --image <previous>`.

## 3. Decisions and trade-offs

- Native `<dialog>`: less code and correct trapping, but backdrop clicks need care.
- Real focusable markers plus "Skip map": simple and testable, but 12 tab stops in data order. The 2.5.8 target-size "Equivalent" exception instead of clustering: honest, but a real fix is better.
- Strict verification of AI answers over answer quality: the checker rejects whole answers on any failure. This costs recall (3 of 23 eval queries still miss) but kept shown unsupported facts at 0.
- Hybrid retrieval with local embeddings: better paraphrase recall (0.96 vs 0.61 lexical) but a model download and a cold start.
- No streaming: a screen reader never hears token-by-token text, at the price of a short wait.
- Whole-word search: keyword results are exact (19 amenity keywords checked), but partial words no longer match.
- Ant Design for styling only: nicer controls at +92 kB gzip and a future CSP allowance; native dialog, selects and checkboxes kept for accessibility.
- One Fly machine for the AI service to lower cost: the daily cap is then roughly the cap, but cold starts happen.
- Stacked PRs saved time but were merged into the wrong bases once (#16 fixed it); I would avoid them.

## 4. What was left out

VoiceOver pass, real phone, 200% zoom, forced-colors, streaming, a CSP, monitoring, shared daily cap, distance labels in the list, partial-word search, image hosting. Within the box I also cut search, the audit and deploy, and built them after.

## 5. The AI-usage story

Claude Code orchestrated. Opus 5.5 did orchestration, architecture, review and the RAG ticket reviews; Sonnet 5.5 did PRD, tickets, implementation and docs; the live model is Haiku 4.5. Agents worked in separate worktrees under a documented process; I approved at gates and merged every PR. Real problems found: a vacuous e2e stub, a dialog that closed on blank clicks, a Caddy `/healthz` that served HTML, a PostHog option with no effect (so a privacy claim overclaimed), two AI grounding holes (partial citation failure still returned the text; answer text unchecked), `Retry-After` hidden by CORS, a late announcement overwriting a user message in the live region, wrong contrast figures from a developer, a parallel e2e run testing the wrong build, and a failed first RAG deploy. Incidents: I pasted an API key into a `!` command (it is in the transcript; the key was revoked and replaced via `fly secrets import`; tell the recruiter), and the Anthropic account initially had no credit. See `docs/REVIEW_LOG.md` and `SELF_IMPROVEMENT.md`.

## 6. What I would change before release

- VoiceOver, real phone, 200% zoom, text spacing, forced-colors; users who rely on screen readers.
- Bigger marker hit areas or clustering.
- A shared daily cap and billing alerts; a larger eval set and work on the three remaining misses.
- Monitoring, a CSP, rehearsed rollback, per-worktree e2e ports.
- Analytics: "Discard client IP data" in PostHog, a DevTools payload check, consent and legal review.
- Replace public OSM tiles; real image hosting.
- Likely failures: cold starts, an unfunded API account (503 and fallback), tile limits, stale data, the Cedar Hill coordinate.

## 7. Three review candidates

Pick one, review it for real, and record what you found in `docs/REVIEW_LOG.md`.

1. **Answer verification.** `server/src/rag/verifyCitations.ts`, `verifyAnswer` (with `quoteProblem` and `unsupportedFacts`). Could be wrong: the fact check is a word-presence rule, so a wrong claim made only of words found in the cited chunk (for example swapped attributes) passes; a legitimate capitalised word not in the chunk abstains (this is what flagged "It" in `kw-skate`); the 6-character quote minimum is a calibration choice that may be too loose or too tight; parkId must come from our chunk, never the model. Check: read `server/test/verifyCitations.test.ts`; feed `verifyAnswer` a reply with a fabricated quote, a quote of only the park name, a real quote with a false number, and a mixed good-and-bad citation list, and confirm each abstains; run `npm run eval:ask` with your own key and read every answer.
2. **Live region.** `web/src/a11y/LiveRegion.tsx`. Could be wrong: the 1.5 s hold queues only the latest message, so a rapid second message silently drops the one before it; timers after unmount; the clear-then-set trick may not repeat identical text in every screen reader; one region means every feature competes for it. Check: read `LiveRegion.test.tsx`; with VoiceOver, trigger "Sorted by distance" then an AI availability change within a second and listen; run the live-site e2e.
3. **Analytics privacy.** `web/src/analytics.ts`, `privacyOptions`. Could be wrong: option names were checked against posthog-js 1.435 types and may change on upgrade; a missed remote-config feature could re-enable capture; `capture_pageview` is on; `$ip` is stripped client-side but PostHog adds it server-side unless the project setting is on. Check: with the key set, open DevTools Network, filter on the PostHog host, and read the payloads for cookies, coordinates, query text and IP; confirm no cookies or storage entries; confirm Do Not Track stops all capture; turn on "Discard client IP data" in the project.
