import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { onRequestPatch as updateRequest } from "../functions/api/admin/requests.js";
import { onRequestGet as getRequestHistory } from "../functions/api/admin/request-history.js";

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
publicJwk.kid = "request-history-test-key";

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

const header = encode({ alg: "RS256", kid: publicJwk.kid });
const claims = encode({
  iss: "https://team.example.test",
  aud: ["admin-api-audience"],
  exp: Math.floor(Date.now() / 1000) + 300,
  email: "yr.proservice@gmail.com",
});
const signedContent = header + "." + claims;
const signature = await cryptoApi.subtle.sign(
  "RSASSA-PKCS1-v1_5",
  signingKey.privateKey,
  new TextEncoder().encode(signedContent),
);
const accessToken = signedContent + "." + Buffer.from(signature).toString("base64url");

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

const adminConfig = {
  ACCESS_TEAM_DOMAIN: "team.example.test",
  ACCESS_AUD: "admin-api-audience",
  ADMIN_EMAILS: "yr.proservice@gmail.com",
};

function makeRequestDatabase({ beforeBatch = null } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  for (const migration of [
    "../migrations/0001_create_requests.sql",
    "../migrations/0004_request_status_history.sql",
    "../migrations/0008_request_rate_limits.sql",
  ]) {
    sqlite.exec(readFileSync(new URL(migration, import.meta.url), "utf8"));
  }
  sqlite.prepare(`
    INSERT INTO requests (
      id, reference, request_type, status, customer_name, company,
      phone, email, message, details_json
    ) VALUES (?, ?, 'service', 'received', ?, ?, ?, ?, ?, ?)
  `).run(
    "synthetic-request-id",
    "YRS-20261125-ABCDEF0123456789",
    "Preview Integration Test",
    "Not a customer",
    "0100000000",
    "preview-test@example.invalid",
    "Synthetic test record only",
    JSON.stringify({ source: "unit-test" }),
  );

  return {
    sqlite,
    async batch(statements) {
      if (beforeBatch) beforeBatch(sqlite);
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
    prepare(sql) {
      return {
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          return sqlite.prepare(sql).get(...this.values) ?? null;
        },
        async all() {
          return { results: sqlite.prepare(sql).all(...this.values) };
        },
        async run() {
          const result = sqlite.prepare(sql).run(...this.values);
          return { meta: { changes: Number(result.changes) } };
        },
      };
    },
    close() { sqlite.close(); },
  };
}

function adminContext(path, method, body, db) {
  return {
    request: new Request("https://preview.yrproservice.pages.dev" + path, {
      method,
      headers: {
        "Cf-Access-Jwt-Assertion": accessToken,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    env: { ...adminConfig, DB: db },
  };
}

const reference = "YRS-20261125-ABCDEF0123456789";

test("Admin status transition and append-only history work together in real SQLite", async () => {
  const db = makeRequestDatabase();
  try {
    const response = await updateRequest(adminContext(
      "/api/admin/requests",
      "PATCH",
      { reference, status: "in_review" },
      db,
    ));
    const result = await response.json();

    assert.equal(response.status, 200);
    assert.equal(result.ok, true);
    assert.equal(result.historyRecorded, true);
    assert.equal(result.request.status, "in_review");

    const stored = db.sqlite.prepare(
      "SELECT status FROM requests WHERE reference = ?",
    ).get(reference);
    assert.equal(stored.status, "in_review");

    const historyResponse = await getRequestHistory(adminContext(
      "/api/admin/request-history?reference=" + reference,
      "GET",
      undefined,
      db,
    ));
    const history = await historyResponse.json();
    assert.equal(historyResponse.status, 200);
    assert.equal(history.history.length, 1);
    assert.equal(history.history[0].previousStatus, "received");
    assert.equal(history.history[0].newStatus, "in_review");
    assert.equal(history.history[0].actorEmail, "yr.proservice@gmail.com");
  } finally {
    db.close();
  }
});

test("Admin status transition rejects a stale concurrent update without writing false history", async () => {
  const db = makeRequestDatabase({
    beforeBatch(sqlite) {
      sqlite.prepare("UPDATE requests SET status = ? WHERE reference = ?")
        .run("contacted", reference);
    },
  });
  try {
    const response = await updateRequest(adminContext(
      "/api/admin/requests",
      "PATCH",
      { reference, status: "in_review" },
      db,
    ));
    const result = await response.json();

    assert.equal(response.status, 409);
    assert.match(result.error, /changed in another session/i);
    assert.equal(result.request.status, "contacted");
    assert.equal(
      db.sqlite.prepare("SELECT status FROM requests WHERE reference = ?").get(reference).status,
      "contacted",
    );
    assert.equal(
      db.sqlite.prepare("SELECT COUNT(*) AS total FROM request_status_history").get().total,
      0,
    );
  } finally {
    db.close();
  }
});

test("Admin status transition rolls back when its history insert fails", async () => {
  const db = makeRequestDatabase();
  try {
    db.sqlite.exec(`
      CREATE TRIGGER fail_request_history_insert
      BEFORE INSERT ON request_status_history
      BEGIN
        SELECT RAISE(ABORT, 'simulated request history failure');
      END;
    `);

    const response = await updateRequest(adminContext(
      "/api/admin/requests",
      "PATCH",
      { reference, status: "in_review" },
      db,
    ));
    const result = await response.json();

    assert.equal(response.status, 500);
    assert.match(result.error, /Unable to update this request/i);
    assert.equal(
      db.sqlite.prepare("SELECT status FROM requests WHERE reference = ?").get(reference).status,
      "received",
    );
    assert.equal(
      db.sqlite.prepare("SELECT COUNT(*) AS total FROM request_status_history").get().total,
      0,
    );
  } finally {
    db.close();
  }
});
