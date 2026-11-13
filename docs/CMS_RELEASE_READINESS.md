# YR Proservice CMS — Release Readiness Audit

**Audit date:** 13 November 2026  
**Working branch:** `cms-development`  
**Pull request:** #2 — remains open and draft  
**Release status:** Not approved for Production

This audit was performed against the current `cms-development` source. Changes in this audit are Preview/development work only. No Production bindings, Production data, merges or Production deployments were changed.

## Completed during this audit

- Connected homepage featured-product cards to published CMS product data.
- Connected published `site.navigation` and `site.footer` settings to the public layout, with safe internal/external link handling.
- Added the missing HR-only `/contact` route and added it to default navigation, footer and Visual Design Studio options. It currently uses the existing published company email address; confirm that this inbox is appropriate for HR enquiries before release.
- Fixed published archived-product handling so archived items do not reappear through static catalogue fallbacks and direct product URLs return an unavailable response.
- Added product-image source resolution: public product views prefer approved local catalogue images or Preview R2 media, rather than old external image URLs.
- Reassigned product images to exact matching files in the repository catalogue. A repository scan found 149 distinct catalogue image paths and all referenced files exist. No external image URL literals remain in the static product catalogue.
- Added neutral image fallback handling for products without a matched catalogue image.
- Hardened R2 media uploads with file-signature validation, a 12 MB limit and rejection of SVG/unverified formats.
- Prevented media deletion when the image is referenced by saved product, page or site-setting versions, including revision history.
- Increased new request-reference randomness to 64 bits and added hashed-IP/email rate limits to public tracking and request-submission endpoints.
- Corrected coupling manufacturer identities for KaVo, W&H and NSK.
- Added or improved manufacturer-source references and model-specific technical data where matching official manufacturer pages, brochures or manuals were available.
- Removed unsupported Fussen scanner technical specifications pending confirmation of the exact model.
- Added automated tests for approved product image sources and product catalogue image integrity.

## Automated verification

- GitHub Actions automated checks: **passed** on the latest checked commit.
- Vite production build: **passed** on the latest checked commit.
- Cloudflare Pages Preview deployment: status must be checked again before browser verification.
- The earlier 43/43 browser tests were user-reported against the previous Preview build. They have not been independently repeated against the current audit changes.

## Outstanding content and release items

1. **Three exact catalogue images are not available in the current image library:** Cattani AC 400 Q, Cattani AC 600 Q and MELAG Vacuclave 118. They are left without a product image rather than being assigned a visually similar but potentially incorrect model.
2. **Eleven product records still lack a verified official manufacturer source:** Fussen Imaging Plate Scanner; six Mocom Silent Power variants; Mocom M7/M8/M9 stools; and Morita TCS TS 2. No unsupported specifications have been added for these records.
3. **Twenty-seven product records still have no verified specification list.** These are primarily legacy/variant-specific items for which an exact official technical document was not found. Do not fill these with guessed or distributor-derived values without verification.
4. **Product pricing and stock values remain business data.** Keep unconfirmed values as pending until YR Proservice supplies or enters the actual price and stock status.
5. **HR email destination needs confirmation.** The new HR-only page currently opens an email to the existing public company inbox; a dedicated HR contact was not present in the inspected source.
6. **Preview browser verification is still required** for the new homepage CMS product feed, navigation/footer settings, Contact page, archived-product behaviour, image upload rejection, media deletion protection and request rate limits.
7. **Performance, accessibility and recovery checks remain incomplete.** No authenticated browser/Lighthouse run, full assistive-technology review, backup restore drill or external penetration test was performed in this audit.
8. **Public form rate-limit behaviour should be observed in Preview** to ensure normal customer submissions are not unintentionally blocked.

## Production release gates

Do not merge PR #2 or deploy to Production until:

- The outstanding product-image/source/specification gaps are resolved or explicitly accepted.
- The HR contact destination is confirmed.
- The current Preview deployment is complete and the new workflows pass browser verification.
- Database backup/recovery and Preview/Production separation are rechecked.
- The final regression, security and accessibility reviews are complete.
- The user explicitly approves the merge and Production release.

