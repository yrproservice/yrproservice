const encoder = new TextEncoder();

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
  const adminEmails = String(env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!teamDomain || !audience || adminEmails.length === 0) {
    return {
      ok: false,
      response: jsonError("Admin access is not configured.", 503),
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
  if (
    !email ||
    !adminEmails.some((allowed) => constantTimeEqual(allowed, email))
  ) {
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

export async function requireAdmin(context) {
  const token = context.request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token)
    return { ok: false, response: jsonError("Authentication required.", 401) };
  return validateAccessJwt(token, context.env);
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
