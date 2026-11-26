# AC 100 showroom summary vs product details — 2026-11-25

## User-observed result
The user opened the Preview product details page for Cattani AC 100 and supplied its visible content.

- The product details page displays the expected oil-less dental air compressor description.
- The detailed description explains the Cattani brochure's drying system and filters and advises confirming capacity and installation configuration.
- The string "CMS draft save test" is not present anywhere in the supplied product details content.
- The user previously observed "CMS draft save test" on the normal showroom `/products` card.

## Source-level explanation
The inspected source uses separate catalogue fields:
- `src/components/ShowroomProductCard.jsx` renders `product.summary`.
- `src/pages/ProductDetails.jsx` uses `product.description || product.summary`.

This explains why the showroom card and detail page can show different text.

## Conclusion
The test string is currently observed only on the showroom card, not on the AC 100 details page. This is consistent with a difference between the summary and description fields.

## Not yet verified
The actual live Preview D1 published record and the exact origin of the showroom summary text have not been independently inspected. Do not conclude that the test string is in the published database until that value is checked. No product data, source code, database, or deployment was changed as part of this observation.
