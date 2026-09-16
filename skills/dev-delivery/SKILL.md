---
name: dev-delivery
description: Dev delivery orchestration — QA-first acceptance checklist → single writer implements (self-verified) → independent read-only review (diff-only input) → fail-closed acceptance → fixes go back to the writer → (visual gate for UI/PPT deliverables). MUST USE for multi-file coding tasks, code delivered for others to run, or changes needing independent acceptance; single-file scripts may use the lite path.
---

# Dev Delivery

Core principles: **one writer; independent, read-only review; fail-closed acceptance; fixes go back to the writer.**
Multi-agent raises the floor (that's what gates are for) — the ceiling is still the main model. So the gates must be real, short, and evidence-backed.

## 0. Pick the path

- **Full flow**: multi-file / delivered for the user to run / touches data or security.
- **Lite**: single-file tools, exploratory scripts → the main session lists acceptance points → implement with self-test coverage → (optional) one static review pass.

## 1. HITL plan gate (big changes only)

Before spending budget, produce a 3-5 line plan: files touched, module boundaries/contracts, failure modes, how it will be accepted. Get the user's nod first — reworking a plan is far cheaper than reworking a heap of code.

## 2. QA-first: freeze the acceptance checklist

Dispatch **reviewer** (read-only) to produce the acceptance checklist: numbered items + the pass bar for each + severity P0-P3.
The checklist must be **frozen before** implementation; changing requirements mid-flight = change the checklist and say so.

## 3. Single-writer implementation

Dispatch **worker-coder**, one module at a time.

- **verification-before-completion**: run verification yourself (tests/command output) before reporting back; no fresh run output → you may not say "done".
- Report format: files changed + run evidence + leftover risks.

## 4. Independent read-only review

Dispatch **reviewer**. Dispatch notes:

- **Feed only the diff + requirements (+ optional commit SHA), never the conversation history** — clean perspective, no contamination.
- Output: each finding = location (file:line) + phenomenon + severity (P0-P3); no unsubstantiated generic advice.
- **finder ≠ fixer**: the reviewer only finds; fixes go back to the single writer; **one repair round, no recursion**.

## 5. Fail-closed acceptance

- **unknown = fail**: anything unconfirmed counts as not-passed unless explicitly waived with a written reason.
- An empty diff needs an explicit waiver to count as "no change needed".
- Numeric assertions must trace to first-hand output (test logs / command output) — "I did run it" is not accepted.

## 6. Visual gate (when the deliverable is UI / web / PPT)

- Render → screenshot → verdict (pass/fail + evidence, one line per page/screen) → fix → re-render and re-judge.
- Judge with **visual-judge** (zero write permission; sees only rendered images, never source files).
- Mechanical gate (optional): edited UI files but produced no screenshot evidence this turn → bounce at wrap-up to collect evidence. Example hook: `hooks/ui-screenshot-gate.mjs` in this repo.

## 7. Failure handling

- Sub-agent dispatch failure/timeout → **retry once** (smaller scope or different model); if it fails again, the main session covers it and states the gap in the final answer.
- **Circuit breaker**: the same channel/model failing **twice in a row** → switch channel/model; do not hit it a third time.
- **Silent model substitution**: for third-party OpenAI-compatible endpoints, verify the response's `model` field matches the request (`scripts/verify-model.mjs`) — some endpoints answer with their own default model for unknown ids without saying so.

## 8. Dispatch ledger (optional; recommended for long tasks)

- Save every dispatch to `<project>/.dispatch/<time>-<role>.md` (full task + model + raw output); keep multi-round progress in `.dispatch/STATE.md` to resume after interruption.
- On first creation, write a one-line `.gitignore` containing `*` inside `.dispatch/` — it never gets committed.

## Pre-delivery self-check (all must pass)

- Checklist items all verified? Un-passed ones explicitly waived with reasons?
- Review findings all carry location + evidence? P0/P1 fixed or explicitly declined with reasons?
- Fresh run output exists before any "done" claim?
- Visual deliverables: screenshot evidence + verdicts present?
- Dispatch ledger complete (if enabled)?
