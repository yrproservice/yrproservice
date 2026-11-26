import {
  clearCustomerSessionCookie,
  customerHmac,
  customerJson,
  readCustomerCookie,
  sameOriginRequest,
} from "../../../_utils/customer-request-access.js";

export async function onRequest({ request, env }) {
  if (request.method !== "DELETE") return customerJson({ error: "Method not allowed." }, 405);
  if (!sameOriginRequest(request)) return customerJson({ error: "This request could not be verified." }, 403);

  const headers = { "Set-Cookie": clearCustomerSessionCookie() };
  const token = readCustomerCookie(request);
  if (env.DB && /^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    try {
      const tokenHash = await customerHmac(env, `session:${token}`);
      await env.DB.prepare("DELETE FROM customer_request_access_sessions WHERE token_hash = ?").bind(tokenHash).run();
    } catch {
      // Clear the browser cookie even if the server-side cleanup is unavailable.
    }
  }
  return customerJson({ ok: true }, 200, headers);
}
