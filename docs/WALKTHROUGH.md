# Walkthrough (for the 30-minute follow-up)

Scope note: inside the 2-hour box, I built only the map, list and details. Some items below mention search, AI, analytics, Ant Design, deploys or the bug round. I built all of those after the box, at my request.

## 1. Demo script (about 5 minutes)

Use the live site https://peter-parks-web.fly.dev.

**Open it a minute early and run one AI question first.** The web and AI machines auto-stop when idle. The AI service loads an embedding model on a cold start.

Or run it locally:

1. Run `npm ci`.
2. For standard mode, run `npm run dev:web`.
3. For AI, put your own key in `.env.local` and run `npm run dev`.

Demo steps:

1. **Core view (30s).** Show the map with 12 markers, the directory, and one h1. Say plainly what existed at T+120 (map, list, details) and what came after.
2. **List to details (30s).** Click a park. A modal dialog opens, with focus on the park heading. Point out "Not listed", the verbatim hours, and the "image unavailable" placeholders. Open Prospect Park. Its gallery shows both images, each with its own placeholder.
3. **Ratings (15s).** Each list item shows "★ 4.7" next to the title. A screen reader reads it as "rated 4.7 out of 5". A park without a rating says "No rating".
4. **Keyboard on the map (45s).** Press Tab. Focus goes to "Skip to results", then "Skip map", then the markers. Enter or Space opens details. Esc returns focus to the marker. Zoom out, then press **Recenter map** with Enter. The view returns to the starting bounds.
5. **Search and filters (30s).** Type "lake". Only parks that list a lake match. Lakeshore Point no longer matches, because matching uses whole words. Tick an amenity, sort by rating, then press Reset.
6. **AI search (90s).**
   - The AI controls appear a moment after load, because the page asked `/v1/capabilities`.
   - The mode radios are Filters, AI, and Both (default).
   - Ask "Which park has a dog run with water fountains?". The answer names Highland Dog Park with a citation. Activate the citation, and the same details dialog opens.
   - Ask something off-topic ("what is the stock market?"). The service abstains.
   - Switch to AI mode. The standard filters leave the page. Switch to Filters. The AI results clear.
   - With a screen reader, "Answer ready." is announced once. The streamed text is not read (there is no streaming).
7. **Failure path (20s).** Say what happens when the service is cold, capped or rate-limited. An error appears under the Ask input, and the standard search keeps working. The browser never needs the service.
8. **Phone width (20s).** The directory collapses. Details is a full-screen sheet.
9. **Gates (20s).** Show `docs/REVIEW_LOG.md` and `docs/VERIFICATION.md`. VERIFICATION.md has honest HUMAN TODO rows, including VoiceOver and the PostHog checks.

## 2. Architecture in plain language

- One npm package with three folders:
  - `web/`: React 19, TypeScript, Vite, Leaflet, and Ant Design for styling.
  - `server/`: the Fastify RAG service.
  - `shared/`: zod schemas, the API contract and a loader.
- The data is `db/parks.sample.json`, read directly. There is no database.
- `shared/parks.ts` validates and normalizes each park. Null or empty becomes "missing". One selected-park state feeds the list, the map and the dialog.
- **RAG pipeline in plain words.**
  1. At build time, each park is cut into small chunks by field group (description, amenities, address and so on). Each chunk starts with the park name. A missing field makes no chunk.
  2. A question is ranked in two ways. One is by keywords (BM25-style). The other is by meaning: a small embedding model runs on the server and uses cosine similarity. Reciprocal rank fusion merges the two rankings.
  3. Sometimes the question shares no words with the data, and nothing is close in meaning (cosine below 0.30). Then the server answers "I don't have that information" without calling the model.
  4. Otherwise, the server makes one Claude Haiku 4.5 call (max 400 tokens, no tools). The call gets only the retrieved chunks, each labeled with a `chunkId`. The model must reply in JSON with an answer and quoted citations. The server treats the question as untrusted text.
  5. The server checks the reply:
     - Every cited chunk was retrieved.
     - Every quote really appears in that chunk.
     - Every quote is at least 6 characters and says more than the park name.
     - Every name and number in the answer appears in the cited text.
     - If one check fails, the whole answer becomes an abstention.
     - The browser gets one JSON response.
  6. Guards:
     - The key is only in the server environment.
     - CORS allows only the web origin.
     - The rate limit is 20 requests per minute per IP.
     - The body limit is 2 KB (413).
     - The daily cap is 300 model calls per machine.
     - Logs contain no keys.
- **Capability gating.** `GET /v1/capabilities` returns `{ai: true}` only when the key is non-empty. The web app renders AI controls only after that answer. Otherwise, the AI controls are not in the DOM.
- **One polite live region** (`LiveRegion.tsx`). It announces counts, mode changes, "AI search is available.", "Answer ready." and errors. It holds each message for 1.5 s, so one message does not overwrite another.
- **Analytics** go through one wrapper (`analytics.ts`). Analytics are cookieless and do nothing without a key.
- **Deploy:** two Fly apps.
  - Web: Docker. A Node build, then Caddy on 8080 with `/healthz` and security headers.
  - RAG: Node 22 slim, 1 GB, with the model and index baked in, on one machine.
  - On merge to `main`, GitHub Actions deploys each app and curls `/healthz`.
  - Rollback: run `fly releases -a <app> --image`, then `fly deploy --image <previous>`.

## 3. Decisions and trade-offs

- **Native `<dialog>`.** It needs less code and traps focus correctly. But backdrop clicks need care.
- **Real focusable markers plus "Skip map".** This is simple and testable. But it gives 12 tab stops in data order.
- **The 2.5.8 target-size "Equivalent" exception instead of clustering.** This is honest, but a real fix is better.
- **Strict verification of AI answers over answer quality.** The checker rejects the whole answer on any failure. This costs recall (3 of 23 eval queries still miss). But it kept shown unsupported facts at 0.
- **Hybrid retrieval with local embeddings.** Paraphrase recall is better (0.96 vs 0.61 lexical). The cost is a model download and a cold start.
- **No streaming.** A screen reader never hears token-by-token text. The cost is a short wait.
- **Whole-word search.** Keyword results are exact (19 amenity keywords checked). But partial words no longer match.
- **Ant Design for styling only.** It gives nicer controls. The cost is +92 kB gzip and a future CSP allowance. I kept native dialog, selects and checkboxes for accessibility.
- **One Fly machine for the AI service, to lower cost.** The daily cap is then roughly the cap. But cold starts happen.
- **Stacked PRs.** They saved time, but once they were merged into the wrong bases (#16 fixed it). I would avoid them.

## 4. What was left out

- VoiceOver pass.
- Real phone.
- 200% zoom.
- Forced-colors.
- Streaming.
- A CSP.
- Monitoring.
- Shared daily cap.
- Distance labels in the list.
- Partial-word search.
- Image hosting.

Within the box, I also cut search, the audit and deploy. I built them after the box.

## 5. The AI-usage story

Claude Code orchestrated the work. Opus 5.5 did orchestration, architecture, review and the RAG ticket reviews. Sonnet 5.5 did the PRD, tickets, implementation and docs. The live model is Haiku 4.5. Agents worked in separate worktrees under a documented process. I approved at gates and merged every PR.

Real problems found:

- A vacuous e2e stub.
- A dialog that closed on blank clicks.
- A Caddy `/healthz` that served HTML.
- A PostHog option with no effect, so a privacy claim overclaimed.
- Two AI grounding holes. A partial citation failure still returned the text. The answer text was unchecked.
- `Retry-After` hidden by CORS.
- A late announcement that overwrote a user message in the live region.
- Wrong contrast figures from a developer.
- A parallel e2e run that tested the wrong build.
- A failed first RAG deploy.

Incidents:

- I pasted an API key into a `!` command. The key is in the transcript. The key was revoked and replaced via `fly secrets import`. Tell the recruiter.
- The Anthropic account initially had no credit.

See `docs/REVIEW_LOG.md` and `SELF_IMPROVEMENT.md`.

## 6. What I would change before release

- VoiceOver, real phone, 200% zoom, text spacing, forced-colors; users who rely on screen readers.
- Bigger marker hit areas or clustering.
- A shared daily cap and billing alerts.
- A larger eval set, and work on the three remaining misses.
- Monitoring, a CSP, rehearsed rollback, per-worktree e2e ports.
- Analytics: "Discard client IP data" in PostHog, a DevTools payload check, consent and legal review.
- Replace public OSM tiles. Add real image hosting.
- Likely failures: cold starts, an unfunded API account (503 and fallback), tile limits, stale data, the Cedar Hill coordinate.

## 7. Three review candidates

Pick one candidate. Review it for real. Record what you found in `docs/REVIEW_LOG.md`.

1. **Answer verification.** `server/src/rag/verifyCitations.ts`, `verifyAnswer` (with `quoteProblem` and `unsupportedFacts`).
   - What could be wrong:
     - The fact check is a word-presence rule. A wrong claim made only of words found in the cited chunk passes (for example, swapped attributes).
     - A legitimate capitalised word not in the chunk causes an abstention. This is what flagged "It" in `kw-skate`.
     - The 6-character quote minimum is a calibration choice. It may be too loose or too tight.
     - parkId must come from our chunk, never from the model.
   - How to check:
     1. Read `server/test/verifyCitations.test.ts`.
     2. Feed `verifyAnswer` these replies: a fabricated quote, a quote of only the park name, a real quote with a false number, and a mixed good-and-bad citation list.
     3. Confirm that each one abstains.
     4. Run `npm run eval:ask` with your own key and read every answer.
2. **Live region.** `web/src/a11y/LiveRegion.tsx`.
   - What could be wrong:
     - The 1.5 s hold queues only the latest message. A rapid second message silently drops the message before it.
     - Timers can run after unmount.
     - The clear-then-set trick may not repeat identical text in every screen reader.
     - There is one region, so every feature competes for it.
   - How to check:
     1. Read `LiveRegion.test.tsx`.
     2. With VoiceOver, trigger "Sorted by distance", then an AI availability change within a second. Listen.
     3. Run the live-site e2e.
3. **Analytics privacy.** `web/src/analytics.ts`, `privacyOptions`.
   - What could be wrong:
     - The option names were checked against posthog-js 1.435 types. They may change on upgrade.
     - A missed remote-config feature could turn capture on again.
     - `capture_pageview` is on.
     - `$ip` is stripped client-side. But PostHog adds it server-side unless the project setting is on.
   - How to check:
     1. Set the key.
     2. Open DevTools Network and filter on the PostHog host.
     3. Read the payloads for cookies, coordinates, query text and IP.
     4. Confirm that there are no cookies or storage entries.
     5. Confirm that Do Not Track stops all capture.
     6. Turn on "Discard client IP data" in the project.
