# Revision restore preflight — source inspection — 25 November 2026

## Scope
Read-only inspection of `src/pages/CMSManagement.jsx` and `functions/api/cms/admin/history.js` on `cms-development`. No browser restore action was triggered.

## Frontend behaviour
- Selecting **Restore as draft** calls `restoreRevision(type, key, id)`.
- The UI first verifies that the current entity is loaded and captures the current draft ID and creation timestamp.
- It displays a native confirmation dialog: **“Restore this revision as a new draft?”** and **“The current published version will remain live.”**
- If there are unsaved product-editor changes for the selected product, the dialog warns that those changes will also be discarded.
- The POST request is sent only after the user confirms. Cancelling the dialog returns without making the request.
- On success, the UI reports that the restored version is a draft and has not been published.

## Backend safeguards and effects
- The endpoint requires valid entity type, entity key, version ID, and a current-draft snapshot.
- It verifies the source revision belongs to the selected CMS item and validates the archived content before restoring.
- It compares the expected current draft ID and timestamp to detect concurrent changes.
- The batch operation archives an existing draft (if present) and inserts a new draft using the selected historical content. The published version is not replaced or published.
- An audit-log entry is written as part of the batch; success is returned only when the new draft and audit record are confirmed.
- For a product restore, this creates a new product revision with a change note such as `Restored from V3`; it does not directly change the published product.

## Safe next browser check
For `cattani-ac-100`, the user may click **Restore as draft** beside archived V3 solely to view the native confirmation dialog, then choose **Cancel**. Do not choose OK/Confirm. This tests that the UI presents the expected warning without creating a draft or changing the existing V5 draft.

## Limitations
This is source-derived behaviour, not a runtime test. No database writes, draft changes, publishing, deletion, restore, or deployment occurred. Production remains untouched.