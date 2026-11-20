import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeProductData,
  moveRow,
  createProductSnapshot,
  parseProductJson,
  protectProductImage,
  splitSpecificationString,
  updateDocumentRow,
  updateSpecificationRow,
} from "../src/components/productEditorData.js";

test("specification strings split at the first colon and retain additional colons", () => {
  const examples = [
    ["Seats", { hasColon: false, label: "", value: "Seats" }],
    [" Seats : 1:2:3 ", { hasColon: true, label: "Seats", value: "1:2:3" }],
    ["Format: https://example.test/a:b", { hasColon: true, label: "Format", value: "https://example.test/a:b" }],
  ];

  for (const [input, expected] of examples) {
    const parsed = splitSpecificationString(input);
    assert.equal(parsed.hasColon, expected.hasColon);
    assert.equal(parsed.label, expected.label);
    assert.equal(parsed.value, expected.value);
  }
});

test("editing one specification preserves mixed row types and object metadata", () => {
  const source = [
    "No colon value",
    "Value: https://example.test/a:b",
    { label: "Weight", value: "10 kg", source: { verified: true }, unit: "kg" },
  ];
  const unchanged = source[0];
  const next = source.slice();
  next[2] = updateSpecificationRow(next[2], "value", "12 kg");

  assert.equal(next[0], unchanged);
  assert.equal(next[1], source[1]);
  assert.equal(typeof next[0], "string");
  assert.equal(typeof next[1], "string");
  assert.deepEqual(next[2], {
    label: "Weight",
    value: "12 kg",
    source: { verified: true },
    unit: "kg",
  });
  assert.equal(updateSpecificationRow("Unlabelled", "value", "Updated"), "Updated");
  assert.equal(updateSpecificationRow("Seats:  1:2 ", "value", "  2:3 "), "Seats:    2:3  ");
  assert.equal(updateSpecificationRow(null, "raw", "{}"), null);
});

test("specification rows can be reordered without changing their values or types", () => {
  const rows = [" A: B ", { name: "C", value: "D", extra: 7 }, 10];
  const reordered = moveRow(rows, 0, 1);
  assert.deepEqual(reordered, [rows[1], rows[0], rows[2]]);
  assert.deepEqual(rows, [" A: B ", { name: "C", value: "D", extra: 7 }, 10]);
});

test("document rows reorder without normalizing their stored paths", () => {
  const rows = [
    { label: "Relative", path: "../docs/a.pdf", extra: true },
    "https://example.test/a?b=c#d:e",
  ];
  assert.deepEqual(moveRow(rows, 1, -1), [rows[1], rows[0]]);
  assert.deepEqual(rows, [
    { label: "Relative", path: "../docs/a.pdf", extra: true },
    "https://example.test/a?b=c#d:e",
  ]);
});

test("document edits preserve extra properties and exact relative or absolute locations", () => {
  const relative = { title: "Manual", path: "../docs/manual.pdf", revision: 3, metadata: { retained: true } };
  const external = { name: "Guide", href: "https://example.test/file?a=b#page:3", mimeType: "application/pdf" };
  assert.deepEqual(updateDocumentRow(relative, "label", "Setup manual"), {
    ...relative,
    title: "Setup manual",
  });
  assert.deepEqual(updateDocumentRow(relative, "location", "./docs/manual.pdf"), {
    ...relative,
    path: "./docs/manual.pdf",
  });
  assert.deepEqual(updateDocumentRow(external, "location", external.href), external);
  assert.equal(updateDocumentRow("../docs/manual.pdf", "location", "../new path/manual.pdf"), "../new path/manual.pdf");
});

test("deep merge retains unknown nested metadata and image protection covers advanced JSON", () => {
  const original = {
    slug: "product",
    img: "/catalog/current.jpg",
    metadata: { source: "legacy", nested: { retained: true, updated: "before" } },
    specifications: ["A: B"],
  };
  const edited = {
    slug: "product-updated",
    img: "/catalog/changed.jpg",
    metadata: { nested: { updated: "after" } },
    specifications: [{ label: "A", value: "C" }],
  };
  const merged = protectProductImage(original, edited);

  assert.equal(merged.slug, "product-updated");
  assert.equal(merged.img, "/catalog/current.jpg");
  assert.deepEqual(merged.metadata, {
    source: "legacy",
    nested: { retained: true, updated: "after" },
  });
  assert.deepEqual(merged.specifications, [{ label: "A", value: "C" }]);
  assert.deepEqual(parseProductJson(JSON.stringify(merged)), merged);
  assert.equal(parseProductJson("[]"), null);
});

test("product save and reload round-trip preserves original specification strings and document URLs", () => {
  const original = {
    slug: "round-trip-product",
    img: "/catalog/model.jpg",
    specifications: ["  Plain text  ", " Format :  text:with:colons  ", { name: "Size", value: "M", source: "catalogue" }],
    docs: [
      { name: "Local", url: "../manuals/local.pdf", license: "internal" },
      { title: "External", href: "https://example.test/manual?lang=en#section:1", extra: { kept: true } },
    ],
    metadata: { nested: { keep: ["all", "values"] } },
  };

  const saved = protectProductImage(original, JSON.parse(JSON.stringify(original)));
  const reloaded = JSON.parse(JSON.stringify(saved));
  assert.deepEqual(reloaded, original);
  assert.equal(reloaded.img, "/catalog/model.jpg");
  assert.equal(reloaded.specifications[0], "  Plain text  ");
  assert.equal(reloaded.specifications[1], " Format :  text:with:colons  ");
  assert.equal(reloaded.docs[0].url, "../manuals/local.pdf");
  assert.equal(reloaded.docs[1].href, "https://example.test/manual?lang=en#section:1");
});

test("switching products initializes independent complete product snapshots", () => {
  const first = createProductSnapshot(JSON.stringify({
    slug: "first",
    img: "/catalog/first.jpg",
    metadata: { nested: { value: 1 } },
  }));
  const second = createProductSnapshot(JSON.stringify({
    slug: "second",
    img: "../images/second.jpg",
    metadata: { nested: { value: 2 } },
  }));

  assert.equal(first.slug, "first");
  assert.equal(second.slug, "second");
  assert.notEqual(first.img, second.img);
  assert.deepEqual(second.metadata, { nested: { value: 2 } });
  assert.notEqual(first.metadata, second.metadata);
});
