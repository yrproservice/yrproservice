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
