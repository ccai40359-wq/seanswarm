# Example: claims table (sanitized sample)

Output shape of one research lane — exactly this, no prose. (Fictional topic; URLs are placeholders.)

| Assertion | Source | Date | P/S | Counter-evidence |
|---|---|---|---|---|
| WidgetDB's free tier caps storage at 5 GB | https://example.org/widgetdb/pricing | 2026-09-10 | primary (official pricing page) | none found |
| WidgetDB announced reducing its free tier for new users | https://example.net/community/thread/12345 | 2026-08-30 | secondary (community post; links an official post) | official blog says "reduced", not "removed" — conflict, send to arbitration |
| Average first setup takes under 10 minutes | https://example.com/blog/widgetdb-review | 2025-11-02 | secondary (review blog) | stale (>30 days); uncorroborated |

Rules:

- One line per assertion; every line carries a URL and a date.
- `none found` in the counter-evidence column is a result, not a gap — record it explicitly.
- Anything that could not be found or conflicts with another lane goes below, never silently dropped.

## Not found / conflicting

- No primary source found for the migration export limits.
- Conflict: two secondary sources disagree on whether the free-tier reduction applies to new users only.
