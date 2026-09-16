# Changelog

## v0.1.0 — 2026-09-16

Initial release.

- **skills/web-research-fanout** — web research orchestration: lane splitting, firepower tiers, claims-table contract, adversarial lanes, cross-family arbitration, anti-scrape escalation ladder (L0–L4). Ships `scripts/fetch-hard.mjs`.
- **skills/dual-read** — dual-channel document reading: main agent reads + one subagent per file reads independently, then cross-compare (match / addition / conflict).
- **skills/dev-delivery** — dev delivery protocol: QA-first acceptance checklist → single writer → independent read-only review (diff-only input) → fail-closed acceptance → visual gate. Ships `scripts/verify-model.mjs`.
- **agents/** — four role templates: researcher, reviewer, worker-coder, visual-judge.
- **hooks/ui-screenshot-gate.mjs** — mechanical gate: blocks finishing a turn that edited UI files without screenshot evidence.
- **Languages**: skills ship in English (`SKILL.md`) with Chinese translations (`SKILL.zh.md`); READMEs in English and Chinese.
- **Security**: `fetch-hard.mjs` and `verify-model.mjs` include a URL safety guard (http/https only; loopback, private and reserved addresses rejected).
