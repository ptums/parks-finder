# Timebox

Start (epoch, UTC): 1790960295 — Fri Oct 2 2026, 11:58 CDT (16:58 UTC)

Budget: 120 minutes wall clock, human wait time included. See PROCESS.md section 3.

## Log

+0 Preflight passed (node 22.22.3, gh auth ok, board #1, Fly apps exist, GH secrets/vars present). Labels created.
+4 G0 approved: settings.json written; models confirmed; env file is `.env.local` (human decision); analytics = PostHog only. Phase 1 Analyze started.
+10 G1 summary sent (PRD + ARCHITECTURE done).
+67 G1 approved ("approve all"; the reply came ~55 min after the G1 message, and wait time counts). REQUIREMENTS.md APPROVED with section 0 amendments; settings deny rule fixed (REVIEW_LOG #1); .env.example updated. The T+60 core checkpoint has passed with no code yet, so the cut line is proposed at G2. Phase 2 Plan started.
+69 G2: human chose cut line A (strict 2h): core only (T1, T2, T3). T4, T5-T10 cut or deferred.
+71 T1 foundation started.
+86 T1 done and checked; PR #11 opened (CI green).
+91 to +93 T2 and T3 reviewed (reviewer, a11y-auditor), fixes sent back, PRs #12 and #13 opened (stacked on #11).
+93 (13:31 CDT) Wrap-up started: README, WALKTHROUGH, VERIFICATION, retro.

## Models and parallelism

Confirmed by the human at G0: orchestrator Opus 5.5 (`/model` set at session start); architect, reviewer, a11y-auditor, rag-engineer Opus 5.5 (inherit); developer, tester (and pm, ticketer as low-judgment drafting roles) Sonnet 5.5. Parallelism cap: 2.

## Usage readings

| When                                                                                                                                                                                                                                                                                                                                                                                                    | Session meter         | Weekly (all models)         | Weekly Fable | Note                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------- | ------------ | --------------------------- |
| G0 (+3)                                                                                                                                                                                                                                                                                                                                                                                                 | 8% (resets 13:50 CDT) | 1% (resets Oct 2 15:00 CDT) | 0%           | weekly meter resets mid-run |
| +98 G6 checklist sent; PRs #11-#14 open.                                                                                                                                                                                                                                                                                                                                                                |
| +114 Human chose to continue past the 2-hour box with T4 (search/filters/sort) only. T4 started, stacked on T2 (#13). The README time-spent section must report the overrun.                                                                                                                                                                                                                            |
| +132 Human asked to continue with T9, T10 and near-me. #16 merged (stacked PRs brought to main).                                                                                                                                                                                                                                                                                                        |
| +133 T9 and T10 started in parallel; near-me after T10 finished.                                                                                                                                                                                                                                                                                                                                        |
| +~150 PRs #17 (deploy), #18 (T9), #19 (near-me) opened; #17 merged and deployed; live smoke test passed.                                                                                                                                                                                                                                                                                                |
| +~165 #18 and #19 merged; redeploy passed; full e2e (80) passed against the live site. Final docs PR.                                                                                                                                                                                                                                                                                                   |
| After the box, 2026-10-02 evening to 2026-10-03 (exact times not logged here; the human fills in totals in the README): AI search T5 retrieval (#23), T6 `/v1/ask` (#24), RAG deploy (#25, #27), T7 AI UI (#26), T8 PostHog (#22), dependency update (#21), Ant Design (#29, issue #28), AI diagnostics (#30), live-region hold (#31), grounding calibration with eval:ask 74% to 87% abstention (#32). |
| After the box: human bug round, issues #33-#36 (Bug A to D), fixed in PRs #37-#40 (marker images and Recenter, directory rating and AI error placement, image gallery, whole-word search).                                                                                                                                                                                                              |
| Human fills in: prep minutes before the clock and total time.                                                                                                                                                                                                                                                                                                                                           |
