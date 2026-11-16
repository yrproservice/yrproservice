export const PRODUCT_REQUEST_FLOWS = Object.freeze({
  CART: "cart",
  QUOTATION: "quotation",
  DENTAL_CHAIR: "dental_chair",
});

// These are the 11 confirmed chair models in the current static catalogue.
// Do not infer chair routing from a category label or from purchaseType alone.
const DENTAL_CHAIR_SLUGS = new Set([
  "cingol-x1",
  "cingol-x3",
  "cingol-x5",
  "mocom-f10",
  "mocom-m10",
  "mocom-v10",
  "signo-g10ii",
  "signo-g20",
  "signo-t100",
  "signo-t500",
  "signo-z300",
]);

export function getProductRequestFlow(product) {
  if (!product || typeof product !== "object") return PRODUCT_REQUEST_FLOWS.CART;

  const explicit = product.requestFlow || product.workflowType;
  if (explicit === "chair-consultation" || explicit === PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR) {
    return PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR;
  }
  if (explicit === "quotation" || explicit === "quote") {
    return PRODUCT_REQUEST_FLOWS.QUOTATION;
  }
  if (explicit === "cart" || explicit === "cart-quotation") {
    return PRODUCT_REQUEST_FLOWS.CART;
  }

  const slug = typeof product.slug === "string" ? product.slug.trim().toLowerCase() : "";
  if (DENTAL_CHAIR_SLUGS.has(slug)) return PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR;

  // Legacy quote products that are not confirmed dental chairs use the
  // general quotation route. This prevents imaging/lab/autoclave products
  // from being sent to the Dental Chair Request page.
  if (product.purchaseType === "quote") return PRODUCT_REQUEST_FLOWS.QUOTATION;

  return PRODUCT_REQUEST_FLOWS.CART;
}

export function isDentalChairProduct(product) {
  return getProductRequestFlow(product) === PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR;
}
