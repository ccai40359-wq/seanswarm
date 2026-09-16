#!/usr/bin/env node
// verify-model — detect silent model substitution by OpenAI-compatible endpoints.
// Sends a minimal chat completion and compares response.model with the requested model.
// Some third-party / proxy endpoints answer with their own default model when they do
// not recognize the requested model id — this utility catches that.
//
// usage:
//   node verify-model.mjs --endpoint https://host/v1 --model <model-id> [--key-env OPENAI_API_KEY] [--timeout 30]
//
// exit codes: 0 = match / 2 = mismatch / 3 = error (bad args, rejected URL, network, HTTP, parse)
// credentials: read ONLY from environment variables — never hard-code keys.
import dns from "node:dns/promises";
import net from "node:net";

function usage() {
  console.error(
    "usage: node verify-model.mjs --endpoint <base-url> --model <model-id> [--key-env OPENAI_API_KEY] [--timeout 30]"
  );
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--endpoint" || a === "--model" || a === "--key-env") out[a.slice(2)] = argv[++i];
    else if (a === "--timeout") out.timeout = parseInt(argv[++i], 10);
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

// ---------------------------------------------------------------------------
// URL safety guard: http/https only; reject loopback / private / reserved hosts
// (same guard as fetch-hard.mjs; duplicated so each skill folder stays self-contained)
// note: the host is resolved once for the guard; DNS-rebinding between check and
// request is out of scope for a local CLI.
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
  if (/^f[cd]/.test(h)) return true;
  if (/^fe[89ab]/.test(h)) return true;
  if (h.startsWith("::ffff:")) return isPrivateV4(h.slice(7));
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
      // resolution failure will surface later as a fetch error
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

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.endpoint || !args.model) {
  usage();
  process.exit(3);
}

let base;
try {
  base = await assertSafeUrl(args.endpoint);
} catch (e) {
  console.error(`[verify-model] URL rejected: ${e.message}`);
  process.exit(3);
}

const keyEnv = args["key-env"] || "OPENAI_API_KEY";
const apiKey = process.env[keyEnv];
if (!apiKey) {
  console.error(`[verify-model] no credential: set the '${keyEnv}' environment variable (keys are read from env only).`);
  process.exit(3);
}

const timeoutMs = (Number.isFinite(args.timeout) ? args.timeout : 30) * 1000;
const url = base.pathname.endsWith("/chat/completions")
  ? base.href
  : new URL(base.href.replace(/\/+$/, "") + "/chat/completions").href;

const ctl = new AbortController();
const timer = setTimeout(() => ctl.abort(), timeoutMs);
let res, body;
try {
  res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: args.model, messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
    signal: ctl.signal,
  });
  body = await res.text();
} catch (e) {
  clearTimeout(timer);
  console.error(`[verify-model] request failed: ${e.name === "AbortError" ? "timeout" : e.message}`);
  process.exit(3);
}
clearTimeout(timer);

let json;
try {
  json = JSON.parse(body);
} catch {
  console.error(`[verify-model] non-JSON response (HTTP ${res.status}): ${String(body).slice(0, 200)}`);
  process.exit(3);
}

if (!res.ok) {
  const detail =
    (json && json.error && (json.error.message || JSON.stringify(json.error))) || String(body).slice(0, 200);
  console.error(`[verify-model] HTTP ${res.status}: ${detail}`);
  process.exit(3);
}

const returned = json.model || "(none)";
const verdict = returned === args.model ? "match" : "mismatch";
console.log(JSON.stringify({ endpoint: url, requested: args.model, returned, verdict }));
if (verdict !== "match") {
  console.error(`[verify-model] MISMATCH: requested '${args.model}' but the endpoint answered as '${returned}'.`);
  process.exit(2);
}
