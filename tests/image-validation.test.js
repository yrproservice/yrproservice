import test from "node:test";
import assert from "node:assert/strict";
import { detectImageMime } from "../functions/_utils/image-validation.js";

test("detects PNG signature", () => {
  assert.equal(detectImageMime(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])), "image/png");
});

test("detects JPEG signature", () => {
  assert.equal(detectImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
});

test("detects both GIF signatures", () => {
  assert.equal(detectImageMime(new TextEncoder().encode("GIF87a")), "image/gif");
  assert.equal(detectImageMime(new TextEncoder().encode("GIF89a")), "image/gif");
});

test("detects WebP RIFF signature", () => {
  assert.equal(detectImageMime(new TextEncoder().encode("RIFFxxxxWEBP")), "image/webp");
});

test("rejects SVG, arbitrary data and truncated signatures", () => {
  assert.equal(detectImageMime(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>")), "");
  assert.equal(detectImageMime(new TextEncoder().encode("not an image")), "");
  assert.equal(detectImageMime(new Uint8Array([137, 80, 78])), "");
});
