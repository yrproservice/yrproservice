import test from "node:test";
import assert from "node:assert/strict";
import { isApprovedProductImage, mergePublishedProduct } from "../src/data/productImages.js";

test("accepts local catalogue image paths", () => {
  assert.equal(isApprovedProductImage("/catalog/morita/dental chair/signo-t100.jpg"), true);
});

test("accepts HTTPS R2 media URLs", () => {
  assert.equal(isApprovedProductImage("https://pub-example.r2.dev/cms/test/product.webp"), true);
});

test("rejects external, active and malformed image URLs", () => {
  assert.equal(isApprovedProductImage("https://images.example.com/product.jpg"), false);
  assert.equal(isApprovedProductImage("javascript:alert(1)"), false);
  assert.equal(isApprovedProductImage("data:image/svg+xml,<svg/>"), false);
  assert.equal(isApprovedProductImage("/catalog/../private/file.jpg"), false);
});

test("uses an approved CMS image when present", () => {
  const result = mergePublishedProduct(
    { slug: "test", img: "/catalog/test.jpg" },
    { slug: "test", img: "https://pub-example.r2.dev/cms/test.webp", name: "Updated" },
  );
  assert.equal(result.name, "Updated");
  assert.equal(result.img, "https://pub-example.r2.dev/cms/test.webp");
});

test("falls back to the exact catalogue image instead of an old external image", () => {
  const result = mergePublishedProduct(
    { slug: "test", img: "/catalog/test-model.jpg" },
    { slug: "test", img: "https://old-manufacturer.example.com/old.jpg" },
  );
  assert.equal(result.img, "/catalog/test-model.jpg");
});

test("does not invent a product image when no approved image exists", () => {
  const result = mergePublishedProduct(
    null,
    { slug: "test", img: "https://old-manufacturer.example.com/old.jpg" },
  );
  assert.equal(result.img, "");
});
