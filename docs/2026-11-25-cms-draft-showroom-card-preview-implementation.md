# CMS draft showroom-card preview implementation

**Date:** 2026-11-25  
**Repository:** `yrproservice/yrproservice`  
**Branch:** `cms-development`  
**Scope:** Administrator-only preview enhancement; no production release.

## Implementation

Updated `src/pages/CMSProductPreview.jsx` to add a two-view selector:

- **Product details** continues to render the existing `ProductDetails` preview.
- **Showroom card** renders the selected preview product through the existing `ShowroomProductCard` component.
- The card view labels the selected draft version and states that the public Products page is unchanged.
- The card preview is non-interactive and hides the card action row, preventing cart/request actions or navigation from being triggered in the preview.

Updated `src/style.css` with scoped selector, preview stage, and narrow-screen layout styles. Existing public card component and public catalogue behavior were not changed.

## Source verification

- The preview page imports and renders `ShowroomProductCard`.
- The existing product-preview API continues to supply the saved draft version when one exists.
- The product preview's version indicator distinguishes draft from published content.
- The new card preview wrapper disables pointer interaction and hides the action row.
- No D1 or R2 operations were performed.
- No product content was saved, restored, deleted, or published.
- Production was not modified.

## CI and runtime status

A CMS Preview Build Check was triggered for implementation commit `829c33651132725f49316d6852cf69c2fcd67cf9` (run 45541350408). At report creation, the run was still **pending**. No successful build result is claimed here.

The feature has not yet been browser-verified in the deployed Preview environment. After the matching Preview deployment is available, verify the Showroom card selector using a draft product, confirm its summary and image, confirm the action row is absent/non-interactive, and confirm the public Products listing still reflects the published version.

## PR and environment safeguards

PR #2 remains Open/Draft and unmerged. Production remains untouched. Do not publish the Cattani AC 100 V6 product draft as part of this UI enhancement.
