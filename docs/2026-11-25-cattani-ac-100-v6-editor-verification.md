# Cattani AC 100 — V6 CMS editor verification

**Date:** 2026-11-25  
**Environment:** Cloudflare Preview CMS editor  
**Product:** `cattani-ac-100`  
**Evidence source:** Editor content and revision list pasted by the user. This was not an independent browser replay.

## Verified editor state

The editor identifies the selected product version as **V6 · draft**, with change note **Restored from V3** and timestamp `2026-11-25T03:04:10.156Z`.

The editor fields match the user's read-only Preview D1 query:

- Summary: “Cattani AC 100 oil-less compressor for dry compressed air in dental clinics.”
- Description: “Cattani AC 100 is an oil-less compressor for dental compressed-air systems. The supplied Cattani brochure describes the dry-compressor range as including a drying system and filters to provide dry, high-purity compressed air. Confirm the required capacity and installation configuration for your clinic before ordering.”
- Primary image: `/catalog/cattani/images/ac-100.jpg`

The editor also displays five specification entries, no gallery images, and the existing revision history V1–V6. The user-provided editor view shows Price `1` and Stock status `pending`; these fields were not changed and are outside the summary correction.

## Assessment

The CMS editor display confirms that V6 contains the intended summary and description. The earlier read-only published-version query identified V4 as the live published version, with the incorrect summary `CMS draft save test`.

No save, publish, restore, delete, or database mutation was performed during this verification. V6 and the existing revision history remain preserved. Publication remains pending explicit user review and approval.

## Next controlled action

If the user chooses to proceed, review whether V6 is the intended replacement for the currently published V4, including all fields—not only summary and description—before any publication action. In particular, confirm the displayed price and stock status are intentional before publishing.
