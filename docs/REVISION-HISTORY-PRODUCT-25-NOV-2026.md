# Revision History Browser Check — Product — 25 November 2026

## Result
**PASSED (user-confirmed browser observation)**

## Scope
- Environment: Cloudflare Preview
- Repository branch: `cms-development`
- CMS area: Management Centre → Revision history
- Content type: Product
- Selected item: Assumed to be `cattani-ac-100`, following the immediately preceding instruction to select that example; the pasted result did not repeat the selected-item field.
- Action: Load history (read-only)

## Observed result
The revision list displayed five entries:
- `V5 · draft` — `Restored from V1` — `2026-11-24T03:01:51.241Z`
- `V4 · published` — `Restored from V2` — `2026-11-24T02:57:29.315Z`
- `V3 · archived` — `Restored from V1` — `2026-11-24T02:56:39.048Z`
- `V2 · archived` — `New product draft` — `2026-11-24T02:54:44.686Z`
- `V1 · archived` — `Updated product draft` — `2026-11-12T03:10:36.850Z`

## What this verifies
The Management Centre revision-history view displayed five product revision entries, including draft, published, and archived statuses, with descriptions and timestamps.

## Limitations
- This was a user-confirmed observation; the browser interaction was not independently replayed by the assistant.
- The selected product identifier is inferred from the prior instruction, not explicitly visible in the pasted result.
- Pagination beyond the five displayed entries was not tested.
- Restore and delete actions were not tested.
- No product content was edited, restored, deleted, or published during this check.
- Production was not accessed or changed.
