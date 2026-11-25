import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { requireAdmin } from "../functions/_utils/admin-auth.js";

const cryptoApi = globalThis.crypto || webcrypto;
const originalFetch = globalThis.fetch;
const signingKeys = await cryptoApi.subtle.generateKey(
  {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true,
  ["sign", "verify"],
);
const publicJwk = await cryptoApi.subtle.exportKey("jwk", signingKeys.publicKey);
publicJwk.kid = "admin-auth-test-key";
let certificateMode = "ok";

globalThis.fetch = async (input) => {
  if (String(input) === "https://team.example.test/cdn-cgi/access/certs") {
    if (certificateMode === "error") return new Response("unavailable", { status: 503 });
    return new Response(JSON.stringify({ keys: [publicJwk] }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return originalFetch(input);
};

test.after(() => {
  globalThis.fetch = originalFetch;
});

const config = {
  ACCESS_TEAM_DOMAIN: "team.example.test",
  ACCESS_AUD: "admin-api-audience",
  ADMIN_EMAILS: "yr.proservice@gmail.com",
};

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function tokenFor(claimOverrides = {}, headerOverrides = {}) {
  const header = encode({ alg: "RS256", kid: publicJwk.kid, ...headerOverrides });
  const claims = encode({
    iss: "https://team.example.test",
    aud: ["admin-api-audience"],
    exp: Math.floor(Date.now() / 1000) + 300,
    email: "yr.proservice@gmail.com",
    ...claimOverrides,
  });
  const input = header + "." + claims;
  const signature = await cryptoApi.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    signingKeys.privateKey,
    new TextEncoder().encode(input),
  );
  return input + "." + Buffer.from(signature).toString("base64url");
}

function context(token, env = config) {
  return {
    request: new Request("https://yrproservice.test/api/cms/admin/pages", {
      headers: token ? { "Cf-Access-Jwt-Assertion": token } : {},
    }),
    env,
  };
}

test("Admin authentication rejects a missing Access JWT", async () => {
  const result = await requireAdmin(context(null));
  assert.equal(result.ok, false);
  assert.equal(result.response.status, 401);
});

test("Admin authentication fails closed when the single-account configuration is missing or broadened", async () => {
  const token = await tokenFor();
  for (const env of [
    { ...config, ACCESS_AUD: "" },
    { ...config, ACCESS_TEAM_DOMAIN: "" },
    { ...config, ADMIN_EMAILS: "" },
    { ...config, ADMIN_EMAILS: "yr.proservice@gmail.com,other@example.com" },
    { ...config, ADMIN_EMAILS: "other@example.com" },
  ]) {
    const result = await requireAdmin(context(token, env));
    assert.equal(result.ok, false);
    assert.equal(result.response.status, 503);
  }
});

test("Admin authentication rejects malformed JWTs and unsupported signing algorithms", async () => {
  const malformed = await requireAdmin(context("not.a.valid-token"));
  assert.equal(malformed.response.status, 401);

  const unsupported = await requireAdmin(context(await tokenFor({}, { alg: "HS256" })));
  assert.equal(unsupported.response.status, 401);
});

test("Admin authentication rejects invalid issuer, audience, expiry and not-before claims", async () => {
  const invalidClaims = [
    { iss: "https://attacker.example.test" },
    { aud: ["another-audience"] },
    { exp: Math.floor(Date.now() / 1000) - 1 },
    { nbf: Math.floor(Date.now() / 1000) + 120 },
  ];
  for (const claims of invalidClaims) {
    const result = await requireAdmin(context(await tokenFor(claims)));
    assert.equal(result.ok, false);
    assert.equal(result.response.status, 401);
  }
});

test("Admin authentication rejects a token with an unknown signing key", async () => {
  const result = await requireAdmin(context(await tokenFor({}, { kid: "unknown-key" })));
  assert.equal(result.ok, false);
  assert.equal(result.response.status, 401);
});

test("Admin authentication rejects a token with an invalid signature", async () => {
  const token = await tokenFor();
  const parts = token.split(".");
  parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);
  const result = await requireAdmin(context(parts.join(".")));
  assert.equal(result.ok, false);
  assert.equal(result.response.status, 401);
});

test("Admin authentication rejects a valid Access identity outside the approved email", async () => {
  const result = await requireAdmin(context(await tokenFor({ email: "someone@example.com" })));
  assert.equal(result.ok, false);
  assert.equal(result.response.status, 403);
});

test("Admin mutations reject a mismatched Origin before accepting an Access JWT", async () => {
  const token = await tokenFor();
  const request = new Request("https://yrproservice.test/api/cms/admin/media", {
    method: "POST",
    headers: {
      "Cf-Access-Jwt-Assertion": token,
      Origin: "https://attacker.example",
    },
  });
  const result = await requireAdmin({ request, env: config });
  assert.equal(result.ok, false);
  assert.equal(result.response.status, 403);
  assert.match(await result.response.text(), /Cross-origin Admin changes/);
});

test("Admin mutations reject cross-site Fetch Metadata when Origin is absent", async () => {
  const request = new Request("https://yrproservice.test/api/cms/admin/media", {
    method: "POST",
    headers: {
      "Cf-Access-Jwt-Assertion": await tokenFor(),
      "Sec-Fetch-Site": "cross-site",
    },
  });
  const result = await requireAdmin({ request, env: config });
  assert.equal(result.ok, false);
  assert.equal(result.response.status, 403);
});

test("Admin mutations accept same-origin browser requests", async () => {
  const request = new Request("https://yrproservice.test/api/cms/admin/media", {
    method: "POST",
    headers: {
      "Cf-Access-Jwt-Assertion": await tokenFor(),
      Origin: "https://yrproservice.test",
      "Sec-Fetch-Site": "same-origin",
    },
  });
  const result = await requireAdmin({ request, env: config });
  assert.deepEqual(result, { ok: true, email: "yr.proservice@gmail.com" });
});

test("Admin read-only requests remain compatible with cross-origin navigation", async () => {
  const request = new Request("https://yrproservice.test/api/cms/admin/pages", {
    method: "GET",
    headers: {
      "Cf-Access-Jwt-Assertion": await tokenFor(),
      Origin: "https://attacker.example",
    },
  });
  const result = await requireAdmin({ request, env: config });
  assert.deepEqual(result, { ok: true, email: "yr.proservice@gmail.com" });
});

test("Admin authentication returns the approved identity for a valid signed Access JWT", async () => {
  const result = await requireAdmin(context(await tokenFor()));
  assert.deepEqual(result, { ok: true, email: "yr.proservice@gmail.com" });
});

test("Admin authentication fails closed when Access signing certificates cannot be fetched", async () => {
  certificateMode = "error";
  try {
    const result = await requireAdmin(context(await tokenFor()));
    assert.equal(result.ok, false);
    assert.equal(result.response.status, 503);
  } finally {
    certificateMode = "ok";
  }
});
