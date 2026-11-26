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


## Visual CMS section-recovery and retention review — 26 November 2026

- Reviewed `functions/api/cms/admin/section-recovery.js`, `src/utils/sectionRecovery.js`, `migrations/0005_page_section_recovery.sql`, `tests/cms-section-recovery-sqlite.test.js`, `tests/section-recovery.test.js` and `.github/workflows/cms-preview-recovery-retention.yml`.
- Section removal verifies the page's saved draft or published snapshot, checks that the section exists exactly once, rejects an already-active recovery entry, and uses a conditional D1 batch to persist the recovery payload and audit event together.
- Recovery entries are page-scoped, expire after 30 days, and are paged in bounded batches. Restore preparation checks that the entry remains active/unexpired and rejects a section ID already present in the saved page. Discard is conditional on the expected draft snapshot and active recovery entry.
- SQLite tests cover atomic persistence/audit rollback, duplicate active entries, intact section payload restoration, page ownership, and draft-concurrency behavior. Existing user-confirmed manual Recovery Bin tests remain separate acceptance evidence.
- The scheduled retention workflow verifies the exact Preview D1 name/UUID before clearing expired payloads. It never targets Production D1. Once this workflow is present on the repository's default branch, the schedule will run against the explicitly named Preview database; this is not a backup mechanism.
- No confirmed defect was found in this focused review. No Preview or Production data was changed and no retention job was dispatched.
- This review does not close the independent D1/R2 backup and restore rehearsal requirement.


## Migration and deployment workflow review — 26 November 2026

### Live PR state and CI boundary
- Re-read PR #2 metadata directly from GitHub. It remains Open, Draft and unmerged; current GitHub metadata reports `mergeable=true` (this is a mergeability indicator, not approval or authorization to merge).
- Current PR head is `c5fba6058a2d83e3b6d800e4a3bad11e712d2ed4` on `cms-development`; base is `main` at `0c86d03d3c479a511c48f33f1b9eedbfbd050cd6`. PR metadata reports 1,486 commits, 183 changed files, 33,462 additions and 1,768 deletions.
- Preview CI #2126 / run `45744936516` was independently checked and passed all substantive steps on the earlier commit `97fd5a7433d1b43e931c81e1c431b2b68335c30f`. It is not exact-head evidence for the current documentation commit `c5fba60`.
- The current technical-review document includes the `c5fba60` section-recovery review. The separate workflow run reference `139663693341` could not be resolved by the available GitHub job lookup, and the combined commit-status endpoint returned no legacy status entries for `c5fba60`; do not claim this current head has passed CI until its exact-head run is independently confirmed.

### Workflows inspected
- `.github/workflows/cms-preview-migration.yml`
- `.github/workflows/request-history-preview-migration.yml`
- `.github/workflows/customer-request-access-preview-migration.yml`
- `.github/workflows/request-rate-limit-preview-migration.yml`
- `.github/workflows/request-history-preview-schema-check.yml`
- `.github/workflows/cms-preview-recovery-retention.yml`
- `.github/workflows/cms-build-check.yml`
- `.github/workflows/worker-preview.yml`
- `.github/workflows/preview-request-persistence-integration.yml`

### Migration safety observations
- CMS migrations 0002/0003/0005, request-history migration 0004, customer-access migrations 0006/0007, and request-rate-limit migration 0008 all use the explicit Preview D1 database name `yr-proservice-test-db`; the write workflows verify the expected Preview database UUID `7fca4ad0-3baa-4148-ad28-bfd2ef416c16` before SQL execution.
- Push triggers are scoped to `cms-development` and their corresponding migration-file paths. Manual dispatch jobs are guarded to `refs/heads/cms-development`. Migration steps use the Preview D1 API token and account ID secrets; no Production D1 name or Production migration target was found in the inspected workflows.
- Table/index creation uses `IF NOT EXISTS`. The non-idempotent column additions in migrations 0003 and 0007 are preceded by schema checks: 0003 refuses a partially migrated title/route state and only applies the ALTER when both columns are absent; 0007 checks for the email column and skips the ALTER if it is already present.
- Migration jobs use separate concurrency groups by migration family. The current migrations create separate schema areas; no conflicting operation was confirmed. There is no single global lock serializing every migration family.
- Identity checks recursively collect string values from Wrangler's JSON output and check for the expected name and UUID. This is a fail-closed guard in normal output, but a stricter check against the exact documented JSON fields would reduce the chance of an unrelated matching string satisfying the guard. Treat this as defense-in-depth, not a confirmed bypass.
- The request-history schema-check workflow performs SELECT/schema inspection only; it does not apply migrations or write customer data.
- The manual Preview request-persistence workflow verifies the exact Preview D1 name/UUID and required tables before synthetic submissions; the test script is responsible for verification and cleanup. This review did not dispatch it.

### Retention and deployment observations
- The recovery-retention workflow verifies the Preview D1 name/UUID, then clears expired recovery payload JSON and marks expired active entries discarded. Scheduled execution is enabled only when the workflow exists on the default branch; manual dispatch is restricted to `cms-development`. This is expected 30-day retention cleanup, not a backup. It does not perform a D1/R2 backup or restore rehearsal, and no retention run was dispatched.
- `cms-build-check.yml` runs on pushes to `cms-development`; manual dispatch is branch-guarded. It performs a read-only Preview D1 schema query and, when a Pages token is configured, deploys explicitly with `--branch=cms-development`. Its fallback compares the deployed Preview HTML asset references against the current build. No Production Pages deployment command was found.
- The Preview D1 schema query inside `cms-build-check.yml` is read-only but does not independently repeat the database UUID preflight used by the migration workflows. Adding that check would improve defense-in-depth; no write or Production target is involved in this step.
- `worker-preview.yml` triggers on pushes to `production-release`, but its command is `wrangler preview --config wrangler.worker-preview.toml`, not `wrangler deploy`. The referenced config contains an assets directory and an empty `[previews]` block, with no D1/R2 bindings or Production environment block. Cloudflare documents `wrangler preview` as creating/updating a Worker Preview and `wrangler deploy` as the Production deployment command (https://developers.cloudflare.com/workers/wrangler/commands/workers/ and https://developers.cloudflare.com/workers/previews/). The workflow is therefore a Preview operation by source inspection. Dashboard-managed Preview base settings and the actual scope of the generic `CLOUDFLARE_API_TOKEN` secret are not visible in Git and were not independently inspected.
- `preview-request-persistence-integration.yml` is manually dispatched only and its job permits `cms-development` or the isolated test branch; it uses the fixed Preview D1 identity and Preview URL. No Production endpoint or D1 name is used in the workflow.

### Findings and limits
- No confirmed accidental Production access, Production D1 migration target, Production Pages deployment command, or Production Worker deployment command was found in the nine inspected workflow files.
- Follow-ups: validate Wrangler D1 identity using exact JSON fields; add the same read-only UUID preflight to the CMS build schema check; consider a shared migration concurrency group if future migrations become dependent; and independently inspect Cloudflare dashboard Preview base settings/token scopes before relying on Worker Preview resource isolation.
- This was a source-level review of the repository workflows and migration SQL, not a live Cloudflare account audit. It does not prove actual secret scopes, dashboard settings, or Production resource state.
- No workflow was dispatched, no Preview or Production data was changed, no Cloudflare configuration or secret was changed, no code was modified, and no Production deployment or PR merge was performed. Product-image acquisition/assignment remains excluded and user-owned.
- PR #2 remains Open and Draft. Despite GitHub currently reporting `mergeable=true`, do not merge or deploy Production without completion of the remaining review/release gates and separate explicit approval.


## UI-to-API authorization and data-flow review — 26 November 2026

### Verified PR state for this checkpoint
- Re-read PR #2 metadata before continuing. It remains Open, Draft and unmerged. At the start of this review the head was `b3dd553162ecc4686096d4c2e9b8103718c8fc1e`; after the focused UI/API fix below, the head is `6f635932aca107195b651f2fc48f9a096eea6d56`.
- GitHub reports `mergeable=false` at the post-fix check. Treat mergeability as unresolved; no merge was attempted.
- The PR description contains an older project checkpoint and is not authoritative for the live head. The PR metadata and branch file reads were used for this review.

### Confirmed UI/API contract defect and correction
- Compared `src/pages/PageVisualDesignManager.jsx` with `functions/api/cms/admin/settings.js`.
- The settings API requires both `expectedDraftId` and `expectedDraftCreatedAt` on every settings save, including an explicit `null` when no draft exists. The visual design manager sent the draft ID but omitted the timestamp.
- Result: saving a visual design draft through that manager was rejected by the server with HTTP 409 before it could create the draft. This was a confirmed client/server contract mismatch, not an authentication bypass or data-loss defect.
- Corrected the request payload to include `expectedDraftCreatedAt: draftCreatedAt || null`. The manager already loads and maintains this timestamp, and refreshes it after a successful save.
- Fix commit: `6f635932aca107195b651f2fc48f9a096eea6d56` (`fix(cms): include design draft timestamp on save`). The updated file was fetched again from `cms-development` and the exact payload was verified.
- The parallel settings-save flow in `src/pages/CMSManagement.jsx` already supplies both expected draft ID and timestamp; product saves and revision publish/restore flows also include their expected snapshot fields.

### Authorization and data-flow checks performed
- Reviewed the shared Admin authentication helper and the CMS settings, products, pages, draft, publish, history, Preview, request-list, request-history, public request-submission and public tracking handlers alongside their principal UI callers.
- Each inspected Admin API handler calls `requireAdmin`; that helper validates the Cloudflare Access JWT signature, issuer, audience, expiry and the single configured authorized email. Unsafe Admin methods also use same-origin Origin validation and reject cross-site Fetch Metadata when Origin is absent.
- CMS publish handlers independently verify that the selected revision belongs to the selected entity, is the current saved draft, and matches the expected draft timestamp. They revalidate content, route/destination and media references server-side before a guarded D1 batch updates the published pointer and audit log.
- CMS save/restore/delete handlers use parameterized SQL and expected-draft snapshots to detect stale concurrent edits. Public CMS read endpoints are separate from the Admin endpoints.
- Admin request listing and history are authenticated. Request filters and cursors are validated, SQL values are bound, status updates use an allowlist and write a status-history record in the same D1 batch.
- Public request submission validates request type, required fields, service slug and email, limits body size, and applies database-backed rate limits. Public tracking requires both reference and email, returns only request status metadata, and applies a separate rate limit.
- No confirmed authorization bypass, unauthenticated customer-data read, SQL injection path, or cross-entity revision operation was identified in these inspected paths. This is a focused source review, not a full penetration test or live browser/API acceptance run.

### Verification boundary and remaining work
- The visual-design payload correction is committed, but the combined commit-status and PR-workflow-run lookups returned no CI records for exact head `6f635932aca107195b651f2fc48f9a096eea6d56`. Do not treat the fix as CI-verified until an exact-head workflow is independently confirmed.
- The review did not authenticate to Preview, submit live customer data, write to D1/R2, inspect Cloudflare dashboard settings or secret scopes, or touch Production.
- Follow-up review can continue across remaining UI callers and endpoint pairs, especially CMS media/recovery and customer-access flows; then exact-head CI and release gates must be checked separately.
- Product-image sourcing, acquisition, replacement and assignment remain excluded and user-owned. PR #2 remains Open/Draft/unmerged; no Production deployment or merge was performed.


## CMS media and customer request-access flow review — 26 November 2026

- Continued the source review across `functions/api/cms/admin/media.js`, `functions/api/cms/admin/section-recovery.js`, customer email-code/session handlers, `functions/_utils/customer-request-access.js`, and the customer request-history endpoint.
- Media upload is Admin-authenticated, capped at 12 MiB, validates image bytes against JPEG/PNG/GIF/WebP signatures and dimensions, rejects SVG/unknown formats and mismatched declared MIME types, and writes an R2 object plus D1 media/audit rows. If the D1 batch outcome is ambiguous, the R2 object is deliberately retained for reconciliation rather than risking a broken committed row.
- Media archive checks references across all saved page/product/site-setting revisions, repeats the reference guard in the conditional D1 update, records an audit event, and keeps the R2 object for reversible restore. Restore verifies the R2 object still exists before unarchiving. No confirmed archive/delete race or unauthorized media operation was identified in the inspected code.
- Customer email-code access is fail-closed when the private mailer binding or DB is unavailable. It requires a same-origin POST, uses HMAC-derived email/code/IP values, limits code issuance, expires codes after ten minutes, limits verification attempts, consumes a code conditionally, and creates a random eight-hour session token stored only as an HMAC in D1. The cookie is HttpOnly, Secure, SameSite=Strict and scoped to `/api/customer`.
- Customer request history requires the server-side session and queries only rows matching the verified email. The response is bounded to 100 records and omits internal staff history/notes. Logout removes the matching session token hash and clears the cookie.
- No confirmed authorization bypass, cross-customer data disclosure, unsafe R2 deletion, or customer-session weakness was identified in this focused source review. This is not a live penetration test and does not verify Cloudflare bindings/secrets or mailer configuration.
- The customer email-code path remains unavailable until the private mailer binding is configured; the existing reference-plus-email tracking flow remains the active customer tracking method. This is a known capability boundary, not a newly discovered defect.
- No live customer code was requested, no email sent, no customer record queried, no D1/R2 data changed, and no Production or Cloudflare configuration was touched. Product-image acquisition/assignment remains excluded and user-owned.


## Section recovery and customer tracking UI/API review — 26 November 2026

- Reviewed the section-recovery API and its visual-editor caller, public request submission and tracking handlers, and the Track Request page caller.
- Section recovery requires Admin authentication, validates page/draft snapshots, bounds payload size and original section index, prevents duplicate active recovery entries, binds SQL values, checks page ownership and current draft/published version, and writes recovery/audit records in D1 batches. Restore preparation checks that the section is not already present; discard is conditional on the current draft snapshot and active unexpired entry. No confirmed cross-page recovery operation or unauthenticated recovery path was identified.
- Public request submission validates request type and required fields, allowlists service slugs, limits payload size, uses parameterized SQL and a single-statement rate-limit insert to reduce concurrent limit bypass. Public tracking requires both a request reference and matching email, returns only reference/type/status/submission date, applies IP/email rate limits, and uses no-store response headers.
- Frontend Track Request uses `GET /api/track?reference=...&email=...`. This places the customer's email address in the request URL, which may be retained in browser/network/proxy logs. This is a privacy-hardening follow-up rather than a confirmed cross-customer disclosure: the endpoint still requires the matching reference and returns limited status metadata. Recommended before launch: move tracking lookup to a same-origin POST with a bounded JSON body so email is not carried in the URL, then update the UI caller and add focused tests. No change was made in this checkpoint to avoid an untested API contract change.
- The current PR head `a85a101bef18d2199f63dba47942fced5af977fa` was checked for combined commit statuses and PR workflow runs; both lookups returned empty arrays. Exact-head CI therefore remains unverified, and no earlier workflow result is being treated as proof for this head.
- PR #2 was re-read before this checkpoint and remains Open, Draft and unmerged. No Production deployment, merge, live request submission, D1/R2 write, or product-image work was performed.

## Request-tracking privacy fix — 26 November 2026

- Changed the public `/api/track` lookup from GET query parameters to same-origin POST with a bounded JSON body. The customer email and request reference are no longer placed in the request URL.
- Updated `src/pages/TrackRequest.jsx` to submit the lookup as JSON via POST.
- The endpoint now requires JSON, caps the body at 8 KiB (checking both declared and actual byte length), rejects malformed/non-object payloads, rejects mismatched Origin and cross-site Fetch Metadata, retains the existing reference + matching-email check, rate limiting, minimal response fields and no-store/referrer protections.
- Updated `tests/api-request-flows.test.js` for POST tracking and added focused checks for wrong content type, malformed JSON, cross-origin/cross-site rejection and oversized bodies. The test suite has not yet been executed in this environment; exact-head CI must be checked before claiming these tests pass.
- Implementation commits: `6b68867` (endpoint), `33f295f` (frontend), `5ee6be0` (tests).
- No customer records, Preview/Production databases, R2 objects, Cloudflare settings or deployments were changed. PR #2 remains Open/Draft/unmerged. Product-image work remains excluded.

## Exact-head Preview verification and release gaps — 26 November 2026

- Workflow `45755724485` completed successfully for exact commit `22386ed3dbbea20fcf537be338a98d2d73df304a`: https://github.com/yrproservice/yrproservice/actions/runs/45755724485
- Confirmed passing stages: locked dependency install, high-severity dependency audit, automated tests, Vite build, Cloudflare Pages Functions build, Preview D1 schema readiness, Preview deployment/build-asset verification, Preview security/Access audit, desktop/mobile screenshot capture and customer request journey audit.
- Customer-flow artifact reports 4/4 passed: product cart to quotation; separate dental-chair request; service request validation/submission; HR-only contact. Submission requests were intercepted; no test request was written to Preview D1.
- Read-only Services content artifact reports `no-published-services-page` and `fallbackExpected: true`. The fallback behavior is expected by the audit; this does not establish that the final Services copy/CTA has been reconciled and approved.
- Backup/recovery review: repository workflows/scripts contain Preview migrations, schema checks and CMS recovery-bin retention, but no D1/R2 backup-and-restore rehearsal workflow or script was found. This remains an operational release-readiness gap; do not treat the CMS recovery bin as a database/media backup.
- Production CMS R2 binding/public URL configuration remains outstanding. No Cloudflare Production configuration or resource was changed.
- Product image acquisition/assignment remains explicitly excluded and user-owned.
- PR #2 remains Open/Draft/unmerged. No Production deployment, PR merge, or customer data write was performed during this verification.


## Customer tracking copy correction and Services CTA review — 26 November 2026

- Commit `c6e7fd5d6576fa4b78e877d1012070d87bfd6cb1` updated the Request Tracking introduction to explain that customers can check one request using its reference and submission email; email-based history is not enabled.
- Commit `18c0c3c6294024cc8453319e8ae8177dc51bb5b4` removed the inactive email-history email field and disabled Continue button, replacing them with a clear availability notice. The active reference-based lookup remains available.
- Exact-head Preview workflow #2141 for `18c0c3c6294024cc8453319e8ae8177dc51bb5b4` was still in progress at the time of this note: https://github.com/yrproservice/yrproservice/actions/runs/45757923664. Do not treat the changes as CI-passed until that run completes successfully.
- Read-only Services review confirmed the five-section CMS template, all eight established service entries, and the primary CTA labels “Request a Service” and “Contact Us”. The Contact Us CTA routes to `/quote`, preserving `/contact` for HR-only enquiries. Existing `tests/services-template.test.js` explicitly covers the CTA destination and legacy `/contact` normalization.
- No additional Services code change was needed. No Production deployment/configuration, customer submission, database write, R2 change, PR merge, or product-image work was performed.


## Service request confirmation wording correction — 26 November 2026

- Source review of `functions/api/requests.js` confirmed that successful public submissions are inserted into the Preview/Production-bound D1 database and return a reference; this handler does not send an email or otherwise notify staff.
- Updated `src/pages/ServiceRequest.jsx` so the success page says the request has been saved and instructs the customer to keep the reference to check its status. Removed the inaccurate statement that it had also been sent to YR Proservice.
- Implementation commit: `1698175095ca7db3d7add9a25ddfd33f4cde434f`. The subsequent documentation commit `e909b16eb838294aae2196587517b100b956b096` includes this code and passed Preview workflow #2144 (`45758661568`): https://github.com/yrproservice/yrproservice/actions/runs/45758661568. The workflow completed the automated tests, dependency audit, Vite and Pages Functions builds, Preview D1 readiness, Preview deployment verification, security/Access checks and customer-flow audit.
- No customer submission, database write, R2 change, Cloudflare configuration, Production deployment, PR merge, or product-image work was performed.


## Quotation and dental-chair confirmation copy review — 26 November 2026

- Read-only review of `src/pages/Quote.jsx` and `src/pages/DentalChairRequest.jsx` confirmed both success pages accurately state that the request has been saved and tell customers to retain the reference; neither claims that an email or staff notification was sent. No copy change was needed.
- Rechecked `src/pages/TrackRequest.jsx`: the active reference-plus-email lookup uses same-origin POST with a JSON body; the unavailable email-history feature is explicitly labelled unavailable.
- Rechecked `wrangler.toml`: Preview has its D1, R2 and public media-base configuration. Production currently has its D1 binding but no CMS R2 bucket binding or public media-base variable. This remains an operational Cloudflare configuration task requiring explicit Production approval; no config was changed.
- No customer submissions, D1/R2 writes, Cloudflare changes, Production deployment, PR merge or product-image work were performed.
