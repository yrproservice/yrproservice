# YR Proservice Production Release-Readiness Audit — 25 November 2026

Status: **Read-only audit in progress — no Production or Cloudflare changes performed**

Repository: `yrproservice/yrproservice`  
Branch reviewed: `cms-development`  
Reviewed head: `90bfbc6197482552f880593450895742ca935539`  
Pull request: [#2 — Build YR Proservice Visual CMS foundation](https://github.com/yrproservice/yrproservice/pull/2)

## 1. Safety boundary

This checkpoint is an inspection and release-planning record only.

- No Production deployment was initiated.
- No Production D1 query, write, migration, export, restore, or other database operation was initiated.
- No Cloudflare binding, bucket, Access policy, secret, DNS, or deployment configuration was changed.
- No PR merge, branch-history rewrite, force-push, branch-protection change, or ruleset change was performed.
- No product image was acquired, assigned, replaced, or published. Product images remain user-owned.
- Product prices and stock status remain user-managed.

## 2. Exact-head Preview verification

The documentation commit reviewed here is `90bfbc6197482552f880593450895742ca935539`.

Exact-head GitHub Actions run [#45582946265](https://github.com/yrproservice/yrproservice/actions/runs/45582946265) completed with conclusion **success**. Its single job completed all 24 steps successfully, including:

- Locked dependency installation and dependency audit.
- Automated tests.
- Vite website build and Cloudflare Pages Functions build.
- Preview D1 schema readiness.
- Preview deployment/assets verification.
- Preview security-header and Access-boundary audit.
- Read-only Preview Services content audit.
- Informational catalogue image audits (no product image acquisition or assignment).
- Desktop/mobile browser screenshots.
- Customer request journey audit and artifact uploads.

This is evidence for the exact Preview commit. It is not Production acceptance or authorization to release.

## 3. Confirmed Production media configuration gap

Read-only inspection of `wrangler.toml` at the reviewed head shows:

- `env.production` defines the existing Production D1 binding `DB` to `yr-proservice-db`.
- `env.preview` defines Preview D1 `yr-proservice-test-db`, the `CMS_MEDIA` R2 binding to `yrproservice-cms-preview`, and `CMS_MEDIA_PUBLIC_BASE`.
- `env.production` does **not** define a `CMS_MEDIA` R2 binding or `CMS_MEDIA_PUBLIC_BASE`.

The CMS media API at `functions/api/cms/admin/media.js` requires `env.CMS_MEDIA` for media uploads and R2 object operations. Its upload handler returns HTTP 503 when the R2 binding is absent. After a successful object write, it also requires `CMS_MEDIA_PUBLIC_BASE` to construct the public URL; without that value it removes the just-uploaded object and returns HTTP 503.

**Release consequence:** the Production CMS media-upload and R2-management workflow is not configured by the reviewed repository environment. Do not claim Production CMS media upload is launch-ready.

**Required future decision:** establish the intended Production bucket, public delivery URL, least-privilege binding and backup/recovery approach in a separately reviewed Cloudflare change plan. This audit did not create or configure any of them.

This finding does not imply that the existing public static product catalogue images are broken; those are separate from CMS-managed R2 uploads.

## 4. Production database schema and migration evidence

The reviewed CMS, customer-access and request-rate-limit migration workflows explicitly target `yr-proservice-test-db` and verify its expected Preview UUID before executing SQL.

No Production migration workflow was identified in the reviewed workflow set. The repository therefore does not provide evidence in this checkpoint that migrations `0002` through `0008` have been applied to the Production D1 database.

The Production D1 schema and migration state remain **unknown** because this was a repository-only inspection. Do not infer that Production is missing all tables, and do not infer that its schema is current.

**Required future gate:** obtain an explicitly approved, read-only Production schema and migration-state inspection, compare it against the application’s required schema, then prepare a separately reviewed migration sequence. No Production database command was run for this audit.

## 5. Customer request access scope

The reviewed PR documentation and application configuration state that email-code customer access remains disabled until the private `CUSTOMER_REQUEST_MAILER` service binding is configured and tested.

The active customer tracking route is reference number plus the email address used for the request. This distinction must remain clear in launch communications: do not advertise email-code access to a customer's full request history as available.

Configuring or testing a Production mailer is outside this read-only audit and requires a separate plan and approval.

## 6. Backup and recovery readiness

The repository's `docs/D1-R2-DISASTER-RECOVERY-PLAN.md` is explicitly a planning document, not proof of executed backups or a restore drill.

Still unverified at account level:

- Production D1 backup/Time Travel retention and an independently retained export.
- Production R2 bucket identity, backup/copy mechanism, and object/metadata integrity.
- A consistent D1 + R2 recovery point.
- A successful isolated D1 + R2 restore rehearsal.
- Approved RPO, RTO, retention, backup ownership, and recovery operators.

The Production CMS R2 bucket is not established by the reviewed `wrangler.toml`. Do not claim that Production media backup or restore is ready.

## 7. Governance and release scope

At the previous repository settings inspection, both `main` and `cms-development` were unprotected and no repository rulesets were configured. This checkpoint did not change governance settings. Recheck current settings before any release decision.

PR #2 remains Open, Draft and unmerged at the reviewed head. GitHub reports the branch is 1,478 commits ahead of `main` and 0 behind, with 181 changed files, 33,167 additions and 1,768 deletions. GitHub mergeability is not a substitute for review or release approval.

The large accumulated change set remains a material release-review risk. A controlled release strategy must be selected after the full diff/history and deployment dependencies have been reviewed; do not assume the entire PR should be merged as one production release.

## 8. Outstanding release gates

- [ ] Review remaining high-impact PR changes and history, including UI routes, customer requests, CMS settings, media and migration behavior.
- [ ] Perform authenticated live Preview CMS media upload/metadata/archive/restore acceptance with the user; automated tests and source review are not a substitute.
- [ ] Complete a supported-setting Revision History restore test in Preview, restoring to a draft only.
- [ ] Complete Preview D1 + R2 backup/restore and media-reference integrity evidence.
- [ ] Obtain V10 visual sign-off. The authoritative `YR-Proservice-Visual-Blueprint-V10-Verified-Images.zip` was not present in the connected Library during the previous search, so full comparison against that ZIP is not claimed.
- [ ] Perform approved read-only Production configuration and D1 schema inspection.
- [ ] Establish and verify a Production CMS R2 bucket/binding/public-base plan, independent backup and restore procedure.
- [ ] Prepare a Production migration plan and rollback/recovery runbook based on verified schema and backups.
- [ ] Decide and approve repository branch protection/required-check governance separately.
- [ ] Obtain explicit user approval for any Production deployment, Production database mutation, Cloudflare configuration change, or PR merge.

## 9. Current decision

**Production release is not yet ready to execute based on the evidence reviewed here.** The concrete repository-level blocker is the missing Production CMS R2 binding/public base. Other important Production facts—especially database schema, account backup settings, and actual bucket configuration—remain unverified rather than presumed absent.

Continue with read-only review and Preview acceptance. Do not deploy, migrate, write Production data, alter Cloudflare configuration, merge PR #2, or rewrite branch history without separate explicit approval.
