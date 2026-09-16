#!/usr/bin/env node
// ZCode UI 截图自检闸门（用户级 hook，三个事件共用一个脚本，按 hook_event_name 分派）
//   PostToolUse:      改动 UI 文件 -> 打"脏"标记；出现截图证据 -> 清除标记
//   UserPromptSubmit: 新的一轮开始 -> 清除标记（闸门只约束单轮：本轮改了 UI 就必须本轮有截图）
//   Stop:             脏标记仍在 -> decision:block 把模型弹回去补截图（ZCode 最多连续弹 3 次）
// 任何异常一律放行（fail-open），脚本自身永远不能让会话卡住。

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const DIR = path.join(os.tmpdir(), "zcode-uicheck");
const CLEAN_AFTER_MS = 3 * 24 * 3600 * 1000;

const UI_EXT = /\.(tsx|jsx|vue|svelte|html?|css|scss|sass|less|astro|erb|hbs|ejs|pug|njk|liquid|twig)$/i;
const UI_DIR = /(^|[\\/])(views|components|pages|layouts|partials|public|static|templates|frontend|styles)([\\/]|$)/i;
const UI_NAME = /(^|[\\/])(index\.html?|app\.(js|mjs|ts|tsx|jsx|vue)|main\.(js|mjs|ts|css|scss))$/i;
const IMG_EXT = /\.(png|jpe?g|webp|gif|bmp)$/i;
const ESCAPE =
  /(无法(进行)?视觉自检|无法截图|没有可运行的?界面|无可运行界面|截图不可行|视觉自检不适用|unable to (take a )?screenshot|no runnable ui)/i;

const BLOCK_REASON =
  "本轮修改了前端/UI 文件但没有截图验证（Stop 闸门）。请按 UI 任务自检规则：启动服务 → 用 Browser Use 打开页面 → 截图 → 对照需求自检，确认后附上截图证据路径；若确实无法进行视觉自检（没有可运行的界面），请在回复中明确说明原因。";

function failOpen() {
  process.exit(0);
}

function readStdin() {
  return new Promise((resolve) => {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => resolve(raw));
    process.stdin.on("error", () => resolve(raw));
  });
}

function flagFile(sessionId) {
  const safe = String(sessionId || "unknown").replace(/[^A-Za-z0-9._-]/g, "_");
  return path.join(DIR, safe + ".dirty");
}

function setDirty(file) {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(file, String(Date.now()));
  } catch {}
}

function clearDirty(file) {
  try {
    fs.unlinkSync(file);
  } catch {}
}

function isDirty(file) {
  try {
    return fs.existsSync(file);
  } catch {
    return false;
  }
}

function cleanupOld() {
  try {
    const now = Date.now();
    for (const f of fs.readdirSync(DIR)) {
      const p = path.join(DIR, f);
      try {
        if (now - fs.statSync(p).mtimeMs > CLEAN_AFTER_MS) fs.unlinkSync(p);
      } catch {}
    }
  } catch {}
}

function isUiFile(p) {
  if (typeof p !== "string" || !p) return false;
  return UI_EXT.test(p) || UI_DIR.test(p) || UI_NAME.test(p);
}

function asText(v) {
  try {
    return JSON.stringify(v ?? "");
  } catch {
    return "";
  }
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return failOpen();
  }

  const event = input.hook_event_name || input.hookEventName || "";
  const file = flagFile(input.session_id || input.sessionId);
  cleanupOld();

  if (event === "UserPromptSubmit") {
    clearDirty(file);
    return failOpen();
  }

  if (event === "PostToolUse") {
    const toolName = String(input.tool_name || input.toolName || "");
    const t = input.tool_input || input.toolInput || {};
    const fp = String(t.file_path || t.filePath || "");
    const text = asText(t);

    const edited = [];
    if (/^(edit|write|multiedit|applypatch|patch)$/i.test(toolName)) {
      if (fp) edited.push(fp);
      if (Array.isArray(t.edits)) {
        for (const e of t.edits) {
          const f2 = e && (e.file_path || e.filePath);
          if (f2) edited.push(String(f2));
        }
      }
    }
    if (edited.some(isUiFile)) setDirty(file);

    const shotByName = /screenshot/i.test(toolName);
    const shotByImageFile =
      /^(read|write)$/i.test(toolName) && IMG_EXT.test(fp);
    const shotByJs = /(^js$|node_repl)/i.test(toolName) && /emitimage|screenshot/i.test(text);
    const shotByBash =
      /^bash$/i.test(toolName) &&
      /(screenshot|\.png|\.jpe?g|\.webp|playwright[^\n]*(shot|screenshot))/i.test(String(t.command || ""));
    if (shotByName || shotByImageFile || shotByJs || shotByBash) clearDirty(file);

    return failOpen();
  }

  if (event === "Stop") {
    if (!isDirty(file)) return failOpen();
    const last = String(input.last_assistant_message || input.lastAssistantMessage || "");
    if (ESCAPE.test(last)) {
      clearDirty(file);
      return failOpen();
    }
    process.stdout.write(JSON.stringify({ decision: "block", reason: BLOCK_REASON }));
    return;
  }

  return failOpen();
}

main().catch(() => process.exit(0));
