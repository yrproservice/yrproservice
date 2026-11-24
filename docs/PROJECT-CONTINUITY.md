## Current launch checkpoint — 24 November 2026, 08:00 UTC

- Current PR #2 / `cms-development` head: `ce33cba9d0dd115a9c429c03243e6bc8fc8706ab`; PR remains Open, Draft, unmerged. GitHub currently reports `mergeable=false`; do not attempt a merge. PR scope is 132 changed files and 1,356 commits ahead of `main`, 0 behind. The complete PR history/diff review remains required.
- Cloudflare Pages reports deployment success for commit `0cf490411dd94843f95737632e4cb57d905ed5da` (the Services code/test plus continuity checkpoint) at 07:57:59 UTC. Preview branch URL: `https://cms-development.yrproservice.pages.dev`; deployment URL: `https://8c02fc8e.yrproservice.pages.dev`.
- The later head `ce33cba...` is a documentation-only update after the deployed code checkpoint. Do not claim that exact documentation head has its own completed deployment until the Cloudflare status is refreshed.
- Exact GitHub Actions workflow evidence for the Services test remains unavailable: the commit-status and PR-triggered run lookups returned no entries, and the earlier run #45350267061 was cancelled before Playwright/screenshots/customer-flow checks. The test source is committed, but the test itself is **not yet verified as executed**.
- Services fallback data now has the original four approved categories and exact original point lists. Existing saved Preview CMS content remains unverified because authenticated CMS/API access is not available through the current GitHub integration; do not overwrite it blindly.
- Product-image work remains user-owned and excluded. No product image or image reference was modified.
- Production remains untouched. No PR merge, Production migration, binding change, or Production deployment occurred.

## Services restoration Preview deployment checkpoint — 24 November 2026

- Static Services catalogue restoration commit: `dc697df7255ab916533e80078dc513c297678ac8`.
- Regression-test addition commit: `6f2676f2e21e0b8afa8402366b9e5426d8dda2cf`.
- Cloudflare Pages deployment bot reports **Deploy successful** for exact commit `6f2676f` at 07:57:17 UTC, with branch Preview URL `https://cms-development.yrproservice.pages.dev` and deployment URL `https://0905d63c.yrproservice.pages.dev`. This confirms the source update reached Preview; it does not prove the new Node test ran or that the currently published CMS Services record was reconciled.
- PR #2 head after documentation-only follow-ups: `511025e8aa7c2e5f7777ab7068c5689d41562882`; Open, Draft, unmerged, 132 changed files, 1,354 commits ahead of `main`, 0 behind. Latest GitHub mergeability response was true; full history/diff review is still required.
- GitHub combined status and PR-triggered workflow lookup returned no check entries for the latest docs head. The connector's workflow lookup is PR-triggered-only; do not interpret empty results as proof that no push workflow ran.
- No test result is available for the new Services regression test. The separate workflow run #45350267061 remains cancelled and predates the Services correction.
- No product-image assets, catalogue files, product image paths/references or CMS image assignments were changed. No CMS database record was edited. Production remains untouched.

Next: obtain an exact-head test result for `6f2676f` or the latest code-equivalent head; then perform an authenticated, read-only inspection of the Preview Services CMS page before reconciling saved content. Preserve the original four categories and existing route compatibility; do not overwrite published content without a verified recovery path.

---

## Services content restoration — 24 November 2026

A source review found that `src/data/services.js` contained an eight-item replacement catalogue (dental chair installation, equipment installation, compressor installation, dental suction installation, underfloor piping, preventive maintenance, equipment relocation, and repair/technical support), contrary to the user's previously approved requirement to preserve the original four Services categories.

Restored the original four-category content in commit `dc697df7255ab916533e80078dc513c297678ac8`:
1. **Installation & Site Planning** — Floor-plan consultation; Chair & unit setup; System calibration.
2. **Emergency Repair** — On-site diagnostics; Repair support; Loaner equipment.
3. **Preventative Maintenance** — Quarterly check-ups; Wear-part replacement; Performance logging.
4. **Compliance & Safety Audits** — X-ray calibration; Water-line testing; Sterilization audits.

The Services page layout, hero/intro/process/CTA sections, and Contact Us → `/quote` routing were retained. The source data descriptions are limited to the approved original service bullets; no additional service claims were invented.

Added regression coverage in commit `6f2676f2e21e0b8afa8402366b9e5426d8dda2cf` to assert the exact four titles and point lists, preserve the page sections/layout, and retain the HR Contact route protection. **The new test has not yet been executed**; the exact-head workflow/deployment must be checked before claiming it passed.

Important runtime caveat: `getServicesCmsContent()` intentionally uses saved CMS `listing.items` when present, and the Services Manager says route slugs are fixed to preserve existing detail URLs. Therefore this static-template correction does not prove the currently published Preview CMS record has been restored. Read the authenticated Preview CMS content first and reconcile it safely; do not overwrite saved/published content blindly. The intended original four service entries must be preserved, with route slug compatibility checked.

No product images, catalogue assets, image references, CMS image assignments, database records, or Production resources were changed.

---

## Live Git and Preview deployment checkpoint — 24 November 2026

- Current `cms-development` / PR #2 head at inspection: `35b90b4970e39d9d568251be02acecfd8ddd4079`.
- PR #2 is Open, Draft, unmerged, base `main`; GitHub reported mergeable=true at this inspection. Current comparison is 1,348 commits ahead, 0 behind, 132 changed files, 29,507 additions and 1,761 deletions. The large history/diff remains a mandatory complete review gate; mergeability does not mean release-ready.
- GitHub combined commit status returned no status entries and the connector's workflow-run lookup returned no PR-triggered run records for this SHA. This connector's workflow lookup is limited to PR-triggered runs, so those empty results do not establish that no push-triggered workflow exists.
- Cloudflare Pages deployment bot comment was refreshed at 07:55:30 UTC and reports exact commit `35b90b4` **Deploy successful**. Preview URL: `https://c532858a.yrproservice.pages.dev`; branch URL: `https://cms-development.yrproservice.pages.dev`. This confirms a Pages Preview deployment for the exact SHA, not authenticated CMS workflows or Production readiness.
- Separate GitHub Actions workflow [#45350267061](https://github.com/yrproservice/yrproservice/actions/runs/45350267061), associated with JA20 static correction commit `2f230daf80957f02b2e9282754cc523d0914c9e9`, ended cancelled. Locked install, npm audit, tests, Vite build, Pages Functions build, Preview D1 schema check, Preview deployment/asset verification, security/Access audit, and image-status/URL audit steps completed successfully; Playwright install was cancelled and browser screenshots/customer-flow steps were skipped. Do not claim a full workflow pass.
- Product images remain excluded from assistant work by the new user instruction. The Pages deployment success does not verify product image completeness or require image remediation.
- No Production D1/R2, binding, secret, Access setting or deployment was changed. PR #2 was not merged.

### Launch work still required (non-image scope)

1. Re-run/complete exact-head automated tests, Vite and Pages Functions builds, Preview checks, Playwright screenshots and customer-flow audit on the latest source head. Record exact run results.
2. Complete authenticated Preview CMS workflows: save draft, preview draft, publish to Preview, revision history, restore-as-new-draft, delete draft, media upload/archive/restore/reference protection, and concurrent/stale-edit conflict handling. Product-image acquisition/assignment is excluded; test media mechanics only with safe non-product test files if needed and do not change catalogue images or product references.
3. Verify Admin Access/session behaviour and clarify/document the existing limitation: Access JWT + allowlist is enforced, but no server-side single-device lock/revocation registry is confirmed.
4. Review Services and Team CMS defaults against the approved original content. Do not invent replacement service claims, staff names, biographies or photos; preserve unresolved items and seek verified source rather than fabricate.
5. Complete Preview D1/R2 backup/restore and reference-integrity drills with exact resource identity and recovery proof. Do not perform Production data operations.
6. Complete security, accessibility, responsive layout and performance review; compare to V10 only if the approved V10 source is actually available.
7. Review all 132 changed files and 1,348-commit delta against `main`, check branch protection and CI requirements, and produce a clear release/rollback assessment.
8. Production blockers remain: Production R2 bucket/binding/public base absent or unconfirmed in `wrangler.toml`; Production CMS D1 schema/migrations unverified; backup/PITR/restore proof unconfirmed; Access coverage for actual Production hostname unverified; `main` branch protection previously reported disabled. Production must remain untouched until separately authorized and all release gates pass.

## Priority change — launch readiness; product images owned by user — 24 November 2026

**New explicit user instruction:** Proceed with all work required to get the website ready to launch quickly, except product-image acquisition. The user will handle all product images.

This instruction supersedes earlier task lists that assigned product-image acquisition, sourcing, matching, replacement or assignment to the assistant. From this checkpoint onward:
- Do not search for, acquire, source, generate, create, replace, assign, curate or otherwise perform product-image work. Do not edit product-image files, catalogue assets, CMS image assignments, image paths or product image references.
- Leave all product-image acquisition and assignment to the user. Preserve the existing files and references as-is.
- Do not make missing product images or unassigned CMS image fields a blocker to the launch-readiness work. Record them as user-owned post/parallel-launch content tasks, not as code defects.
- Do not invent or substitute product imagery. Do not alter image assets as part of this scope.
- Continue non-image work that materially affects launch readiness: code fixes, verified product text/specification corrections, customer journeys, CMS/editor runtime behaviour, authentication/authorization, security, accessibility, responsive layout, performance, Preview D1/R2 integrity and recovery, deployment verification, operational documentation and release-gate review. If a workflow automatically reports image status, record it for visibility only; do not remediate image content.
- Product facts still require official manufacturer evidence. If exact product identity/specifications cannot be verified, keep the relevant text/data conservative or explicitly pending rather than inventing facts.
- Maintain the approved V10 design and the existing Preview/Production isolation rules.

### Immediate checkpoint status

- PR #2 remains Open, Draft and unmerged; no merge or Production deployment is authorized by this launch-priority instruction.
- Exact correction workflow [#45350267061](https://github.com/yrproservice/yrproservice/actions/runs/45350267061) did **not** pass: its job ended with conclusion `cancelled`. Steps 1–15 (locked install, npm audit, tests, Vite build, Pages Functions build, Preview D1 readiness, Preview deploy/asset verification, security/Access audit, image-field/static image URL audits and artifact uploads) completed successfully; Playwright installation was cancelled, and screenshot/customer-flow steps were skipped. Do not represent this run as a full pass.
- Re-run the current exact branch head through the relevant non-image test/build/browser checks, with screenshots and customer-flow tests retained where they support launch readiness. Do not add image sourcing/assignment work to the workflow.
- Product-image work is explicitly excluded from the assistant's launch scope and remains with the user.

---

# YR Proservice — Permanent Project Continuity Record

**Purpose:** This file is the repository-resident handover for work that must survive loss of ChatGPT conversation history. Read this file at the start of every new work session, then read the linked source-of-truth documents and verify the live GitHub state before acting. Keep it updated in the same branch whenever instructions, decisions, progress, risks, or next steps materially change.

**Last updated:** 24 November 2026 (launch-readiness priority; product images user-owned)  
**Repository:** `yrproservice/yrproservice`  
**Working branch:** `cms-development`  
**Pull request:** [#2 — Build YR Proservice Visual CMS foundation](https://github.com/yrproservice/yrproservice/pull/2)

---

## 1. Start-here instructions for any future assistant or contributor

1. Read this file first.
2. Read [README.md](../README.md), [CMS_RELEASE_READINESS.md](./CMS_RELEASE_READINESS.md), [CMS-PREVIEW-OPERATIONS.md](./CMS-PREVIEW-OPERATIONS.md), and [PHASE-G-MEDIA-HANDOVER.md](./PHASE-G-MEDIA-HANDOVER.md). Read the newest dated checkpoint in each; older entries are historical, not current status.
3. Check the live `cms-development` branch HEAD, PR #2 state/head/base/draft status, latest Actions runs and exact-commit check results. Do not rely on SHAs or workflow statuses copied from an earlier conversation.
4. Work on `cms-development` only. Make small, scoped, reviewable changes; inspect the actual source before editing; test the exact change; record exact commit SHA and exact workflow run; update this continuity record.
5. Do not say a build, test, deployment, audit, migration, CMS operation or browser check passed unless its result was actually inspected for the exact relevant commit/environment.
6. Never treat this file as permission to perform an operation that is prohibited below. If repository documents conflict, follow the latest explicit user instruction and the more restrictive Production/data-safety boundary; record the resolution here.

**The repository, not the conversation, is the durable project memory.** Every future handover must be committed to Git. Do not leave important decisions, pending work, or verification evidence only in chat.

## 2. Hard safety and workflow rules

- Work on branch `cms-development` and the isolated Cloudflare Preview environment.
- PR #2 must remain **Open, Draft, and unmerged** unless the user explicitly approves merging. Do not mark it ready for review or merge it as a convenience.
- Do not merge to `main`, deploy Production, apply Production migrations, publish Production content, or change Production settings/bindings/secrets/resources without explicit user approval.
- Keep Production and Preview completely separate. Never run Preview migration commands against Production D1.
- Preview D1: `yr-proservice-test-db`, ID `7fca4ad0-3baa-4148-ad28-bfd2ef416c16`.
- Preview R2: `yrproservice-cms-preview`.
- Preview site: https://cms-development.yrproservice.pages.dev
- Production D1: `yr-proservice-db`, ID `9bf690db-a74b-43e9-8c38-cc8bab18a9f1`. Production must remain untouched during this work.
- Do not expose secrets, tokens, customer personal data, or private credentials in commits, logs, chat, or screenshots.
- Before any destructive or database operation: confirm the exact environment/database identity, inspect the SQL/operation, determine affected rows/data, establish a recovery/backup path, and verify the result. Do not repeat successful migrations or destructive operations without a demonstrated need.
- Use small, verifiable batches and regular commits/recovery checkpoints. Keep exact evidence linked to the exact commit.
- Do not use broad CSS override piles or blind cascade changes. Inspect V10 structure, routes, components, data and CSS first; make the smallest justified change and verify desktop/mobile.
- Do not claim work is complete based on configuration alone. A workflow definition is not a successful run; a build is not an authenticated CMS runtime test; a static asset check is not a visual-fidelity sign-off.

## 3. Visual source of truth and design requirements

- The sole approved visual baseline is `YR-Proservice-Visual-Blueprint-V10-Verified-Images.zip` (V10). Do not rebuild from old ZIPs, revert to an earlier design, or use older project archives to recover features.
- V10 defines page identity, layout, sections, proportions, cards, spacing, hierarchy and typography. It is not an instruction to make every section blue.
- Palette: Deep Navy `#0B4A88`; Primary Blue `#1E7ED8`; Cyan `#00C2FF`; Pale Blue `#EAF6FD`; Light Grey `#F5F7FA`; Text `#1F2937`; Muted `#687280`; White `#FFFFFF`.
- Typography: Montserrat headings and Inter body; target sizes H1 48, H2 32, H3 24, H4 20, H5 16, H6 12; body 16, small 14, caption 12.
- Maintain readable contrast: dark text on light surfaces and readable bright text on dark sections. Never use pale text on white/light cards.
- Keep distinct identities and transitions for Home, Products, Services, Product Details and Team.
- Product images must show the entire product, preserve aspect ratio, and use contain-style presentation; no crop, stretch, distortion or overflow. Do not silently fall back to old/external images.
- The catalogue image source is the user-provided `catalog.zip` and its existing manufacturer/category folder structure. Match exact product/model variants; never substitute a visually similar model.
- Do not transform source/catalogue images (resize, crop, convert, optimize, recompress or otherwise process them) unless the user gives a new explicit instruction. Rendered-page screenshots used as evidence are not source-image processing.

## 4. Product, content and customer-flow rules

- Use official manufacturer product pages first, then official catalogues/manuals; distributor documents only if official sources are unavailable. Record the exact source URL and model identity.
- Do not invent or extrapolate specifications, compatibility, reviews, ratings, prices, stock status, employee identities or business facts.
- Exact model matching is mandatory (e.g. Morita Signo T100 is not Signo T500; Westcode JA20 optic/light is not JA20 non-optic).
- Price and stock are business data; leave pending until YR Proservice confirms them. Never create fake reviews or star counts.
- Product Details Description / Specifications / Review areas must reflect verified information; when there are no reviews, say so rather than fabricate them.
- Normal products use Product Cart and quotation/request flow. Dental chairs must not enter the normal cart; they use Dental Chair Request. Preserve quantity controls and navigation between the two flows.
- Keep Services' original service information; do not replace it with an invented generic list. Services CTA labels are `Request a Service` and `Contact Us`; Services `Contact Us` routes to `/quote`, not the HR-only `/contact`.
- Contact page is HR/employment contact only, not a general quote/service/product enquiry page.
- Do not invent employees or use unapproved/random staff photos. Preserve exact Team roles: Technical Support; Installation & Service; Customer Support; Project Coordination.
- Do not add redundant navigation CTAs or decorative nonfunctional header controls. Logo/home control navigates Home.

## 5. Full Visual CMS direction

The chosen CMS experience combines:
- Live visual editing alongside a page preview (select/edit sections in context).
- Structured management panels, especially for products, specifications, images, documents and settings.

Preserve Preview-only draft/save/preview/publish workflows, revision history and restore-as-draft safeguards. Publishing in this project means publishing to isolated Preview unless and until a separately approved Production release occurs. Keep normal customer request workflows separate from Admin APIs. Admin dashboard and CMS Admin are private and Access-protected.

Current server-side Admin identity uses Cloudflare Access JWT validation and an administrator allowlist. Do not claim there is a server-enforced single-device lock or revocation registry; source review found that browser `sessionStorage` is local UI state and shared-account concurrent use remains possible. Clarify intended device/session policy before implementing a lock.

## 6. Current verified checkpoint — 24 November 2026

### Repository and release state

- PR #2 body currently records branch/PR head `68ccbc5d7f9290a4f9bae33fab31f53d8cc2589e`, Open, Draft, base `main`, unmerged. Recheck live HEAD before relying on this snapshot.
- Commit `68ccbc5d7f9290a4f9bae33fab31f53d8cc2589e` records the Preview customer-access migration incident and recovery.
- Static catalogue correction commit `2f230daf80957f02b2e9282754cc523d0914c9e9` was created 24 November 2026 at 07:44 UTC. It changes only `src/data/products.js` and corrects the two static Westcode JA20 variant records described below. Confirm whether this commit is already included in the current branch head before any further edit; do not assume ordering from the commit timestamps alone.
- No Production D1/R2, bindings, secrets, Access configuration or deployment was changed. No PR merge or Production release occurred.
- The latest PR body also records exact-head run [#45347722101](https://github.com/yrproservice/yrproservice/actions/runs/45347722101) as successful for head `68ccbc5d7f9290a4f9bae33fab31f53d8cc2589e`: all 21 steps passed, including 21 workflow stages, desktop/mobile screenshot capture, customer-flow audit and artifact upload. This is evidence for that exact commit only, not automatically for later commits.

### Westcode JA20 media/model investigation

- The two original repository assets are distinct files and both exist at the exact Preview asset commit `68ccbc5d7f9290a4f9bae33fab31f53d8cc2589e`:
  - `westcode ja20.webp`
  - `westcode ja20 non optic.webp`
- Visual verification identified `westcode ja20.webp` as the JA20-WH-AL light/optic configuration and `westcode ja20 non optic.webp` as the non-optic configuration. Do not swap or replace these files based only on a product name.
- The static data correction in commit `2f230daf80957f02b2e9282754cc523d0914c9e9`:
  - Corrects the non-optic record subcategory to `Non-Optic`.
  - Corrects the light record to model code `JA20-WH-AL`, identifies it as the light configuration, and adds the manufacturer-supported cellular-glass optics specification.
  - Retains the two original image paths and changes no image file.
- Manufacturer evidence available in the review: the Westcode light-configuration page identifies `JA20-WH-AL`, cellular-glass optics, 20:1 reduction, 2,000 rpm and 80 N·cm. The current manufacturer model guide identifies the non-optic legacy model as `A3028`, while a Westcode comparison table still labels the non-optic JA20 as `JA20-WH-NO`. The exact current manufacturer identity for the non-optic variant remains unresolved; do not invent a definitive manufacturer model code or overwrite its source/specs without resolving that discrepancy.
- Duplicate CMS records remain a separate task. Five unpublished CMS records were previously identified: `mocom-v10`, `mocom-f10`, `mocom-goldspeed-evo-e4`, `westcode-ap31`, `westcode-ja20` (see the current audit artifact/PR checkpoint for exact scope). They were unarchived and unpublished and had no published image field at the time of the audit. Verify current records from the authenticated Preview CMS/API before editing.
- Do not publish any of the five records until each exact model identity, manufacturer source, and image are verified. Static catalogue corrections do not automatically reconcile CMS draft/published records.

### Current workflow status for JA20 correction

- Exact correction commit: `2f230daf80957f02b2e9282754cc523d0914c9e9`.
- Workflow run [#45350267061](https://github.com/yrproservice/yrproservice/actions/runs/45350267061) was inspected and remained **in progress** at the last check.
- Completed successfully in that run: locked dependency installation; npm audit; automated tests; Vite build; Cloudflare Pages Functions build; Preview D1 schema readiness; Preview deployment/asset verification; Preview security-header/Access-boundary audit; product image-field audit and artifact upload; static catalogue URL checks and artifact upload.
- Playwright installation was in progress. Desktop/mobile screenshots and customer request journey audit/artifact upload were still pending. Do not report this run as passed until its final conclusion is checked.
- Recheck the latest branch HEAD and exact workflow result. If the run completed, record the final conclusion and any artifact references here and in the release-readiness document.

### Earlier 24 November Preview migration incident

- Run [#45347227246](https://github.com/yrproservice/yrproservice/actions/runs/45347227246) targeted Preview D1 `yr-proservice-test-db` / `7fca4ad0-3baa-4148-ad28-bfd2ef416c16`.
- Migration 0006 completed with five queries and zero rows written. Migration 0007 failed with `duplicate column name: email`; the email column already existed. The run did not complete final schema verification. This was a Preview-only failed migration attempt, not evidence of data loss.
- Read-only schema check [#45347240863](https://github.com/yrproservice/yrproservice/actions/runs/45347240863) passed.
- The workflow was subsequently hardened to inspect `pragma_table_info('customer_request_access_sessions')` and skip migration 0007 if the column already exists. Verify current workflow source and schema before any further migration. Do not rerun migration merely to clear the historical failed status.

### Other latest Preview audit facts from PR #2

- Exact-head run #45347722101 reported 10 routes captured at desktop 1440px and mobile 390px (20 screenshots); all route responses were HTTP 200; measured document widths matched viewport widths; all captured images loaded; zero failed/missing-source/pending images.
- Customer journey audit: 4 passed, 0 failed. Product cart → quotation; dental chair request remained separate (chair quantity 2, product cart count 0); service request validation/submission; HR contact remained HR-only. Audit intercepted `POST /api/requests`; no test submissions were written to Preview D1.
- Five checked CMS records were unpublished, unarchived, and had no published image field at the time of the audit.
- Five corresponding static catalogue URLs returned HTTP 200 and valid JPEG/WebP signatures. Two `.jfif` assets were served as `application/octet-stream`; bytes were valid JPEG. Review MIME normalization before declaring media delivery fully normalized.
- These screenshots are viewport/layout evidence, not V10 pixel-diff approval; the V10 ZIP was not available for direct comparison in that checkpoint.

## 7. Known outstanding work and release gates

Prioritize in this order, updating this file after each meaningful verified stage:

1. **Finish the exact JA20 correction workflow:** recheck run #45350267061, capture final outcome, and verify whether its commit is current branch HEAD.
2. **Resolve JA20 non-optic manufacturer identity:** reconcile Westcode's `A3028` model-guide reference against the `JA20-WH-NO` comparison-table label. Keep uncertainty explicit; do not invent.
3. **Inspect the five unpublished Preview CMS product records individually:** verify exact manufacturer model, product data, image identity, source URL, draft state and publication state. Do not publish while any fact is unresolved.
4. **Verify authenticated Preview CMS/editor workflows and concurrency:** save, preview, publish-to-Preview, restore, delete, media upload/archive/restore/reference protection, Admin Access/session behaviour, and concurrent/stale-draft conflicts. Keep test content/data isolated and do not mutate real customer requests.
5. **Verify live Preview D1/R2 recovery and media integrity:** backup/restore drill, object/database consistency, reference safety and audit outcomes. Confirm database identity before every operation.
6. **Review static image delivery MIME types**, particularly valid JPEG `.jfif` assets served as `application/octet-stream`.
7. **Compare current desktop/mobile screenshots against the actual V10 baseline.** Do not claim pixel/design sign-off until the V10 reference is available and actually compared.
8. **Review product content gaps** against official manufacturer documentation. Do not transfer specs between variants (e.g. Silent Power Evo vs older non-Evo models); leave unsupported fields incomplete.
9. **Complete security, accessibility, performance and abuse-control review**, including Access boundary, public request endpoints, rate limiting and Admin isolation.
10. **Review full PR history and diff** before any release decision. Prior branch comparisons show a very large history delta from `main`; recheck current live counts and inspect all changed files/commits. A green workflow or mergeable indicator is not approval.
11. **Production readiness remains separate:** Production R2 binding/public media base, Production D1 schema/migrations, backup/PITR and tested restore, Access coverage for actual Production hostname, branch protection/review requirements, and full release/rollback plan must be verified before requesting approval.
12. Keep PR #2 Draft and unmerged; Production untouched until explicit user approval.

## 8. Evidence and document hierarchy

- [README.md](../README.md): project overview, V10 design, environments, CMS capabilities and local checks.
- [CMS_RELEASE_READINESS.md](./CMS_RELEASE_READINESS.md): authoritative dated release audit, completed fixes, known gaps and release blockers. Add new dated checkpoints at the top; do not silently rewrite historical evidence.
- [CMS-PREVIEW-OPERATIONS.md](./CMS-PREVIEW-OPERATIONS.md): Preview deployment, D1 migration, secrets and operational recovery procedures.
- [PHASE-G-MEDIA-HANDOVER.md](./PHASE-G-MEDIA-HANDOVER.md): detailed media administration/editor handover and source-level changes.
- [PHASE-G-19-NOV-SOURCE-REVIEW.md](./PHASE-G-19-NOV-SOURCE-REVIEW.md): source-review findings and unresolved follow-ups.
- PR #2 description: running summary of the most recent release checkpoint and verification links.
- GitHub Actions run artifacts: screenshot and JSON audit evidence; artifacts may expire, so preserve important findings and stable links in Git documentation. Never rely on a short-retention artifact as the only copy of a decision or instruction.

## 9. Required format for future progress updates

For every substantial work session, add a dated section at the top of this file and, where relevant, the release-readiness document. Include:

- Exact date/time and branch.
- Starting and ending commit SHA.
- Exact files changed and concise reason.
- User instruction/decision being implemented.
- Environment and database/resource identity, if applicable.
- Tests/builds/audits performed, with exact commands or workflow run IDs and final results.
- What was not tested or not verified.
- Any data/content mutation and its recovery/rollback evidence.
- Outstanding risks, blockers and next single action.
- Explicit statement that Production and PR state were not changed when applicable.

Never write “complete”, “verified”, “passed”, “deployed”, “safe”, or “published” without the matching evidence. Distinguish source inspection, static tests, automated tests, browser tests, Preview deployment, authenticated runtime checks and Production readiness.
