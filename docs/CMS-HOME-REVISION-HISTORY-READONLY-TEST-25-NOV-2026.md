# CMS Revision History — Home Page Read-Only Test — 25 November 2026

## Result
**PASSED — the Revision History workspace displayed a saved revision for the Home page.**

## Test scope
- Environment: Cloudflare Preview — `https://cms-development.yrproservice.pages.dev`
- Workspace: Management Centre → Revision history
- Content type: Page
- Selected item: `Home · /` (the item selector displays its label as `Home · /second test · /second-test`)
- Action: Select Home and click **Load history**.
- Evidence: User supplied the rendered Revision history screen.

## Observed evidence
The history panel displayed:
- Version: `V1 · draft`
- Description: `Visual editor update`
- Timestamp: `2026-11-24T09:06:39.362Z`

This confirms that the workspace can display at least one saved revision for the Home page selection.

## Limitations
- This was a user-confirmed browser observation, not an independently replayed browser test.
- Only one revision was visible in the supplied result. Completeness, pagination, additional versions, and other content types remain untested.
- Revision preview/restore behavior was not tested.
- **Delete Draft** was not clicked. No restore, delete, publish, save, migration, or database operation was performed.
- Production was not accessed or changed.

## Related test
The CMS Preview Test page also displayed one `V1 · draft` revision in the read-only test recorded in `docs/CMS-REVISION-HISTORY-READONLY-TEST-25-NOV-2026.md`.
