import test from "node:test";
import assert from "node:assert/strict";
import { products } from "../src/data/products.js";
import { getProductRequestFlow, isDentalChairProduct, PRODUCT_REQUEST_FLOWS } from "../src/data/productWorkflow.js";

test("the 11 confirmed dental chair models use the separate chair consultation flow", () => {
  const chairs = products.filter(isDentalChairProduct);
  assert.equal(chairs.length, 11);
  assert.ok(chairs.every((product) => getProductRequestFlow(product) === PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR));
});

test("legacy non-chair quote products use general quotation rather than chair requests", () => {
  const legacyQuoteProducts = products.filter((product) => product.purchaseType === "quote");
  const chairs = legacyQuoteProducts.filter(isDentalChairProduct);
  const otherQuotedProducts = legacyQuoteProducts.filter((product) => !isDentalChairProduct(product));
  assert.equal(legacyQuoteProducts.length, 37);
  assert.equal(chairs.length, 11);
  assert.equal(otherQuotedProducts.length, 26);
  assert.ok(otherQuotedProducts.every((product) => getProductRequestFlow(product) === PRODUCT_REQUEST_FLOWS.QUOTATION));
});

test("confirmed chair slugs cannot be overridden by CMS cart or quotation metadata", () => {
  for (const slug of ["cingol-x1", "cingol-x3", "cingol-x5", "mocom-f10", "mocom-m10", "mocom-v10", "signo-g10ii", "signo-g20", "signo-t100", "signo-t500", "signo-z300"]) {
    assert.equal(getProductRequestFlow({ slug, requestFlow: "cart", purchaseType: "cart" }), PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR);
    assert.equal(getProductRequestFlow({ slug, requestFlow: "quotation", purchaseType: "quote" }), PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR);
    assert.equal(isDentalChairProduct({ slug, requestFlow: "cart" }), true);
  }
});

test("explicit CMS requestFlow takes precedence for products without a confirmed chair slug", () => {
  assert.equal(getProductRequestFlow({ slug: "new-equipment", purchaseType: "quote", requestFlow: "dental_chair" }), PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR);
  assert.equal(getProductRequestFlow({ slug: "existing-chair", purchaseType: "quote", requestFlow: "quotation" }), PRODUCT_REQUEST_FLOWS.QUOTATION);
  assert.equal(getProductRequestFlow({ slug: "new-standard-product", purchaseType: "cart", requestFlow: "cart" }), PRODUCT_REQUEST_FLOWS.CART);
});

test("legacy quote chair slugs are explicit and unrelated quote slugs never become chairs", () => {
  assert.equal(getProductRequestFlow({ slug: "signo-t100", purchaseType: "quote" }), PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR);
  assert.equal(getProductRequestFlow({ slug: "melag-vacuclave-118", purchaseType: "quote" }), PRODUCT_REQUEST_FLOWS.QUOTATION);
});
