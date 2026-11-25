# PR #2 technical review checkpoint — 25 November 2026

## PR #2 technical review checkpoint — 25 November 2026

### Current GitHub state
- PR #2 remains open, Draft and unmerged. GitHub currently reports `mergeable=true` / `mergeable_state=clean`.
- `cms-development` is 1,472 commits ahead of `main`, 0 behind; merge base is the current `main` head `0c86d03d3c479a511c48f33f1b9eedbfbd050cd6`.
- PR diff: 179 files, 32,731 additions, 1,768 deletions. This is a large review surface even though GitHub reports no merge conflict.
- Exact-head CI on `d80925c820a6a65b350c19ce8bbe9e2ce989671b` passed: [workflow #45579468776](https://github.com/yrproservice/yrproservice/actions/runs/45579468776).

### Read-only code review observations
- CMS admin handlers inspected for products, pages, history and publishing call `requireAdmin`; the authentication helper verifies Cloudflare Access JWT signature, issuer, audience, expiry and the single configured admin identity.
- CMS publishing uses conditional pointer updates and D1 batch statements; stale draft/published pointer checks and audit-write confirmation are present.
- CMS/recovery/customer-access/request-history/rate-limit migration workflows explicitly target `yr-proservice-test-db` and fail closed unless the database name and expected Preview UUID match. No Production migration target was found in the inspected workflows.
- Customer email-code access is intentionally unavailable until a private `CUSTOMER_REQUEST_MAILER` service binding is configured. The Track Request UI accurately disables this option and tells customers to use reference + email tracking. Do not present email-based “view all requests” as launch-ready until the mailer and required secret are configured and tested.
- Public request and tracking rate-limit records use plain SHA-256 hashes of email/IP values. This avoids storing the raw values but does not provide keyed pseudonymisation for predictable email addresses. Treat this as a privacy-hardening follow-up; do not claim these hashes are irreversible.
- The PR already contains two Cattani image assets and a catalogue media manifest from earlier work. This checkpoint made no product-image changes; further image acquisition/assignment remains excluded and user-owned.
- Both `main` and `cms-development` remain unprotected and no repository rulesets were found in the last settings check. Do not change branch protection/rulesets or merge/rewrite history without a separately approved governance plan.

### Scope and limitations
- This was a source-level review of high-impact authentication, publish, request access, public API and migration paths; it is not a full independent security audit or Production acceptance test.
- No code, D1/R2 data, bindings, secrets, Access configuration or Production deployment was changed in this review.
- PR #2 remains Draft/unmerged. Remaining release gates still include V10 visual sign-off, Preview/Production backup and restore evidence, Production configuration checks, branch protection, live CMS acceptance and review of the remaining UI/media paths.


## CMS media/editor review and Admin mutation-origin hardening — 25 November 2026

- Added central mutation-origin validation to `functions/_utils/admin-auth.js`. Unsafe Admin methods reject a supplied Origin that does not match the request origin; when Origin is absent, a browser Fetch Metadata value of `cross-site` is rejected. Same-origin browser requests pass. Read-only GET/HEAD/OPTIONS and server-to-server automation that omits browser-origin metadata remain compatible.
- Added Admin auth tests for cross-origin rejection, cross-site Fetch Metadata rejection, same-origin acceptance and read-only compatibility.
- Added `tests/cms-media-api-sqlite.test.js` with real SQLite and a fake R2 binding. It covers valid image upload plus D1/audit registration, invalid image rejection before storage, archive blocking when a saved page revision references the image, and reversible archive/restore while retaining the R2 object.
- Source review covered CMS media upload validation (JPEG/PNG/GIF/WebP; SVG rejected; 12 MB cap), metadata audit, reference detection across page/product/setting revisions, archive/restore, read-only paged orphan inspection, publishing media/route validation, visual editor draft save/publish and persistent section recovery.
- Media archive is deliberately non-destructive: the D1 record is marked archived and the R2 object is retained for restoration. The orphan report is read-only and inspects the `cms/` prefix in batches. No R2 object was deleted or changed during this work.
- Team publishing requires explicit approved image metadata; unapproved team photos are not rendered. Product-image acquisition/assignment remains user-owned and was not changed.
- Exact-head Preview CI [#45582266692](https://github.com/yrproservice/yrproservice/actions/runs/45582266692) passed for `773e36eb7430b48cd78e745eb5cc0c55cdb5e3cb`; all 24 workflow steps succeeded.
- Automated tests: 188 total, 185 passed, 0 failed, 3 intentionally skipped. Vite build and Cloudflare Pages Functions build passed; Preview D1 schema readiness, Preview deployment/assets and security/Access audit passed.
- Browser capture: 20 screenshots across 10 routes at desktop 1440px and mobile 390px. All route responses were HTTP 200; measured document widths matched viewport widths; all captured image requests loaded; no failed, missing-source or pending images were reported.
- Customer-flow audit: 4 passed, 0 failed. This audit uses intercepted customer POSTs and is not D1 persistence evidence; retain separate real browser-to-Preview-D1 verification [#45569677497](https://github.com/yrproservice/yrproservice/actions/runs/45569677497).
- This remains a focused source review plus automated verification, not a complete independent security audit. Assistant did not perform authenticated live CMS media upload/restore browser acceptance. User-confirmed Recovery Bin acceptance remains the live manual evidence for section recovery.
- No Production code, D1/R2 data, bindings, secrets, Cloudflare Access configuration or Production deployment was changed. PR #2 remains Draft/unmerged. Branch protection and repository rulesets remain absent and require a separate approved governance plan.
