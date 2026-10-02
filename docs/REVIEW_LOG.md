# Review Log

Append-only. Every mistake found (by an agent, a check, CI, or the human), how it was found, and how it was fixed.

| # | Ticket/PR | Finding | Severity | Found by | How found | Fix (commit/PR) | Status |
| - | --------- | ------- | -------- | -------- | --------- | --------------- | ------ |
| 1 | G0 settings | Orchestrator's `.claude/settings.json` deny rule `Read(./.env.*)` also blocks `.env.example` (deny beats allow), contradicting the stated intent "`.env.example` is fine". | should-fix | agent self-report (pm subagent hit permission denied; orchestrator grep also denied) | PM could not read `.env.example`; orchestrator reproduced | Human approved at G1; replaced the glob with explicit `.env.local`, `.env.*.local`, `.env.production`, `.env.development` denies; `.env.example` readable again (confirmed by Read) | fixed |
