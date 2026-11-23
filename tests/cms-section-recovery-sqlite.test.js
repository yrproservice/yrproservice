import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { onRequestPost as updateSectionRecovery } from "../functions/api/cms/admin/section-recovery.js";

const cryptoApi = globalThis.crypto || webcrypto;
const signingKey = await cryptoApi.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"],
);
const publicJwk = await cryptoApi.subtle.exportKey("jwk", signingKey.publicKey);
publicJwk.kid = "section-recovery-test-key";

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
    "RSASSA-PKCS1-v1_5", signingKey.privateKey, new TextEncoder().encode(content),
  );
  return `${content}.${Buffer.from(signature).toString("base64url")}`;
}

const accessToken = await createAccessToken();
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

function makeSQLiteD1() {
  const sqlite = new DatabaseSync(":memory:");
  for (const migration of [
    "../migrations/0002_create_cms.sql",
    "../migrations/0003_page_metadata_versions.sql",
    "../migrations/0005_page_section_recovery.sql",
  ]) {
    sqlite.exec(readFileSync(new URL(migration, import.meta.url), "utf8"));
  }
  return {
    sqlite,
    prepare(sql) {
      return {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() { return sqlite.prepare(sql).get(...this.values) ?? null; },
        async all() { return { results: sqlite.prepare(sql).all(...this.values) }; },
        async run() {
          const result = sqlite.prepare(sql).run(...this.values);
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

const originalSection = {
  id: "section-featured",
  type: "featured-products",
  order: 2,
  visible: false,
  content: { heading: "Featured products", nested: { preserved: true } },
  layout: { variant: "wide", custom: { spacing: 24 } },
};

function seedPage(db, content = { sections: [{ id: "section-hero", type: "hero", order: 1 }, originalSection] }) {
  db.sqlite.prepare(
    "INSERT INTO cms_pages (id, page_key, title, route) VALUES (?, ?, ?, ?)"
  ).run("page-id", "home", "Home", "/");
  db.sqlite.prepare(
    "INSERT INTO cms_page_versions (id, page_id, version_number, state, title, route, content_json, created_at) VALUES (?, ?, 1, 'draft', ?, ?, ?, ?)"
  ).run("draft-id", "page-id", "Home", "/", JSON.stringify(content), "2026-11-23T07:00:00.000Z");
}

function context(db, body) {
  return {
    request: new Request("https://yrproservice.test/api/cms/admin/section-recovery", {
      method: "POST",
      headers: {
        "Cf-Access-Jwt-Assertion": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pageKey: "home",
        expectedDraftId: "draft-id",
        expectedDraftCreatedAt: "2026-11-23T07:00:00.000Z",
        ...body,
      }),
    }),
    env: { ...adminConfig, DB: db },
  };
}

function seedRecoveryEntry(db) {
  db.sqlite.prepare(`
    INSERT INTO cms_page_section_recovery (
      id, page_key, draft_id, draft_created_at, original_index,
      section_json, status, created_at, expires_at
    ) VALUES (?, 'home', 'draft-id', '2026-11-23T07:00:00.000Z', 1, ?, 'active', ?, ?)
  `).run(
    "recovery-id",
    JSON.stringify(originalSection),
    "2026-11-23T07:01:00.000Z",
    "2026-12-23T07:01:00.000Z",
  );
}

test("section recovery remove persists the exact section payload and audit record atomically in SQLite", async () => {
  const db = makeSQLiteD1();
  try {
    seedPage(db);
    const response = await updateSectionRecovery(context(db, {
      action: "remove",
      entryId: "recovery-new",
      originalIndex: 1,
      section: originalSection,
    }));
    const result = await response.json();
    assert.equal(response.status, 201);
    assert.equal(result.entry.id, "recovery-new");
    assert.equal(result.entry.originalIndex, 1);
    assert.deepEqual(result.entry.section, originalSection);
    const stored = db.sqlite.prepare(
      "SELECT section_json, status, original_index FROM cms_page_section_recovery WHERE id = ?"
    ).get("recovery-new");
    assert.deepEqual({ ...stored }, {
      section_json: JSON.stringify(originalSection),
      status: "active",
      original_index: 1,
    });
    assert.equal(
      db.sqlite.prepare("SELECT action FROM cms_audit_log").get().action,
      "remove_section_recovery",
    );
  } finally { db.close(); }
});

test("section recovery remove rolls back its recovery row when the audit insert fails", async () => {
  const db = makeSQLiteD1();
  try {
    seedPage(db);
    db.sqlite.exec(`
      CREATE TRIGGER fail_section_recovery_audit
      BEFORE INSERT ON cms_audit_log
      WHEN NEW.action = 'remove_section_recovery'
      BEGIN SELECT RAISE(ABORT, 'simulated section recovery audit failure'); END;
    `);
    const response = await updateSectionRecovery(context(db, {
      action: "remove",
      entryId: "recovery-rollback",
      originalIndex: 1,
      section: originalSection,
    }));
    assert.equal(response.status, 500);
    assert.equal(
      db.sqlite.prepare("SELECT COUNT(*) AS total FROM cms_page_section_recovery").get().total,
      0,
    );
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS total FROM cms_audit_log").get().total, 0);
  } finally { db.close(); }
});

test("section recovery rejects a duplicate active section without replacing its stored payload", async () => {
  const db = makeSQLiteD1();
  try {
    seedPage(db, { sections: [{ id: "section-hero", type: "hero" }] });
    seedRecoveryEntry(db);
    const competing = { ...originalSection, content: { heading: "Competing payload" } };
    const response = await updateSectionRecovery(context(db, {
      action: "remove",
      entryId: "recovery-duplicate",
      originalIndex: 0,
      section: competing,
    }));
    assert.equal(response.status, 409);
    const rows = db.sqlite.prepare(
      "SELECT id, section_json, status FROM cms_page_section_recovery"
    ).all().map((row) => ({ ...row }));
    assert.deepEqual(rows, [{
      id: "recovery-id",
      section_json: JSON.stringify(originalSection),
      status: "active",
    }]);
  } finally { db.close(); }
});

test("prepare_restore returns the intact section but rejects a section already present in saved content", async () => {
  const db = makeSQLiteD1();
  try {
    seedPage(db, { sections: [{ id: "section-hero", type: "hero" }] });
    seedRecoveryEntry(db);
    const prepared = await updateSectionRecovery(context(db, {
      action: "prepare_restore",
      entryId: "recovery-id",
    }));
    assert.equal(prepared.status, 200);
    assert.deepEqual((await prepared.json()).section, originalSection);

    db.sqlite.prepare("UPDATE cms_page_versions SET content_json = ? WHERE id = ?")
      .run(JSON.stringify({ sections: [{ id: "section-hero" }, originalSection] }), "draft-id");
    const duplicate = await updateSectionRecovery(context(db, {
      action: "prepare_restore",
      entryId: "recovery-id",
    }));
    assert.equal(duplicate.status, 409);
    assert.match((await duplicate.json()).error, /already present/i);
    assert.equal(
      db.sqlite.prepare("SELECT status FROM cms_page_section_recovery WHERE id = ?").get("recovery-id").status,
      "active",
    );
  } finally { db.close(); }
});

test("discard rolls back the recovery status and payload when its audit insert fails", async () => {
  const db = makeSQLiteD1();
  try {
    seedPage(db, { sections: [{ id: "section-hero", type: "hero" }] });
    seedRecoveryEntry(db);
    db.sqlite.exec(`
      CREATE TRIGGER fail_section_discard_audit
      BEFORE INSERT ON cms_audit_log
      WHEN NEW.action = 'discard_section_recovery'
      BEGIN SELECT RAISE(ABORT, 'simulated discard audit failure'); END;
    `);
    const response = await updateSectionRecovery(context(db, {
      action: "discard",
      entryId: "recovery-id",
    }));
    assert.equal(response.status, 500);
    const row = db.sqlite.prepare(
      "SELECT status, section_json, resolved_at FROM cms_page_section_recovery WHERE id = ?"
    ).get("recovery-id");
    assert.equal(row.status, "active");
    assert.equal(row.section_json, JSON.stringify(originalSection));
    assert.equal(row.resolved_at, null);
    assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS total FROM cms_audit_log").get().total, 0);
  } finally { db.close(); }
});
