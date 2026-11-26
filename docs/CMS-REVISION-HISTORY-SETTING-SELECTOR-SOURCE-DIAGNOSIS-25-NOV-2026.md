# Revision History Setting Selector Source Diagnosis — 25 November 2026

## Finding
The Site setting options in Revision history are populated from the settings returned by the Preview CMS settings API, not from a complete list of every setting key accepted by validation.

## Source evidence
- `src/pages/CMSManagement.jsx`: `historyOptions` for setting history is constructed from `settings.map(row => ({ key: row.setting_key, label: row.setting_key }))`.
- The same component loads `settings` from `/api/cms/admin/settings`.
- `functions/api/cms/admin/settings.js`: GET selects rows from `cms_site_settings` and returns those rows as `settings`. It does not synthesize missing keys.
- `functions/_utils/cms-settings-validation.js`: `page-design.services` is included in `PAGE_DESIGN_KEYS`, so the key is supported by validation if a setting is saved; this does not itself create a database setting row.

## Interpretation
The user's Preview selector showed only:
- `page-design.product-detail`
- `page-design.products`
- `qa.persistence-check`
- `revision-check-1`

Therefore the selector is reflecting the setting records currently returned by the Preview settings list. `page-design.services` is absent because no corresponding setting record is currently exposed by that list. The same mechanism explains why other supported-but-uncreated settings may be absent. This is not evidence that those keys are rejected by validation.

## Safety and scope
- Read-only source inspection on `cms-development`.
- No application source, database, setting, or deployment changed.
- No Production access or change.
- The user's browser observation is user-confirmed; the source explanation is based on repository code.

## Recommended next step
Do not create a dummy setting merely to populate the selector. If testing history for `page-design.services` is required, first determine whether the Services design workflow is intended to create and save this setting in Preview. Only save a legitimate, validated Services design draft as a separate, explicitly approved test.
