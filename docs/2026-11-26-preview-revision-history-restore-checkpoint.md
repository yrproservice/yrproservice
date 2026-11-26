# Preview CMS Revision History Restore Test — 26 November 2026

Status: **Blocked by lack of a suitable archived revision; no restore performed**

Repository: `yrproservice/yrproservice`  
Branch: `cms-development`  
Purpose: record the authenticated Preview Revision History observations and preserve the safe test boundary.

## Result

The manual restore test was not completed because the user could not identify an archived revision belonging to a supported CMS site-setting key.

User-reported Revision History observations:

| CMS item | Revisions shown | Assessment |
|---|---|---|
| `page-design.product-detail` | V1 · Draft (2026-11-12T02:39:26.879Z) | No Archived revision available |
| `page-design.products` | V2 · Draft (2026-11-13T02:29:45.070Z); V1 · Published (2026-11-12T02:39:24.719Z) | No Archived revision available |
| `qa.persistence-check` | V4, V3, V2, V1 · Archived | Not a supported setting key; do not restore |
| `site.navigation` | User reported no suitable archived revisions available | No suitable Archived revision identified |

The user confirmed that the `qa.persistence-check` list was the source of the four archived entries. These entries must not be used because the setting key is unsupported. The unsupported `revision-check-1` key must also never be retried.

The valid site-setting key family is `site.navigation`, `site.footer`, and `page-design.<supported-page-key>`; supported page keys include `product-detail` and `products`. The Revision History test should use only a supported key and a revision explicitly marked **Archived**.

## Safety and outcome

- No Restore as draft action was clicked.
- No draft was created or modified during this test.
- No revision was published.
- No Production deployment, database operation, or Cloudflare configuration change was performed.
- This is a **test-data limitation**, not evidence that the restore endpoint or restore UI is broken.
- Do not mark the supported-setting restore acceptance test as passed.

## Next safe path

To finish the restore acceptance test, first create or identify a disposable archived revision under a supported Preview setting. Prefer a dedicated, clearly labelled Preview-only test value in a supported setting, and preserve the original value so it can be restored. Then verify that the chosen history entry is explicitly marked **Archived**, restore it **as a draft only**, confirm the published version remains unchanged, and verify the resulting draft. Do not publish the test draft.

If creating a disposable revision would alter live Preview navigation, footer, or page design in a way that could affect Preview users, stop and implement a separate isolated test fixture/workflow instead. Do not use unsupported keys, and do not write to Production.

## User workflow constraints retained

- Preview-only work on `cms-development`.
- Production remains unchanged unless separately and explicitly approved.
- Product image acquisition/assignment remains the user's responsibility and is out of scope.
- Product price and stock values remain user-managed.
- Record future test evidence in Git, distinguishing user-confirmed browser observations from independently verified automation.
