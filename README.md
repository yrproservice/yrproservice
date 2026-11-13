# YR Proservice — Full Visual CMS

The YR Proservice website is a dental equipment and services platform with a Preview-only Full Visual CMS. The CMS combines live visual editing beside a page preview with structured management panels for products, specifications, images, documents, and site settings.

## Source of truth and design

- The approved V10 visual blueprint is the sole visual baseline for layout, page identity, proportions, spacing, cards, and typography.
- Headings use Montserrat; body text uses Inter.
- The design palette is Deep Navy `#0B4A88`, Primary Blue `#1E7ED8`, Cyan `#00C2FF`, Pale Blue `#EAF6FD`, Light Grey `#F5F7FA`, Text `#1F2937`, Muted `#687280`, and White `#FFFFFF`.
- Product images must preserve the full image and aspect ratio: contain-style presentation, no crop, stretch, distortion, or overflow.
- Do not use older project archives as a replacement for V10 or redesign existing pages as a shortcut to CMS integration.

## Environments and release safety

| Purpose | Configuration |
| --- | --- |
| Preview branch | `cms-development` |
| Preview site | `https://cms-development.yrproservice.pages.dev` |
| Preview D1 binding | `DB` → `yr-proservice-test-db` |
| Preview D1 ID | `7fca4ad0-3baa-4148-ad28-bfd2ef416c16` |
| Preview R2 binding | `CMS_MEDIA` → `yrproservice-cms-preview` |
| Production site | `https://yrproservice.pages.dev` |
| Production D1 binding | `DB` → `yr-proservice-db` |
| Production D1 ID | `9bf690db-a74b-43e9-8c38-cc8bab18a9f1` |

**Production is protected.** Keep all development, experiments, migrations, and verification on `cms-development` and Preview. Do not merge to `main`, change Production resources, or deploy a Production release without explicit user approval. Never run Preview migration commands against `yr-proservice-db`.

## CMS capabilities

The current development branch contains:

- Draft, preview, publish-to-Preview, revision-history, restore-as-draft, and draft-deletion workflows.
- Product management, including structured product data, specifications, documents, image selection, and catalogue import.
- Media-library upload, listing, and removal through the Preview R2 bucket, with file-signature checks, a 12 MB limit, and protection against deleting media referenced by saved content or revisions.
- CMS page/settings support and management interfaces for Home, Products, Services, Team, navigation/footer, and Visual Design Studio.
- Public renderers for CMS-managed page, product, navigation, and footer content.
- Cloudflare Access-protected Admin APIs and a single-device Admin session lock with a 90-second expiry/heartbeat.
- Separate customer flows: normal products use the Product Cart; dental chairs use the dedicated Dental Chair Request. Quotation, service requests, request tracking, and HR-focused Contact remain separate workflows.

The request dashboard and CMS Admin are private. Public customer request and tracking endpoints must remain accessible without exposing Admin APIs.

## Product and content integrity

- Match every product image to the exact model; do not substitute a visually similar model.
- Prefer approved local catalogue assets and Preview R2 media. Do not silently fall back to obsolete external image URLs.
- Use official manufacturer pages first, then official catalogues/manuals. Do not invent specifications, reviews, ratings, prices, or stock values.
- Unconfirmed pricing and stock are business data and must remain pending until supplied or entered by YR Proservice.
- Products without verified images or technical sources should remain clearly identified as incomplete rather than populated with guesses.

## Local development and automated checks

Use Node.js 22 and the committed lockfile:

```bash
npm ci
npm test
npm run build
```

The GitHub Actions workflow `.github/workflows/cms-build-check.yml` runs the locked install, automated Node tests, and Vite build for pushes to `cms-development`. A successful build confirms compilation; it does not replace authenticated browser testing of CMS workflows or verification that Cloudflare Pages Preview deployed the same branch commit.

The migration workflow `.github/workflows/cms-preview-migration.yml` targets only `yr-proservice-test-db`. Review migration contents and workflow output before treating a schema change as complete.

## Release readiness

See [CMS_RELEASE_READINESS.md](./docs/CMS_RELEASE_READINESS.md) for the dated audit, completed fixes, known content gaps, and remaining release gates. See [CMS-PREVIEW-OPERATIONS.md](./docs/CMS-PREVIEW-OPERATIONS.md) for Preview operations and the dedicated D1 migration secret.

The 13 November 2026 GitHub Actions run #542 passed 27/27 automated tests and the Vite build on commit `f54212e15900c2a00258b9de0fcab110272499ba`; run #544 also passed on the subsequent documentation-only commit. The Vite build reports a 609.88 kB minified JavaScript entry chunk (143.91 kB gzip), above its 500 kB warning threshold. The earlier audit reported a successful Workers build and Preview deployment, but neither was independently reverified against the latest source commit. Authenticated browser verification remains outstanding. The earlier 43/43 browser checks were user-reported against a previous Preview build and have not been independently repeated against the latest audit changes.

Outstanding release items include three missing exact catalogue images, eleven product records without verified official manufacturer sources, twenty-seven records without verified specifications, confirmation of the HR email destination, Preview browser verification, accessibility/performance review, and a backup-recovery drill.

**Production release status: not approved.** Do not merge PR #2 or deploy Production until the release gates in `docs/CMS_RELEASE_READINESS.md` are resolved or explicitly accepted and the user approves the release.
