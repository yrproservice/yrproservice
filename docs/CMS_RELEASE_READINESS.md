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

- GitHub Actions run **#552** on the updated `cms-development` commit `05f40d45df70a01c29b73df6905641ff01777123`: **28/28 automated tests passed**; locked dependency installation and Vite production build also passed. This run includes the new Fussen F200 catalogue-data regression test.
- The Vite build still reports a main JavaScript chunk of **610.04 kB minified (144.00 kB gzip)**, above the 500 kB warning threshold. Performance sign-off and route/component code-splitting review remain outstanding.
- A subsequent AC400Q regional-variant update initially exposed one stale manufacturer-source assertion (run **#557**, 27/28 passed). The assertion was corrected in commit `815127a7774d16d468d3d1901e9a715f422573d6`; follow-up GitHub Actions run **#563** on commit `cfe22d2be1120fc0920c409a1041bb72cef8186a` passed **28/28 tests**, locked dependency installation and the Vite production build.
- Cloudflare Workers build success was reported by the earlier audit, but was not rerun in GitHub Actions run #534.
- Cloudflare Pages Preview deployment of the latest source commit and authenticated browser verification remain unconfirmed.
- The earlier 43/43 browser tests were user-reported against the previous Preview build. They have not been independently repeated against the current audit changes.

## Follow-up source verification — 13 November 2026

After the initial audit, exact manufacturer references and additional verified technical data were added for:
- **Cattani AC 400 Q:** the Cattani Asia 2026 catalogue applicable to Malaysia identifies AC400Q (item 013449) as 3-phase, 400 V, 3.0 kW / 7.4 A, and AC400Q-1P (item 013452) as the separate single-phase 230 V variant. The YR Proservice AC400Q record has been corrected to the regional three-phase configuration; the two variants must remain distinct.
- **Cattani AC 600 Q:** the Cattani Asia 2026 regional catalogue applicable to Malaysia identifies item 013549, recommends 7–8 chairs, and records 400 V / 50 Hz three-phase power, 476 N l/min delivery at 5 bar, 150 L tank, 70.4 dB(A), dimensions and weight. The regional recommendation is used instead of the broader 6–9 dental-unit recommendation on Cattani's global page.
- **Morita TCS-TS2:** the official Signo Z300 brochure identifies TCS-TS2 (220 V) as a dental suction device. The source is linked, but no standalone technical specifications have been added.
- **Mocom M7, M8 and M9 stools:** matching Mocom Stools catalogue entries now link to the Mocom brochure and describe only its model-specific features. No unverified dimensions or numeric specifications were added.
- **MELAG Vacuclave 118:** the official MELAG user manual states noise emission is **71 dB(A)**. The catalogue value previously shown as 60.9 dB(A) was corrected. The product image remains unassigned.

These content edits have regression tests in `tests/product-catalog.test.js`. Their new CI result must be checked before treating the tests as passed.

## Outstanding content and release items

1. **Three exact catalogue images are not available in the current image library:** Cattani AC 400 Q, Cattani AC 600 Q and MELAG Vacuclave 118. They remain unassigned rather than being given visually similar substitutes. The currently assigned Fussen scanner image is also a cropped close-up; replace it only after the original full-product F200 image binary is saved and checked in the repository.
2. **Six product records still lack a verified exact-model manufacturer source:** the six Mocom Silent Power variants do not yet have an exact match to the current Mocom Evo brochure. The Fussen Imaging Plate Scanner record has now been reconciled to the manufacturer's F200 Image Plate System page and updated with its published model specifications; the existing repository photograph remains a cropped close-up and still needs a better full-product image.
3. **Twenty-seven product records still have no verified specification list.** These are primarily legacy/variant-specific items for which an exact official technical document was not found. Do not fill these with guessed or distributor-derived values without verification.
4. **Product pricing and stock values remain business data.** Keep unconfirmed values as pending until YR Proservice supplies or enters the actual price and stock status.
5. **HR email destination needs confirmation.** The new HR-only page currently opens an email to the existing public company inbox; a dedicated HR contact was not present in the inspected source.
6. **Preview browser verification is still required** for the new homepage CMS product feed, navigation/footer settings, Contact page, archived-product behaviour, image upload rejection, media deletion protection and request rate limits.
7. **Performance, accessibility and recovery checks remain incomplete.** No authenticated browser/Lighthouse run, full assistive-technology review, backup restore drill or external penetration test was performed in this audit.
8. **Public form rate-limit behaviour should be observed in Preview** to ensure normal customer submissions are not unintentionally blocked.

## Production release gates

Do not merge PR #2 or deploy to Production until:
- Review the PR merge base and full commit history before any merge. A fresh comparison on 13 November 2026 reported `cms-development` as 326 commits ahead of `main` and 0 behind before the latest catalogue correction commits. Recheck the count and review the full history/diff before any merge; do not infer that a large ahead count is safe.

- The outstanding product-image/source/specification gaps are resolved or explicitly accepted.
- The HR contact destination is confirmed.
- The current Preview deployment is complete and the new workflows pass browser verification.
- Database backup/recovery and Preview/Production separation are rechecked.
- The final regression, security and accessibility reviews are complete.
- The user explicitly approves the merge and Production release.



## Additional regional catalogue correction — 13 November 2026

- The AC 600 Q record now uses the Cattani Asia 2026 Region 1 catalogue, which is the relevant regional source for the Malaysia-facing catalogue. It lists item code 013549 and recommends 7–8 chairs. This replaces the broader 6–9 dental-unit recommendation from Cattani's global product page. The AC 600 Q image remains unassigned; no image binary was saved or image reference changed.
- Regression coverage now checks the regional source and 7–8 chair recommendation. This latest code/test change still requires a fresh GitHub Actions run before it can be marked passed.
