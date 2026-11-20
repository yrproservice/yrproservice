import test from "node:test";
import assert from "node:assert/strict";
import { matchesProductSearch } from "../src/data/productSearch.js";

const product = {
  slug: "mocom-m10",
  name: "Mocom M10",
  brand: "Mocom",
  category: "Dental Chairs",
  brandLine: "Premium Treatment Centre",
  summary: "A compact dental treatment unit.",
};

test("search matches product names and brands without case sensitivity", () => {
  assert.equal(matchesProductSearch(product, "mocom m10"), true);
  assert.equal(matchesProductSearch(product, "MOCOM"), true);
});

test("search matches category and product type labels", () => {
  assert.equal(matchesProductSearch(product, "dental chairs"), true);
  assert.equal(matchesProductSearch(product, "premium treatment"), true);
});

test("search matches product summaries and slugs", () => {
  assert.equal(matchesProductSearch(product, "compact dental"), true);
  assert.equal(matchesProductSearch(product, "mocom-m10"), true);
});

test("empty or whitespace-only searches include every product", () => {
  assert.equal(matchesProductSearch(product, ""), true);
  assert.equal(matchesProductSearch(product, "   "), true);
  assert.equal(matchesProductSearch(product, null), true);
});

test("search returns false when no searchable field contains the query", () => {
  assert.equal(matchesProductSearch(product, "autoclave"), false);
});
