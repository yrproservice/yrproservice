import {
  customerJson,
  requireCustomerSession,
} from "../../_utils/customer-request-access.js";

function safeDetails(value) {
  if (typeof value !== "string" || value.length > 12000) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function cleanText(value, max = 8000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET") return customerJson({ error: "Method not allowed." }, 405);
  const session = await requireCustomerSession({ request, env });
  if (!session.ok) return session.response;

  try {
    const result = await env.DB.prepare(`
      SELECT
        reference,
        request_type,
        status,
        service_slug,
        preferred_timing,
        message,
        details_json,
        created_at
      FROM requests
      WHERE lower(email) = ?
      ORDER BY created_at DESC, reference DESC
      LIMIT 101
    `).bind(session.email).all();

    const rows = result.results || [];
    const requests = rows.slice(0, 100).map((row) => {
      const details = safeDetails(row.details_json);
      return {
        reference: cleanText(row.reference, 40),
        requestType: row.request_type,
        status: row.status,
        createdAt: row.created_at,
        service: cleanText(row.service_slug, 100) || null,
        preferredTiming: cleanText(row.preferred_timing, 160) || null,
        location: cleanText(details.location, 200) || null,
        selection: cleanText(details.productSelection, 8000) || null,
        // Only service requests need their submitted message to explain the
        // requested work. Internal request history and staff-only notes are
        // stored elsewhere and are never queried by this endpoint.
        message: row.request_type === "service" ? cleanText(row.message, 5000) : null,
      };
    });

    return customerJson({
      ok: true,
      requests,
      totalReturned: requests.length,
      hasMore: rows.length > 100,
    });
  } catch {
    return customerJson({ error: "Unable to load your requests right now. Please try again later." }, 500);
  }
}
