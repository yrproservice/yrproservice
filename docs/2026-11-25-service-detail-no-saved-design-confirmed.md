# Service-detail Visual Design Studio status confirmation — 25 November 2026

## User-confirmed Preview observation
The user reopened **Service details · all services Visual Design Studio**. It displayed:
- **Design status: No saved design**
- **No design draft exists yet. Start with the current website appearance and save when ready.**

The studio description states that this design is stored separately from other pages and controls only the shared service-detail template. The controls include palette, typography, page layout, card appearance, and image fit.

## Conclusion
The editor's explicit status confirms that no service-detail design draft currently exists. This is consistent with `page-design.service-detail` being absent from the Site setting revision-history selector. No separate design history should be expected until a design draft has actually been saved.

The Services listing page remains a different scope: its content manager includes visual styling saved with the Services page draft. Do not conflate that with the shared service-detail template studio.

## Safeguards and limitations
- Evidence is the user-provided Preview screen; no independent browser replay is claimed.
- User did not click Save design draft, Publish to Preview, Delete Draft, or Reset controls.
- No database, source code, or deployment changes were made. Production remains untouched.

## Status
The service-detail revision-history availability check is complete. No design draft was created solely to populate revision history.