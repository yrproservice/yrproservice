# Preview CMS runtime and recovery audit — 24 November 2026

**Repository:** `yrproservice/yrproservice`  
**Branch:** `cms-development`  
**Audited branch head:** `479a900b33e69c7f6f8b1f39a6d486e71b48c24d`  
**Preview:** https://cms-development.yrproservice.pages.dev  
**Production:** not accessed or changed  
**Product-image scope:** no image sourcing, acquisition, processing, replacement, assignment or publication

## 1. Repository and CI state

- The live `cms-development` branch was confirmed at `479a900b33e69c7f6f8b1f39a6d486e71b48c24d`.
- PR #2 remains Open, Draft and unmerged. GitHub reports it as mergeable; that is not release approval.
- Exact-head browser workflow #45355842812 completed successfully on application commit `443921cdfc2fdc09abfd6da7a8c638a62166fb11`.
- The workflow job completed dependency installation/audit, automated tests, Vite build, Pages Functions build, Preview D1 readiness, Preview deployment/asset verification, security-header/Access boundary audit, Playwright installation, desktop/mobile screenshots and customer-flow audit.
- The later branch commits `8c81f0de` and `479a900b` are documentation-only. The verified application code at `443921cd` is the application code present at this audited branch head.
- Customer-flow audit: 4 passed, 0 failed. The tested flows were Product Cart to quotation, separate dental chair request, service request validation/submission, and HR-only Contact. The request POST was intercepted; no test request was written to Preview D1.
- Screenshot and audit artifacts for run #45355842812 were confirmed present and not expired at this audit. They have a stated expiry of 1 December 2026.
- The browser screenshots are not a full V10 visual comparison. Only the previously documented desktop spot-checks are claimed.

## 2. CMS source inspection

The following current-branch files were inspected:

- `src/pages/AdminEntry.jsx`
- `src/pages/CMSManagement.jsx`
- `src/pages/CMSDashboard.jsx`
- `functions/api/cms/admin/pages.js`
- `functions/api/cms/admin/preview.js`
- `functions/api/cms/admin/publish.js`
- `functions/api/cms/admin/history.js`
- `functions/api/cms/admin/draft.js`
- `functions/api/cms/admin/section-recovery.js`
- `functions/api/cms/admin/media.js`
- `tests/api-admin-workflows.test.js`
- `tests/cms-section-recovery-sqlite.test.js`
- `tests/section-recovery.test.js`
- `tests/admin-auth.test.js`

### Authentication entry

- `AdminEntry.jsx` checks `POST /api/admin/session`.
- If the session check is redirected or fails without an HTTP response status, the page navigates to `/api/admin/session?access_return=1` to enter the Cloudflare Access flow.
- Administrative API handlers inspected call `requireAdmin(context)` before protected reads or writes.
- This is source inspection. It is not evidence that the live Preview Access challenge and authenticated browser session have been exercised in this audit.

### Visual editor wiring

- `CMSDashboard.jsx` uses the authenticated page, preview, publish and section-recovery endpoints.
- The visible controls distinguish saving a Preview draft, restoring the last saved editor snapshot, previewing a saved draft and publishing to Preview.
- The editor explicitly warns that publishing is to the isolated Preview environment and does not change Production.
- `CMSManagement.jsx` currently declares and uses the same uppercase constant `VISUAL_DESIGN_KEYS_BY_TAB`. No stale lowercase `visualDesignKeysByTab` reference was found in the current file. This source check addresses the earlier reported identifier mismatch, but it does not replace opening and exercising the live CMS.

### Existing backend safeguards and test coverage

The existing tests include:

- New and updated page/product draft creation.
- Draft concurrency conflicts and stale-snapshot rejection.
- Rollback when an audit-log write fails.
- Publish compare-and-swap conflicts.
- Rejection of archived revisions and revisions belonging to another item.
- Idempotent handling of an already-published revision.
- Preview selection of the latest draft and safe fallback to the published revision.
- Page, product and settings revision restoration as a new draft, without silently publishing the restored content.
- Media restore requiring the original R2 object to exist.
- Media archive blocked while a saved revision references the image.
- Media archive retaining the original R2 object for recovery.
- Media reference races and audit-write rollback.
- Section recovery persistence, restore validation, concurrency checks and audit rollback.
- Preview section-recovery expiry and retention behaviour.
- Cloudflare Access JWT validation cases in the admin-auth test suite.

These are repository test-coverage findings. They do not establish that every workflow has been exercised against the live Preview D1/R2 services.

## 3. Preview resource configuration

Current `wrangler.toml` declares:

| Resource | Preview configuration |
|---|---|
| D1 binding | `DB` |
| D1 database | `yr-proservice-test-db` |
| D1 database ID | `7fca4ad0-3baa-4148-ad28-bfd2ef416c16` |
| R2 binding | `CMS_MEDIA` |
| R2 bucket | `yrproservice-cms-preview` |
| Public media base | Preview R2 public URL configured in Preview variables |

Production has a separate D1 declaration. The inspected configuration does not declare a Production `CMS_MEDIA` R2 binding or Production public media base. Do not copy the Preview bucket or URL into Production configuration.

## 4. Full backup gap

A repository workflow-tree review found no dedicated full D1 backup/export workflow and no full R2 bucket backup workflow.

The existing `cms-preview-recovery-retention.yml` workflow is not a database backup. It purges expired page-section recovery payloads from Preview D1 after checking the target database identity. The section-recovery feature's 30-day retention is not a full D1 backup or an R2 backup.

Cloudflare documents D1 export through Wrangler:

```bash
npx wrangler@4.157.0 d1 export yr-proservice-test-db --remote --output=preview-d1-backup.sql
```

Reference: https://developers.cloudflare.com/d1/wrangler-commands/

For bulk R2 object backup, Cloudflare documents S3-compatible tooling such as rclone or AWS CLI. That requires R2 S3 API credentials scoped to the intended Preview bucket; a bucket name or public URL is not sufficient backup access.

Reference: https://developers.cloudflare.com/r2/get-started/cli/

No backup or restore command was executed during this audit. No D1 or R2 objects were changed. A durable backup destination, credential availability, retention policy, integrity manifest and isolated restore target must be confirmed before implementing or running a backup workflow. A short-lived GitHub Actions artifact alone must not be described as a durable backup.

## 5. Runtime verification status

**Not yet verified against live authenticated Preview:**

- Cloudflare Access challenge and successful admin session.
- Open the live Visual Website Editor.
- Save a new test draft.
- Reload and confirm the saved draft persists.
- Preview the saved draft.
- Publish a controlled test change to Preview.
- Verify the public Preview route shows the published version.
- Restore a prior revision as a new draft and verify the published pointer remains unchanged until republished.
- Delete an unpublished test draft.
- Exercise section removal and recovery.
- Exercise media upload/archive/restore using only an explicitly approved non-product test asset.
- Confirm D1/R2 recovery and integrity against an isolated restore target.

The available GitHub connection can inspect source and workflow evidence but does not provide the authenticated Cloudflare Access browser session. The available web retrieval did not open the protected Preview admin routes. No credentials were requested or exposed, and no protected write operation was attempted.

## 6. Safety decisions

- Continue only on `cms-development` and Preview for this stage.
- Do not merge PR #2 or deploy to Production.
- Do not change Production bindings, D1, R2, secrets or data.
- Do not source, acquire, process, replace, assign or publish product images.
- Keep customer-request tests intercepted; do not create fake customer requests in Preview D1.
- Use dedicated temporary test records and a documented cleanup/rollback plan for future authenticated CMS tests.
- Before any restore, verify the exact Preview resource identity and preserve a separate backup of the current state.
- Never infer successful live CMS behaviour from unit tests or source inspection.

## 7. Next actions

1. Obtain an authenticated Preview admin session for live CMS workflow verification without sharing passwords or Access tokens in chat.
2. Run the CMS save/preview/publish/restore/delete tests against a dedicated, reversible Preview test record.
3. Design a Preview-only D1 export and R2 bulk-backup workflow with bucket-scoped credentials, integrity hashes and a defined retention destination.
4. Restore backups into an isolated target and verify table counts, schema, object keys, object sizes and checksums before considering recovery verified.
5. Continue security, accessibility, performance and full V10 visual review.
6. Keep PR #2 Draft/unmerged and Production untouched until all release gates and approval requirements are satisfied.
