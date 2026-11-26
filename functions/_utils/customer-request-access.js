const encoder = new TextEncoder();

export function customerJson(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...extraHeaders,
    },
  });
}

export function normalizeCustomerEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

export function isValidCustomerEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function sameOriginRequest(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function customerHmac(env, value) {
  const secret = typeof env.CUSTOMER_REQUEST_ACCESS_SECRET === "string"
    ? env.CUSTOMER_REQUEST_ACCESS_SECRET
    : "";
  if (secret.length < 32) throw new Error("Customer request access secret is not configured.");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function readCustomerCookie(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookie = cookieHeader.split(";").map((part) => part.trim())
    .find((part) => part.startsWith("yr_customer_session="));
  return cookie ? cookie.slice("yr_customer_session=".length) : "";
}

export async function requireCustomerSession({ request, env }) {
  if (!env.DB) return { ok: false, response: customerJson({ error: "Request history is temporarily unavailable." }, 503) };
  const token = readCustomerCookie(request);
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    return { ok: false, response: customerJson({ error: "Please verify your email address to view your requests." }, 401) };
  }
  try {
    const tokenHash = await customerHmac(env, `session:${token}`);
    const now = Math.floor(Date.now() / 1000);
    const session = await env.DB.prepare(
      "SELECT email FROM customer_request_access_sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1",
    ).bind(tokenHash, now).first();
    if (!session?.email || !isValidCustomerEmail(session.email)) {
      return { ok: false, response: customerJson({ error: "Your verification session has expired. Please verify your email again." }, 401) };
    }
    return { ok: true, email: session.email };
  } catch {
    return { ok: false, response: customerJson({ error: "Request history is temporarily unavailable." }, 503) };
  }
}

export function customerSessionCookie(token, maxAge = 8 * 60 * 60) {
  return `yr_customer_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/customer; Max-Age=${maxAge}`;
}

export function clearCustomerSessionCookie() {
  return "yr_customer_session=; HttpOnly; Secure; SameSite=Strict; Path=/api/customer; Max-Age=0";
}

export async function readJsonBody(request, maxBytes = 3000) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, response: customerJson({ error: "Submit the form using the website." }, 415) };
  }
  try {
    const raw = await request.text();
    if (raw.length > maxBytes) return { ok: false, response: customerJson({ error: "Submitted data is too large." }, 413) };
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
    return { ok: true, body };
  } catch {
    return { ok: false, response: customerJson({ error: "Please check the submitted details and try again." }, 400) };
  }
}
