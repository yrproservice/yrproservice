# Cattani AC-100 restore confirmation clarification — 25 November 2026

## User confirmation
The user confirmed that the CMS displayed the confirmation prompt:

> Restore this revision as a new draft? The current published version will remain live.

The user intentionally clicked **OK**.

## Confirmed outcome
The subsequent revision history showed:
- V6 — draft — Restored from V3 — 2026-11-25T03:04:10.156Z
- V5 — archived — Restored from V1 — 2026-11-24T03:01:51.241Z
- V4 — published — Restored from V2 — 2026-11-24T02:57:29.315Z
- V3 — archived — Restored from V1 — 2026-11-24T02:56:39.048Z
- V2 — archived — New product draft — 2026-11-24T02:54:44.686Z
- V1 — archived — Updated product draft — 2026-11-12T03:10:36.850Z

This establishes that the restore was user-confirmed, not an accidental or unexplained action. V6 is the current draft; V4 remains the published version. V6 has not been published.

## Safeguards
Preserve V6 and V5. Do not perform another restore, delete, publish, or draft mutation without a separate deliberate test plan and explicit user approval.

## Scope
This is a documentation-only clarification. No application source, database, deployment, or additional browser action was performed.
