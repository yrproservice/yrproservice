# CMS Revision Restore Test — 25 November 2026

## Result
**Blocked — restore as draft rejected by CMS.**

## Test target
- Environment: Cloudflare Preview only
- CMS area: Management Centre → Revision history
- Content type: Site setting
- Setting key: `revision-check-1`
- Selected revision: `V1 · archived`
- Revision label: `New settings draft`
- Revision timestamp: `2026-11-13T02:09:51.166Z`

## User-confirmed browser evidence
The user confirmed V1 was visible in revision history alongside `V2 · draft` (`Updated settings draft`, timestamp `2026-11-13T02:10:19.916Z`). On attempting **Restore as draft** for V1, the CMS displayed:

> This CMS setting key is not supported.

The history remained visible with V1 still marked archived and V2 still marked draft. No successful restore or newly created draft was observed.

## Assessment
- Restore-as-draft: **Blocked / failed at the UI operation**
- Archived V1 state: still shown as archived after the error
- New draft creation: **Not observed**
- Published setting change: **Not observed**
- Production impact: none reported; this test was in Preview
- This is evidence of an unsupported setting-key path. It does not establish whether the key is invalid, intentionally unsupported, or missing restore-handler support.

## Safety / next steps
Do not retry the restore from the browser until the supported site-setting keys and the revision restore handler have been inspected. Do not delete V2, publish a test setting, or perform any Production operation. Investigate the exact error path in source and add a safe Preview-only regression test before another browser attempt.

## Evidence qualification
This report records the user's pasted browser result. The assistant did not independently operate the browser or verify database state.
