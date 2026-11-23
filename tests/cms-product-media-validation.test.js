import test from "node:test";
import assert from "node:assert/strict";
import { validateProductMediaReferences } from "../functions/_utils/cms-product-media-validation.js";

const publicBase = "https://pub-preview-example.r2.dev";
const objectKey = "cms/2026-11-23/123456-image.png";
const publicUrl = publicBase + "/" + objectKey;

function makeDb(rows) {
  let query = null;
  return {
    get query() { return query; },
    prepare(sql) {
      return {
        bind(...values) {
          query = { sql, values };
          return this;
        },
        async all() { return { results: rows }; },
      };
    },
  };
}

function makeEnv({ head = async () => ({ size: 2048 }), base = publicBase } = {}) {
  const checked = [];
  return {
    checked,
    env: {
      CMS_MEDIA_PUBLIC_BASE: base,
      CMS_MEDIA: {
        async head(key) {
          checked.push(key);
          return head(key);
        },
      },
    },
  };
}

test("product media verification accepts an active record and existing object from this bucket", async () => {
  const db = makeDb([{
    id: "media-1",
    storage_provider: "r2",
    object_key: objectKey,
    public_url: publicUrl,
    byte_size: 2048,
    deleted_at: null,
  }]);
  const { env, checked } = makeEnv();

  assert.equal(await validateProductMediaReferences(db, env, {
    img: publicUrl,
    gallery: [{ url: publicUrl }],
  }), null);
  assert.deepEqual(checked, [objectKey]);
  assert.match(db.query.sql, /storage_provider, object_key, public_url, byte_size, deleted_at/);
  assert.deepEqual(db.query.values, [publicUrl]);
});

test("product media verification rejects an archived media record", async () => {
  const db = makeDb([{
    id: "media-1",
    storage_provider: "r2",
    object_key: objectKey,
    public_url: publicUrl,
    byte_size: 2048,
    deleted_at: "2026-11-22T10:00:00.000Z",
  }]);
  const { env, checked } = makeEnv();

  const error = await validateProductMediaReferences(db, env, { img: publicUrl });
  assert.match(error, /archived/i);
  assert.deepEqual(checked, []);
});

test("product media verification rejects a URL that has no unique active media record", async () => {
  const { env, checked } = makeEnv();

  const missing = await validateProductMediaReferences(makeDb([]), env, { img: publicUrl });
  assert.match(missing, /not registered/i);
  assert.deepEqual(checked, []);

  const duplicate = await validateProductMediaReferences(makeDb([
    { storage_provider: "r2", object_key: objectKey, public_url: publicUrl, byte_size: 2048, deleted_at: null },
    { storage_provider: "r2", object_key: objectKey, public_url: publicUrl, byte_size: 2048, deleted_at: null },
  ]), env, { img: publicUrl });
  assert.match(duplicate, /not registered/i);
});

test("product media verification rejects URLs belonging to another R2 environment", async () => {
  const { env, checked } = makeEnv();
  const foreignUrl = "https://another-bucket.r2.dev/" + objectKey;

  const error = await validateProductMediaReferences(makeDb([]), env, { img: foreignUrl });
  assert.match(error, /configured CMS media bucket/i);
  assert.deepEqual(checked, []);
});

test("product media verification rejects missing R2 objects and byte-size mismatches", async () => {
  const row = {
    id: "media-1",
    storage_provider: "r2",
    object_key: objectKey,
    public_url: publicUrl,
    byte_size: 2048,
    deleted_at: null,
  };
  const missingEnv = makeEnv({ head: async () => null }).env;
  const missing = await validateProductMediaReferences(makeDb([row]), missingEnv, { img: publicUrl });
  assert.match(missing, /missing from CMS media storage/i);

  const mismatchEnv = makeEnv({ head: async () => ({ size: 1024 }) }).env;
  const mismatch = await validateProductMediaReferences(makeDb([row]), mismatchEnv, { img: publicUrl });
  assert.match(mismatch, /stored size does not match/i);
});

test("static catalogue images do not require a CMS R2 media record", async () => {
  const db = makeDb([]);
  const error = await validateProductMediaReferences(db, {}, {
    img: "/catalog/morita/signo-t100.png",
    gallery: [{ url: "/catalog/morita/signo-t100-detail.png" }],
  });
  assert.equal(error, null);
  assert.equal(db.query, null);
});

test("R2 product images fail closed when this environment has no media binding", async () => {
  const error = await validateProductMediaReferences(makeDb([]), {
    CMS_MEDIA_PUBLIC_BASE: publicBase,
  }, { img: publicUrl });
  assert.match(error, /not configured/i);
});
