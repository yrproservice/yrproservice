# YR Proservice Phase 5 — Admin Dashboard

This phase adds a private request dashboard while preserving public request submission and customer tracking.

## Features

- `/admin` lists up to 200 newest requests and filters by type, status, reference, customer, email, or company.
- Request details show customer contact and submitted requirements.
- Administrators can update status to received, in review, contacted, completed, or cancelled.
- The status change is reflected by the existing public request tracking page.
- The dashboard API independently verifies the Cloudflare Access JWT and enforces one authorized account.
- Multiple people may take turns using the single authorized account; only one active browser/device session is permitted at a time.
- No database migration is required.

## Required Cloudflare configuration

### 1. Protect the admin paths with Cloudflare Access

Create two separate Self-hosted Access applications on the same public website hostname because Cloudflare reports that a destination already belongs to another application when the paths are combined:

- **YR Proservice Admin** — path `/admin*` — Allow policy includes only `yr.proservice@gmail.com`.
- **YR Proservice Admin API** — protect both `/api/admin*` and `/api/cms/admin*` on each Preview hostname used for CMS administration. Keep the Allow policy limited to `yr.proservice@gmail.com`. The existing CMS endpoints use the same server-side Access JWT verifier and API audience; no second API application is required.

Do not protect the entire public hostname: public pages, `/api/requests`, and `/api/track` must remain available to customers. Do not use a broad “Everyone” allow policy or add other email identities to either Admin application.

The two applications can have different Application Audience (AUD) tags. The server-side admin API verifies the Access JWT on `/api/admin*`, so set `ACCESS_AUD` below to the **AUD tag belonging to `YR Proservice Admin API`**. Do not use the `/admin*` application's AUD tag for this server-side variable.

### 2. Configure server-side Pages variables

Add the following as Cloudflare Pages Functions environment variables for Production. Configure Preview only if admin testing on previews is intended.

- `ACCESS_TEAM_DOMAIN`: Zero Trust team hostname only, such as `your-team.cloudflareaccess.com`, with no scheme or trailing slash.
- `ACCESS_AUD`: the AUD tag for the **YR Proservice Admin API** application (`/api/admin*`).
- `ADMIN_EMAILS`: exactly `yr.proservice@gmail.com`. This must be a single email address; comma-separated additional addresses are rejected by the server.

Do not use `VITE_` prefixes or put these values in frontend code. Keep the existing D1 binding named `DB`.

### 3. Deploy and verify

1. Install dependencies and run a local production build first (`npm ci`, then `npm run build`). Deploy only if the build succeeds and the Access configuration has been checked.
2. Signed out, open `/admin` and verify Cloudflare Access requires authentication.
3. Sign in with `yr.proservice@gmail.com` and verify the dashboard loads.
4. Check that requests without an Access JWT receive 401 and every other identity receives 403 from the admin API.
5. Verify that the single authorized account can start Admin, while a second browser/device receives HTTP 409 until the first session logs out or expires.
6. Filter/search requests, update a status, then verify that status on `/track-request` using the matching reference and email.
7. Retest public service, quotation, dental-chair submission, and tracking flows.
8. Confirm invalid request types and statuses are rejected.

## Security and current limits

- Keep Cloudflare Access protection enabled; API JWT verification is defense in depth, not a replacement for the Access application.
- The API returns at most 200 matching records. Pagination, export, audit history, staff roles, and deletion are not included.
- Dashboard counts apply to the currently filtered result set.
- The API does not send email notifications.
- Before high-volume public use, add rate limiting or Cloudflare Turnstile/rate-limiting rules to reduce automated lookup attempts against public tracking.

## Client / Admin entry mode

The public application now presents a first-entry choice. Client mode opens the public site and remembers the choice for the current browser tab. Admin mode navigates to the existing protected `/admin` route; after the existing request-dashboard API returns a successful, server-verified response, the application returns the administrator to the public homepage and displays the Admin navigation menu. The menu is a convenience only: all dashboard and CMS endpoints continue to enforce Cloudflare Access JWT validation and the single-account allowlist on the server.

On page refresh, Admin mode is revalidated through the existing `GET /api/admin/requests` endpoint. No new API, Access application, database, or Production binding is introduced by this feature.

For Preview, ensure the existing **YR Proservice Admin** Access application covers `/admin*` and the existing **YR Proservice Admin API** application covers both `/api/admin*` and `/api/cms/admin*` on the current Preview hostname. The API application's AUD must match the Preview `ACCESS_AUD` value. Access hostname/path configuration is managed in Cloudflare Zero Trust, not in this repository.

## Single-account, single-device Admin session and logout

The server accepts exactly one administrator identity: `yr.proservice@gmail.com`. Several people can use this shared authorized account at different times, but the app does not create or authorize separate staff accounts. The Preview application enforces one active Admin browser/device session using the existing Preview D1 database binding. The first Admin device atomically acquires the singleton `admin_session_lock` row through `POST /api/admin/session`. The lock is renewed every 30 seconds and expires after 90 seconds without a heartbeat. A second device receives HTTP 409 and is not allowed into Admin. The lock table is created automatically on first use in the bound D1 database; no additional database or API application is required.

Logout is available in the Admin navigation and on Admin workspace routes. It calls `DELETE /api/admin/session`, releases only the current browser's lock, clears its HttpOnly session cookie and returns to the Client/Admin entry screen. If the browser closes unexpectedly or loses connection, the lock expires within 90 seconds. All existing dashboard and CMS API handlers use `requireAdmin`, which checks the Cloudflare Access identity, the one-account allowlist, and the active single-device session.

The lock is scoped to the Cloudflare Pages environment's existing D1 binding: Preview uses `yr-proservice-test-db`; Production would use `yr-proservice-db` only when a separately approved Production deployment is made. Do not merge or deploy to Production as part of Preview verification.
