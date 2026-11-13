const encoder = new TextEncoder();
const AUTHORIZED_ADMIN_EMAIL = "yr.proservice@gmail.com";

function jsonError(message, status = 401) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJsonSegment(value) {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
}

function constantTimeEqual(first, second) {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return difference === 0;
}

async function validateAccessJwt(token, env) {
  const teamDomain = String(env.ACCESS_TEAM_DOMAIN || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const audience = String(env.ACCESS_AUD || "").trim();
  const configuredEmails = String(env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  // Fail closed if the environment is configured with zero or multiple
  // administrator identities. Several people may share this one account,
  // while the D1 session lock below still permits only one active device.
  if (
    !teamDomain ||
    !audience ||
    configuredEmails.length !== 1 ||
    !constantTimeEqual(configuredEmails[0], AUTHORIZED_ADMIN_EMAIL)
  ) {
    return {
      ok: false,
      response: jsonError("Admin access is not configured for the single authorized account.", 503),
    };
  }

  const parts = token.split(".");
  if (parts.length !== 3)
    return { ok: false, response: jsonError("Authentication required.", 401) };

  let header;
  let claims;
  let signature;
  try {
    header = decodeJsonSegment(parts[0]);
    claims = decodeJsonSegment(parts[1]);
    signature = decodeBase64Url(parts[2]);
  } catch {
    return { ok: false, response: jsonError("Authentication required.", 401) };
  }
  if (
    header.alg !== "RS256" ||
    typeof header.kid !== "string" ||
    !header.kid ||
    typeof claims !== "object" ||
    !claims
  ) {
    return { ok: false, response: jsonError("Authentication required.", 401) };
  }

  const now = Math.floor(Date.now() / 1000);
  const issuer = `https://${teamDomain}`;
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (
    claims.iss !== issuer ||
    !audiences.includes(audience) ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= now ||
    (claims.nbf !== undefined &&
      (!Number.isFinite(claims.nbf) || claims.nbf > now + 60))
  ) {
    return { ok: false, response: jsonError("Authentication required.", 401) };
  }

  let keys;
  try {
    const certResponse = await fetch(`${issuer}/cdn-cgi/access/certs`, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!certResponse.ok)
      throw new Error("Unable to retrieve Access signing keys");
    keys = await certResponse.json();
  } catch (error) {
    console.error("Unable to retrieve Cloudflare Access signing keys", error);
    return {
      ok: false,
      response: jsonError(
        "Admin authentication is temporarily unavailable.",
        503,
      ),
    };
  }

  const jwk = Array.isArray(keys.keys)
    ? keys.keys.find((key) => key.kid === header.kid && key.kty === "RSA")
    : null;
  if (!jwk)
    return { ok: false, response: jsonError("Authentication required.", 401) };

  try {
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      signature,
      encoder.encode(`${parts[0]}.${parts[1]}`),
    );
    if (!valid)
      return {
        ok: false,
        response: jsonError("Authentication required.", 401),
      };
  } catch (error) {
    console.error("Unable to validate Cloudflare Access token", error);
    return {
      ok: false,
      response: jsonError("Authentication could not be verified.", 401),
    };
  }

  const email =
    typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  if (!email || !constantTimeEqual(AUTHORIZED_ADMIN_EMAIL, email)) {
    return {
      ok: false,
      response: jsonError(
        "You are not authorized to use the admin dashboard.",
        403,
      ),
    };
  }
  return { ok: true, email };
}

export function adminJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}

const ADMIN_SESSION_COOKIE = "yr_admin_session";
const ADMIN_SESSION_TTL_SECONDS = 90;

function readCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name)
      return part.slice(separator + 1).trim();
  }
  return "";
}

async function hashAdminSession(token) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function ensureAdminSessionTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS admin_session_lock (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      session_hash TEXT NOT NULL,
      admin_email TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).run();
}

export function adminSessionCookie(token, maxAge = 86400) {
  return `${ADMIN_SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearAdminSessionCookie() {
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function getAdminSessionHash(request) {
  const token = readCookie(request, ADMIN_SESSION_COOKIE);
  return token ? hashAdminSession(token) : "";
}

export async function requireAdmin(context, options = {}) {
  const token = context.request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token)
    return { ok: false, response: jsonError("Authentication required.", 401) };
  const identity = await validateAccessJwt(token, context.env);
  if (!identity.ok || options.skipSessionLock) return identity;

  if (!context.env.DB)
    return {
      ok: false,
      response: jsonError("Admin session storage is not configured.", 503),
    };

  try {
    await ensureAdminSessionTable(context.env.DB);
    const sessionHash = await getAdminSessionHash(context.request);
    if (!sessionHash)
      return {
        ok: false,
        response: jsonError("Admin session required. Sign in through the Admin entry.", 401),
      };
    const active = await context.env.DB.prepare(
      "SELECT session_hash, expires_at FROM admin_session_lock WHERE id = 1 LIMIT 1",
    ).first();
    const now = Math.floor(Date.now() / 1000);
    if (!active || active.expires_at <= now)
      return {
        ok: false,
        response: jsonError("Your Admin session has expired. Sign in again.", 401),
      };
    if (active.session_hash !== sessionHash)
      return {
        ok: false,
        response: jsonError("Admin is already active on another device. Log out there or wait for the session to expire.", 409),
      };
    return { ...identity, sessionHash };
  } catch (error) {
    console.error("Admin session lock check failed", error);
    return {
      ok: false,
      response: jsonError("Unable to verify the active Admin session.", 503),
    };
  }
}
