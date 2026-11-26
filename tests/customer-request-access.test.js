import test from "node:test";
import assert from "node:assert/strict";
import { onRequest as requestCode } from "../functions/api/customer/access/request-code.js";
import { onRequest as verifyCode } from "../functions/api/customer/access/verify.js";
import { onRequest as customerRequests } from "../functions/api/customer/requests.js";
import { onRequest as logoutCustomer } from "../functions/api/customer/access/logout.js";

function customerRequest(path, { method = "GET", body, origin = "https://yrproservice.test", cookie } = {}) {
  const headers = { Accept: "application/json", Origin: origin };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  return new Request(`https://yrproservice.test${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("customer email verification stays disabled until a private mailer is configured", async () => {
  const response = await requestCode({
    request: customerRequest("/api/customer/access/request-code", {
      method: "POST",
      body: { email: "clinic@example.com" },
    }),
    env: { DB: {} },
  });
  const result = await response.json();
  assert.equal(response.status, 503);
  assert.match(result.error, /not enabled yet/i);
});

test("customer access endpoints reject cross-origin requests", async () => {
  const response = await verifyCode({
    request: customerRequest("/api/customer/access/verify", {
      method: "POST",
      origin: "https://attacker.example",
      body: { email: "clinic@example.com", code: "123456" },
    }),
    env: { DB: {} },
  });
  assert.equal(response.status, 403);
});

test("customer request history requires an email-verified session", async () => {
  const response = await customerRequests({
    request: customerRequest("/api/customer/requests"),
    env: { DB: {} },
  });
  const result = await response.json();
  assert.equal(response.status, 401);
  assert.match(result.error, /verify your email/i);
});

test("customer history endpoint rejects unsupported methods", async () => {
  const response = await customerRequests({
    request: customerRequest("/api/customer/requests", { method: "POST", body: {} }),
    env: { DB: {} },
  });
  assert.equal(response.status, 405);
});

test("customer logout expires the browser session cookie", async () => {
  const response = await logoutCustomer({
    request: customerRequest("/api/customer/access/logout", { method: "DELETE" }),
    env: {},
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Set-Cookie") || "", /Max-Age=0/);
  assert.deepEqual(await response.json(), { ok: true });
});
