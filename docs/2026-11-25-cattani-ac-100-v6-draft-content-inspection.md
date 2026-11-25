# Cattani AC 100 — V6 draft content inspection

**Date:** 2026-11-25  
**Environment:** Cloudflare Preview D1  
**Product:** `cattani-ac-100`  
**Inspection type:** Read-only SQL query executed by the user; no data changed.

## Result

The query returned one draft version:

- Draft version ID: `c3a67e6b-54ab-4a80-b846-dce662bfb6fe`
- Version: V6
- State: `draft`
- Change note: `Restored from V3`
- Summary: “Cattani AC 100 oil-less compressor for dry compressed air in dental clinics.”
- Description: “Cattani AC 100 is an oil-less compressor for dental compressed-air systems. The supplied Cattani brochure describes the dry-compressor range as including a drying system and filters to provide dry, high-purity compressed air. Confirm the required capacity and installation configuration for your clinic before ordering.”

## Assessment

V6 contains the appropriate AC 100 summary and description. This confirms that the corrected content is already present in the draft restored from V3.

The previously inspected published version remains V4, whose summary is the test string `CMS draft save test`. V6 is still a draft and has not been published by this inspection.

## Safety and next action

- This was a SELECT-only inspection; no database rows were changed.
- Preserve V6 and the existing revision history.
- Do not publish V6 without user review and explicit approval.
- Next verify that the CMS editor displays V6's summary and description as expected.
