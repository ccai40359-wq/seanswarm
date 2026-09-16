# Field notes

Observations from running this pack on real work (sanitized — no client data, no credentials). Numbers come from a single-host setup and will vary with host, models and gateways.

## Cost & latency

- 4-lane research run (low end of the standard tier): ≈84K–262K tokens per lane (depends on pages read); ≈560K tokens total; ≈5 min wall clock parallel + ≈1 min arbitration.
- Heavy tier (10–20 lanes): estimate 1.5M–4M tokens per round — check your quota before opening it.
- "Premium" research (adversarial lane + cross-family arbitration + two-round protocol): ≈1.5–2.5× standard cost, 15–25 min wall clock.

## What worked

- **Lane productivity ordering**: official docs / primary pages > GitHub repos & issues > community threads. Community lanes (EN/ZH) cost the most and produce the least.
- **Index-layer access**: `site:` queries through a search API read Reddit/Zhihu content from the index snapshot when direct fetch is IP-blocked. The index layer, not more firepower, is the fix for blocked sites.
- **Claims-table contract** (assertion | URL | date | primary/secondary | counter-evidence): turns merging from prose-reading into bookkeeping, and makes single-source assertions and conflicts mechanically visible.
- **Cross-family arbitration**: heterogeneous models catch correlated blind spots that same-family review misses; it is about uncorrelated blind spots, not about buying a smarter model.
- **Role separation**: a zero-write reviewer with a clean context surfaces issues that the writer cannot see about its own work.

## What failed / surprises

- **Skill loaded ≠ protocol executed.** A skill being present does not guarantee the orchestrator follows it. Load-bearing steps should be made mechanical (hooks, scripts), not left as prose. This pack's hook exists for that reason.
- **Hard sites: retrying harder never works.** When the exit IP is blocked, all effort-based escalation fails; escalate the *channel* (index layer → exit IP → real browser).
- **Sub-agent inactivity kills**: hosts may terminate a sub-agent idle for ~10 minutes. Give fetches their own timeouts (the bundled fetcher ships with 25s/45s timeouts) so no step hangs silently.
- **Session snapshots**: on some hosts, sub-agent tool/config changes are snapshotted at session start — restart the session after changing a role's tools.
- **Search fallbacks are fragile**: DuckDuckGo result pages are CAPTCHA-walled from some hosts; Bing's Chinese query segmentation returns garbage results; Brave result pages work but are brittle. Treat search-page scraping as a last resort, not a channel.
- **Free-tier numbers hide behind 403'd pricing pages** — if you cannot fetch a primary source, mark "unverified: no primary source" instead of guessing.

## Visual gate notes

- An LLM judge over rendered page PNGs (one verdict line per page, with evidence) plus a mechanical screenshot hook covers the "does it actually look right" gap that command-line acceptance misses.
- Re-judging after fixes is cheap and catches regressions: fixing a header on one page can break another.
- Keep the judge zero-write; render → judge → fix → re-render is the loop.
