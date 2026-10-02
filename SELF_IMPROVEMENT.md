# SELF_IMPROVEMENT.md

A running log of what went wrong or right in the agent workflow, and the concrete change that follows. It feeds the "what I'd do next" part of the video and deck.

## Rules

- Append only. Newest at the bottom of the Log.
- Every entry ends with an **ACTION** that changes a file (AGENTS.md, PROCESS.md, a subagent definition, CI, a ticket template). "Be more careful" is not an action.
- The Orchestrator reviews this file before Phase 1, and appends at each gate or failure. Final retro in Phase 6.
- Apply approved actions in a PR labeled `process`.
- Never log secrets.

## Entry format

```
### [YYYY-MM-DD HH:MM] <phase> / <agent>
OBSERVED: what happened (link the PR/issue/run)
CAUSE: best guess at why
ACTION: exact change (file + what)
STATUS: proposed | applied (PR #) | rejected (why)
```

## Seeded lessons (from designing this pipeline, before the run; the actions are already baked into the docs)

### [setup] lessons / human + assistant

1. **Two writers, one directory.** A second process wrote into the same folder as the setup session, and files got overwritten and deleted. ACTION (applied): AGENTS.md rule 10 and PROCESS.md section 2 require `git status` before writing, forbid deleting files you didn't create, and say to stop and report unexpected changes.
2. **Peer-dependency traps.** `eslint-plugin-jsx-a11y` caps ESLint at 9; `typescript-eslint` caps TypeScript below 6.1; `onnxruntime-node` needs its postinstall. ACTION (applied): pins and warnings under "Known gotchas" in AGENTS.md.
3. **Secrets end up in submitted transcripts.** ACTION (applied): never read `.env`; settings deny rule proposed at G0; secrets set by the human; config values live in PROCESS.md section 0.
4. **Parallel agents conflict on shared files and the lockfile.** ACTION (applied): disjoint `files_touched`, dependencies installed in the foundation ticket, `package.json` frozen afterward, app shell with named slots.
5. **A logs folder in `.gitignore` would silently drop required deliverables.** ACTION (applied): `transcripts/` is never ignored; PROCESS.md Phase 6 verifies it.
6. **Scope creep versus the 2-hour box.** ACTION (applied): ticket cap of 10, an explicit cut order, and the T+60 / T+80 / T+95 / T+120 checkpoints in PROCESS.md.
7. **The brief grades accountability and verification, not just the app.** It asks the candidate to show code they reviewed closely, a mistake they found, and checks that passing tests miss. ACTION (applied): `docs/REVIEW_LOG.md`, `docs/VERIFICATION.md`, "read this closely" items at each PR gate, `docs/WALKTHROUGH.md` review candidates, a human close-review step at G6.
8. **Extras are optional and slides aren't required.** The brief prefers a modest app that works. ACTION (applied): T+60 core checkpoint, cut order, AI/analytics must never affect core (AGENTS.md rules 7 and 13).
9. **The submission is a zip, so the README's board/Actions/Fly links may not open for the interviewer.** ACTION (applied): the README must stand alone; the human adds screenshots; the zip gets a clean-room test and a secret scan.
10. **Final transcripts can't be complete until the session ends.** ACTION (applied): a tentative zip during wrap-up, and the human re-copies transcripts and re-zips after the session closes.
11. **A folder named `db/` can read as "add a database".** ACTION (applied): AGENTS.md says `db/` is a plain folder with static JSON; no database server.
12. **A public demo with a real API key invites abuse and surprise bills; and the browser can't see the server's `process.env`.** ACTION (applied): `GET /v1/capabilities` gates the AI UI, per-IP rate limit plus `AI_DAILY_REQUEST_CAP`, README sends keyless users to the standard UI or the Fly deployment.
13. **"Complete ADA compliance" can't be certified by a tool, and axe finds only part of the real problems.** ACTION (applied): the standard is stated as WCAG 2.2 AA, a criteria table with evidence, aria snapshots, a tab-order test, a required human VoiceOver walkthrough, and README wording that doesn't overclaim.
14. **Husky hooks silently don't run in a new git worktree** (verified in a spike: a type-error commit passed). ACTION (applied): the orchestrator runs `npx husky` in every worktree; CI mirrors the hooks as the backstop; agents never use `--no-verify`.
15. **Prettier would reformat `transcripts/` and `db/`**, silently editing submitted logs and the dataset. ACTION (applied): `.prettierignore` requirement and lint-staged glob rule.
16. **Jest can't execute Vite's `import.meta.env`** (verified: ESM-syntax error). ACTION (applied): a single env module mapped to a stub in Jest; `.cjs` Jest config; mock ESM-only deps.
17. **The analytics provider changed twice (PostHog, then Simple Analytics, then PostHog) before the run.** ACTION (applied): all analytics specifics live in one wrapper module and a few env names, so a provider swap is a small change; agents must verify provider option names against current docs instead of guessing.
18. **Safari skips links and buttons on Tab by default**, and Leaflet markers react to Enter but not Space. ACTION (applied): README note for interviewers, Space handling and tests for markers, skip links to bypass the marker tab stops.

## Log

(Entries from the run go below.)
