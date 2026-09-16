# Cursor adapter (draft — unverified)

Cursor's extension surface differs from Claude Code–style hosts: rules live in `.cursor/rules` (project) or user rules, and "skills" are not a first-class concept as of this writing.

## Suggested mapping

1. **Rules** — convert each skill's core protocol into a rule file (`.cursor/rules/<name>.mdc` or user-level rules), keeping the decision rules and output contracts:
   - research: lane splitting, claims-table output, adversarial lane, arbitration, anti-scrape ladder
   - documents: dual-channel read + cross-compare
   - dev delivery: QA-first → single writer → diff-only review → fail-closed → visual gate

2. **Roles** — express roles as named instruction blocks or Cursor sub-agent equivalents if your setup supports them; otherwise run roles as separate chats with explicit, self-contained prompts (the dispatch template in `web-research-fanout/SKILL.md` is designed for that).

3. **Scripts** — plain Node CLIs, run from Cursor's terminal:
   ```bash
   node skills/web-research-fanout/scripts/fetch-hard.mjs <url>
   node skills/dev-delivery/scripts/verify-model.mjs --endpoint <base-url> --model <model-id>
   ```

4. **Hooks** — Cursor's automation surface differs; treat the screenshot gate as a manual/checklist step until verified.

Status: draft — unverified. Corrections welcome.
