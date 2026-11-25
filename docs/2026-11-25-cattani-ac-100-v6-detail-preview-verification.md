# Cattani AC 100 — V6 product detail preview verification

**Date:** 2026-11-25  
**Environment:** Cloudflare Preview CMS administrator product preview  
**Product:** `cattani-ac-100`  
**Evidence source:** Product preview text pasted by the user. This was not an independent browser replay.

## Verified preview

The administrator preview was explicitly marked **Not published** and displayed:

- Product: AC 100
- Brand: Cattani
- Brand line: Oil-less Dental Air Compressor
- Price: RM 1.00
- Availability: Availability to be updated
- Description: The V6 AC 100 description, matching the inspected draft text
- Manufacturer information link: Cattani Air Care horizontal oil-less compressors
- Preview notice: ordering disabled; no cart or quotation action will be submitted

The product detail preview also displayed the product image and the Product Details / Specifications / Reviews navigation.

## Assessment and limitations

The V6 product detail preview renders the corrected description as expected. This preview does not display the showroom card summary, so the V6 summary's card rendering has not yet been visually verified.

The user previously declined to review or change the price and stock fields. They remain unchanged.

No save, publish, restore, delete, or database mutation was performed. The draft remains V6; the live published version remains V4.

## Next verification

Close the administrator preview and inspect the AC 100 showroom card through an appropriate draft-preview mechanism, if available. Do not use the public published Products listing as proof of V6 because that listing continues to use the published version until publication.
