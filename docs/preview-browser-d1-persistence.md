# Preview browser-to-D1 persistence test

## Purpose

Verify that the real Preview website forms submit quotation, dental-chair, and service requests through the public request API, that each request can be tracked, and that each record is persisted in the Preview D1 database.

## Run

1. Open the GitHub Actions workflow **Preview Request Persistence Integration Test**.
2. Select **Run workflow**.
3. Select branch `test/preview-browser-d1-persistence`.
4. Start the workflow and inspect the job summary and `preview-browser-d1-persistence-report` artifact.

The workflow is manually dispatched from the default branch and checks out the selected test branch. The test target remains `https://cms-development.yrproservice.pages.dev`.

## Safety boundaries

- The browser script rejects any host other than `cms-development.yrproservice.pages.dev` over HTTPS.
- Before any browser submissions, Wrangler must confirm the exact Preview D1 name `yr-proservice-test-db` and UUID `7fca4ad0-3baa-4148-ad28-bfd2ef416c16`, and the expected request/history/rate-limit tables.
- The test uses unique synthetic identities with `example.invalid` email addresses.
- It submits through the real browser forms; it does not intercept or mock `POST /api/requests`.
- It verifies the returned reference, tracking endpoint, and exact Preview D1 row for each request type.
- Cleanup is restricted to records created by this run, matching exact reference, email, name, request type, and website source marker. Records with status history are never deleted.
- Matching test email hashes are removed from the submission/tracking rate-limit tables. Cleanup is checked for zero remaining synthetic request rows.
- No Production application code, Production D1, PR #2, product images, prices, or stock statuses are changed by this test.

## Current status

Implementation is committed on `test/preview-browser-d1-persistence`. The manual workflow entry point and Preview-only execution guard are committed on `main`. The actual browser run has not yet been dispatched; a maintainer must start the workflow from GitHub Actions and inspect the resulting run before marking the browser-to-D1 gate passed.
