import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { products } from "../src/data/products.js";

test("every assigned product image uses the local catalogue", () => {
  for (const product of products) {
    if (!product.img) continue;
    assert.ok(
      product.img.startsWith("/catalog/"),
      `${product.slug} has a non-catalogue image: ${product.img}`,
    );
  }
});

test("every assigned catalogue image exists in the repository", () => {
  for (const product of products) {
    if (!product.img) continue;
    const imagePath = product.img.split("?")[0];
    const localPath = fileURLToPath(new URL(`../public${imagePath}`, import.meta.url));
    assert.ok(existsSync(localPath), `${product.slug} image file is missing: ${imagePath}`);
  }
});

test("only exact-model image gaps remain unassigned", () => {
  const missing = products.filter((product) => !product.img).map((product) => product.slug).sort();
  assert.deepEqual(missing, [
    "cattani-ac-400-q",
    "cattani-ac-600-q",
    "melag-vacuclave-118",
  ]);
});
