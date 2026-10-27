# YR Proservice Phase 5 — Admin Dashboard

This phase adds a private request dashboard while preserving public request submission and customer tracking.

## Features

- `/admin` lists up to 200 newest requests and filters by type, status, reference, customer, email, or company.
- Request details show customer contact and submitted requirements.
- Administrators can update status to received, in review, contacted, completed, or cancelled.
- The status change is reflected by the existing public request tracking page.
- The dashboard API independently verifies the Cloudflare Access JWT and checks an email allowlist.
- No database migration is required.

## Required Cloudflare configuration

### 1. Protect the admin paths with Cloudflare Access

Create two separate Self-hosted Access applications on the same public website hostname because Cloudflare reports that a destination already belongs to another application when the paths are combined:

- **YR Proservice Admin** — path `/admin*` — Allow policy includes only `yr.proservice@gmail.com`.
- **YR Proservice Admin API** — path `/api/admin*` — Allow policy includes only `yr.proservice@gmail.com`.

Do not protect the entire public hostname: public pages, `/api/requests`, and `/api/track` must remain available to customers. Do not use a broad “Everyone” allow policy.

The two applications can have different Application Audience (AUD) tags. The server-side admin API verifies the Access JWT on `/api/admin*`, so set `ACCESS_AUD` below to the **AUD tag belonging to `YR Proservice Admin API`**. Do not use the `/admin*` application's AUD tag for this server-side variable.

### 2. Configure server-side Pages variables

Add the following as Cloudflare Pages Functions environment variables for Production. Configure Preview only if admin testing on previews is intended.

- `ACCESS_TEAM_DOMAIN`: Zero Trust team hostname only, such as `your-team.cloudflareaccess.com`, with no scheme or trailing slash.
- `ACCESS_AUD`: the AUD tag for the **YR Proservice Admin API** application (`/api/admin*`).
- `ADMIN_EMAILS`: exact administrator email address in lowercase; multiple addresses may be comma-separated.

Do not use `VITE_` prefixes or put these values in frontend code. Keep the existing D1 binding named `DB`.

### 3. Deploy and verify

1. Install dependencies and run a local production build first (`npm ci`, then `npm run build`). Deploy only if the build succeeds and the Access configuration has been checked.
2. Signed out, open `/admin` and verify Cloudflare Access requires authentication.
3. Sign in with the allowlisted account and verify the dashboard loads.
4. Check that requests without an Access JWT receive 401 and non-allowlisted identities receive 403 from the admin API.
5. Filter/search requests, update a status, then verify that status on `/track-request` using the matching reference and email.
6. Retest public service, quotation, dental-chair submission, and tracking flows.
7. Confirm invalid request types and statuses are rejected.

## Security and current limits

- Keep Cloudflare Access protection enabled; API JWT verification is defense in depth, not a replacement for the Access application.
- The API returns at most 200 matching records. Pagination, export, audit history, staff roles, and deletion are not included.
- Dashboard counts apply to the currently filtered result set.
- The API does not send email notifications.
- Before high-volume public use, add rate limiting or Cloudflare Turnstile/rate-limiting rules to reduce automated lookup attempts against public tracking.
