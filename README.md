# YR Proservice — Visual Blueprint V8

This version is a structural visual rebuild based on the supplied Visual & Design Blueprint and the latest feedback.

## Design direction
- Montserrat for headings/navigation/UI; Inter for body copy.
- Blueprint palette: YR navy, primary blue, cyan accent, light ice background, dark text.
- Each major page has a different visual purpose instead of repeating the same composition:
  - Home: cinematic / welcoming
  - Products: showroom / commercial
  - Product Details: premium information
  - Services: technical / engineering
  - Team: human / editorial
  - Contact HR: quiet corporate / recruitment
  - Request Centre: one shared visual shell for Product Cart and Dental Chair Requests
  - Quote: focused conversion / enquiry
- Decorative elements are background treatments only; controls are functional.

## Navigation
- Removed Get a Quote from the main navigation.
- Services navigation is a reusable dropdown built from the same 8-service data used by the Services page.
- Home has a dedicated home-mark link.
- Cart remains available because it is part of the product-selection workflow.

## Product improvements
- Product catalogue is presented as a showroom rather than a plain database grid.
- Hero/spotlight areas use product imagery and product-specific links.
- Product actions have a clear purpose:
  - normal product -> Add to Cart
  - dental chair -> Request Chair
  - View Details -> dedicated product detail page
- Product detail tabs are functional: Description, Specifications and Reviews.
- No star ratings or invented review counts are displayed.
- Price and stock are catalogue fields intended for a future admin workspace.
- Dental-chair imagery for the 11 chair models is model-specific and refreshed using current product references. Before final deployment, these external image URLs should be downloaded into /public/catalog/verified/ to make the final site independent of third-party image hosting.

## Services
The approved 8 services remain:
1. Dental Chair Installation
2. Equipment Installation
3. Compressor Installation
4. Dental Suction Installation
5. Underfloor Piping
6. Preventive Maintenance
7. Equipment Relocation
8. Repair & Technical Support

## Contact
Contact is intentionally HR/careers only. Product and technical enquiries use the product/service request flows.

## Verification note
The source was checked for JSX bracket balance, product image references, product/service counts and removal of the non-functional hero carousel controls. The header has no Get a Quote navigation item; quotation is reached through the product/request workflow. `npm install` timed out in the build environment, so a successful Vite production build is not claimed here.


## V8 updates
- Removed the Home text/link from the main navigation; the YR Proservice logo remains the home link.
- Removed the Home item from the mobile navigation as well.
- Refreshed the non-dental-chair product imagery into clean product-focused local images, removing brochure/specification text where the source image allowed.
- Dental-chair imagery and the V7 chair-specific product overrides remain unchanged.


## Image verification pass

The dental-chair catalogue now uses model-specific image URLs verified against manufacturer/product sources rather than the previous local brochure screenshots. The 11 chair models are mapped individually for Cingol X1/X3/X5, Mocom F10/M10/V10, and Morita Signo G20/T100/Z300/G10 II/T500. Old chair `fallbackImg` entries have been removed so a failed remote image cannot silently display the previous brochure screenshot. Before final Cloudflare deployment, these verified images should be downloaded into `/public/catalog/verified/` (or another owned/licensed image directory) and the URLs changed to those local files.
