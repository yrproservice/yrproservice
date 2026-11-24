import {
  customerHmac,
  customerJson,
  isValidCustomerEmail,
  normalizeCustomerEmail,
  readJsonBody,
  sameOriginRequest,
} from "../../../_utils/customer-request-access.js";

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return customerJson({ error: "Method not allowed." }, 405);
  if (!sameOriginRequest(request)) return customerJson({ error: "This request could not be verified." }, 403);
  if (!env.DB) return customerJson({ error: "Email verification is not available yet. Please use your request reference for now." }, 503);

  // The mailer is an optional private Cloudflare Service Binding. No code is
  // generated or stored until a mailer is explicitly configured.
  if (!env.CUSTOMER_REQUEST_MAILER || typeof env.CUSTOMER_REQUEST_MAILER.fetch !== "function") {
    return customerJson({ error: "Email verification is not enabled yet. Please use your request reference for now." }, 503);
  }

  const parsed = await readJsonBody(request, 1200);
  if (!parsed.ok) return parsed.response;
  const email = normalizeCustomerEmail(parsed.body.email);
  if (!isValidCustomerEmail(email)) return customerJson({ error: "Enter a valid email address." }, 400);

  const now = Math.floor(Date.now() / 1000);
  const id = crypto.randomUUID();
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
  const ip = request.headers.get("CF-Connecting-IP") || "";
  try {
    const emailHash = await customerHmac(env, `email:${email}`);
    const codeHash = await customerHmac(env, `code:${email}:${code}`);
    const ipHash = ip ? await customerHmac(env, `ip:${ip}`) : null;
    await env.DB.prepare("DELETE FROM customer_request_access_codes WHERE expires_at < ? OR consumed_at IS NOT NULL OR created_at < ?")
      .bind(now, now - 86400).run();

    const insert = await env.DB.prepare(`
      INSERT INTO customer_request_access_codes
        (id, email_hash, code_hash, ip_hash, attempts, created_at, expires_at)
      SELECT ?, ?, ?, ?, 0, ?, ?
      WHERE
        (SELECT COUNT(*) FROM customer_request_access_codes
          WHERE email_hash = ? AND created_at > ?) < 3
        AND
        (? IS NULL OR (SELECT COUNT(*) FROM customer_request_access_codes
          WHERE ip_hash = ? AND created_at > ?) < 10)
    `).bind(
      id, emailHash, codeHash, ipHash, now, now + 600,
      emailHash, now - 900, ipHash, ipHash, now - 900,
    ).run();

    if (Number(insert.meta?.changes) !== 1) {
      // Do not disclose whether an address has any customer requests.
      return customerJson({ ok: true, message: "If email verification is available, a code will be sent shortly." }, 202);
    }

    let delivery;
    try {
      delivery = await env.CUSTOMER_REQUEST_MAILER.fetch("https://customer-request-mailer.internal/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          template: "customer-request-access-code",
          to: email,
          code,
          expiresInMinutes: 10,
        }),
      });
    } catch {
      delivery = null;
    }
    if (!delivery?.ok) {
      await env.DB.prepare("DELETE FROM customer_request_access_codes WHERE id = ?").bind(id).run();
      return customerJson({ error: "Email verification is temporarily unavailable. Please try again later." }, 503);
    }

    return customerJson({ ok: true, message: "If email verification is available, a code will be sent shortly." }, 202);
  } catch {
    return customerJson({ error: "Email verification is temporarily unavailable. Please try again later." }, 503);
  }
}
