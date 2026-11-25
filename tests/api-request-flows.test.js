import test from "node:test";
import assert from "node:assert/strict";
import { onRequest as submitRequest } from "../functions/api/requests.js";
import { onRequest as trackRequest } from "../functions/api/track.js";

function makeDb({ ipCount = 0, emailCount = 0, requestRow = null } = {}) {
  const statements = [];
  return {
    statements,
    prepare(sql) {
      const execute = (values) => ({
        async run() {
          statements.push({ sql, values });
          const submissionDenied = sql.includes("INSERT INTO request_submission_attempts") &&
            (emailCount >= 5 || (sql.includes("ip_hash = ?") && ipCount >= 20));
          const trackingDenied = sql.includes("INSERT INTO request_tracking_attempts") &&
            (ipCount >= 30 || emailCount >= 10);
          return { meta: { changes: submissionDenied || trackingDenied ? 0 : 1 } };
        },
        async first() {
          if (sql.includes("COUNT(*)")) {
            return {
              count: sql.includes("email_hash = ?") ? emailCount : ipCount,
            };
          }
          if (sql.includes("SELECT reference, request_type, status, created_at")) {
            return requestRow;
          }
          return null;
        },
      });
      return {
        ...execute([]),
        bind(...values) {
          return execute(values);
        },
      };
    },
  };
}

function postRequest(body, options = {}) {
  const method = options.method || "POST";
  return new Request("https://yrproservice.test/api/requests", {
    method,
    headers: {
      "Content-Type": options.contentType || "application/json",
      "CF-Connecting-IP": "203.0.113.10",
    },
    body: method === "GET" || method === "HEAD"
      ? undefined
      : options.rawBody ?? JSON.stringify(body),
  });
}

function getTrackingRequest(reference = "YRS-20261116-ABC123", email = "clinic@example.com") {
  const url = new URL("https://yrproservice.test/api/track");
  if (reference !== null) url.searchParams.set("reference", reference);
  if (email !== null) url.searchParams.set("email", email);
  return new Request(url, {
    headers: { "CF-Connecting-IP": "203.0.113.10" },
  });
}

test("request submission rejects unsupported methods and non-JSON bodies", async () => {
  const method = await submitRequest({
    request: postRequest({}, { method: "GET" }),
    env: { DB: makeDb() },
  });
  assert.equal(method.status, 405);

  const contentType = await submitRequest({
    request: postRequest({}, { contentType: "text/plain" }),
    env: { DB: makeDb() },
  });
  assert.equal(contentType.status, 415);
});

test("request submission rejects malformed JSON and unsupported request types", async () => {
  const malformed = await submitRequest({
    request: postRequest({}, { rawBody: "{broken" }),
    env: { DB: makeDb() },
  });
  assert.equal(malformed.status, 400);

  const unsupported = await submitRequest({
    request: postRequest({ requestType: "unknown" }),
    env: { DB: makeDb() },
  });
  assert.equal(unsupported.status, 400);
});

test("service request validation requires contact details, a valid email and an allowed service", async () => {
  const missing = await submitRequest({
    request: postRequest({ requestType: "service", name: "Clinic" }),
    env: { DB: makeDb() },
  });
  assert.equal(missing.status, 400);

  const invalidEmail = await submitRequest({
    request: postRequest({
      requestType: "service",
      name: "Clinic",
      phone: "0123456789",
      email: "not-an-email",
      service: "dental-chair-installation",
      message: "Please contact us.",
    }),
    env: { DB: makeDb() },
  });
  assert.equal(invalidEmail.status, 400);

  const invalidService = await submitRequest({
    request: postRequest({
      requestType: "service",
      name: "Clinic",
      phone: "0123456789",
      email: "clinic@example.com",
      service: "not-a-real-service",
      message: "Please contact us.",
    }),
    env: { DB: makeDb() },
  });
  assert.equal(invalidService.status, 400);
});


test("all eight established V10 Services destinations are accepted by the request API", async () => {
  const originalServiceSlugs = [
    "dental-chair-installation",
    "equipment-installation",
    "compressor-installation",
    "dental-suction-installation",
    "underfloor-piping",
    "preventive-maintenance",
    "equipment-relocation",
    "repair-technical-support",
  ];

  for (const service of originalServiceSlugs) {
    const response = await submitRequest({
      request: postRequest({
        requestType: "service",
        name: "Clinic Manager",
        clinic: "Example Dental",
        phone: "0123456789",
        email: "clinic@example.com",
        service,
        message: "Please contact us about this service.",
      }),
      env: { DB: makeDb() },
    });
    assert.equal(response.status, 201, service);
  }
});

test("superseded four-category Preview service slugs remain temporarily compatible", async () => {
  const compatibilitySlugs = [
    "installation-site-planning",
    "emergency-repair",
    "preventative-maintenance",
    "compliance-safety-audits",
  ];

  for (const service of compatibilitySlugs) {
    const response = await submitRequest({
      request: postRequest({
        requestType: "service",
        name: "Clinic Manager",
        clinic: "Example Dental",
        phone: "0123456789",
        email: "clinic@example.com",
        service,
        message: "Please contact us about this service.",
      }),
      env: { DB: makeDb() },
    });
    assert.equal(response.status, 201, service);
  }
});

test("quotation and dental-chair requests require a product selection", async () => {
  for (const requestType of ["quotation", "dental_chair"]) {
    const response = await submitRequest({
      request: postRequest({
        requestType,
        name: "Clinic",
        email: "clinic@example.com",
      }),
      env: { DB: makeDb() },
    });
    assert.equal(response.status, 400);
  }
});

test("a valid service request is rate-limited, stored and returns a reference", async () => {
  const db = makeDb();
  const response = await submitRequest({
    request: postRequest({
      requestType: "service",
      name: "Clinic Manager",
      clinic: "Example Dental",
      phone: "0123456789",
      email: "clinic@example.com",
      service: "dental-chair-installation",
      message: "Please arrange an installation visit.",
    }),
    env: { DB: db },
  });

  const result = await response.json();
  assert.equal(response.status, 201);
  assert.equal(result.ok, true);
  assert.match(result.reference, /^YRS-\d{8}-[A-F0-9]{16}$/);
  assert.equal(
    db.statements.some((item) => /^\s*CREATE\s+(TABLE|INDEX)/i.test(item.sql)),
    false,
    "Request submission must not mutate database schema at runtime.",
  );
  const insert = db.statements.find((item) => item.sql.includes("INSERT INTO requests"));
  assert.ok(insert);
  assert.equal(insert.values[2], "service");
  assert.equal(insert.values[3], "Clinic Manager");
  assert.equal(insert.values[6], "clinic@example.com");
});

test("request submission returns 429 when the email submission limit is reached", async () => {
  const response = await submitRequest({
    request: postRequest({
      requestType: "service",
      name: "Clinic",
      phone: "0123456789",
      email: "clinic@example.com",
      service: "dental-chair-installation",
      message: "Please contact us.",
    }),
    env: { DB: makeDb({ emailCount: 5 }) },
  });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "3600");
});

test("tracking validates method and requires configured request storage", async () => {
  const method = await trackRequest({
    request: new Request("https://yrproservice.test/api/track", { method: "POST" }),
    env: { DB: makeDb() },
  });
  assert.equal(method.status, 405);

  const unavailable = await trackRequest({
    request: getTrackingRequest(),
    env: {},
  });
  assert.equal(unavailable.status, 503);
});

test("tracking returns only the matching request status for reference and email", async () => {
  const db = makeDb({
    requestRow: {
      reference: "YRS-20261116-ABC123",
      request_type: "service",
      status: "in_progress",
      created_at: "2026-11-16T02:00:00.000Z",
    },
  });
  const response = await trackRequest({
    request: getTrackingRequest(),
    env: { DB: db },
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(result, {
    ok: true,
    request: {
      reference: "YRS-20261116-ABC123",
      requestType: "service",
      status: "in_progress",
      createdAt: "2026-11-16T02:00:00.000Z",
    },
  });
  assert.equal(
    db.statements.some((item) => /^\s*CREATE\s+(TABLE|INDEX)/i.test(item.sql)),
    false,
    "Request tracking must not mutate database schema at runtime.",
  );
});

test("tracking does not reveal a request when the reference and email do not match", async () => {
  const response = await trackRequest({
    request: getTrackingRequest(),
    env: { DB: makeDb({ requestRow: null }) },
  });
  assert.equal(response.status, 404);
});

test("tracking rate-limits repeated attempts by IP", async () => {
  const response = await trackRequest({
    request: getTrackingRequest(),
    env: { DB: makeDb({ ipCount: 30 }) },
  });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "900");
});
