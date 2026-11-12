# YR Proservice CMS — Preview Operations

## Environments

- Preview branch: `cms-development`
- Preview site: `https://cms-development.yrproservice.pages.dev`
- Preview D1 database: `yr-proservice-test-db`
- Preview D1 database ID: `7fca4ad0-3baa-4148-ad28-bfd2ef416c16`
- Preview R2 bucket: `yrproservice-cms-preview`
- Production website and database are separate. Do not run Preview migration commands against `yr-proservice-db`.

## Preview D1 migration workflow

The workflow is `Apply CMS Migration to Preview D1` in GitHub Actions. It applies only `migrations/0002_create_cms.sql` to `yr-proservice-test-db`, then lists the CMS tables for verification. It can be started manually with workflow_dispatch. It also runs when the Preview CMS migration SQL file changes.

The schema uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, so rerunning this specific migration is idempotent. Review future migrations before treating them as safe to rerun.

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

## Build checks and deployment distinction

The `CMS Preview Build Check` workflow runs `npm ci` and `npm run build` on pushes to `cms-development`. A successful build confirms the source compiles; it does not by itself prove that Cloudflare Pages has deployed the commit or that the Preview D1 migration has completed.

Verify these separately:
- GitHub Actions build check: successful for the latest commit.
- Cloudflare Pages Preview deployment: deployed commit matches the branch HEAD.
- D1 migration workflow: all three migration steps successful.
- Authenticated CMS runtime: save, preview, publish and restore operations work against Preview.

No Production deployment or Production database migration is part of this workflow.
