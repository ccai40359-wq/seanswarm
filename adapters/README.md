# Adapters

This pack is designed to be portable, but hosts differ in how they load skills, agents and hooks. What maps 1:1 and what needs adaptation:

| Piece | Portability | Notes |
|---|---|---|
| Skills (`SKILL.md`) | High | Same file format across Claude Code–style hosts. Verified on ZCode; Claude Code shares the same conventions (inferred, not independently verified). Codex keeps a skills directory too — verify the current format on your version. |
| Scripts (Node) | High | Plain `node` CLIs (`fetch-hard.mjs`, `verify-model.mjs`); need Node 18+ and `curl` on PATH. |
| `AGENTS.md` rules | High | AGENTS.md is a cross-tool convention; the dev-delivery and research rules port as text. |
| Role templates (`agents/*.md`) | Medium | Frontmatter fields (tools, model) differ per host; the body text ports as-is. |
| Hooks | Low | Event schemas differ between hosts; the bundled hook targets the host's Stop/PostToolUse events. |

Per-platform notes:

- `codex.md` — skills directory, role adaptation, hook caveats
- `cursor.md` — rules-based adaptation (draft, unverified)

Status: the ZCode paths were verified during development. Claude Code shares the same conventions (inferred). Codex/Cursor are drafts — verify against current docs and send fixes.
