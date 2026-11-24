import {
  customerHmac,
  customerJson,
  customerSessionCookie,
  isValidCustomerEmail,
  normalizeCustomerEmail,
  randomToken,
  readJsonBody,
  sameOriginRequest,
} from "../../../_utils/customer-request-access.js";

function constantTimeEqual(first, second) {
  if (typeof first !== "string" || typeof second !== "string" || first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  return difference === 0;
}

export async function onRequest({ request, env }) {
  if (request.method !== "POST") return customerJson({ error: "Method not allowed." }, 405);
  if (!sameOriginRequest(request)) return customerJson({ error: "This request could not be verified." }, 403);
  if (!env.DB) return customerJson({ error: "Email verification is temporarily unavailable." }, 503);

  const parsed = await readJsonBody(request, 1200);
  if (!parsed.ok) return parsed.response;
  const email = normalizeCustomerEmail(parsed.body.email);
  const code = typeof parsed.body.code === "string" ? parsed.body.code.trim() : "";
  if (!isValidCustomerEmail(email) || !/^\d{6}$/.test(code)) {
    return customerJson({ error: "Enter the email address and six-digit code." }, 400);
  }

  try {
    const emailHash = await customerHmac(env, `email:${email}`);
    const submittedCodeHash = await customerHmac(env, `code:${email}:${code}`);
    const now = Math.floor(Date.now() / 1000);
    const record = await env.DB.prepare(`
      SELECT id, code_hash
      FROM customer_request_access_codes
      WHERE email_hash = ? AND consumed_at IS NULL AND expires_at > ? AND attempts < 5
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(emailHash, now).first();

    if (!record || !constantTimeEqual(record.code_hash, submittedCodeHash)) {
      if (record?.id) {
        await env.DB.prepare(`
          UPDATE customer_request_access_codes
          SET attempts = attempts + 1
          WHERE id = ? AND consumed_at IS NULL AND expires_at > ? AND attempts < 5
        `).bind(record.id, now).run();
      }
      return customerJson({ error: "The code is invalid or has expired. Request a new code and try again." }, 400);
    }

    const consumed = await env.DB.prepare(`
      UPDATE customer_request_access_codes
      SET consumed_at = ?
      WHERE id = ? AND code_hash = ? AND consumed_at IS NULL AND expires_at > ? AND attempts < 5
    `).bind(now, record.id, submittedCodeHash, now).run();
    if (Number(consumed.meta?.changes) !== 1) {
      return customerJson({ error: "The code is invalid or has expired. Request a new code and try again." }, 400);
    }

    const token = randomToken(32);
    const tokenHash = await customerHmac(env, `session:${token}`);
    const sessionExpiry = now + 8 * 60 * 60;
    await env.DB.prepare(`
      INSERT INTO customer_request_access_sessions
        (token_hash, email_hash, created_at, expires_at, email)
      VALUES (?, ?, ?, ?, ?)
    `).bind(tokenHash, emailHash, now, sessionExpiry, email).run();

    return customerJson(
      { ok: true, expiresAt: sessionExpiry },
      200,
      { "Set-Cookie": customerSessionCookie(token) },
    );
  } catch {
    return customerJson({ error: "Email verification is temporarily unavailable." }, 503);
  }
}
