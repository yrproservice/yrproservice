# Product revision restore outcome — cattani-ac-100 — 25 November 2026

## User-confirmed Preview observation
Following the restore preflight instructions, the user supplied a Revision history screen showing that a restore had completed. The history now displays:

- V6 · draft — Restored from V3 — 2026-11-25T03:04:10.156Z
- V5 · archived — Restored from V1 — 2026-11-24T03:01:51.241Z
- V4 · published — Restored from V2 — 2026-11-24T02:57:29.315Z
- V3 · archived — Restored from V1 — 2026-11-24T02:56:39.048Z
- V2 · archived — New product draft — 2026-11-24T02:54:44.686Z
- V1 · archived — Updated product draft — 2026-11-12T03:10:36.850Z

## Result and impact
A new V6 draft was created from the archived V3 revision. The previously active V5 draft is now archived. V4 remains the published revision according to the displayed history. The published product was therefore not replaced by this restore operation; the change is to draft/revision state.

## Safety response
Do not perform further restore, delete, or publish actions on this item during this test. Preserve V6 as the current draft until the user decides what to do. Do not delete V6 or attempt to recreate V5 without a separate reviewed recovery plan.

## Evidence and limitations
- This is based on the user-provided Preview CMS screen, not an independent browser replay.
- The user was previously instructed to cancel the confirmation dialog; the supplied result shows that the restore nevertheless completed. The exact dialog text and whether confirmation was intentional are not established by the screen alone.
- No further action was taken after observing V6.
- Production remains untouched.