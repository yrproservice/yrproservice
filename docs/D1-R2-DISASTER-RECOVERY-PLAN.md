# YR Proservice D1 + R2 Disaster-Recovery Plan

Status: **Planning only — not an executed backup or restore procedure**  
Repository branch: `cms-development`  
Last reviewed: 25 November 2026

## 1. Scope and safety boundary

This plan covers the Cloudflare D1 database and R2 media objects used by the YR Proservice CMS. It is a release-readiness design, not evidence that backups exist or that recovery has been tested.

Current known resource identities:

| Environment | D1 database | D1 UUID | R2 |
|---|---|---|---|
| Preview | `yr-proservice-test-db` | `7fca4ad0-3baa-4148-ad28-bfd2ef416c16` | `yrproservice-cms-preview` |
| Production | `yr-proservice-db` | `9bf690db-a74b-43e9-8c38-cc8bab18a9f1` | Production CMS_MEDIA bucket not yet established in reviewed `wrangler.toml` |

**Hard safety rules**

- Never use Preview credentials, bucket names, public URLs, or database IDs for Production.
- Before every D1 export, migration, restore, or destructive action, verify both the exact database name and UUID from Cloudflare account metadata. Fail closed on missing, malformed, or mismatched identity.
- Never run a restore into the live Production database as a rehearsal.
- Never delete or overwrite R2 objects as part of an initial restore test.
- Do not store API tokens, secrets, private keys, customer data exports, or signed URLs in Git.
- Keep PR #2 Draft and unmerged until the release gates and explicit release approval are complete.

## 2. Current evidence and unknowns

The reviewed repository has a Preview-only R2 binding and Preview media public base in `wrangler.toml`. The Production environment currently has a D1 binding but no corresponding Production `CMS_MEDIA` binding or `CMS_MEDIA_PUBLIC_BASE` entry in that file.

The scheduled workflow `.github/workflows/cms-preview-recovery-retention.yml` purges expired section-recovery payloads from Preview D1 after checking its exact identity. This is retention cleanup, **not** a backup.

CMS media archive/restore is an application-level soft-archive workflow. It retains the R2 object and checks object existence during restore. It is not an independent copy of the bucket.

The following account-level facts have not been verified and must remain open until checked in Cloudflare:

- Whether D1 point-in-time recovery, automatic backups, or export facilities are enabled for each database.
- Their actual retention windows, restore-point granularity, limitations, and restore destination behavior.
- Whether R2 object versioning, replication, or another supported independent-copy mechanism is available and enabled for the intended Production bucket.
- Whether the GitHub Actions Cloudflare token has only the permissions needed for the intended backup operations.

Do not describe any of these features as enabled or disabled until account evidence is recorded.

## 3. Backup design

### 3.1 D1

Before every Production schema migration or release operation that can change data:

1. Confirm the Production database name and UUID through Cloudflare account metadata.
2. Record the UTC start time, operator, release/commit identifier, migration set, and database identity in a restricted backup register.
3. Create a supported D1 export/backup using the verified Cloudflare mechanism available to the account.
4. Store the backup outside the source repository in an access-controlled destination independent of the source database.
5. Record the export identifier, object/location, size, completion status, and integrity/checksum evidence where supported.
6. Verify that the backup can be read and that its schema/content is internally consistent. Do not put customer data or credentials in the Git register.

A migration must not proceed if the required pre-change backup cannot be completed and verified.

### 3.2 R2 media

Before Production media publishing or migration:

1. Establish the intended Production bucket, binding, and public base as a separate reviewed configuration decision.
2. Confirm the bucket identity and permissions before any object operation.
3. Establish an independent backup/copy mechanism supported by the account. It must preserve object keys and object bytes, not merely list object names.
4. Preserve relevant metadata, content type, custom metadata, and any required cache/HTTP metadata.
5. Produce a manifest that can be reconciled with D1 media records, including object key, size, content type, and checksum/ETag where available.
6. Verify copied objects by reading/checking them in the backup destination. A successful listing alone is insufficient.

Do not assume R2 versioning or cross-bucket replication is enabled. Confirm feature availability and configuration in the account first.

### 3.3 Cross-resource consistency

D1 media rows and R2 objects form a linked recovery set. A D1 snapshot without its referenced R2 objects can restore broken media links; an R2 copy without matching D1 metadata can leave untracked objects.

For a consistent recovery point:

- Define a controlled backup window and temporarily avoid CMS media writes/publishing during the capture, or use a documented reconciliation method for writes that occur during the window.
- Capture the D1 backup and R2 object manifest/copy with timestamps and a shared recovery-point identifier.
- Reconcile active and archived D1 media references against the R2 manifest.
- Preserve archived objects as well as active objects where application recovery depends on them.
- Record any objects uploaded or changed during the backup window and ensure they are included or explicitly reconciled.

## 4. Retention, security, and ownership decisions

Before enabling recurring Production backups, the project owner must approve:

- Backup frequency and retention tiers.
- Recovery Point Objective (maximum acceptable data loss) and Recovery Time Objective (maximum acceptable restoration time).
- Independent backup destination and its region/account ownership.
- Encryption at rest/in transit and key ownership/rotation.
- Least-privilege Cloudflare and backup-storage access.
- Named backup operator and recovery approver.
- Monitoring, failure notifications, and periodic restore-drill ownership.

These values are intentionally **TBD**. Do not invent targets or silently adopt Preview's 30-day section-recovery retention as a database/media backup policy.

## 5. Isolated restore rehearsal — required before Production release

Use a separate non-Production recovery environment with new, clearly named D1 and R2 resources. Never point the rehearsal at Production.

1. Select one recorded recovery-point identifier and verify its D1 and R2 backup artifacts.
2. Restore D1 into the isolated recovery database using the supported Cloudflare restore/import procedure.
3. Restore the matching R2 object set into an isolated recovery bucket, preserving keys and metadata.
4. Configure only the isolated test Worker/Pages environment to use those resources.
5. Run schema and migration-state checks.
6. Reconcile D1 media rows to R2 objects, including active and archived references.
7. Exercise representative read-only CMS page/product/media retrieval and a controlled non-customer test upload if the environment supports it.
8. Verify that no Preview or Production resource was modified.
9. Record duration, errors, missing objects/rows, integrity results, and actual recovery point/time achieved.
10. Fix gaps and repeat until the project owner accepts the result.

A successful SQL import alone is not a successful D1+R2 restore drill.

## 6. Release gate checklist

- [ ] Confirm Cloudflare D1 backup/PITR/export capabilities and actual settings for Production.
- [ ] Verify a pre-change Production D1 backup/export and its integrity.
- [ ] Establish and verify an independent Production R2 backup/copy and manifest.
- [ ] Define and approve cross-resource consistency procedure.
- [ ] Approve retention, RPO, RTO, encryption, access, monitoring, and owners.
- [ ] Complete an isolated D1+R2 restore rehearsal and retain its evidence.
- [ ] Establish Production CMS_MEDIA bucket, binding, and public base separately from Preview.
- [ ] Review Production migration sequence and rollback/recovery steps before execution.

## 7. Execution record

As of this plan's creation:

- No Production D1 export or backup was performed by this work.
- No Production R2 copy or backup was performed.
- No Production restore, migration, data mutation, or binding change was performed.
- No isolated D1+R2 restore rehearsal has been completed.
- Cloudflare account-level backup/PITR configuration and retention remain unverified.

Update this section only with verifiable execution evidence. Keep credentials and customer data out of the record.


## 8. Cloudflare platform capabilities checked against official documentation

Official Cloudflare documentation was reviewed on 25 November 2026. This is product-level documentation, **not account-specific verification**.

### D1 Time Travel

Cloudflare documents D1 Time Travel as automatically enabled for databases on its production storage subsystem. It provides point-in-time restore to any minute within the plan's retention window: 7 days on Workers Free or 30 days on Workers Paid. The database's `version` from `wrangler d1 info` distinguishes the production storage subsystem from legacy alpha storage. The current YR Proservice database versions and account plan have not been retrieved, so the actual applicable retention for either YR Proservice database is still unverified.

A Time Travel restore overwrites the target database in place. It is not a safe rehearsal mechanism against Production. It also does not provide an independent long-term export by itself. A separate export to R2 is documented by Cloudflare for retention beyond the Time Travel window.

References:
- [D1 Time Travel and backups](https://developers.cloudflare.com/d1/reference/time-travel/)
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

### R2 durability and bucket locks

Cloudflare documents R2 as storing redundant copies/erasure-coded data across multiple data centers within a region, with strong consistency. This is infrastructure durability, not protection against an authorized or accidental object overwrite/deletion. Cloudflare separately provides R2 bucket-lock rules that can prevent overwrites and deletions for a specified period or indefinitely. A bucket lock is a retention guard, not a second independent backup copy; it can also block intended cleanup and must be designed carefully.

The account's current R2 bucket-lock configuration has not been inspected. Do not enable a lock rule on Preview or Production as part of this planning step.

References:
- [R2 durability](https://developers.cloudflare.com/r2/reference/durability/)
- [R2 bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/)
- [R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/)

### Revised verification actions

- [ ] Run read-only `wrangler d1 info` for each database and record its storage `version`; verify the actual account plan before assigning the 7-day/30-day Time Travel retention.
- [ ] Confirm current Time Travel bookmark retrieval works for each database without invoking restore.
- [ ] For any recovery rehearsal, restore/export into a separate isolated database; never use the in-place Production restore command as a test.
- [ ] Confirm the supported D1 export-to-R2 process and whether the export destination is independent of the source account/bucket.
- [ ] Inspect the actual R2 bucket-lock configuration read-only for each relevant bucket; decide whether a retention rule is appropriate only after reviewing upload, replacement, archive and cleanup behavior.
- [ ] Design an independent R2 object copy and manifest. R2's built-in durability and bucket locks do not replace this copy.


## 9. Repository workflow inventory — 26 November 2026

A read-only review of the `.github/workflows` directory on `cms-development` was completed on 26 November 2026.

- The repository contains the scheduled `cms-preview-recovery-retention.yml` workflow. It verifies the Preview D1 database name and UUID, then purges expired section-recovery payloads from Preview D1. It does **not** export or back up D1, copy R2 objects, create a recovery manifest, or perform a restore.
- No dedicated D1 backup/export, R2 independent-copy, or combined D1+R2 restore-rehearsal workflow was present in the reviewed workflow directory.
- The user-confirmed Preview Media Library upload/archive/restore acceptance test verifies the application-level media lifecycle for a temporary non-product image. It is not evidence of an independent R2 backup or a D1+R2 disaster-recovery restore.
- Existing automated Preview D1 request-persistence tests verify application data persistence and cleanup; they are not backup or restore evidence.

**Conclusion:** Preview D1+R2 backup/restore readiness remains unverified and the isolated restore rehearsal remains open. Do not treat the scheduled retention job, Media Library archive/restore, or request-persistence integration tests as backups.

**Safe next implementation gate:** before adding or running a backup workflow, establish an approved isolated recovery target and a least-privilege credential plan. The workflow must fail closed on exact Preview D1 name/UUID and R2 bucket identity, write backup artifacts only to an explicitly designated isolated destination, verify integrity, and never target Production. No such resources or credentials were created or changed during this review.


## 10. Cloudflare resource provisioning checkpoint — 26 November 2026

The user has now confirmed the following Cloudflare resources in the account dashboard:

| Purpose | Resource | Identity / status |
|---|---|---|
| Preview CMS media | R2 bucket `yrproservice-cms-preview` | Existing; user-provided dashboard listing showed 3 objects (73.9 kB) |
| Production CMS media | R2 bucket `yrproservice-cms-production` | Created; user confirmed bucket listing. No custom domain is assigned and the Public Development URL is disabled. |
| Recovery database | D1 database `yrproservice-recovery` | Created; database UUID `edbacdd0-efb0-4b52-8fe3-2002ec01e1af` (provided by user) |
| Recovery copy destination | R2 bucket `yrproservice-cms-recovery` | Created; user confirmed it appears in the bucket listing. Public-access configuration has not been independently inspected. |
| Separate inventory system | R2 bucket `yrproservice-inventory-media` | Explicitly identified by the user as belonging to the separate inventory system; do not bind, copy to, or modify it for the website CMS. |

The user does not yet own a business custom domain. The user selected the option to wait for a business domain rather than enable the R2 Public Development URL. Therefore Production CMS public media delivery remains intentionally unconfigured: do not add a Production `CMS_MEDIA_PUBLIC_BASE` or expose the bucket until a suitable domain is available and the user approves the configuration. The new Production bucket is not yet bound in `wrangler.toml`.

No backup/export, object copy, migration, restore, or data write has been performed. The Recovery D1 and R2 resources are provisioned but empty/unverified; their existence is not evidence of a backup. No Cloudflare API token or GitHub secret has been supplied or configured. Do not create a scheduled or executable backup workflow until its least-privilege credential design, exact resource identity checks, consistency procedure, and retention/RPO/RTO approvals are in place.

The next safe steps are to verify the Recovery R2 bucket's access configuration in the dashboard, then design and review the isolated Preview-to-Recovery backup procedure. Production remains out of scope for this rehearsal. Keep PR #2 Draft and unmerged; do not perform Production configuration or release operations without explicit approval.


## 11. Recovery R2 access-settings verification — 26 November 2026

The user inspected the Cloudflare dashboard Settings page for `yrproservice-cms-recovery` and supplied the following settings:

- Custom Domains: no custom domain assigned.
- Public Development URL: disabled.
- Basin Catalog: disabled.
- CORS: no policy defined.
- Object Lifecycle Rules: the default multipart-abort rule is enabled and aborts incomplete multipart uploads after 7 days.
- Bucket Lock Rules: none defined.

These are user-reported dashboard observations, not an independent API inspection. The bucket is not publicly exposed through either a custom domain or the R2 development URL. No CORS policy is currently configured; do not add one unless a specific browser-based recovery workflow requires it. The multipart-abort rule applies to incomplete multipart uploads and is not a completed-object backup retention policy. No bucket lock is currently configured; do not add one until object overwrite, restore, and cleanup behavior has been designed and tested.

Recovery R2 access settings are acceptable for the planned private recovery destination at this stage. The bucket remains empty/unverified until an actual backup is written and independently checked. No backup, object copy, restore, or Production operation was performed as part of this verification.
