import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { onRequestPatch as updateRequest } from "../functions/api/admin/requests.js";
import { onRequestGet as getAdminSession, onRequestPost as startAdminSession, onRequestPatch as heartbeatAdminSession, onRequestDelete as logoutAdminSession } from "../functions/api/admin/session.js";
import { onRequestPost as publishCms } from "../functions/api/cms/admin/publish.js";
import { onRequestGet as previewCmsPage } from "../functions/api/cms/admin/preview.js";
import { onRequestGet as getPublicCmsPages } from "../functions/api/cms/public/pages.js";
import { onRequestPost as saveCmsSetting } from "../functions/api/cms/admin/settings.js";
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
          if (sql.includes("SELECT id, reference, status FROM requests")) {
            return exists ? { id: "request-id", reference: this.values[0], status: currentStatus } : null;
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
    async batch(statements) {
      calls.push(...statements);
      if (statements[0]?.sql.startsWith("UPDATE requests SET status")) {
        currentStatus = statements[0].values[0];
      }
      return statements.map(() => ({ meta: { changes: 1 } }));
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
            return { id: this.values[0], version_number: 4, state: targetState, created_at: "2026-11-20T00:00:00.000Z", ...draftContent };
          }
          return null;
        },
      };
      return statement;
    },
    async batch(statements) {
      batches.push(statements);
      return statements.map(() => ({ meta: { changes: 1 } }));
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
    historyRecorded: true,
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

test("Admin entry, refresh, heartbeat and workspace exit require only the authorised Access identity", async () => {
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
  const exited = await logoutAdminSession(context("/api/admin/session", "DELETE"));
  assert.deepEqual(await exited.json(), { ok: true, workspaceClosed: true, accessSessionActive: true });
  assert.equal(exited.headers.get("Set-Cookie"), null);
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
      { entityType, entityKey: entityType === "page" ? "home" : entityType === "product" ? "chair-model" : "site.navigation", versionId: "draft-version", expectedDraftCreatedAt: "2026-11-20T00:00:00.000Z" },
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
    assert.ok(batch[0].sql.includes("SET state = 'published'"));
    assert.equal(batch[0].values[1], "draft-version");
    assert.ok(batch[1].sql.includes("SET state = 'archived'"));
    assert.deepEqual(batch[1].values, ["previous-version", "draft-version"]);
    if (entityType === "page") {
      assert.ok(batch[2].sql.includes("SET title = ?, route = ?, published_version_id = ?"));
      assert.equal(batch[2].values[2], "draft-version");
    } else {
      assert.ok(batch[2].sql.includes("SET published_version_id = ?"));
      assert.equal(batch[2].values[0], "draft-version");
    }
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


function makeSettingsSaveDb({ existingDraft = null } = {}) {
  const calls = [];
  const batches = [];
  return {
    calls,
    batches,
    prepare(sql) {
      const statement = {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          calls.push(this);
          if (sql.includes("FROM cms_site_setting_versions WHERE setting_key=? AND state='draft'")) {
            return existingDraft;
          }
          if (sql.includes("COALESCE(MAX(version_number),0)")) return { version: 2 };
          return null;
        },
      };
      return statement;
    },
    async batch(statements) {
      batches.push(statements);
      return statements.map((statement, index) => ({
        meta: { changes: index === 1 ? 0 : 1 },
      }));
    },
  };
}

test("CMS settings save creates an audited draft when no prior draft exists", async () => {
  const db = makeSettingsSaveDb();
  const value = {
    items: [
      { label: "Products", url: "/products" },
      { label: "Services", url: "/services", type: "services" },
      { label: "Team", url: "/team" },
    ],
  };
  const response = await saveCmsSetting(adminContext(
    "/api/cms/admin/settings",
    { key: "site.navigation", value, expectedDraftId: null, changeNote: "Navigation update" },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.equal(result.auditRecorded, true);
  assert.equal(result.version, 3);
  assert.ok(result.draftId);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 5);
  assert.match(db.batches[0][1].sql, /SET state=state WHERE setting_key=\? AND state='draft'/);
  assert.match(db.batches[0][2].sql, /WHERE changes\(\) = \?/);
  assert.equal(db.batches[0][2].values.at(-1), 0);
  assert.match(db.batches[0][4].sql, /'save_draft'/);
});

test("CMS settings save rejects a newly appeared draft instead of overwriting it", async () => {
  const db = makeSettingsSaveDb({
    existingDraft: { id: "concurrent-draft", version_number: 3 },
  });
  const response = await saveCmsSetting(adminContext(
    "/api/cms/admin/settings",
    {
      key: "site.navigation",
      value: { items: [{ label: "Products", url: "/products" }] },
      expectedDraftId: null,
    },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 409);
  assert.match(result.error, /changed in another session/i);
  assert.equal(db.batches.length, 0);
});


import { onRequestPost as saveCmsPage } from "../functions/api/cms/admin/pages.js";
import { onRequestPost as saveCmsProduct } from "../functions/api/cms/admin/products.js";

function makeCmsCreateDb() {
  const calls = [];
  const batches = [];
  return {
    calls,
    batches,
    prepare(sql) {
      const statement = {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async first() { calls.push(this); return null; },
      };
      return statement;
    },
    async batch(statements) {
      batches.push(statements);
      return statements.map(() => ({ meta: { changes: 1 } }));
    },
  };
}

test("CMS page save creates a version-one draft and an audit record", async () => {
  const db = makeCmsCreateDb();
  const response = await saveCmsPage(adminContext(
    "/api/cms/admin/pages",
    {
      pageKey: "cms-test-page",
      title: "CMS Test Page",
      route: "/cms-test-page",
      content: { sections: [] },
      changeNote: "Create test page",
    },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.equal(result.auditRecorded, true);
  assert.equal(result.version, 1);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 3);
  assert.match(db.batches[0][0].sql, /INSERT INTO cms_pages/);
  assert.match(db.batches[0][1].sql, /INSERT INTO cms_page_versions/);
  assert.match(db.batches[0][2].sql, /'create_draft', 'page'/);
});

test("CMS product save creates a version-one draft and an audit record", async () => {
  const db = makeCmsCreateDb();
  const response = await saveCmsProduct(adminContext(
    "/api/cms/admin/products",
    {
      product: {
        slug: "cms-test-product",
        name: "CMS Test Product",
        purchaseType: "cart",
        requestFlow: "cart",
      },
    },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.equal(result.auditRecorded, true);
  assert.equal(result.version, 1);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 3);
  assert.match(db.batches[0][0].sql, /INSERT INTO cms_products/);
  assert.match(db.batches[0][1].sql, /INSERT INTO cms_product_versions/);
  assert.match(db.batches[0][2].sql, /'create_draft', 'product'/);
});


import { onRequestPost as restoreCmsRevision } from "../functions/api/cms/admin/history.js";
import { onRequestPatch as updateCmsMedia } from "../functions/api/cms/admin/media.js";

test("CMS product revision restore creates a new audited draft without publishing it", async () => {
  const calls = [];
  const batches = [];
  const db = {
    calls,
    batches,
    prepare(sql) {
      const statement = {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          calls.push(this);
          if (sql.includes("FROM cms_products WHERE product_slug = ?")) {
            return { id: "product-id" };
          }
          if (sql.includes("FROM cms_product_versions WHERE id = ? AND product_id = ?")) {
            return {
              version_number: 2,
              content: JSON.stringify({
                slug: "chair-model",
                name: "Chair model",
                purchaseType: "cart",
              }),
            };
          }
          if (sql.includes("FROM cms_product_versions WHERE product_id = ? AND state = 'draft'")) {
            return null;
          }
          if (sql.includes("COALESCE(MAX(version_number), 0)")) return { version: 4 };
          return null;
        },
      };
      return statement;
    },
    async batch(statements) {
      batches.push(statements);
      return statements.map(() => ({ meta: { changes: 1 } }));
    },
  };

  const response = await restoreCmsRevision(adminContext(
    "/api/cms/admin/history",
    {
      entityType: "product",
      entityKey: "chair-model",
      versionId: "old-product-version",
      expectedDraftId: null,
      expectedDraftCreatedAt: null,
    },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.equal(result.auditRecorded, true);
  assert.equal(result.version, 5);
  assert.equal(result.restoredFrom, 2);
  assert.ok(result.draftId);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 3);
  assert.match(batches[0][0].sql, /UPDATE cms_product_versions SET state = state/);
  assert.match(batches[0][1].sql, /INSERT INTO cms_product_versions/);
  assert.match(batches[0][1].sql, /'draft'/);
  assert.match(batches[0][2].sql, /'restore_revision_as_draft'/);
});

function makeMediaRestoreDb({ archived = true, batchChanges = [1, 1] } = {}) {
  const calls = [];
  const batches = [];
  return {
    calls,
    batches,
    prepare(sql) {
      return {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          calls.push(this);
          if (sql.includes("FROM cms_media WHERE id=? AND deleted_at IS NOT NULL")) {
            return archived ? { id: "media-id", storage_provider: "r2", object_key: "cms/original-image.png" } : null;
          }
          return null;
        },
      };
    },
    async batch(statements) {
      batches.push(statements);
      return statements.map((statement, index) => ({
        meta: { changes: batchChanges[index] ?? 1 },
      }));
    },
  };
}

function mediaPatchContext(db, mediaBinding) {
  return {
    request: new Request("https://yrproservice.test/api/cms/admin/media?id=media-id", {
      method: "PATCH",
      headers: {
        "Cf-Access-Jwt-Assertion": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "restore" }),
    }),
    env: { ...adminConfig, DB: db, CMS_MEDIA: mediaBinding },
  };
}

test("CMS media restore requires the original R2 object before changing the archive record", async () => {
  const db = makeMediaRestoreDb();
  const response = await updateCmsMedia(mediaPatchContext(db, {
    async head(key) {
      assert.equal(key, "cms/original-image.png");
      return null;
    },
  }));
  const result = await response.json();

  assert.equal(response.status, 409);
  assert.match(result.error, /missing from Preview R2/i);
  assert.equal(db.batches.length, 0);
});

test("CMS media restore reactivates an existing R2 object and records the audit event", async () => {
  const db = makeMediaRestoreDb();
  const response = await updateCmsMedia(mediaPatchContext(db, {
    async head(key) {
      assert.equal(key, "cms/original-image.png");
      return { key, size: 1234 };
    },
  }));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result, { ok: true, restored: true, auditRecorded: true });
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 2);
  assert.match(db.batches[0][0].sql, /UPDATE cms_media SET deleted_at=NULL/);
  assert.match(db.batches[0][1].sql, /'restore_media'/);
});


import { onRequestDelete as archiveCmsMedia } from "../functions/api/cms/admin/media.js";

function makeRevisionRestoreDb(entityType) {
  const calls = [];
  const batches = [];
  const entityId = entityType === "setting" ? "site.navigation" : entityType + "-id";
  const entityTable = entityType === "page" ? "cms_pages" : entityType === "setting" ? "cms_site_settings" : "cms_products";
  const keyColumn = entityType === "page" ? "page_key" : entityType === "setting" ? "setting_key" : "product_slug";
  const versionTable = entityType === "page" ? "cms_page_versions" : entityType === "setting" ? "cms_site_setting_versions" : "cms_product_versions";
  const foreignKey = entityType === "page" ? "page_id" : entityType === "setting" ? "setting_key" : "product_id";
  const content = entityType === "page"
    ? { sections: [] }
    : { items: [{ label: "Products", url: "/products" }] };
  return {
    calls,
    batches,
    prepare(sql) {
      return {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          calls.push(this);
          if (sql.includes(`FROM ${entityTable} WHERE ${keyColumn} = ?`)) return { id: entityId };
          if (sql.includes(`FROM ${versionTable} WHERE id = ? AND ${foreignKey} = ?`)) {
            return {
              version_number: 2,
              content: JSON.stringify(content),
              ...(entityType === "page" ? { title: "Home", route: "/" } : {}),
            };
          }
          if (sql.includes(`FROM ${versionTable} WHERE ${foreignKey} = ? AND state = 'draft'`)) return null;
          if (sql.includes("COALESCE(MAX(version_number), 0)")) return { version: 4 };
          return null;
        },
      };
    },
    async batch(statements) {
      batches.push(statements);
      return statements.map(() => ({ meta: { changes: 1 } }));
    },
  };
}

test("CMS page revision restore creates a new page draft and leaves the published pointer unchanged", async () => {
  const db = makeRevisionRestoreDb("page");
  const response = await restoreCmsRevision(adminContext(
    "/api/cms/admin/history",
    {
      entityType: "page",
      entityKey: "home",
      versionId: "old-page-version",
      expectedDraftId: null,
      expectedDraftCreatedAt: null,
    },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.equal(result.version, 5);
  assert.equal(result.restoredFrom, 2);
  assert.equal(result.auditRecorded, true);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 4);
  assert.match(db.batches[0][1].sql, /INSERT INTO cms_page_versions/);
  assert.match(db.batches[0][1].sql, /'draft'/);
  assert.match(db.batches[0][2].sql, /UPDATE cms_pages SET title = \?, route = \?/);
  assert.match(db.batches[0][3].sql, /'restore_revision_as_draft'/);
});

test("CMS navigation setting revision restore creates a new draft and audit record", async () => {
  const db = makeRevisionRestoreDb("setting");
  const response = await restoreCmsRevision(adminContext(
    "/api/cms/admin/history",
    {
      entityType: "setting",
      entityKey: "site.navigation",
      versionId: "old-navigation-version",
      expectedDraftId: null,
      expectedDraftCreatedAt: null,
    },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.equal(result.version, 5);
  assert.equal(result.restoredFrom, 2);
  assert.equal(result.auditRecorded, true);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 3);
  assert.match(db.batches[0][1].sql, /INSERT INTO cms_site_setting_versions/);
  assert.match(db.batches[0][1].sql, /'draft'/);
  assert.match(db.batches[0][2].sql, /'restore_revision_as_draft'/);
});

test("CMS media archive is blocked while a saved revision still references the image", async () => {
  const calls = [];
  const batches = [];
  const db = {
    calls,
    batches,
    prepare(sql) {
      return {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          calls.push(this);
          if (sql.includes("FROM cms_media WHERE id=? AND deleted_at IS NULL")) {
            return {
              id: "media-id",
              storage_provider: "r2",
              object_key: "cms/used-image.png",
              public_url: "https://media.example.r2.dev/cms/used-image.png",
            };
          }
          if (sql.includes("SELECT COUNT(*) AS total FROM cms_page_versions")) return { total: 1 };
          return { total: 0 };
        },
        async all() {
          calls.push(this);
          return { results: [] };
        },
      };
    },
    async batch(statements) {
      batches.push(statements);
      return statements.map(() => ({ meta: { changes: 1 } }));
    },
  };

  const response = await archiveCmsMedia({
    request: new Request("https://yrproservice.test/api/cms/admin/media?id=media-id", {
      method: "DELETE",
      headers: { "Cf-Access-Jwt-Assertion": accessToken },
    }),
    env: { ...adminConfig, DB: db },
  });
  const result = await response.json();

  assert.equal(response.status, 409);
  assert.match(result.error, /referenced by saved CMS content/i);
  assert.equal(result.usage.total, 1);
  assert.equal(db.batches.length, 0);
});


function makeExistingCmsDraftDb(type, { updateChanges = [1, 1, 1] } = {}) {
  const calls = [];
  const batches = [];
  const entityId = type === "setting" ? "site.navigation" : type + "-id";
  const draftId = type + "-draft-id";
  const draftContent = type === "page"
    ? JSON.stringify({ sections: [] })
    : type === "product"
      ? JSON.stringify({ slug: "cms-test-product", name: "CMS Test Product", purchaseType: "cart", requestFlow: "cart" })
      : undefined;
  return {
    calls,
    batches,
    prepare(sql) {
      const statement = {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          calls.push(this);
          if (type === "page" && sql.includes("SELECT id FROM cms_pages WHERE page_key")) return { id: entityId };
          if (type === "product" && sql.includes("SELECT id FROM cms_products WHERE product_slug")) return { id: entityId };
          if (sql.includes("SELECT p.id") && sql.includes("LEFT JOIN cms_page_versions")) return null;
          if (type === "page" && sql.includes("FROM cms_page_versions WHERE page_id = ? AND state = 'draft'")) {
            return { id: draftId, version_number: 2, created_at: "2026-11-20T07:00:00.000Z", content_json: draftContent };
          }
          if (type === "product" && sql.includes("FROM cms_product_versions WHERE product_id = ? AND state = 'draft'")) {
            return { id: draftId, version_number: 2, created_at: "2026-11-20T07:00:00.000Z", product_json: draftContent };
          }
          if (type === "setting" && sql.includes("FROM cms_site_setting_versions WHERE setting_key=? AND state='draft'")) {
            return { id: draftId, version_number: 2 };
          }
          if (type === "setting" && sql.includes("COALESCE(MAX(version_number),0)")) return { version: 2 };
          return null;
        },
      };
      return statement;
    },
    async batch(statements) {
      batches.push(statements);
      return statements.map((_, index) => ({ meta: { changes: updateChanges[index] ?? 1 } }));
    },
  };
}

test("CMS page save updates the existing draft snapshot and records an audit event", async () => {
  const db = makeExistingCmsDraftDb("page");
  const response = await saveCmsPage(adminContext(
    "/api/cms/admin/pages",
    {
      pageKey: "cms-test-page",
      title: "Updated CMS Test Page",
      route: "/cms-test-page",
      content: { sections: [] },
      expectedDraftId: "page-draft-id",
      expectedDraftCreatedAt: "2026-11-20T07:00:00.000Z",
    },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.equal(result.auditRecorded, true);
  assert.equal(result.version, 2);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 3);
  assert.match(db.batches[0][0].sql, /content_json = \?/);
  assert.match(db.batches[0][2].sql, /'update_draft', 'page'/);
});

test("CMS product save updates the existing draft snapshot and records an audit event", async () => {
  const db = makeExistingCmsDraftDb("product");
  const response = await saveCmsProduct(adminContext(
    "/api/cms/admin/products",
    {
      product: {
        slug: "cms-test-product",
        name: "Updated CMS Test Product",
        purchaseType: "cart",
        requestFlow: "cart",
      },
      expectedDraftId: "product-draft-id",
      expectedDraftCreatedAt: "2026-11-20T07:00:00.000Z",
    },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.ok, true);
  assert.equal(result.auditRecorded, true);
  assert.equal(result.version, 2);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 3);
  assert.match(db.batches[0][0].sql, /UPDATE cms_product_versions SET product_json/);
  assert.match(db.batches[0][2].sql, /'update_draft', 'product'/);
});

test("CMS navigation setting save replaces the exact current draft with an audited version", async () => {
  const db = makeExistingCmsDraftDb("setting");
  const response = await saveCmsSetting(adminContext(
    "/api/cms/admin/settings",
    {
      key: "site.navigation",
      value: { items: [{ label: "Products", url: "/products" }, { label: "Services", url: "/services" }] },
      expectedDraftId: "setting-draft-id",
      changeNote: "Update navigation",
    },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.equal(result.auditRecorded, true);
  assert.equal(result.version, 3);
  assert.ok(result.draftId);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 5);
  assert.match(db.batches[0][1].sql, /SET state='archived' WHERE id=\?/);
  assert.match(db.batches[0][2].sql, /WHERE changes\(\) = \?/);
  assert.equal(db.batches[0][2].values.at(-1), 1);
  assert.match(db.batches[0][4].sql, /'save_draft'/);
});

test("CMS page save rejects a stale draft snapshot without writing metadata or audit records", async () => {
  const db = makeExistingCmsDraftDb("page", { updateChanges: [0, 0, 0] });
  const response = await saveCmsPage(adminContext(
    "/api/cms/admin/pages",
    {
      pageKey: "cms-test-page",
      title: "Stale CMS Test Page",
      route: "/cms-test-page",
      content: { sections: [] },
      expectedDraftId: "page-draft-id",
      expectedDraftCreatedAt: "2026-11-20T07:00:00.000Z",
    },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 409);
  assert.match(result.error, /changed in another session/i);
  assert.equal(db.batches.length, 1);
  assert.match(db.batches[0][0].sql, /created_at = \? AND content_json = \?/);
});

test("CMS product save rejects a stale draft snapshot without writing metadata or audit records", async () => {
  const db = makeExistingCmsDraftDb("product", { updateChanges: [0, 0, 0] });
  const response = await saveCmsProduct(adminContext(
    "/api/cms/admin/products",
    {
      product: {
        slug: "cms-test-product",
        name: "Stale CMS Test Product",
        purchaseType: "cart",
        requestFlow: "cart",
      },
      expectedDraftId: "product-draft-id",
      expectedDraftCreatedAt: "2026-11-20T07:00:00.000Z",
    },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 409);
  assert.match(result.error, /changed in another session/i);
  assert.equal(db.batches.length, 1);
  assert.match(db.batches[0][0].sql, /created_at = \? AND product_json = \?/);
});


function makeSettingsExistingDraftDb({ batchChanges = [1, 1, 1, 1, 1], latestVersion = 3 } = {}) {
  const batches = [];
  return {
    batches,
    prepare(sql) {
      return {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.includes("FROM cms_site_setting_versions WHERE setting_key=? AND state='draft'")) {
            return { id: "current-navigation-draft", version_number: 3 };
          }
          if (sql.includes("COALESCE(MAX(version_number),0)")) return { version: latestVersion };
          return null;
        },
      };
    },
    async batch(statements) {
      batches.push(statements);
      return statements.map((_, index) => ({ meta: { changes: batchChanges[index] ?? 1 } }));
    },
  };
}

test("CMS settings save archives the exact expected draft before creating its replacement", async () => {
  const db = makeSettingsExistingDraftDb();
  const response = await saveCmsSetting(adminContext(
    "/api/cms/admin/settings",
    {
      key: "site.navigation",
      value: { items: [{ label: "Products", url: "/products" }, { label: "Team", url: "/team" }] },
      expectedDraftId: "current-navigation-draft",
      changeNote: "Replace navigation draft",
    },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.equal(result.auditRecorded, true);
  assert.equal(result.version, 4);
  assert.ok(result.draftId);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 5);
  assert.match(db.batches[0][1].sql, /SET state='archived' WHERE id=\? AND setting_key=\? AND state='draft'/);
  assert.equal(db.batches[0][1].values[0], "current-navigation-draft");
  assert.match(db.batches[0][2].sql, /WHERE changes\(\) = \?/);
  assert.equal(db.batches[0][2].values.at(-1), 1);
  assert.match(db.batches[0][4].sql, /'save_draft'/);
});

test("CMS settings save rejects a draft changed after the editor snapshot was loaded", async () => {
  const db = makeSettingsExistingDraftDb({ batchChanges: [1, 0, 0, 0, 0] });
  const response = await saveCmsSetting(adminContext(
    "/api/cms/admin/settings",
    {
      key: "site.navigation",
      value: { items: [{ label: "Services", url: "/services" }] },
      expectedDraftId: "current-navigation-draft",
    },
    { ...adminConfig, DB: db },
  ));
  const result = await response.json();

  assert.equal(response.status, 409);
  assert.match(result.error, /changed in another session/i);
  assert.equal(db.batches.length, 1);
  assert.match(db.batches[0][1].sql, /WHERE id=\? AND setting_key=\? AND state='draft'/);
  assert.match(db.batches[0][2].sql, /WHERE changes\(\) = \?/);
  assert.equal(db.batches[0][2].values.at(-1), 1);
});
