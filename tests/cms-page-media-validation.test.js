import test from "node:test";
import assert from "node:assert/strict";
import { validatePageMediaReferences } from "../functions/_utils/cms-page-media-validation.js";

const base = "https://pub-preview-example.r2.dev";
const key = "cms/2026-11-25/page-hero.png";
const url = base + "/" + key;

function dbFor(rows) {
  return {
    prepare(sql) {
      return {
        bind(...values) {
          this.values = values;
          return this;
        },
        async all() { return { results: rows.filter((row) => this.values.includes(row.public_url)) }; },
      };
    },
  };
}

function envFor({ head = async () => ({ size: 512 }) } = {}) {
  const checked = [];
  return {
    checked,
    env: {
      CMS_MEDIA_PUBLIC_BASE: base,
      CMS_MEDIA: {
        async head(objectKey) {
          checked.push(objectKey);
          return head(objectKey);
        },
      },
    },
  };
}

const activeRow = {
  id: "media-page-1",
  storage_provider: "r2",
  object_key: key,
  public_url: url,
  byte_size: 512,
  deleted_at: null,
};

test("page media validation verifies R2 images in section and nested hero fields", async () => {
  const { env, checked } = envFor();
  const error = await validatePageMediaReferences(dbFor([activeRow]), env, {
    sections: [{
      type: "services-page",
      content: { imageUrl: url, hero: { imageUrl: url } },
    }],
  });
  assert.equal(error, null);
  assert.deepEqual(checked, [key]);
});

test("page media validation checks brand logos and Team role images", async () => {
  const { env, checked } = envFor();
  const error = await validatePageMediaReferences(dbFor([activeRow]), env, {
    sections: [
      { type: "brand-grid", content: { items: [{ url }] } },
      { type: "team-page", content: { people: { items: [{ image: url }] } } },
    ],
  });
  assert.equal(error, null);
  assert.deepEqual(checked, [key]);
});

test("page media validation rejects archived or unregistered R2 images", async () => {
  const { env, checked } = envFor();
  const archived = await validatePageMediaReferences(dbFor([{
    ...activeRow, deleted_at: "2026-11-24T00:00:00.000Z",
  }]), env, { sections: [{ type: "hero", content: { imageUrl: url } }] });
  assert.match(archived, /archived|not registered/i);

  const missing = await validatePageMediaReferences(dbFor([]), env, {
    sections: [{ type: "hero", content: { imageUrl: url } }],
  });
  assert.match(missing, /not registered/i);
  assert.deepEqual(checked, []);
});

test("page media validation rejects missing R2 objects and leaves local or external images alone", async () => {
  const missingEnv = envFor({ head: async () => null }).env;
  const missing = await validatePageMediaReferences(dbFor([activeRow]), missingEnv, {
    sections: [{ type: "hero", content: { imageUrl: url } }],
  });
  assert.match(missing, /missing from CMS media storage/i);

  const { env, checked } = envFor();
  const error = await validatePageMediaReferences(dbFor([]), env, {
    sections: [
      { type: "hero", content: { imageUrl: "/assets/hero.jpg" } },
      { type: "brand-grid", content: { items: [{ url: "/catalog/brand/logo.png" }, { url: "https://manufacturer.example/logo.png" }] } },
    ],
  });
  assert.equal(error, null);
  assert.deepEqual(checked, []);
});
