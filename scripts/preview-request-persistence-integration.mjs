import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";

const origin = process.env.PREVIEW_BASE_URL || "https://cms-development.yrproservice.pages.dev";
const expectedHost = "cms-development.yrproservice.pages.dev";
const databaseName = "yr-proservice-test-db";
const databaseId = "7fca4ad0-3baa-4148-ad28-bfd2ef416c16";

assert.equal(new URL(origin).hostname, expectedHost, "Refusing to test a non-Preview hostname.");
assert.equal(new URL(origin).protocol, "https:", "Preview integration tests require HTTPS.");

function runD1(sql) {
  const output = execFileSync("npx", [
    "wrangler@4.157.0", "d1", "execute", databaseName,
    "--remote", "--command", sql, "--json",
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const parsed = JSON.parse(output);
  const sets = Array.isArray(parsed) ? parsed : [parsed];
  return sets.flatMap((set) => Array.isArray(set?.results) ? set.results : []);
}

function sqlString(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}

function hashEmail(email) {
  return createHash("sha256").update(email.toLowerCase()).digest("hex");
}

const marker = "YR-PREVIEW-INTEGRATION-" + randomUUID().toUpperCase();
const cases = [
  {
    type: "service",
    prefix: "YRS",
    suffix: "SERVICE",
    body: {
      requestType: "service",
      phone: "0100000000",
      service: "installation-site-planning",
      message: marker + " synthetic Preview service request",
    },
  },
  {
    type: "quotation",
    prefix: "YRQ",
    suffix: "QUOTE",
    body: {
      requestType: "quotation",
      product: marker + " synthetic product selection; Qty: 1",
      message: marker + " synthetic Preview quotation request",
    },
  },
  {
    type: "dental_chair",
    prefix: "YRC",
    suffix: "CHAIR",
    body: {
      requestType: "dental_chair",
      product: marker + " synthetic dental chair selection x1",
      message: marker + " synthetic Preview chair request",
    },
  },
].map((item) => {
  const email = `yr-preview-${randomUUID()}@example.invalid`;
  return {
    ...item,
    email,
    name: `${marker}-${item.suffix}`,
    company: "Automated Preview Test - Not a Customer",
    body: {
      ...item.body,
      name: `${marker}-${item.suffix}`,
      clinic: "Automated Preview Test - Not a Customer",
      email,
      location: "Preview test only",
    },
  };
});

let primaryError = null;
let previewIdentityVerified = false;
const created = [];

try {
  const infoText = execFileSync("npx", [
    "wrangler@4.157.0", "d1", "info", databaseName, "--json",
  ], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const info = JSON.parse(infoText);
  const identityValues = [];
  const visit = (value) => {
    if (typeof value === "string") identityValues.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(info);
  assert.ok(identityValues.includes(databaseName), "Preview D1 name did not match; refusing to write.");
  assert.ok(identityValues.includes(databaseId), "Preview D1 UUID did not match; refusing to write.");
  previewIdentityVerified = true;

  const schema = runD1(`
    SELECT
      (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='requests') AS requests_table,
      (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='request_status_history') AS history_table,
      (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('request_submission_attempts','request_tracking_attempts')) AS rate_limit_tables;
  `);
  assert.equal(schema.length, 1, "Unexpected Preview schema response.");
  assert.equal(Number(schema[0].requests_table), 1, "Preview requests table is missing.");
  assert.equal(Number(schema[0].history_table), 1, "Preview request history table is missing.");
  assert.equal(Number(schema[0].rate_limit_tables), 2, "Preview rate-limit tables are missing.");

  for (const item of cases) {
    const response = await fetch(new URL("/api/requests", origin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.body),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    assert.equal(response.status, 201, `${item.type} submission failed: ${JSON.stringify(result)}`);
    assert.equal(result.ok, true);
    assert.match(result.reference, new RegExp(`^${item.prefix}-\\d{8}-[A-F0-9]{16}$`));
    item.reference = result.reference;
    created.push(item);

    const trackingUrl = new URL("/api/track", origin);
    trackingUrl.searchParams.set("reference", item.reference);
    trackingUrl.searchParams.set("email", item.email);
    const trackingResponse = await fetch(trackingUrl, { signal: AbortSignal.timeout(20000) });
    const tracking = await trackingResponse.json();
    assert.equal(trackingResponse.status, 200, `${item.type} tracking failed: ${JSON.stringify(tracking)}`);
    assert.equal(tracking.request.reference, item.reference);
    assert.equal(tracking.request.requestType, item.type);
    assert.equal(tracking.request.status, "received");
  }

  const references = created.map((item) => sqlString(item.reference)).join(", ");
  const persisted = runD1(`
    SELECT reference, request_type, status, customer_name, email
    FROM requests
    WHERE reference IN (${references})
    ORDER BY request_type;
  `);
  assert.equal(persisted.length, 3, "Not all three synthetic requests were persisted in Preview D1.");
  for (const item of created) {
    const row = persisted.find((entry) => entry.reference === item.reference);
    assert.ok(row, `Missing persisted ${item.type} request.`);
    assert.equal(row.request_type, item.type);
    assert.equal(row.status, "received");
    assert.equal(row.customer_name, item.name);
    assert.equal(row.email, item.email);
  }

  console.log(JSON.stringify({
    result: "passed",
    target: expectedHost,
    database: databaseName,
    databaseId,
    marker,
    verified: created.map(({ type, reference }) => ({ type, reference, persisted: true, tracking: true })),
  }, null, 2));
} catch (error) {
  primaryError = error;
} finally {
  if (previewIdentityVerified) {
    const cleanupConditions = cases.map((item) =>
      `(email = ${sqlString(item.email)} AND customer_name = ${sqlString(item.name)} AND request_type = ${sqlString(item.type)} AND details_json LIKE ${sqlString("%website-" + (item.type === "service" ? "service-request" : item.type === "quotation" ? "quotation-request" : "dental-chair-request") + "%")})`
    ).join(" OR ");
    const emailHashes = cases.map((item) => sqlString(hashEmail(item.email))).join(", ");
    try {
      // Never delete a request that acquired status history. This test does not
      // change status, and cleanup is restricted to this run's unique marker/email.
      runD1(`DELETE FROM requests
        WHERE (${cleanupConditions})
          AND NOT EXISTS (
            SELECT 1 FROM request_status_history h
            WHERE h.request_id = requests.id
          );`);
      runD1(`DELETE FROM request_submission_attempts WHERE email_hash IN (${emailHashes});`);
      runD1(`DELETE FROM request_tracking_attempts WHERE email_hash IN (${emailHashes});`);
      const remaining = runD1(`
        SELECT COUNT(*) AS total
        FROM requests
        WHERE ${cleanupConditions};
      `);
      assert.equal(Number(remaining[0]?.total), 0, "Synthetic Preview request records remain after cleanup.");
    } catch (cleanupError) {
      if (primaryError) {
        console.error("Primary integration test error:", primaryError);
      }
      throw new Error("Preview integration test cleanup could not be confirmed. Inspect only records with marker " + marker + ". " + cleanupError.message);
    }
  } else {
    console.error("Preview D1 identity was not verified; cleanup and all database mutations were skipped.");
  }
}

if (primaryError) throw primaryError;
