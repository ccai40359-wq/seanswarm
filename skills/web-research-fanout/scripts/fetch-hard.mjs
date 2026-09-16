#!/usr/bin/env node
// fetch-hard — chained-degradation page fetcher (the L2 channel of web-research-fanout)
//   direct fetch with a real browser UA (curl, honors system proxy)
//   → HTML → plain text; if blocked/failed, fall back to r.jina.ai
// usage: node fetch-hard.mjs <url> [--max 40000]
// stdout = fetched text (safe to redirect to a file); stderr = diagnostics
// exit codes: 0 = ok / 2 = all channels failed / 3 = URL rejected by the safety guard
import { execFile } from "node:child_process";
import dns from "node:dns/promises";
import net from "node:net";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const MARK = "__FETCHHARD_STATUS__";
const BLOCK_RE =
  /(access denied|just a moment|cf-chl|captcha|验证码|人机验证|attention required|blocked|forbidden)/i;

// ---------------------------------------------------------------------------
// URL safety guard: http/https only; reject loopback / private / reserved hosts
// before any request is made. Hostnames are resolved and every address checked.
// note: the host is resolved once for the guard; DNS-rebinding between check and
// request is out of scope for a local CLI, but keep it in mind if you wrap this.
// ---------------------------------------------------------------------------
function isPrivateV4(ip) {
  const p = ip.split(".").map((n) => Number(n));
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isUnsafeV6(ip) {
  const h = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "::" || h === "::1") return true;
  if (/^f[cd]/.test(h)) return true; // fc00::/7 unique-local
  if (/^fe[89ab]/.test(h)) return true; // fe80::/10 link-local
  if (h.startsWith("::ffff:")) return isPrivateV4(h.slice(7)); // IPv4-mapped
  return false;
}

async function assertSafeUrl(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error(`invalid URL: ${raw}`);
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error(`blocked scheme '${u.protocol}' — only http/https are allowed`);
  }
  const host = u.hostname.replace(/^\[|\]$/g, "");
  const literal = net.isIP(host);
  if (literal === 4 && isPrivateV4(host)) throw new Error(`blocked private/loopback address: ${host}`);
  if (literal === 6 && isUnsafeV6(host)) throw new Error(`blocked private/loopback address: ${host}`);
  if (literal === 0) {
    if (/(^|\.)(localhost|local|internal|home\.arpa)$/i.test(host)) {
      throw new Error(`blocked host: ${host}`);
    }
    let addrs = [];
    try {
      addrs = await dns.lookup(host, { all: true });
    } catch {
      // resolution failure will surface later as a curl error; not a guard decision
    }
    for (const { address, family } of addrs) {
      if (family === 4 && isPrivateV4(address))
        throw new Error(`host ${host} resolves to private address ${address}`);
      if (family === 6 && isUnsafeV6(address))
        throw new Error(`host ${host} resolves to private address ${address}`);
    }
  }
  return u;
}
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const url = argv.find((a) => !a.startsWith("--"));
const maxIdx = argv.indexOf("--max");
const MAX = maxIdx >= 0 ? parseInt(argv[maxIdx + 1], 10) || 40000 : 40000;

if (!url) {
  console.error("usage: node fetch-hard.mjs <url> [--max 40000]");
  process.exit(2);
}

try {
  await assertSafeUrl(url);
} catch (e) {
  console.error(`[fetch-hard] URL rejected: ${e.message}`);
  process.exit(3);
}

function curl(target, timeoutSec) {
  return new Promise((resolve) => {
    execFile(
      "curl",
      [
        "-sL",
        "--max-time", String(timeoutSec),
        "--max-redirs", "5",
        "--proto-redir", "=http,https",
        "-A", UA,
        "-H", "Accept: text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "-H", "Accept-Language: zh-CN,zh;q=0.9,en;q=0.8",
        "-w", `\n${MARK}%{http_code}`,
        target,
      ],
      { maxBuffer: 32 * 1024 * 1024, timeout: (timeoutSec + 10) * 1000 },
      (err, stdout) => {
        if (err && !stdout) return resolve({ ok: false, status: 0, body: "", err: String(err.message || err) });
        const out = stdout || "";
        const i = out.lastIndexOf(MARK);
        if (i < 0) return resolve({ ok: false, status: 0, body: out, err: "no status marker" });
        const status = parseInt(out.slice(i + MARK.length), 10) || 0;
        resolve({ ok: status === 200, status, body: out.slice(0, i) });
      }
    );
  });
}

function looksHtml(text) {
  return /<html|<!doctype|<body|<div|<script/i.test(text.slice(0, 2000));
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decide(res, raw) {
  // returns {text, blocked, reason}
  if (!res.status) return { text: "", blocked: true, reason: res.err || "no response" };
  if (!res.ok) return { text: "", blocked: true, reason: `http ${res.status}` };
  const html = looksHtml(raw);
  const text = html ? htmlToText(raw) : raw.trim();
  if (BLOCK_RE.test(text.slice(0, 3000)) && text.length < 5000)
    return { text: "", blocked: true, reason: "block-page marker" };
  if (raw.trim().length < 150) return { text: "", blocked: true, reason: `too small (${raw.trim().length}B)` };
  return { text, blocked: false, reason: "" };
}

const direct = await curl(url, 25);
let d = decide(direct, direct.body);
if (!d.blocked) {
  console.error(`[fetch-hard] direct:${direct.status} ${d.text.length}B`);
  console.log(d.text.slice(0, MAX) + (d.text.length > MAX ? `\n\n[... truncated, original ${d.text.length} chars]` : ""));
  process.exit(0);
}
console.error(`[fetch-hard] direct failed (${d.reason}) -> trying r.jina.ai`);

const jina = await curl("https://r.jina.ai/" + url, 45);
let j = decide(jina, jina.body);
if (!j.blocked) {
  console.error(`[fetch-hard] jina:${jina.status} ${j.text.length}B`);
  console.log(j.text.slice(0, MAX) + (j.text.length > MAX ? `\n\n[... truncated, original ${j.text.length} chars]` : ""));
  process.exit(0);
}
console.error(
  `[fetch-hard] all channels failed: direct=${direct.status}(${d.reason}) jina=${jina.status}(${j.reason})\n` +
    `[fetch-hard] hint: escalate to L1 (site: queries via a search API) or hand off to the main session for L3 (change exit IP) / L4 (real browser).`
);
process.exit(2);
