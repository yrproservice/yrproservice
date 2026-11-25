# Services page editor and service-detail design studio — 25 November 2026

## Result
User-provided Preview CMS screen confirms that the Services workspace contains a Services page manager with five existing sections and an embedded visual styling studio. The embedded typography, colour, section arrangement, and alignment controls explicitly state that they are saved with the Services draft.

The same screen also shows a separate **Service details · all services Visual Design Studio**. Its status is **No saved design**, and its controls apply to the shared service-detail template rather than the Services listing page.

## Interpretation
These are two distinct editing scopes:
- **Services listing page:** content and its associated visual styling are managed together in the Services page draft.
- **Service detail pages:** appearance is managed separately through the shared service-detail design studio.

This explains why the Services page can have visual styling controls even though the Revision history selector has no `page-design.services` entry. The absence of that selector entry should not be interpreted as absence of Services page styling or as a reason to create a separate `page-design.services` record without further investigation.

## Evidence and limitations
- The screen content and editor labels above were supplied by the user from the Preview CMS.
- Earlier repository source inspection found the Services tab mapped to the `service-detail` design key, while the standalone design manager supports both `services` and `service-detail` keys.
- This report records the observed editor separation and the likely explanation. It does not claim an independent browser replay.
- No draft was saved, published, restored, or deleted. No database or application source was changed. Production remains untouched.

## Next check
Confirm whether the Services tab's own embedded styling panel is the intended page-level visual editor, and keep the separate service-detail studio scoped to service detail pages.