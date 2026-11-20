# YR Proservice CMS — Limit-Safe Recovery Checkpoint

**Checkpoint date:** 20 November 2026  
**Repository:** `yrproservice/yrproservice`  
**Working branch:** `cms-development`  
**Pull request:** [#2](https://github.com/yrproservice/yrproservice/pull/2)  
**Production:** not deployed or modified by this continuation  
**Image processing:** explicitly prohibited

## Authorization

The user has explicitly authorized independent development, commits and pushes to `cms-development`, tests, browser checks, screenshots, Preview deployments, necessary database/destructive operations with safeguards, PR #2 merge, and Production migration/deployment when release gates are satisfied. This authorization supersedes older documentation statements that merge or Production deployment were not authorized.

Image processing remains excluded: do not convert, manipulate, optimize, resize, transform, or otherwise process repository/catalogue image assets. Screenshot capture is authorized and is not permission to process source images.

## Latest inspected repository state

- PR #2 is Open, Draft, and not merged.
- PR head at inspection: `74cd15f0bc0f931c295279ec70291fe8b70602b7`.
- PR base: `main`.
- GitHub reports the PR as mergeable, but this is not a safety or release-readiness determination.
- Live comparison reports `cms-development` 1,182 commits ahead of `main`, 0 behind, and 98 changed files. The unusually large history/diff requires careful review before merge.
- No PR review threads or submitted reviews were returned by the review-list checks.
- The latest workflow result documented in the release-readiness record is run [#44676226791](https://github.com/yrproservice/yrproservice/actions/runs/44676226791), successful on commit `1b2221f1a16caf75cff7e9a5dd66897f24ef2dc4`. It completed 77 automated tests, Vite build, Pages Functions build, Preview D1 readiness, Preview asset verification, six desktop viewport screenshots, and artifact upload.
- The PR head has since advanced to the documentation checkpoint above. The successful run is therefore evidence for commit `1b2221f...`, not proof that the later head has its own exact-head workflow result.
- Screenshot artifact: `cms-preview-screenshots-1b2221f1a16caf75cff7e9a5dd66897f24ef2dc4`; 1,633,647 bytes; six routes; expires 27 November 2026. Access it from the Actions run's Artifacts section.
- Image assets were not processed.

## Environment separation

- Preview site: https://cms-development.yrproservice.pages.dev
- Preview D1: `yr-pro-service-test-db` / `yr-proservice-test-db`, ID `7fca4ad0-3baa-4148-ad28-bfd2ef416c16` (verify exact binding identity before any write).
- Preview R2: `yrproservice-cms-preview`.
- Production site: https://yrproservice.pages.dev
- Production D1: `yr-proservice-db`, ID `9bf690db-a74b-43e9-8c38-cc8bab18a9f1`.
- Production R2 bucket name/binding is not confirmed.
- Preview request-history migration/schema verification has previously passed. Do not rerun migrations without a demonstrated need.
- A prior Cloudflare Access confirmation covered `production-release.yrproservice.pages.dev`; it does not prove Access coverage for the actual Production hostname `yrproservice.pages.dev`.

## Outstanding release gates

1. Review the complete PR history and all 98 changed files; the 1,182-commit delta must be understood before merging.
2. Verify authenticated Preview runtime workflows, including CMS save, preview, publish, restore, draft deletion, media protection, request lifecycle history, admin authorization and session behaviour.
3. Verify Production D1 schema/migration requirements and environment binding identities. No Production migration until target, impact, backup and recovery are confirmed.
4. Confirm Production D1 backup/PITR retention and a tested restore procedure.
5. Confirm Production R2 bucket, `CMS_MEDIA` binding, public media base URL and required secrets. Do not invent bucket names or bindings.
6. Verify Cloudflare Access coverage for the actual Production hostname and all intended admin hostnames.
7. Confirm the repository's `main` branch protection and required checks. The latest audit record reported branch protection disabled and no rulesets.
8. Complete performance, accessibility, security and Preview/Production isolation checks.
9. Resolve or explicitly accept catalogue/content gaps without inventing product specifications, prices, stock, HR email destinations or staff information.
10. Review the known admin limitation: Cloudflare Access JWT/allowlist is used, but a server-side single-device session lock/revocation registry is not implemented.

## Limit-safe execution rules

- Work in small, independently verifiable batches.
- Prefer one focused tool operation or a small parallel read-only group at a time.
- Save a checkpoint after meaningful work; commit coherent verified changes regularly.
- Record branch, commit SHA, files changed, commands/tests run, outcomes, remaining tasks and risks.
- On failure, preserve successful work and retry only the failed operation when safe.
- Do not repeat successful migrations, deployments, tests or uploads unnecessarily.
- Before any destructive Production operation, verify the exact target, inspect impact, and confirm backup/restore readiness.
- Do not merge or deploy merely because GitHub reports mergeable or a build is green.
- Do not claim exact-head verification unless the workflow run is for that exact commit.
- If interrupted, resume from this checkpoint and the latest GitHub state rather than restarting.

## Next recommended action

Continue the full PR/source review in small groups, starting with security-sensitive API/authentication and database/migration changes. Keep all writes on `cms-development` until the Production gates above are independently verified.

## Security and data-integrity review — 20 November 2026

Reviewed all 17 changed API route files listed in PR #2, with focused source inspection of admin authentication/session, CMS draft save/delete, revision history/restore, publish, media upload/archive/restore, request submission, request tracking, request status administration/history, public CMS reads, and the three CMS migrations.

Findings confirmed from source:
- All inspected admin API handlers call `requireAdmin(context)` before accessing protected CMS/customer data or mutating it.
- Cloudflare Access JWT verification checks RS256, `kid`, issuer, audience, expiry, optional not-before, signature against the Access cert endpoint, and the single allowlisted admin email. It fails closed if Access configuration or the exact allowlist is missing.
- The current "session" API does not implement a server-side session registry or single-device lock. POST/PATCH are authenticated acknowledgements; DELETE returns a clearing cookie, while protected APIs still authenticate the Access JWT. Do not describe this as a revocable application session.
- CMS draft save/delete, restore and publish use revision ownership checks, draft-state checks, conditional writes, D1 batches, and audit records. Publish requires a current draft and expected creation timestamp. Restore creates a new draft from a selected revision.
- Media uploads accept only recognized JPEG/PNG/GIF/WebP signatures, validate declared MIME agreement, enforce a 12 MiB file limit, and inspect dimensions as metadata. No image transformation/conversion/optimization was performed. Media archive checks references across all saved revisions and retains the R2 object for recovery; this is soft-archive, not physical deletion.
- Request status updates validate allowed statuses and use a conditional status update plus lifecycle-history insert. The history endpoint is authenticated and paginated.
- Public CMS endpoints expose published page/product/settings data only. Setting publishing is restricted by an explicit settings-key/field validator; arbitrary setting keys are rejected.
- Migration 0004 adds a separate history table with allowed-status checks, non-identical previous/new status constraint, foreign key `ON DELETE RESTRICT`, and supporting indexes.

Items requiring runtime/operational verification, not inferred from source:
- Confirm D1 batch transaction/changes() sequencing against the deployed Cloudflare D1 runtime using the current exact branch head.
- Exercise concurrent draft save/publish/restore/delete and request status updates against Preview.
- Confirm the request-history migration is applied to Preview and separately determine Production migration readiness.
- Confirm media upload, archive, restore and usage checks against the Preview R2 bucket; do not process image contents beyond existing signature/dimension metadata inspection.
- Confirm Access policy coverage for the actual Preview and Production hostnames.
- The current exact branch head does not yet have a confirmed workflow result from the workflow-run connector; the prior successful 77-test run is for commit `1b2221f1a16caf75cff7e9a5dd66897f24ef2dc4` only.

No code change was made during this review because the inspected source did not establish a safe, isolated defect that could be corrected without a runtime reproduction. Do not invent a fix or change behaviour solely to create a commit.

## Desktop and mobile Preview screenshot coverage — 20 November 2026

- Updated `.github/workflows/cms-build-check.yml` to capture both desktop (1440×1000, DPR 1) and mobile (390×844, DPR 2, touch emulation) screenshots for the same six routes: Home, Products, Services, Team, Signo T100 product detail, and HR Contact.
- The workflow now produces 12 rendered-page screenshots in `preview-screenshots/desktop/` and `preview-screenshots/mobile/`, uploaded as one run artifact.
- This changes screenshot capture only. It does not modify, convert, resize, optimize, or otherwise process source/catalogue images.
- Workflow change commit: `c0c89854c7a8357ab1d0c9db63339c3a7b02ae34`.
- Exact-head workflow result has not yet been returned by the available commit-run lookup. Do not claim the new workflow has passed until a corresponding GitHub Actions run and its jobs are inspected.
- Latest PR check at this checkpoint: head `c0c89854c7a8357ab1d0c9db63339c3a7b02ae34`, Open/Draft/unmerged, 1,187 commits ahead of `main`, 0 behind, 104 changed files. GitHub mergeability response is currently false; recheck before any merge attempt.

## Preview operations documentation reconciliation — 20 November 2026

- Reviewed the active `.github/workflows/cms-build-check.yml` against `docs/CMS-PREVIEW-OPERATIONS.md`.
- Found and corrected stale operational documentation that still described tests and screenshots as deferred, despite the active workflow running `npm test` and capturing desktop screenshots.
- The operations guide now documents the actual ordered stages: locked install, automated tests, Vite build, Pages Functions build, Preview D1 readiness, Preview-only deploy/asset verification, and 12 viewport screenshot captures (six routes at desktop and mobile sizes).
- It explicitly distinguishes rendered-page screenshots from source-image processing; no catalogue/source image conversion or manipulation is performed.
- Documentation correction commit: `c2b6f26516075f5b43216e66d3880cdfc008a0f8`.
- Latest reviewed PR head before this documentation-only commit was `b0868fdbcf3190b2c4fc5095258de8a02ec047fd`. The PR was Open/Draft/unmerged; comparison reported 1,188 commits ahead and 0 behind, 104 changed files. GitHub mergeability returned true at that check, but no merge was attempted.
- The available commit-workflow lookup returned no PR-triggered workflow records and combined status lookup returned no status entries for that exact head. These results do not prove that no push-triggered Actions run exists; the available connector lookup is limited and the workflow source has a push trigger. Exact-head CI and artifact status remain unverified.
- Frontend source review continued across CMSManagement, CMSDashboard, ProductFormEditor, CMS preview pages, and admin dashboard. The reviewed paths include unsaved-change guards, request cancellation/stale-response protection, product image selection constraints, and admin request-history UI. No reproducible source defect was established from this read-only pass, so no speculative application-code patch was made.
- This documentation reconciliation was committed as `12cbefc9c5e9cf69b67ed1e0c7e1557aabcdc533`; the next docs-only release-readiness refresh is recorded in commit `1cd4e7a20ff965975791cb611fe34b1fb5a62334`.

## PR status and frontend review continuation — 20 November 2026

- Refreshed PR #2 after the documentation updates. Latest observed head before this checkpoint commit: `1cd4e7a20ff965975791cb611fe34b1fb5a62334`; PR Open/Draft/unmerged, 1,190 commits ahead of `main`, 0 behind, 104 changed files. GitHub currently reports mergeable=true.
- Combined status lookup returned no status entries. The available workflow-run lookup is restricted to PR-triggered runs, so this does not establish whether the push-triggered workflow has completed. Exact-head tests/build/Preview deployment/screenshots remain unverified.
- Updated `docs/CMS_RELEASE_READINESS.md` with this distinction: mergeable is only a conflict assessment, not release approval. No merge or Production operation was performed.
- Continued read-only frontend review of `CMSDashboard.jsx`, `AdminDashboard.jsx`, `PageDesignScope.jsx`, `Layout.jsx`, and CMS management flows. Inspected draft save/publish guards, page switching, section recovery, responsive preview controls, public navigation settings, request filtering and history loading. No verified defect was established, so no speculative application patch was made.
- Corrected the prior checkpoint's self-referential SHA note: the Preview operations documentation reconciliation commit was `c2b6f26516075f5b43216e66d3880cdfc008a0f8`, its checkpoint commit was `12cbefc9c5e9cf69b67ed1e0c7e1557aabcdc533`, and the release-readiness refresh was `1cd4e7a20ff965975791cb611fe34b1fb5a62334`.
- No source/catalogue image was processed. Production website, Production D1 and Production R2 remain untouched.

## Final status refresh for this work interval — 20 November 2026

- Latest checkpoint commit before this note: `9a8b327ef160a2dc8ea9fc70b6a5ac6e62ec15a7`.
- PR #2 refreshed again: Open, Draft, unmerged; head `9a8b327ef160a2dc8ea9fc70b6a5ac6e62ec15a7`; 1,192 commits ahead of `main`, 0 behind; 104 changed files. The latest GitHub response reports `mergeable=false` (the flag has fluctuated between refreshes; no merge was attempted).
- Current PR review-thread and submitted-review queries returned empty lists. This is not a substitute for the outstanding complete diff review.
- Combined commit-status query returned no entries for this head. Do not claim latest CI passed based on the earlier successful run on `1b2221f1a16caf75cff7e9a5dd66897f24ef2dc4`.
- No Cloudflare runtime/deployment/database tools are exposed in this session. Preview D1/R2 live workflow and Production controls cannot be executed from the current tool set; continue source review and use repository Actions evidence where available.
- No source-image processing, merge, Production deployment, Production D1 migration, or Production R2 operation occurred.


## Screenshot artifact path fix and source review continuation — 20 November 2026

- Rechecked PR #2 after the previous checkpoint. Before this fix, PR #2 was Open/Draft/unmerged at `4a41cbb86099027f4417269ea705bb0e01055408`, 1,193 commits ahead of `main`, 0 behind, 104 changed files; GitHub reported mergeable=true. No submitted reviews or inline review threads were returned.
- Confirmed the exact-head workflow lookup and combined-status lookup returned no records for that SHA. The workflow lookup is limited to PR-triggered runs; it does not establish that the push-triggered workflow did not run. Exact-head CI remains unverified.
- Found a concrete artifact upload mismatch: screenshot files are written below `preview-screenshots/desktop/` and `preview-screenshots/mobile/`, while the upload glob only matched files directly under `preview-screenshots/`. Changed the glob to `preview-screenshots/**/*.png` so both viewport folders are included.
- Workflow fix committed on `cms-development` as `7ff1de30b922a4b9daee563e8c6a48d813e7170c`. This workflow-only correction does not manipulate source/catalogue images.
- Continued reviewing the cart/chair split and migration logic, service-page content flow, team-page content flow, and image signature/dimension validation. The fixed slug allowlist keeps the 11 confirmed chair models out of the normal cart. Legacy chair migration writes the destination chair store before rewriting the product cart and includes retry-safe quantity tracking.
- Team template still has role-based cards referencing `/assets/team-1.jpg` through `team-4.jpg`; these are not named employees, but the actual asset identity/authorization was not verified in this pass. Keep this as an explicit content/asset verification item; do not present those assets as confirmed staff portraits or invent employee identities.
- The Services fallback template contains eight named service categories and claims including emergency repair/compliance support. Because the authoritative original Services content and V10 source assets are not present for comparison in this session, no content replacement was made. Verify against the approved original content before release.
- No Preview runtime, D1/R2 operation, merge, Production migration/deployment, or source-image processing occurred.


## Exact-head CI and screenshot artifact verified — 20 November 2026

- Workflow run [#44691001424](https://github.com/yrproservice/yrproservice/actions/runs/44691001424) completed successfully for exact branch commit `eaebfc0db6d8218fd758fc90ffa862a8bfb60709`.
- Confirmed successful steps: locked dependency installation, automated tests, Vite website build, Cloudflare Pages Functions build, Preview D1 schema readiness, Preview deployment/asset verification, desktop/mobile screenshot capture, and screenshot artifact upload.
- Screenshot artifact `cms-preview-screenshots-eaebfc0db6d8218fd758fc90ffa862a8bfb60709` (artifact ID `14609040827`, 3,587,918 bytes) was downloaded and inspected as a ZIP. It contains exactly 12 PNG captures: six routes (Home, Products, Services, Team, Signo T100 product detail, HR Contact) in both `desktop/` and `mobile/` directories. This confirms the recursive upload glob includes both nested folders.
- The artifact was inspected as an archive listing only; no screenshot or source/catalogue image was altered or processed.
- The run's single job concluded `success`. This is exact-head CI evidence for `eaebfc0...`, not evidence for any later documentation commit.
- Current release blockers remain: full PR history/diff review; authenticated Preview CMS and D1/R2 runtime/concurrency verification; Production D1 migration/backup/restore, R2 binding, actual Production Access hostname, and branch protection verification; performance/accessibility/security/isolation checks; content/data confirmation; and decision on the absence of a server-side single-device session lock.
- No PR merge, Production migration/deployment, or Production resource change occurred.


## Visual follow-up and content provenance review — 20 November 2026

- Re-inspected the previously captured mobile Home screenshot. The subtitle wraps after the hyphen in “Long-term” but remains within the viewport; this is a normal line wrap, not a confirmed overflow defect. No subtitle-specific patch was made.
- The mobile Services screenshot confirms the original eyebrow colour was blue on a navy background and lacked sufficient contrast. Commit `c3d398ec2033cada4f804e7cb215920f63a82cb3` changes only the Services hero eyebrow to the existing light-cyan palette and removes a redundant `width: 100%` from the Home hero content child so it follows the parent container's natural width.
- Historical base-branch files at `c3f8b658fa49187f5dc3a5ad2ce4b2feab6817e4` contain the same eight Services entries and hero/intro/process/CTA copy now used by the CMS template. This proves parity with the checked-in base branch, **not** approval against the user's V10 source-of-truth Services content. Keep that content comparison open; do not rewrite it based on assumptions.
- The checked-in base-branch Team page also already used `/assets/team-1.jpg` through `team-4.jpg` as role-based image cards, with no named staff identities. The current CMS version preserves that pattern. Asset provenance/approval against the user's V10 baseline remains unverified; do not label the images as identified employees or add names.
- The GitHub connector's commit-workflow lookup is documented to return pull-request-triggered runs only; it returned no run for the latest push commit `c3d398ec2033cada4f804e7cb215920f63a82cb3`. This does **not** prove that no push workflow ran. Exact-head CI/build status for this CSS correction remains unverified through the currently exposed lookup. Do not reuse the successful earlier run #44691001424 as evidence for this later commit.
- No image/source asset was modified, converted, optimized, resized or otherwise processed. No migration, Production deployment, PR merge or Production resource change occurred.
