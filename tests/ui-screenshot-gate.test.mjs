// Self-test for ui-screenshot-gate.mjs: node tests/ui-screenshot-gate.test.mjs (run from the repo root)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOOK = fileURLToPath(new URL("../hooks/ui-screenshot-gate.mjs", import.meta.url));
const DIR = path.join(os.tmpdir(), "zcode-uicheck");
const SID = "zcode-selftest";
const flag = () => path.join(DIR, SID + ".dirty");

function run(payload) {
  const r = spawnSync(process.execPath, [HOOK], { input: JSON.stringify(payload), encoding: "utf8" });
  return { code: r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

let pass = 0,
  fail = 0;
function check(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log("PASS  " + name);
  } else {
    fail++;
    console.log("FAIL  " + name + (extra ? "  [" + extra + "]" : ""));
  }
}

fs.rmSync(flag(), { force: true });

let r = run({ hook_event_name: "Stop", session_id: SID, last_assistant_message: "hello" });
check("1 clean stop passes silently", r.out === "" && !fs.existsSync(flag()), r.out);

r = run({ hook_event_name: "PostToolUse", session_id: SID, tool_name: "Edit", tool_input: { file_path: "C:/proj/src/server.js" } });
check("2 non-ui edit leaves no flag", !fs.existsSync(flag()));

r = run({ hook_event_name: "PostToolUse", session_id: SID, tool_name: "Edit", tool_input: { file_path: "C:/proj/public/app.js" } });
check("3 ui edit sets flag", fs.existsSync(flag()));

r = run({ hook_event_name: "Stop", session_id: SID, last_assistant_message: "done" });
let j = null;
try { j = JSON.parse(r.out); } catch {}
check("4 stop blocks with decision:block", !!(j && j.decision === "block" && j.reason), r.out.slice(0, 80));
check("5 flag kept after block", fs.existsSync(flag()));

r = run({ hook_event_name: "PostToolUse", session_id: SID, tool_name: "mcp__node_repl__js", tool_input: { code: "nodeRepl.emitImage(await tab.screenshot());" } });
check("6 js screenshot clears flag", !fs.existsSync(flag()));

r = run({ hook_event_name: "Stop", session_id: SID, last_assistant_message: "done" });
check("7 stop passes after evidence", r.out === "");

run({ hook_event_name: "PostToolUse", session_id: SID, tool_name: "Write", tool_input: { file_path: "C:/proj/views/x.vue" } });
check("8 vue edit sets flag", fs.existsSync(flag()));
run({ hook_event_name: "PostToolUse", session_id: SID, tool_name: "Read", tool_input: { file_path: "C:/proj/shot.png" } });
check("9 read png clears flag", !fs.existsSync(flag()));

run({ hook_event_name: "PostToolUse", session_id: SID, tool_name: "Write", tool_input: { file_path: "C:/proj/index.html" } });
r = run({ hook_event_name: "Stop", session_id: SID, last_assistant_message: "这个改动没有可运行的界面，无法进行视觉自检。" });
check("10 escape hatch passes and clears", r.out === "" && !fs.existsSync(flag()), r.out.slice(0, 80));

run({ hook_event_name: "PostToolUse", session_id: SID, tool_name: "Write", tool_input: { file_path: "C:/proj/index.html" } });
run({ hook_event_name: "UserPromptSubmit", session_id: SID, prompt: "next" });
check("11 new prompt resets flag", !fs.existsSync(flag()));

const r2 = spawnSync(process.execPath, [HOOK], { input: "not json", encoding: "utf8" });
check("12 garbage input fails open", r2.status === 0 && (r2.stdout || "").trim() === "");

fs.rmSync(flag(), { force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
