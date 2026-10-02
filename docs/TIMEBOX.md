# Timebox

Start (epoch, UTC): 1790960295 — Fri Oct 2 2026, 11:58 CDT (16:58 UTC)

Budget: 120 minutes wall clock, human wait time included. See PROCESS.md section 3.

## Log

+0 Preflight passed (node 22.22.3, gh auth ok, board #1, Fly apps exist, GH secrets/vars present). Labels created.
+4 G0 approved: settings.json written; models confirmed; env file is `.env.local` (human decision); analytics = PostHog only. Phase 1 Analyze started.
+10 G1 summary sent (PRD + ARCHITECTURE done).
+67 G1 approved ("approve all"; the reply came ~55 min after the G1 message, and wait time counts). REQUIREMENTS.md APPROVED with section 0 amendments; settings deny rule fixed (REVIEW_LOG #1); .env.example updated. The T+60 core checkpoint has passed with no code yet, so the cut line is proposed at G2. Phase 2 Plan started.

## Models and parallelism

Confirmed by the human at G0: orchestrator Opus 5.5 (`/model` set at session start); architect, reviewer, a11y-auditor, rag-engineer Opus 5.5 (inherit); developer, tester (and pm, ticketer as low-judgment drafting roles) Sonnet 5.5. Parallelism cap: 2.

## Usage readings

| When    | Session meter         | Weekly (all models)         | Weekly Fable | Note                        |
| ------- | --------------------- | --------------------------- | ------------ | --------------------------- |
| G0 (+3) | 8% (resets 13:50 CDT) | 1% (resets Oct 2 15:00 CDT) | 0%           | weekly meter resets mid-run |
