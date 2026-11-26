import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  onRequestDelete as archiveMedia,
  onRequestPatch as patchMedia,
  onRequestPost as uploadMedia,
} from "../functions/api/cms/admin/media.js";

const cryptoApi = globalThis.crypto || webcrypto;
const signingKey = await cryptoApi.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"],
);
const publicJwk = await cryptoApi.subtle.exportKey("jwk", signingKey.publicKey);
publicJwk.kid = "cms-media-test-key";
const adminConfig = {
  ACCESS_TEAM_DOMAIN: "team.example.test",
  ACCESS_AUD: "admin-api-audience",
  ADMIN_EMAILS: "yr.proservice@gmail.com",
};
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  if (String(input) === "https://team.example.test/cdn-cgi/access/certs") {
    return new Response(JSON.stringify({ keys: [publicJwk] }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return originalFetch(input, init);
};
test.after(() => { globalThis.fetch = originalFetch; });

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}
async function accessToken() {
  const header = encode({ alg: "RS256", kid: publicJwk.kid });
  const claims = encode({
    iss: "https://team.example.test",
    aud: ["admin-api-audience"],
    exp: Math.floor(Date.now() / 1000) + 300,
    email: "yr.proservice@gmail.com",
  });
  const content = header + "." + claims;
  const signature = await cryptoApi.subtle.sign(
    "RSASSA-PKCS1-v1_5", signingKey.privateKey, new TextEncoder().encode(content),
  );
  return content + "." + Buffer.from(signature).toString("base64url");
}

function makeSQLiteD1() {
  const sqlite = new DatabaseSync(":memory:");
  for (const migration of [
    "../migrations/0002_create_cms.sql",
    "../migrations/0003_page_metadata_versions.sql",
  ]) {
    sqlite.exec(readFileSync(new URL(migration, import.meta.url), "utf8"));
  }
  return {
    sqlite,
    prepare(sql) {
      let values = [];
      return {
        sql,
        get values() { return values; },
        bind(...next) { values = next; return this; },
        async first() { return sqlite.prepare(sql).get(...values) ?? null; },
        async all() { return { results: sqlite.prepare(sql).all(...values) }; },
        async run() {
          const result = sqlite.prepare(sql).run(...values);
          return { meta: { changes: Number(result.changes) } };
        },
      };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map((statement) => {
          const result = sqlite.prepare(statement.sql).run(...statement.values);
          return { meta: { changes: Number(result.changes) } };
        });
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
    close() { sqlite.close(); },
  };
}

function makeR2() {
  const objects = new Map();
  return {
    objects,
    async put(key, bytes, options) {
      objects.set(key, { bytes: new Uint8Array(bytes), size: bytes.byteLength, options });
    },
    async head(key) {
      const object = objects.get(key);
      return object ? { size: object.size, etag: "test-etag" } : null;
    },
    async delete(key) { objects.delete(key); },
  };
}

async function adminContext({ db, r2, method, path, body, contentType }) {
  const token = await accessToken();
  const headers = {
    "Cf-Access-Jwt-Assertion": token,
    Origin: "https://preview.example.test",
  };
  if (contentType) headers["Content-Type"] = contentType;
  if (body instanceof FormData) {
    // Fetch supplies the multipart boundary when the browser sends FormData.
    delete headers["Content-Type"];
  }
  const request = new Request("https://preview.example.test" + path, {
    method,
    headers,
    ...(body === undefined ? {} : { body }),
  });
  return {
    request,
    env: {
      ...adminConfig,
      DB: db,
      CMS_MEDIA: r2,
      CMS_MEDIA_PUBLIC_BASE: "https://images.example.r2.dev",
    },
  };
}

function tinyPng() {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0);
  bytes[16] = 0; bytes[17] = 0; bytes[18] = 0; bytes[19] = 1;
  bytes[20] = 0; bytes[21] = 0; bytes[22] = 0; bytes[23] = 1;
  return bytes;
}

test("CMS media upload registers a validated image in R2 and D1 with an audit event", async () => {
  const db = makeSQLiteD1();
  const r2 = makeR2();
  try {
    const form = new FormData();
    form.append("file", new Blob([tinyPng()], { type: "image/png" }), "test-image.png");
    const context = await adminContext({
      db, r2, method: "POST", path: "/api/cms/admin/media", body: form,
    });
    const response = await uploadMedia(context);
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.auditRecorded, true);
    assert.equal(body.media.mime_type, "image/png");
    assert.equal(body.media.width, 1);
    assert.equal(body.media.height, 1);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS total FROM cms_media").get().total, 1);
    assert.equal(db.sqlite.prepare("SELECT action FROM cms_audit_log").get().action, "upload_media");
    assert.equal(r2.objects.size, 1);
  } finally { db.close(); }
});

test("CMS media upload rejects unsupported image content before writing to R2", async () => {
  const db = makeSQLiteD1();
  const r2 = makeR2();
  try {
    const form = new FormData();
    form.append("file", new Blob(["not an image"], { type: "image/png" }), "fake.png");
    const context = await adminContext({
      db, r2, method: "POST", path: "/api/cms/admin/media", body: form,
    });
    const response = await uploadMedia(context);
    assert.equal(response.status, 415);
    assert.equal(r2.objects.size, 0);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS total FROM cms_media").get().total, 0);
  } finally { db.close(); }
});

test("CMS media archive blocks saved revision references and keeps the object", async () => {
  const db = makeSQLiteD1();
  const r2 = makeR2();
  try {
    const publicUrl = "https://images.example.r2.dev/cms/test/reference.png";
    const key = "cms/test/reference.png";
    await r2.put(key, tinyPng(), {});
    db.sqlite.prepare("INSERT INTO cms_media (id,storage_provider,object_key,public_url,original_file_name,mime_type,byte_size,width,height) VALUES ('media-1','r2',?,?, 'reference.png','image/png',24,1,1)")
      .run(key, publicUrl);
    db.sqlite.prepare("INSERT INTO cms_pages (id,page_key,title,route) VALUES ('page-1','home','Home','/')").run();
    db.sqlite.prepare("INSERT INTO cms_page_versions (id,page_id,version_number,state,title,route,content_json) VALUES ('version-1','page-1',1,'published','Home','/',?)")
      .run(JSON.stringify({ sections: [{ id: "hero", type: "hero", content: { imageUrl: publicUrl } }] }));
    const context = await adminContext({
      db, r2, method: "DELETE", path: "/api/cms/admin/media?id=media-1",
    });
    const response = await archiveMedia(context);
    assert.equal(response.status, 409);
    assert.equal(db.sqlite.prepare("SELECT deleted_at FROM cms_media WHERE id='media-1'").get().deleted_at, null);
    assert.equal(r2.objects.has(key), true);
  } finally { db.close(); }
});

test("CMS media archive retains R2 object and restore reactivates the same record", async () => {
  const db = makeSQLiteD1();
  const r2 = makeR2();
  try {
    const publicUrl = "https://images.example.r2.dev/cms/test/restore.png";
    const key = "cms/test/restore.png";
    await r2.put(key, tinyPng(), {});
    db.sqlite.prepare("INSERT INTO cms_media (id,storage_provider,object_key,public_url,original_file_name,mime_type,byte_size,width,height) VALUES ('media-2','r2',?,?, 'restore.png','image/png',24,1,1)")
      .run(key, publicUrl);
    const archiveContext = await adminContext({
      db, r2, method: "DELETE", path: "/api/cms/admin/media?id=media-2",
    });
    const archived = await archiveMedia(archiveContext);
    assert.equal(archived.status, 200);
    assert.equal((await archived.json()).auditRecorded, true);
    assert.ok(db.sqlite.prepare("SELECT deleted_at FROM cms_media WHERE id='media-2'").get().deleted_at);
    assert.equal(r2.objects.has(key), true);

    const restoreContext = await adminContext({
      db, r2, method: "PATCH", path: "/api/cms/admin/media?id=media-2",
      body: JSON.stringify({ action: "restore" }), contentType: "application/json",
    });
    const restored = await patchMedia(restoreContext);
    assert.equal(restored.status, 200);
    assert.equal((await restored.json()).restored, true);
    assert.equal(db.sqlite.prepare("SELECT deleted_at FROM cms_media WHERE id='media-2'").get().deleted_at, null);
    assert.deepEqual(
      db.sqlite.prepare("SELECT action FROM cms_audit_log ORDER BY rowid").all().map((row) => row.action),
      ["archive_media", "restore_media"],
    );
    assert.equal(r2.objects.has(key), true);
  } finally { db.close(); }
});
