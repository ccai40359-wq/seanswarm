# Codex adapter (draft — verify on your version)

Observed layout (verify against your Codex build): Codex reads `AGENTS.md` natively and keeps skills under `~/.codex/skills/`.

## Steps

1. **Skills** — copy each skill directory into the skills dir:
   ```bash
   cp -r skills/web-research-fanout ~/.codex/skills/
   cp -r skills/dual-read ~/.codex/skills/
   cp -r skills/dev-delivery ~/.codex/skills/
   ```
   The `SKILL.md` format is the same convention; verify Codex picks it up on your version.

2. **Roles** — no verified native `agents/*.md` equivalent. Adapt role templates into instructions (or prompt files) that preserve the key contracts:
   - researcher → read-only; conclusions carry source URL + date; never invent.
   - reviewer → diff + requirements only (no conversation history); findings carry file:line + severity; finder ≠ fixer.
   - worker-coder → single writer; run verification before claiming completion.
   - visual-judge → zero-write; judge rendered page images only.

3. **Hooks** — hook support (if any) differs; if unavailable, keep the screenshot rule as a soft instruction and accept that it is not enforced mechanically.

4. **Scripts** — run as-is with Node 18+:
   ```bash
   node skills/web-research-fanout/scripts/fetch-hard.mjs <url>
   node skills/dev-delivery/scripts/verify-model.mjs --endpoint <base-url> --model <model-id>
   ```

## What stays the same

The protocols (lanes, claims contract, arbitration, QA-first, fail-closed acceptance, visual gate) are host-independent. What changes is the mechanism: registered agent profiles may become prompt instructions.

Status: draft — not verified end-to-end on Codex. PRs with confirmed paths/flags welcome.
