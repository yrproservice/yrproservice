# CMS draft showroom-card preview capability check

**Date:** 2026-11-25  
**Repository:** `yrproservice/yrproservice`  
**Branch inspected:** `cms-development`  
**Source reference:** `3331b226f2124da5e2542ce1e3c7cebff6daf234` (before this report commit)

## Scope

Determine whether the existing CMS Preview Product action can visually verify a draft product's showroom card summary without publishing the draft.

## Source findings

1. `functions/api/cms/admin/product-preview.js` selects the product's current draft version when present, otherwise the published version. It returns the selected product JSON, version number, draft flag, and published version number.
2. `src/pages/CMSProductPreview.jsx` fetches that endpoint and renders the result through `ProductDetails` with `previewMode`.
3. `src/components/ShowroomProductCard.jsx` renders `product.summary` in the showroom card.
4. The existing product preview page does not render `ShowroomProductCard` or a showroom listing/card composition.
5. The public product listing is based on published catalogue data; it is not a draft-specific card preview.

## Assessment

The current Preview Product feature verifies the draft product detail page, not the draft showroom card. Navigating to the ordinary public `/products` listing cannot be used to verify V6's summary while V4 remains published.

This is a source inspection, not a browser test. No source, database, CMS content, or deployment was changed.

## Safe next action

If draft showroom-card verification is required, treat it as a separate CMS preview capability enhancement: render the selected draft product using the existing showroom card component in a clearly marked administrator-only preview. Keep the public catalogue and published product data unchanged. Do not publish V6 merely to test its card summary.
