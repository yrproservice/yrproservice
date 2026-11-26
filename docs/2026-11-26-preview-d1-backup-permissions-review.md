# Preview D1 Backup — Permissions and Safety Review

Review date: 26 November 2026\
Reviewed branch head: `cms-development` at `2bb1c3cccec26f67886ac63d7bdd6c7c038559eb`\
Status: **Review only — no workflow, credential, backup, or Cloudflare setting was created or changed**

## Scope and resources

This review covers only a future read-only SQL export of Preview D1
`yr-pro-service-test-db` (UUID
`7fca4ad0-3baa-4148-ad28-bfd2ef416c16`) and its storage in the private
`yrproservice-cms-recovery` R2 bucket.

The existing disaster-recovery plan records that the recovery bucket was
created, its Public Development URL and custom domain are disabled, and it has
no bucket-lock rules. Those settings were reported by the user from the
Cloudflare dashboard; they were not independently queried. The bucket remains
unverified as a backup destination until an object has actually been uploaded
and checked.

## Existing implementation reviewed

- `.github/workflows/cms-preview-recovery-retention.yml` is a scheduled and
  manually dispatchable Preview D1 cleanup job. It verifies the Preview
  database name and UUID, then **changes** expired section-recovery rows. This
  is retention cleanup, not a backup, and must not be reused or run for this
  backup task.
- `.github/workflows/cms-preview-migration.yml` applies schema migrations to
  Preview D1. It is mutating and is out of scope.
- `.github/workflows/cms-build-check.yml` performs build and verification
  tasks; it is not a D1 export workflow.
- `wrangler.toml` binds Preview CMS media to `yrproservice-cms-preview`. It
  does not bind the recovery bucket. The backup workflow should use a
  bucket-scoped S3-compatible client rather than modify application bindings.
- `package.json` does not declare Wrangler or an S3 client dependency. Existing
  workflows invoke a pinned Wrangler with `npx wrangler@4.157.0`; there is no
  existing backup dependency or backup script.
- The current workflow inventory has no D1 export-to-R2 backup workflow.

The documented D1 export command is:

```sh
npx wrangler@4.157.0 d1 export yr-pro-service-test-db --remote --output=preview-d1.sql
```

Cloudflare documents that an active D1 export blocks other database requests
until the export completes. Any approved run should therefore be manually
triggered during a low-traffic window, not scheduled by default.

## Exact access and credentials needed

### D1 export via Wrangler

Wrangler requires a Cloudflare API token and the non-secret
`CLOUDFLARE_ACCOUNT_ID`. Existing repository workflow conventions suggest a
read token needs:

- Account → D1 → Read, scoped to the YR Proservice Cloudflare account.
- User → Memberships → Read, if required by Wrangler authentication (the
  existing Wrangler workflows include this permission).

No D1 Edit permission is needed for export. Do not reuse
`CLOUDFLARE_D1_API_TOKEN`, because existing migration workflows use that
credential for D1 Edit.

**Important scope limitation:** Cloudflare documents D1 Read as an account
permission. The reviewed documentation does not offer a D1-database-specific
scope for this permission. A token with D1 Read scoped to the YR Proservice
account is not global across Cloudflare accounts, but it can read D1 resources
within that Cloudflare account, not just `yr-pro-service-test-db`. Therefore
the requested no-account-wide-Cloudflare-credential boundary is not met by a
new Wrangler D1 token. Do not create or add one without explicit approval of
this broader account-level read scope, or selection of another approved
architecture.

### Upload and verify in the private recovery bucket

Cloudflare supports an R2 API token with:

- Permission: **Object Read & Write**.
- Resource scope: only the `yrproservice-cms-recovery` bucket.
- API: the R2 S3-compatible API (for example, AWS SDK / S3 client).

Object Read & Write is needed because the workflow must upload the SQL and
read/check the uploaded object. Cloudflare states these bucket-scoped token
permissions are supported by the S3-compatible API, not the Cloudflare REST
API. Do not use a Cloudflare account-level R2 Admin token or Wrangler REST
upload for this purpose.

If later approved and the token is created by the owner, the workflow would
need GitHub Actions secrets for the R2 Access Key ID and Secret Access Key,
plus the non-secret account ID, endpoint, and fixed bucket name. Suggested
secret names are `R2_RECOVERY_ACCESS_KEY_ID` and
`R2_RECOVERY_SECRET_ACCESS_KEY`; these names are proposals only and no secrets
exist or were checked.

The GitHub workflow itself should have only `contents: read` permissions. No
GitHub write permission or Pages deployment token is required.

## Approval gate

Before workflow implementation, resolve the D1 scope conflict: either approve
a dedicated account-scoped, D1-Read-only Cloudflare API token (which still
covers D1 resources in that account), or approve another way to export the
database that does not require that token. No credential should be created as
part of this review.

After that decision, approval is still required before creating or configuring
any Cloudflare credential or GitHub secret. The workflow must remain manual
only and fail closed unless it verifies both the exact Preview database name
and UUID. It must export only that database, upload only to
`yrproservice-cms-recovery`, and verify the resulting object by reading it and
comparing its size and checksum to the local SQL file. It must not import SQL,
execute SQL, restore, migrate, deploy, access Production, or touch
`yrproservice-inventory-media`.

## Manual local procedure — investigated, not executed

Wrangler supports interactive OAuth login on a local workstation. This can
export Preview D1 without creating an API token or GitHub Actions secret.
However, OAuth is still a Cloudflare credential: by default Wrangler writes
the OAuth access and refresh tokens to its global plaintext TOML config file.
On Windows, `npx wrangler@4.157.0 login --use-keyring` stores them using
Windows Credential Manager instead. Do not run login as part of this review.

Cloudflare documents that `wrangler login` does **not** support granular
authorization. The interactive OAuth credential is not a D1-only token and
does not provide a database-specific access boundary. It uses the signed-in
user's Cloudflare access, which may extend to other resources/accounts. The
user must have permission to read/export D1 data in the selected account;
D1 Edit is not needed. Before login, inspect the available OAuth scope names
with `npx wrangler@4.157.0 login --scopes-list`; do not accept Wrangler's
default of all available scopes without reviewing them. The current reviewed
documentation does not establish a minimal OAuth scope set that guarantees
only access to this one D1 database. If that boundary is required, stop rather
than proceeding with local OAuth.

If separately approved by the operator, the manual runbook is:

1. Use VS Code's **local** PowerShell terminal, not a Codespace, remote
   container, CI runner, or shared machine. Confirm
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_API_KEY`, and `CLOUDFLARE_EMAIL` are
   not set so environment credentials cannot override OAuth. Do not print or
   copy their values. Set the non-secret `CLOUDFLARE_ACCOUNT_ID` for the
   intended YR Proservice account. Do not put these values in a project file.
2. If a local OAuth login is needed, review `--scopes-list` first. Proceed
   only if you can select a permission set you have approved; pass that
   reviewed set explicitly with `--scopes` and `--use-keyring`. Wrangler's
   default is all available OAuth scopes. If no acceptable set is clear, stop.
   Approve the resulting browser flow only after reviewing the account and
   consent screen. Confirm the selected account with
   `npx wrangler@4.157.0 whoami`. This creates local OAuth credentials and is
   not performed by this review.
3. Run the read-only identity check:

   ```powershell
   npx wrangler@4.157.0 d1 info yr-pro-service-test-db --json
   ```

   Continue only if the output identifies **both** database name
   `yr-pro-service-test-db` and UUID
   `7fca4ad0-3baa-4148-ad28-bfd2ef416c16`. If the result is missing, malformed,
   ambiguous, or mismatched, stop.
4. Choose a low-traffic window. Export to an access-controlled local directory
   outside the repository and outside cloud-synced folders, using a unique
   timestamped filename:

   ```powershell
   $stamp = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
   $backupDir = Join-Path $env:LOCALAPPDATA "YRProservice\Recovery"
   New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
   $sqlFile = Join-Path $backupDir "yr-pro-service-test-db-$stamp.sql"
   npx wrangler@4.157.0 d1 export yr-pro-service-test-db --remote --output $sqlFile
   ```

   Confirm the command succeeded and the file exists and is non-empty. D1
   exports block other database requests while active; avoid peak traffic.
   The export reads the database and writes a local file; do not run
   `d1 execute`, migrations, or restore commands.
5. Create or use an R2 S3 API token with **Object Read & Write** scoped only
   to `yrproservice-cms-recovery`. This is a separate credential from Wrangler
   OAuth. Use the bucket-scoped S3-compatible API, not Wrangler's REST
   `r2 object put` command or an account-wide R2 Admin token. The standard
   endpoint is
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`; confirm the bucket's
   jurisdiction before using it. AWS CLI's region value is `auto`.
6. If separately authorized to create/use that R2 token, supply the Access
   Key ID and Secret Access Key to the AWS CLI only for the current terminal
   session (or use another approved secret manager). Do not use `aws configure`
   with its default plaintext credentials file. For an interactive session,
   prompt for both values without putting either in command history:

   ```powershell
   $secureKeyId = Read-Host "R2 Access Key ID" -AsSecureString
   $secureSecret = Read-Host "R2 Secret Access Key" -AsSecureString
   $keyIdPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKeyId)
   $secretPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
   try {
     $env:AWS_ACCESS_KEY_ID = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyIdPtr)
     $env:AWS_SECRET_ACCESS_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPtr)
   } finally {
     [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyIdPtr)
     [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPtr)
   }
   $env:AWS_DEFAULT_REGION = "auto"
   ```

   These credentials remain available in that PowerShell process environment
   until removed, so use a trusted local machine and clear them after the
   transfer. Upload to a new, unique key; never reuse a key that could
   overwrite an existing backup:

   ```powershell
   $endpoint = "https://$env:CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com"
   $key = "preview-d1/$stamp/$(Split-Path -Leaf $sqlFile)"
   aws s3api put-object --endpoint-url $endpoint --bucket yrproservice-cms-recovery --key $key --body $sqlFile
   ```

7. Verify object length, download the exact key to a separate local check file,
   then compare SHA-256 hashes. A successful upload response or ETag alone is
   not sufficient integrity evidence:

   ```powershell
   $localSize = (Get-Item $sqlFile).Length
   $remoteSize = aws s3api head-object --endpoint-url $endpoint --bucket yrproservice-cms-recovery --key $key --query ContentLength --output text
   if ([Int64]$remoteSize -ne $localSize) { throw "Uploaded size mismatch" }
   $checkFile = "$sqlFile.r2-check"
   aws s3api get-object --endpoint-url $endpoint --bucket yrproservice-cms-recovery --key $key $checkFile
   $localHash = (Get-FileHash $sqlFile -Algorithm SHA256).Hash
   $remoteHash = (Get-FileHash $checkFile -Algorithm SHA256).Hash
   if ($localHash -ne $remoteHash) { throw "Uploaded SHA-256 mismatch" }
   ```

   Record only the UTC time, Preview database name/UUID, object key, file size,
   and checksum in the recovery record. Never include SQL contents or
   credentials in Git, chat, logs, or workflow output. Remove the R2 keys from
   process environment variables after the transfer:

   ```powershell
   Remove-Item Env:AWS_ACCESS_KEY_ID, Env:AWS_SECRET_ACCESS_KEY, Env:AWS_DEFAULT_REGION -ErrorAction SilentlyContinue
   ```

   Retain or dispose of the local SQL and verification copy under an approved
   data-retention policy.

## Risks and restore considerations

- The SQL contains a full copy of Preview D1 data and may include personal or
  customer information. Treat local files and the R2 object as sensitive. The
  recovery bucket's public URL is reported disabled; preserve that setting and
  do not generate public or presigned URLs.
- Interactive login avoids a GitHub Actions API-token secret, but it does not
  avoid creating/storing a local OAuth credential or grant a per-database
  access boundary. Keyring storage reduces local-at-rest exposure; it does not
  narrow the credential's authorization.
- The D1 SQL export is a point-in-time artifact, not a coordinated D1+R2 media
  recovery set. It does not copy CMS media objects from
  `yrproservice-cms-preview`; media objects and CMS records may change at
  different times.
- A successful export and byte-for-byte readback do not prove that the SQL
  will restore successfully. Cloudflare documents export limitations,
  including virtual tables. Review the dump format and supported schema before
  any restore attempt.
- Any later restore is a separate, mutating operation requiring explicit
  approval. Restore only into an isolated recovery D1 such as
  `yrproservice-recovery`, after verifying its exact name and UUID and
  confirming its intended state. Never execute the dump against Preview or
  Production. A D1-only restore does not restore R2 media.
- The recovery R2 bucket has no bucket-lock rule or completed-object lifecycle
  policy in the user-reported settings. Use unique keys, do not overwrite or
  delete prior objects, and decide retention separately.

## Official documentation

- [Cloudflare D1 export command](https://developers.cloudflare.com/workers/wrangler/commands/d1/#d1-export)
- [Cloudflare D1 import/export behavior and limitations](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [Wrangler OAuth login and local keyring storage](https://developers.cloudflare.com/workers/wrangler/commands/general/#login)
- [Wrangler authentication profiles](https://developers.cloudflare.com/workers/wrangler/profiles/)
- [Cloudflare roles, scopes, and Wrangler OAuth granularity](https://developers.cloudflare.com/workers/authorization/)
- [Cloudflare API token permissions](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
- [Cloudflare R2 token permissions and bucket scoping](https://developers.cloudflare.com/r2/api/tokens/)
- [Cloudflare R2 CLI usage](https://developers.cloudflare.com/r2/get-started/cli/)
- [AWS CLI with Cloudflare R2](https://developers.cloudflare.com/r2/examples/aws/aws-cli/)
- [Cloudflare R2 Wrangler REST-token limitation](https://developers.cloudflare.com/r2/platform/troubleshooting/#object-level-api-tokens-fail-against-the-rest-api)
