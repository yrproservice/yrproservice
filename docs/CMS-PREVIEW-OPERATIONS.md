# YR Proservice CMS — Preview Operations

## Environments

- Preview branch: `cms-development`
- Preview site: `https://cms-development.yrproservice.pages.dev`
- Preview D1 database: `yr-proservice-test-db`
- Preview D1 database ID: `7fca4ad0-3baa-4148-ad28-bfd2ef416c16`
- Preview R2 bucket: `yrproservice-cms-preview`
- Production website and database are separate. Do not run Preview migration commands against `yr-proservice-db`.

## Preview D1 migration workflow

The workflow is `Apply CMS Migration to Preview D1` in GitHub Actions. It applies `migrations/0002_create_cms.sql` to `yr-proservice-test-db`, verifies the CMS tables, then applies the guarded `migrations/0003_page_metadata_versions.sql` migration. It can be started manually with workflow_dispatch and also runs when either migration file changes.

Migration 0002 uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`. Migration 0003 adds page-version metadata columns and backfills existing revisions; those `ALTER TABLE` statements are not rerunnable as-is. The workflow checks both columns before applying it, refuses a partially migrated schema, and when both columns already exist only completes the null backfill and index creation. Review future migrations before treating them as safe to rerun.

### Dedicated GitHub secret

The migration workflow uses a separate repository secret named `CLOUDFLARE_D1_API_TOKEN`. It does not reuse or replace `CLOUDFLARE_API_TOKEN`, which is retained for the existing deployment workflow.

Create a custom Cloudflare API token with these permissions:

- Account → D1 → Read
- Account → D1 → Edit
- User → Memberships → Read

Scope the Account resources to the YR Proservice Cloudflare account only. The D1 Edit permission is required for remote SQL execution; D1 Read allows the workflow to inspect the target database. Wrangler also requests membership information during authentication, which is why User → Memberships → Read is included.

Then add the token to GitHub:

1. Open the `yrproservice/yrproservice` repository.
2. Go to Settings → Secrets and variables → Actions.
3. Create a repository secret named exactly `CLOUDFLARE_D1_API_TOKEN`.
4. Paste the token value directly into GitHub. Never paste it into a chat, source file, or commit.
5. Open Actions → Apply CMS Migration to Preview D1 → Run workflow.
6. Select branch `cms-development` and run it.
7. Confirm that target database verification, migration execution, and CMS table verification all succeed.

The previous attempt using `CLOUDFLARE_API_TOKEN` failed at the database identity check with Cloudflare authentication error 10000. The migration SQL did not run. The dedicated secret is intended to resolve that permission gap without broadening the existing deployment token.

## Build-only, migration and Preview deployment workflow

The `CMS Preview Build Check` workflow runs on pushes to `cms-development` and remains manually dispatchable. Its current sequence is:

1. Install locked dependencies with `npm ci`.
2. Run the automated Node test suite with `npm test`.
3. Build the Vite website with `npm run build`.
4. Compile Cloudflare Pages Functions with `npx wrangler@4.157.0 pages functions build`.
5. Verify that the Preview D1 database has the page-version `title` and `route` columns, the route/state index, and no null page metadata.
6. Deploy or verify the built output against the Preview branch only (`cms-development`).
7. Capture viewport screenshots for Home, Products, Services, Team, Signo T100 product detail and HR Contact at desktop and mobile viewport sizes, then upload the 12 captures as a seven-day artifact.

The screenshot step uses Playwright/Chromium and waits for `domcontentloaded` plus a bounded render delay. It captures visible viewport screenshots, not full-page evidence. **Image processing remains prohibited and is not performed:** screenshots are rendered-page evidence only; source/catalogue image files are not converted, resized, optimized, or otherwise transformed.

The Preview deploy step runs only after dependency installation, tests, Vite build, Pages Functions build and Preview D1 schema readiness succeed. The branch argument is explicitly `cms-development`; the Production branch is not targeted. If a dedicated Pages token is unavailable, the workflow waits for the Git-integrated Preview branch and compares its hashed JavaScript/CSS asset references with the build output. It only accepts that fallback when the Preview is serving the same build assets.

A successful build or deployment alone is not a test result. Record each workflow stage and screenshot artifact against the exact commit SHA; do not transfer a passing result from an earlier commit to a later head.

The `Apply CMS Migration to Preview D1` workflow triggers when either `migrations/0002_create_cms.sql` or `migrations/0003_page_metadata_versions.sql` changes. It verifies the exact Preview database name and UUID before SQL execution. The page-metadata migration checks whether both columns exist, refuses a partially migrated schema, and verifies the columns, index and backfill after execution. **Do not change migration files casually:** doing so automatically triggers this workflow. No migration is required merely because the build workflow changed.

### Required GitHub secrets

- `CLOUDFLARE_D1_API_TOKEN`: Preview D1 read/edit access, used only by the guarded migration and schema-verification steps.
- `CLOUDFLARE_PAGES_API_TOKEN` (optional when Git-integrated Preview deployment is working): Account → Cloudflare Pages → Edit and User → Memberships → Read. Used for direct Preview upload.
- `CLOUDFLARE_ACCOUNT_ID`: the YR Proservice Cloudflare account identifier.

Keep the D1 token separate from the Pages deployment token. The existing `CLOUDFLARE_API_TOKEN` is not overwritten by this workflow. Never put token values in chat, source files or commits.

Verify these separately:
- Dependency installation, Vite build and Pages Functions build: successful for the exact latest commit.
- Preview D1 schema readiness: successful against the expected Preview database identity and schema.
- Cloudflare Pages Preview deployment: the `cms-development` branch serves the same hashed JS/CSS asset references as the verified build, and every referenced asset returns successfully. Direct upload additionally attaches the Git commit SHA when a Pages API token is configured.
- Authenticated CMS runtime: save, preview, publish and restore operations work against Preview.
- Automated tests, screenshots and image processing: deferred; do not imply these passed from a build-only workflow.

No Production deployment, Production database migration, PR merge or Production binding change is part of this workflow.

### Build-only workflow checkpoint — 19 November 2026

Commit `9427614eea6594485cc10b19bfacb91ade277f06` removed the automated test step from `.github/workflows/cms-build-check.yml`. The file was re-fetched from `cms-development` and confirmed to contain no test execution command. This confirms the workflow source configuration only; it does not prove that GitHub Actions ran, that the build passed, or that Preview deployed this commit.


## Browser cart-storage migration recovery

Legacy dental-chair entries found in `yr-cart` are moved to `yr-chair-requests` by the client-side providers. The migration writes the destination chair list first and rewrites the normal cart only after the destination write succeeds. A per-item migration quantity marker makes a retry safe if the destination write succeeds but the normal-cart rewrite fails. In that case the original cart remains intact until a later retry completes.

While migration is pending, cart and chair-request mutations and chair-request submission are paused. Public routes display a recovery message with a retry action. Storage read/write exceptions are caught; an unreadable source store is not replaced with an empty list. The retry logic and simulated quota failures are covered by `tests/cart-storage-migration.test.js`.

Do not manually clear `yr-cart` or `yr-chair-requests` to recover a failed migration. Use the on-page retry control first, and preserve both keys if the browser continues to reject writes.
