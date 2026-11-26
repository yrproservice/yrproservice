# Revision History Browser Check — Site Setting: qa.persistence-check — 25 November 2026

## Result
**PASSED (user-confirmed browser observation)**

## Scope
- Environment: Cloudflare Preview
- Repository branch: `cms-development`
- CMS area: Management Centre → Revision history
- Content type: Site setting
- Selected item: `qa.persistence-check`
- Action: Load history (read-only)

## Observed result
The revision list displayed four archived entries:
- `V4 · archived` — `Restored from V2` — `2026-11-13T02:14:49.392Z`
- `V3 · archived` — `Updated settings draft` — `2026-11-13T02:10:44.317Z`
- `V2 · archived` — `Updated settings draft` — `2026-11-13T02:10:33.462Z`
- `V1 · archived` — `Updated settings draft` — `2026-11-13T02:07:21.293Z`

## What this verifies
The Management Centre revision-history view displayed four archived revision entries for the selected site setting.

## Limitations
- This was a user-confirmed observation; the browser interaction was not independently replayed by the assistant.
- Only `qa.persistence-check` was checked in this test.
- Pagination, restore, and delete actions were not tested.
- No setting was edited, restored, deleted, or published during this check.
- Production was not accessed or changed.
