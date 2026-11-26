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


## Focused PR #2 security and data-integrity review — 26 November 2026

### Exact head and CI
- Reviewed branch head: `97fd5a7433d1b43e931c81e1c431b2b68335c30f`.
- Exact-head Preview workflow [#45744936516](https://github.com/yrproservice/yrproservice/actions/runs/45744936516) completed successfully. The workflow's single build job succeeded.
- PR #2 remains Open, Draft and unmerged; head is `cms-development`, base is `main`. GitHub currently reports 1,483 commits, 183 changed files, 33,411 additions and 1,768 deletions. GitHub's current `mergeable` field is false; treat mergeability as unresolved and do not merge.
- The PR description still contains an older 25 November checkpoint and must not be treated as the current head/status record.

### Files and behaviors inspected
- `functions/_utils/admin-auth.js` and `tests/admin-auth.test.js`: Cloudflare Access JWT RS256 signature, key ID, issuer, audience, expiry, not-before, fixed single-admin identity and fail-closed certificate retrieval; unsafe-method Origin/Fetch Metadata checks; read-only compatibility. Existing tests cover malformed/unsupported JWTs, wrong claims/key/signature/identity, missing or broadened admin configuration, cross-origin rejection, same-origin acceptance and GET compatibility.
- `functions/api/cms/admin/publish.js`: only current drafts can be published; entity ownership, content/schema, media references, team approval and route conflicts are validated; publish pointer and previous published state are updated through conditional D1 batch statements with audit confirmation.
- `functions/api/cms/admin/history.js`: revision restore validates entity ownership and archived content, route/destination conflicts and the expected draft snapshot; restore creates a new draft and does not directly publish the archived revision.
- `functions/api/cms/admin/media.js` and `tests/cms-media-api-sqlite.test.js`: upload checks byte signatures/type and size before R2 write; D1 registration and audit are batched; ambiguous batch outcomes retain the R2 object for reconciliation; archive checks references across saved page/product/setting revisions; metadata changes are concurrency-guarded and audited; orphan inspection is bounded/read-only.
- `functions/api/cms/public/pages.js` and `functions/api/cms/public/products.js`: public reads join through each entity's published-version pointer and require the selected version state to be `published`; drafts and archived revisions are not directly exposed by these handlers.
- `functions/api/cms/admin/settings.js` and `functions/_utils/cms-settings-validation.js`: setting keys are constrained to supported navigation/footer/page-design keys; links are restricted to safe internal routes; design values are type/range/enum checked.
- `.github/workflows/cms-preview-migration.yml`: migration target is the named Preview database and workflow verifies both the Preview database name and UUID before executing migrations. The workflow's dispatch guard restricts manual execution to `cms-development`.
- `wrangler.toml`: Preview has the CMS R2 binding and public base; Production still has no `CMS_MEDIA` binding or `CMS_MEDIA_PUBLIC_BASE`. This remains a Production CMS media launch blocker, not a finding that public static catalogue images are unavailable.

### Findings and limits
- No new exploitable defect was confirmed in this focused source review. This is not a complete independent security audit, full PR diff review, authenticated live acceptance test or Production readiness sign-off.
- No source code, D1/R2 data, bindings, secrets, Access settings, branch protection or Production deployment was changed.
- Remaining high-impact review areas include customer request submission/tracking and access-code endpoints, all migration/workflow paths, request status updates, CMS section recovery concurrency/retention, and broader UI-to-API authorization/data-flow coverage.
- Product image acquisition/assignment and product pricing/stock work remain explicitly excluded and user-owned.
- Keep PR #2 Open/Draft/unmerged and Production untouched pending the remaining review and explicit release approval.


## Customer request, tracking and email-access review — 26 November 2026

- Reviewed `functions/api/requests.js`, `functions/api/track.js`, `functions/api/customer/requests.js`, the customer access request-code/verify/logout handlers, `functions/_utils/customer-request-access.js`, `functions/api/admin/requests.js`, the Preview rate-limit migration workflow and the related customer-access tests.
- Public request submission validates request type, required fields, email format and service slugs; caps request-body and field sizes; and records rate-limit attempts through a single conditional INSERT statement. Per-email and per-IP hourly limits are 5 and 20 respectively when the client IP is available.
- Public tracking requires both reference and email, returns only request status/type/date, uses no-store response headers, and applies atomic per-IP/per-email attempt limits (30/10 per 15 minutes). It does not return customer message or contact details.
- Customer history requires a server-side session token stored as an HMAC, with an HttpOnly, Secure, SameSite=Strict cookie and an eight-hour expiry. Email verification checks are single-use and capped at five attempts per code; request-code creation has per-email/IP issuance limits and same-origin checks.
- Customer email-code access remains deliberately disabled until the private `CUSTOMER_REQUEST_MAILER` binding exists. The request-code handler fails closed before generating or storing a code when the mailer is absent. Existing customer history therefore must not be advertised as available.
- Admin request listing/status changes require Admin authentication. Status updates use a conditional status compare-and-swap and insert the corresponding audit history in the same D1 batch; the history endpoint returns bounded status history.
- The reviewed request-rate-limit migration workflow targets Preview D1 only and verifies the exact Preview database name/UUID before applying schema. No Production database target was found in that workflow.
- No confirmed exploitable defect was found in this focused review. Automated customer-access tests verify disabled-by-default behavior, cross-origin rejection, session requirement, unsupported methods and cookie clearing; they do not constitute an end-to-end mailer delivery or enabled customer-history acceptance test.
- Privacy note retained: public submission/tracking rate-limit tables use plain SHA-256 hashes of email/IP values; predictable values can be guessed offline. Customer email-access identifiers use keyed HMAC via the private secret. Consider keyed HMAC for public rate-limit identifiers as a privacy-hardening follow-up before broader rollout.
- No code, customer data, D1/R2 resources, bindings, secrets or Production configuration was changed. Product image work remains excluded and user-owned.
