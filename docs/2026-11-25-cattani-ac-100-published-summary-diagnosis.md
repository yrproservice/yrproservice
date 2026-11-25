# Cattani AC 100 published summary diagnosis — 2026-11-25

## Evidence supplied by the user
The user ran the following read-only query against the Preview D1 database (`yr-pro-service-test-db`, ID `7fca4ad0-3baa-4148-ad28-bfd2ef416c16`):

```sql
SELECT
  p.product_slug,
  p.published_version_id,
  v.version_number,
  v.state,
  json_extract(v.product_json, '$.summary') AS published_summary,
  json_extract(v.product_json, '$.description') AS published_description
FROM cms_products p
JOIN cms_product_versions v
  ON v.id = p.published_version_id
WHERE p.product_slug = 'cattani-ac-100'
  AND v.state = 'published';
```

The user supplied this result:
- product_slug: `cattani-ac-100`
- published_version_id: `270c9cb0-6b48-48eb-a964-e12139cea653`
- version_number: `4`
- state: `published`
- published_summary: `CMS draft save test`
- published_description: the correct AC 100 oil-less compressor description, including the brochure note about drying system and filters and advice to confirm capacity and installation configuration.

## Diagnosis
The showroom card renders `product.summary`; the product details page renders `product.description || product.summary`. The published V4 database record therefore directly explains the observed discrepancy:
- Showroom card displays the test string from the published summary.
- Product details displays the proper description from the published description field.

This is confirmed by user-supplied Preview D1 query output, not by an independent database connection.

## Draft/published separation
The previously restored V6 is a draft from V3. The query confirms V4 remains the published version. V6 was not published by the restore action.

## Safety and outstanding action
No data was changed by this query or diagnosis. Do not edit, publish, restore, or delete any revision without a deliberate plan and explicit user approval. The test string is confirmed in the published summary and should be corrected through a carefully reviewed CMS draft and explicit publication only after the user approves that corrective action.
