# CMS Site-Setting Revision Restore — Source Diagnosis — 25 November 2026

## Finding
The Preview restore error for `revision-check-1` is explained by the current validation code. This is a deliberately unsupported test key, not evidence that the restore endpoint is generally broken.

## Source path
1. `functions/api/cms/admin/history.js` handles revision restore in `onRequestPost`.
2. For a `setting` entity, it calls `validateSiteSetting(key, restoredValue)` before creating a new draft.
3. `functions/_utils/cms-settings-validation.js` only accepts:
   - `site.navigation`
   - `site.footer`
   - `page-design.<supported-page-key>`, where the suffix must be in `PAGE_DESIGN_KEYS`.
4. Any other key returns `This CMS setting key is not supported.`

The test key `revision-check-1` is not in any supported setting-key family, so the restore is rejected before the draft-creation batch. This matches the user's browser message.

## Safety assessment
- No source code was changed as part of this diagnosis.
- Do not add `revision-check-1` to the production setting allowlist merely to make a synthetic test pass.
- Do not retry this restore.
- The existing V1 archived and V2 draft entries should remain untouched.
- No published setting change was observed.

## Correct next test
Use an existing, supported site-setting key with a known archived revision and inspect its value/validation compatibility first. A `page-design.*` setting is eligible only when its suffix is in the explicit supported-page list. Prefer a non-published archived revision and restore it as a draft only after the exact item and revision are verified. Do not publish it.

## Test coverage gap
`tests/cms-settings-validation.test.js` verifies that unknown keys are rejected, but the current tests do not demonstrate the revision-restore endpoint's behaviour for a valid supported site-setting key. Add focused endpoint-level regression coverage before treating supported-setting restoration as verified.

## Evidence qualification
This diagnosis is based on source files fetched from `cms-development` and the user's browser error. The browser operation was user-performed; no live database was queried by this diagnosis.
