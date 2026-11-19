import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { onRequestPatch as updateRequest } from "../functions/api/admin/requests.js";
import { onRequestGet as getAdminSession, onRequestPost as startAdminSession, onRequestPatch as heartbeatAdminSession, onRequestDelete as logoutAdminSession } from "../functions/api/admin/session.js";
import { onRequestPost as publishCms } from "../functions/api/cms/admin/publish.js";
import { onRequestGet as previewCmsPage } from "../functions/api/cms/admin/preview.js";
import { onRequestGet as getPublicCmsPages } from "../functions/api/cms/public/pages.js";
import { onRequest as getPublicCmsProducts } from "../functions/api/cms/public/products.js";

const cryptoApi = globalThis.crypto || webcrypto;
const originalFetch = globalThis.fetch;
const signingKey = await cryptoApi.subtle.generateKey(
  {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true,
  ["sign", "verify"],
);
const publicJwk = await cryptoApi.subtle.exportKey("jwk", signingKey.publicKey);
publicJwk.kid = "test-access-key";

function encodeSegment(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function createAccessToken() {
  const header = encodeSegment({ alg: "RS256", kid: publicJwk.kid });
  const claims = encodeSegment({
    iss: "https://team.example.test",
    aud: ["admin-api-audience"],
    exp: Math.floor(Date.now() / 1000) + 300,
    email: "yr.proservice@gmail.com",
  });
  const content = `${header}.${claims}`;
  const signature = await cryptoApi.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    signingKey.privateKey,
    new TextEncoder().encode(content),
  );
  return `${content}.${Buffer.from(signature).toString("base64url")}`;
}

const accessToken = await createAccessToken();

globalThis.fetch = async (input, init) => {
  if (String(input) === "https://team.example.test/cdn-cgi/access/certs") {
    return new Response(JSON.stringify({ keys: [publicJwk] }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return originalFetch(input, init);
};

test.after(() => {
  globalThis.fetch = originalFetch;
});

function adminContext(path, body, env) {
  return {
    request: new Request(`https://yrproservice.test${path}`, {
      method: path.includes("/api/admin/requests") ? "PATCH" : "POST",
      headers: {
        "Cf-Access-Jwt-Assertion": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
    env,
  };
}

const adminConfig = {
  ACCESS_TEAM_DOMAIN: "team.example.test",
  ACCESS_AUD: "admin-api-audience",
  ADMIN_EMAILS: "yr.proservice@gmail.com",
};

function makeRequestDb({ exists = true } = {}) {
  const calls = [];
  let currentStatus = "received";
  const db = {
    calls,
    prepare(sql) {
      const statement = {
        sql,
        values: [],
        bind(...values) {
          this.values = values;
          return this;
        },
        async run() {
          calls.push(this);
          if (sql.startsWith("UPDATE requests SET status")) {
            currentStatus = this.values[0];
          }
          return { meta: { changes: 1 } };
        },
        async first() {
          calls.push(this);
          if (sql.includes("SELECT reference FROM requests")) {
            return exists ? { reference: this.values[0] } : null;
          }
          if (sql.includes("SELECT reference, request_type, status, created_at")) {
            return {
              reference: this.values[0],
              request_type: "service",
              status: currentStatus,
              created_at: "2026-11-16T02:00:00.000Z",
            };
          }
          return null;
        },
      };
      return statement;
    },
  };
  return db;
}

function makeCmsDb({
  entityType,
  publishedVersionId = "previous-version",
  targetState = "draft",
  entityExists = true,
  targetExists = true,
} = {}) {
  const entityKey = entityType === "page"
    ? "home"
    : entityType === "product"
      ? "chair-model"
      : "site.navigation";
  const entityId = entityType === "setting" ? entityKey : `${entityType}-id`;
  const entityTable = entityType === "page"
    ? "cms_pages"
    : entityType === "product"
      ? "cms_products"
      : "cms_site_settings";
  const versionTable = entityType === "page"
    ? "cms_page_versions"
    : entityType === "product"
      ? "cms_product_versions"
      : "cms_site_setting_versions";
  const entityKeyColumn = entityType === "page"
    ? "page_key"
    : entityType === "product"
      ? "product_slug"
      : "setting_key";
  const foreignKey = entityType === "page"
    ? "page_id"
    : entityType === "product"
      ? "product_id"
      : "setting_key";
  const calls = [];
  const batches = [];

  return {
    calls,
    batches,
    prepare(sql) {
      const statement = {
        sql,
        values: [],
        bind(...values) {
          this.values = values;
          return this;
        },
        async run() {
          calls.push(this);
          return { meta: { changes: 1 } };
        },
        async first() {
          calls.push(this);
          const normalizedSql = sql.replace(/\s+/g, " ");
          if (normalizedSql.includes(`FROM ${entityTable} WHERE ${entityKeyColumn} = ?`)) {
            if (!entityExists) return null;
            return { id: entityId, published_version_id: publishedVersionId };
          }
          if (normalizedSql.includes(`FROM ${versionTable} WHERE id = ? AND ${foreignKey} = ?`)) {
            if (!targetExists) return null;
            const draftContent = entityType === "page"
              ? { value_json: JSON.stringify({ sections: [] }), title: "Home", route: "/" }
              : entityType === "product"
                ? { value_json: JSON.stringify({ slug: "chair-model", name: "Chair model", purchaseType: "cart" }) }
                : { value_json: JSON.stringify({ items: [{ label: "Products", url: "/products" }] }) };
            return { id: this.values[0], version_number: 4, state: targetState, ...draftContent };
          }
          return null;
        },
      };
      return statement;
    },
    async batch(statements) {
      batches.push(statements);
      return statements.map(() => ({ success: true }));
    },
  };
}

test("Admin status update saves the allowed status and returns the updated request", async () => {
  const db = makeRequestDb();
  const response = await updateRequest(adminContext(
    "/api/admin/requests",
    { reference: "yrs-20261116-abc123", status: "in_review" },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result, {
    ok: true,
    request: {
      reference: "YRS-20261116-ABC123",
      request_type: "service",
      status: "in_review",
      created_at: "2026-11-16T02:00:00.000Z",
    },
  });
  assert.ok(db.calls.some((call) =>
    call.sql.startsWith("UPDATE requests SET status") &&
    call.values[0] === "in_review" &&
    call.values[1] === "YRS-20261116-ABC123",
  ));
});

test("Admin status update rejects invalid statuses and unknown references", async () => {
  const invalidStatusDb = makeRequestDb();
  const invalidStatus = await updateRequest(adminContext(
    "/api/admin/requests",
    { reference: "YRS-20261116-ABC123", status: "pending" },
    { ...adminConfig, DB: invalidStatusDb },
  ));
  assert.equal(invalidStatus.status, 400);
  assert.equal(invalidStatusDb.calls.some((call) =>
    call.sql.startsWith("UPDATE requests SET status"),
  ), false);

  const missingRequest = await updateRequest(adminContext(
    "/api/admin/requests",
    { reference: "YRS-20261116-ABC123", status: "completed" },
    { ...adminConfig, DB: makeRequestDb({ exists: false }) },
  ));
  assert.equal(missingRequest.status, 404);
});

test("multiple authorised devices can use Admin APIs concurrently without a session lock", async () => {
  const db = makeRequestDb();
  const firstDevice = adminContext("/api/admin/requests", { reference: "YRS-20261116-ABC123", status: "in_review" }, { ...adminConfig, DB: db });
  const secondDevice = adminContext("/api/admin/requests", { reference: "YRS-20261116-ABC123", status: "completed" }, { ...adminConfig, DB: db });
  const responses = await Promise.all([updateRequest(firstDevice), updateRequest(secondDevice)]);
  assert.deepEqual(responses.map((response) => response.status), [200, 200]);
  assert.equal(db.calls.some((call) => call.sql.includes("admin_session_lock")), false);
});

test("Admin entry, refresh, heartbeat and logout require only the authorised Access identity", async () => {
  const context = (path, method = "GET") => ({
    request: new Request("https://yrproservice.test" + path, { method, headers: { "Cf-Access-Jwt-Assertion": accessToken } }),
    env: adminConfig,
  });
  const accessReturn = await getAdminSession(context("/api/admin/session?access_return=1"));
  assert.equal(accessReturn.status, 303);
  assert.equal(accessReturn.headers.get("Location"), "/admin?entry=1");
  const refreshed = await getAdminSession(context("/api/admin/session"));
  assert.deepEqual(await refreshed.json(), { ok: true, authorized: true });
  const started = await startAdminSession(context("/api/admin/session", "POST"));
  assert.deepEqual(await started.json(), { ok: true, authorized: true });
  const heartbeat = await heartbeatAdminSession(context("/api/admin/session", "PATCH"));
  assert.deepEqual(await heartbeat.json(), { ok: true, authorized: true });
  const loggedOut = await logoutAdminSession(context("/api/admin/session", "DELETE"));
  assert.deepEqual(await loggedOut.json(), { ok: true, loggedOut: true });
  assert.match(loggedOut.headers.get("Set-Cookie"), /Max-Age=0/);
  const unauthorized = await startAdminSession({
    request: new Request("https://yrproservice.test/api/admin/session", { method: "POST" }),
    env: adminConfig,
  });
  assert.equal(unauthorized.status, 401);
});

for (const entityType of ["page", "product", "setting"]) {
  test(`CMS publishing updates the ${entityType} pointer and records the audit event`, async () => {
    const db = makeCmsDb({ entityType });
    const response = await publishCms(adminContext(
      "/api/cms/admin/publish",
      { entityType, entityKey: entityType === "page" ? "home" : entityType === "product" ? "chair-model" : "site.navigation", versionId: "draft-version" },
      { ...adminConfig, DB: db },
    ));
    const result = await response.json();
    const batch = db.batches[0];

    assert.equal(response.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.entityType, entityType);
    assert.equal(result.version, 4);
    assert.ok(result.publishedAt);
    assert.equal(db.batches.length, 1);
    assert.equal(batch.length, 4);
    assert.ok(batch[0].sql.includes("SET state = 'archived'"));
    assert.deepEqual(batch[0].values, ["previous-version"]);
    assert.ok(batch[1].sql.includes("SET state = 'published'"));
    assert.equal(batch[1].values[1], "draft-version");
    assert.ok(batch[2].sql.includes("SET published_version_id = ?"));
    assert.equal(batch[2].values[0], "draft-version");
    assert.ok(batch[3].sql.includes("INSERT INTO cms_audit_log"));
    assert.equal(batch[3].values[2], entityType);
    assert.deepEqual(JSON.parse(batch[3].values[4]), { version: 4 });
  });
}

test("CMS publishing rejects archived revisions and revisions belonging to another item", async () => {
  const archivedDb = makeCmsDb({ entityType: "page", targetState: "archived" });
  const archived = await publishCms(adminContext(
    "/api/cms/admin/publish",
    { entityType: "page", entityKey: "home", versionId: "old-version" },
    { ...adminConfig, DB: archivedDb },
  ));
  assert.equal(archived.status, 409);
  assert.equal(archivedDb.batches.length, 0);

  const foreignRevisionDb = makeCmsDb({ entityType: "page", targetExists: false });
  const foreignRevision = await publishCms(adminContext(
    "/api/cms/admin/publish",
    { entityType: "page", entityKey: "home", versionId: "foreign-version" },
    { ...adminConfig, DB: foreignRevisionDb },
  ));
  assert.equal(foreignRevision.status, 404);
  assert.equal(foreignRevisionDb.batches.length, 0);
});

test("CMS publishing does not duplicate work for the already-published revision", async () => {
  const db = makeCmsDb({
    entityType: "product",
    publishedVersionId: "current-version",
    targetState: "published",
  });
  const response = await publishCms(adminContext(
    "/api/cms/admin/publish",
    { entityType: "product", entityKey: "chair-model", versionId: "current-version" },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result, {
    ok: true,
    alreadyPublished: true,
    version: 4,
  });
  assert.equal(db.batches.length, 0);
});


function makePagePreviewDb({ draft = true, published = true } = {}) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const statement = {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          calls.push(this);
          if (!sql.includes("FROM cms_pages p")) return null;
          return {
            page_key: "home",
            title: "Home",
            route: "/",
            draft_id: draft ? "draft-id" : null,
            draft_version: draft ? 7 : null,
            draft_content: draft ? JSON.stringify({ sections: [{ id: "draft" }] }) : null,
            published_version: published ? 5 : null,
            published_content: published ? JSON.stringify({ sections: [{ id: "published" }] }) : null,
          };
        },
      };
      return statement;
    },
  };
}

function adminGetContext(path, env) {
  return {
    request: new Request("https://yrproservice.test" + path, {
      method: "GET",
      headers: { "Cf-Access-Jwt-Assertion": accessToken },
    }),
    env: { ...adminConfig, DB: env },
  };
}

test("CMS page preview selects the latest saved draft ahead of the published revision", async () => {
  const db = makePagePreviewDb({ draft: true, published: true });
  const response = await previewCmsPage(adminGetContext("/api/cms/admin/preview?key=home", db));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.page.isDraft, true);
  assert.equal(result.page.draftVersion, 7);
  assert.equal(result.page.publishedVersion, 5);
  assert.deepEqual(result.page.content, { sections: [{ id: "draft" }] });
  assert.match(db.calls[0].sql, /pv\.state = 'published'/);
});

test("CMS page preview falls back to the published revision when no draft exists", async () => {
  const db = makePagePreviewDb({ draft: false, published: true });
  const response = await previewCmsPage(adminGetContext("/api/cms/admin/preview?key=home", db));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.page.isDraft, false);
  assert.equal(result.page.draftVersion, null);
  assert.equal(result.page.publishedVersion, 5);
  assert.deepEqual(result.page.content, { sections: [{ id: "published" }] });
});

test("CMS page preview does not fall back to an archived or invalid published pointer", async () => {
  const db = makePagePreviewDb({ draft: false, published: false });
  const response = await previewCmsPage(adminGetContext("/api/cms/admin/preview?key=home", db));
  assert.equal(response.status, 404);
});

test("public CMS page endpoint explicitly selects published revisions only", async () => {
  let sqlSeen = "";
  const db = {
    prepare(sql) {
      sqlSeen = sql;
      return {
        bind() { return this; },
        async first() { return null; },
      };
    },
  };
  const response = await getPublicCmsPages({
    request: new Request("https://yrproservice.test/api/cms/public/pages?key=home"),
    env: { DB: db },
  });
  assert.equal(response.status, 404);
  assert.match(sqlSeen, /v\.state = 'published'/);
});

test("public CMS product endpoint explicitly selects published revisions only", async () => {
  let sqlSeen = "";
  const db = {
    prepare(sql) {
      sqlSeen = sql;
      return {
        bind() { return this; },
        async first() { return null; },
      };
    },
  };
  const response = await getPublicCmsProducts({
    request: new Request("https://yrproservice.test/api/cms/public/products?slug=chair-model"),
    env: { DB: db },
  });
  assert.equal(response.status, 404);
  assert.match(sqlSeen, /v\.state = 'published'/);
});
