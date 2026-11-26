# Cattani AC400Q and AC600Q product image sources

The product image files below were downloaded from Cattani Australasia's own
manufacturer-hosted media library. The source image names are tied to the
manufacturer product codes shown on the corresponding product pages.

| Product record | Manufacturer product code | Repository image | Manufacturer image source |
|---|---:|---|---|
| Cattani AC 400 Q | 013450 | `public/catalog/cattani/images/ac-400-q.png` | https://www.cattani.com.au/wp-content/uploads/2025/05/013450-main.png |
| Cattani AC 600 Q | 013557 | `public/catalog/cattani/images/ac-600-q.png` | https://www.cattani.com.au/wp-content/uploads/2025/06/013557-main.png |

## Model verification

- [Cattani AC400Q product page](https://www.cattani.com.au/product/ac400q/)
  identifies AC400Q and product code 013450.
- [Cattani AC600Q product page](https://www.cattani.com.au/product/ac600q/)
  identifies AC600Q and product code 013557.
- The [Cattani Asia 2026 regional catalogue](https://cattaniasia.com/wp-content/uploads/2026/01/2026-Catalogue-Asia_Region-1_web.pdf)
  lists Malaysia among its applicable countries and contains the AC400Q and
  AC600Q product pages.

The import script checks HTTP status, image MIME type, PNG/JPEG file signature,
minimum pixel dimensions, and distinct SHA-256 hashes before it writes either
file or updates product references. It fails closed if a source cannot be
retrieved or if both models resolve to identical image bytes.

Do not replace these images with the non-Q AC400 or AC600 images.


## 26 November 2026 — Malaysia Region 1 source reconciliation

- The repository already contains `public/catalog/cattani/images/ac-400-q.png` and `ac-600-q.png`. Both are 1200 × 1200 PNG files (1:1), visually inspected, and show the complete compressor assemblies. Their binary hashes are distinct. The catalogue model records and media manifest already reference these files; no image references were changed in this checkpoint.
- These saved files were sourced from Cattani Australasia, not extracted from the Malaysia-applicable Asia Region 1 catalogue. The Australasia AC400Q page identifies image asset `013450-main` and product code 013450. The current Australasia AC600Q page identifies the model as AC600Q with item code K-AC600Q; the older media asset recorded for the repository file was `013557-main`. These are not the Asia Region 1 item codes.
- The accessible **Catalogue 2026 Asia Region 1** text version (published 29 May 2026) resolves the page numbering:
  - Printed page 19 is AC400-1P, item code 013404 — not AC400Q.
  - Printed page 20 is AC400Q, item code 013449: https://fliphtml5.com/cattani/Catalogue_2026_Asia_Region_1/22/
  - Printed page 23 is AC600Q, item code 013549: https://fliphtml5.com/cattani/Catalogue_2026_Asia_Region_1/25/
- Therefore the earlier note placing AC400Q on printed page 19 is corrected to printed page 20. The product records `cattani-ac-400-q` and `cattani-ac-600-q` currently point to the saved Australasia-source binaries while their `manufacturerSource` fields point to the old Asia PDF URL. That PDF URL returned 404 during this review; the FlipHTML5 text version is accessible, but its page images were not exposed as standalone downloadable binaries.
- The existing Australasia binaries cannot yet be treated as verified Malaysia-specific variants because the item codes differ; the current Australasia AC600Q page also lists 7.2 A while the Asia Region 1 page lists 7.4 A. No Region 1 image binary was retrieved, saved, or installed. Do not replace the current references until the exact Region 1 binary is obtained and visually inspected.
