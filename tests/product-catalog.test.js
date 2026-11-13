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


test("Cattani AC 400 Q and AC 600 Q use exact manufacturer technical data", () => {
  const ac400q = products.find((product) => product.slug === "cattani-ac-400-q");
  const ac600q = products.find((product) => product.slug === "cattani-ac-600-q");

  assert.ok(ac400q);
  assert.ok(ac600q);
  assert.equal(ac400q.manufacturerSource, "https://www.cattani.it/en/prodotto/ac-400-q-twin-cylinder-twin-head-compressor-with-noise-reducing-plastic-covers-and-2-air-driers/");
  assert.equal(ac600q.manufacturerSource, "https://www.cattani.it/en/prodotto/ac-600-q-three-cylinder-twin-head-compressor-with-noise-reducing-plastic-covers-and-2-air-driers/");
  assert.ok(ac400q.specifications.includes("Air delivery at 5 bar: 320 N l/min"));
  assert.ok(ac400q.specifications.includes("Sound pressure level: 63.8 dB(A)"));
  assert.ok(ac600q.specifications.includes("Air delivery at 5 bar: 476 N l/min"));
  assert.ok(ac600q.specifications.includes("Sound pressure level: 70.4 dB(A)"));
  assert.equal(ac400q.img, "");
  assert.equal(ac600q.img, "");
});

test("MELAG Vacuclave 118 uses the manufacturer manual's 71 dB(A) noise value", () => {
  const product = products.find((item) => item.slug === "melag-vacuclave-118");
  assert.ok(product);
  assert.equal(product.manufacturerSource, "https://global.melag.com/sites/default/files/ba_vc_118_123_en.pdf");
  assert.ok(product.specifications.includes("Noise emission: 71 dB(A)"));
  assert.ok(!product.specifications.includes("Noise emission: 60.9 dB(A)"));
});

test("Morita TCS-TS2 classification links to the manufacturer's Signo Z300 brochure", () => {
  const product = products.find((item) => item.slug === "morita-tcs-ts-2");
  assert.ok(product);
  assert.equal(product.brandLine, "Dental Suction Device");
  assert.equal(product.manufacturerSource, "https://www.morita.com/cms/files/Brochure_Signo_Z300_2023_EN.pdf?download=1");
  assert.deepEqual(product.specifications, []);
});
