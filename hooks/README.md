# ui-screenshot-gate

A mechanical gate for UI work: if a turn edited front-end files but produced **no screenshot evidence**, the Stop hook bounces the turn back with a reminder. It is deliberately dumb — no LLM, no judgment, just bookkeeping. Prompts describe the rule; this hook enforces it.

## Behavior

- `PostToolUse` — editing a UI file (`*.tsx/jsx/vue/svelte/html/css/...`, or files under UI-looking directories) sets a "dirty" flag for the session.
- Screenshot evidence — a screenshot tool call, reading/writing an image file, or a shell command containing `screenshot`/`.png` — clears the flag.
- `UserPromptSubmit` — resets the flag (the gate is per-turn).
- `Stop` — if still dirty and the final message does not state why visual self-check was impossible, blocks with a reason (up to 3 consecutive blocks).
- Everything **fails open**: any error in the hook lets the turn pass.

## Wire it up (example host config)

Configuration-file hooks need to be enabled explicitly. In the host's config (paths are absolute to this repo's `hooks/` directory):

```json
{
  "hooks": {
    "enabled": true,
    "events": {
      "PostToolUse":      [{ "hooks": [{ "type": "process", "command": "node", "args": ["<abs-path>/hooks/ui-screenshot-gate.mjs"], "timeoutMs": 5000 }] }],
      "UserPromptSubmit": [{ "hooks": [{ "type": "process", "command": "node", "args": ["<abs-path>/hooks/ui-screenshot-gate.mjs"], "timeoutMs": 5000 }] }],
      "Stop":             [{ "hooks": [{ "type": "process", "command": "node", "args": ["<abs-path>/hooks/ui-screenshot-gate.mjs"], "timeoutMs": 5000 }] }]
    }
  }
}
```

Note: host hook config is usually snapshotted at session start — restart the session after wiring.

## Test

```bash
node ../tests/ui-screenshot-gate.test.mjs
```

12 cases: clean stops pass; UI edits set the flag; stops block; screenshot evidence clears it; the escape hatch (explicitly stating visual self-check is not possible) passes; garbage input fails open.

## Other hosts

The script reads the host's hook payload from stdin (`hook_event_name`, `tool_name`, `tool_input`, `session_id`, `stop_hook_active`, `last_assistant_message`) and writes a one-line JSON decision to stdout. Hosts with the same hook contract work directly; hosts with a different schema need a small shim around `run()`.
