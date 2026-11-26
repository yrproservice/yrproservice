# Revision history — Site setting selector and service-detail design — 25 November 2026

## User-confirmed browser observation
In CMS Management → Revision history, after selecting Content type = Site setting, the item selector displayed:
- `page-design.product-detail`
- `page-design.products`
- `qa.persistence-check`
- `revision-check-1`

The selector did not display `page-design.service-detail`.

## Interpretation
The separate Service details Visual Design Studio previously showed **Design status: No saved design** and **No design draft exists yet**. The absence of `page-design.service-detail` from the Site setting selector is consistent with that status: no existing site-setting record for that key is currently available to inspect in Revision history.

This is not evidence that the service-detail editor is missing. It is present in the Services workspace, but it has no saved design record shown in the supplied screen.

## Limitations and safeguards
- This is a user-reported browser observation, not an independently replayed browser test.
- No design draft was created or saved for the purpose of making it appear in history.
- No restore, delete, publish, or other mutation was performed.
- No application source, database, or deployment was changed. Production remains untouched.

## Next check
Return to the Services workspace and inspect the **Service details · all services Visual Design Studio** only if further confirmation is needed. Do not save a design merely to create a history entry; first decide whether a separate service-detail design draft is actually required.