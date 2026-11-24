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
