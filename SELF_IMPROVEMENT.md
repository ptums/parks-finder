# SELF_IMPROVEMENT.md

This file is a running log of the agent workflow. It records what went wrong or right, and the concrete change that follows. It feeds the "what I'd do next" part of the video and deck.

## Rules

- Append only. Put the newest entry at the bottom of the Log.
- End every entry with an **ACTION** that changes a file. Examples: AGENTS.md, PROCESS.md, a subagent definition, CI, a ticket template. "Be more careful" is not an action.
- The Orchestrator reviews this file before Phase 1.
- The Orchestrator appends to this file at each gate or failure.
- Write the final retro in Phase 6.
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

1. **Two writers, one directory.** A second process wrote into the same folder as the setup session. Files were overwritten and deleted. ACTION (applied): AGENTS.md rule 10 and PROCESS.md section 2 require `git status` before writing. They forbid deleting files you didn't create. They say to stop and report unexpected changes.
2. **Peer-dependency traps.** `eslint-plugin-jsx-a11y` caps ESLint at 9. `typescript-eslint` caps TypeScript below 6.1. `onnxruntime-node` needs its postinstall. ACTION (applied): pins and warnings under "Known gotchas" in AGENTS.md.
3. **Secrets end up in submitted transcripts.** ACTION (applied): never read `.env`. A settings deny rule is proposed at G0. The human sets secrets. Config values live in PROCESS.md section 0.
4. **Parallel agents conflict on shared files and the lockfile.** ACTION (applied): disjoint `files_touched`. The foundation ticket installs dependencies. `package.json` is frozen after that. The app shell has named slots.
5. **A logs folder in `.gitignore` would silently drop required deliverables.** ACTION (applied): `transcripts/` is never ignored. PROCESS.md Phase 6 verifies this.
6. **Scope creep versus the 2-hour box.** ACTION (applied): a ticket cap of 10, an explicit cut order, and the T+60 / T+80 / T+95 / T+120 checkpoints in PROCESS.md.
7. **The brief grades accountability and verification, not just the app.** It asks the candidate to show code they reviewed closely. It also asks for a mistake they found, and for checks that passing tests miss. ACTION (applied): `docs/REVIEW_LOG.md`, `docs/VERIFICATION.md`, "read this closely" items at each PR gate, `docs/WALKTHROUGH.md` review candidates, and a human close-review step at G6.
8. **Extras are optional and slides aren't required.** The brief prefers a modest app that works. ACTION (applied): a T+60 core checkpoint and a cut order. AI and analytics must never affect core (AGENTS.md rules 7 and 13).
9. **The submission is a zip, so the README's board/Actions/Fly links may not open for the interviewer.** ACTION (applied): the README must stand alone. The human adds screenshots. The zip gets a clean-room test and a secret scan.
10. **Final transcripts can't be complete until the session ends.** ACTION (applied): make a tentative zip during wrap-up. After the session closes, the human copies the transcripts again and makes the zip again.
11. **A folder named `db/` can read as "add a database".** ACTION (applied): AGENTS.md says `db/` is a plain folder with static JSON. There is no database server.
12. **A public demo with a real API key invites abuse and surprise bills. Also, the browser can't see the server's `process.env`.** ACTION (applied): `GET /v1/capabilities` gates the AI UI. A per-IP rate limit plus `AI_DAILY_REQUEST_CAP` limit use. The README sends keyless users to the standard UI or the Fly deployment.
13. **No tool can certify "Complete ADA compliance", and axe finds only part of the real problems.** ACTION (applied): the standard is WCAG 2.2 AA. The evidence is a criteria table, aria snapshots, a tab-order test, and a required human VoiceOver walkthrough. The README wording doesn't overclaim.
14. **Husky hooks silently don't run in a new git worktree** (verified in a spike: a type-error commit passed). ACTION (applied): the orchestrator runs `npx husky` in every worktree. CI mirrors the hooks as the backstop. Agents never use `--no-verify`.
15. **Prettier would reformat `transcripts/` and `db/`.** This would silently edit the submitted logs and the dataset. ACTION (applied): a `.prettierignore` requirement and a lint-staged glob rule.
16. **Jest can't execute Vite's `import.meta.env`** (verified: ESM-syntax error). ACTION (applied): one env module, mapped to a stub in Jest. A `.cjs` Jest config. Mock ESM-only deps.
17. **The analytics provider changed twice before the run (PostHog, then Simple Analytics, then PostHog).** ACTION (applied): all analytics details live in one wrapper module and a few env names. A provider swap is then a small change. Agents must verify provider option names against current docs, and must not guess.
18. **Safari skips links and buttons on Tab by default.** Leaflet markers react to Enter but not Space. ACTION (applied): a README note for interviewers. Space handling and tests for markers. Skip links to bypass the marker tab stops.

## Log

(Entries from the run go below.)

## Retro from the run (2026-10-02)

- **A long human gate wait used half the time box.** The G1 reply arrived about 55 minutes after the G1 message. Wait time counts toward the 2 hours. No code existed at T+60. CHANGE: at G1, ask for a short, time-limited default ("proceed with the recommended scope unless you object in 5 minutes"). Or schedule the run when the human is at the keyboard.
- **The settings deny glob was too broad.** `Read(./.env.*)` also blocked `.env.example`, because deny beats allow. The PM agent found it when it got permission denied (REVIEW_LOG #1). CHANGE: write explicit deny entries. Test that `.env.example` is readable at G0.
- **A vacuous e2e stub passed CI.** The OSM tile route glob never matched the real URL. So the "tiles fail" test proved nothing (REVIEW_LOG #6). Reading found it, not running. CHANGE: stub tests must assert that the interception count is greater than 0.
- **Stacking PRs to save time.** #12 and #13 are stacked on #11. This saves waiting, but it forces a merge order and increases rebase risk. CHANGE: at G3, decide whether to merge the foundation before dispatching dependents.
- **The reviewer pass was skipped on T1 because of the clock** (REVIEW_LOG #4). The orchestrator's independent check was the only gate before human review. CHANGE: budget a review slot for the foundation ticket, or run it in parallel with T2/T3 work.

## 2026-10-02: Stacked PRs merged into the wrong base

Stacked PRs (#12-#15) were opened against ticket branches. The human merged them as asked, but into those bases, not `main`. Fix: one combining PR to `main`. Next time, open stacked PRs against `main` and accept the larger diff. Or have the orchestrator retarget each one after its parent merges.

## 2026-10-02: Integration runs keep catching what per-ticket checks miss

Two times, two tickets passed alone but failed together. In one case, a role+name locator matched a map marker. In the other, a hard-coded tab-order list missed a new button. Running the merged branches before opening the last PR caught both. Keep the integration step. Read the full Playwright summary (passed AND failed), never just the last line.

## 2026-10-02: Deploy config needs execution, not just reading

The Caddyfile looked right, but it had a directive-order bug. A passing health check would have hidden it. Docker wasn't running locally, so the first real build was the CI deploy. Next time: start Docker (or a remote build-only run) before the deploy PR. Make the health endpoint return a body that the check asserts on.

## 2026-10-03: Parallel e2e runs shared fixed ports

`playwright.config.ts` used `reuseExistingServer: !CI` on fixed ports 4173/4174. Agents ran e2e in parallel worktrees, so one run silently tested the build of another worktree. The orchestrator's re-run of #33 showed 15 failures, because the #34 worktree owned both ports (REVIEW_LOG #68). Mitigation used: isolated re-runs with `CI=1`. Next time: derive ports per worktree, or never reuse servers. Print which build a run tested.

## 2026-10-03: A secret typed into a `!` command

The human set the Fly secret with a `!` command that contained the API key. So the key is in the session transcript. The transcript is submitted unredacted and must not be edited. The key was revoked immediately. A new key was set with `fly secrets import`, and the value was not in any command. Next time: before the human needs to set any secret, the orchestrator gives the exact no-value command (`fly secrets import` reading from stdin or a file outside the repo). PROCESS.md states "never type a key into a chat command".

## 2026-10-03: Verify deploy configs by execution (again)

The first RAG deploy failed. `npm ci --omit=dev` ran the `prepare` script (husky, a dev dependency), so it exited 127 (REVIEW_LOG #55, fixed in PR #27). Docker was not running locally, so the first real build was the deploy. This is the same lesson as the Caddy `/healthz` bug. Next time: build both images locally, or in a build-only remote run, before the deploy PR. Run the container's health check.

## 2026-10-03: Agent-reported numbers were wrong until recomputed

A developer reported primary-colour contrast as 6.29:1 and hover as 4.92:1. The developer also wrote an unchecked "pressed 8.7:1" in `theme.ts`. The orchestrator computed 8.08, 6.21 and 10.48 (REVIEW_LOG #56). Earlier, the orchestrator's own "18 passed" came from the last output line and hid 2 failures (#19). Next time: compute ratios with a script that is committed or shown. Quote the full Playwright summary (passed and failed) and the Jest totals from the output. Never quote them from memory or from an agent's report.

## 2026-10-03: Stacked PRs merged into the wrong base

Stacked PRs (#12 to #15) were merged into their stacked bases, not `main`. So the foundation and feature work reached `main` only through the combining PR #16. The entry for 2026-10-02 above first noted this. It cost one extra PR and made the history confusing. Next time: open every PR against `main`, or retarget each one after its parent merges. Make the orchestrator check the base branch before it tells the human to merge.
