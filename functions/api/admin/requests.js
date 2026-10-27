import { adminJson, requireAdmin } from "../../_utils/admin-auth.js";

const ALLOWED_STATUSES = new Set([
  "received",
  "in_review",
  "contacted",
  "completed",
  "cancelled",
]);

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB)
    return adminJson({ error: "Request storage is not configured." }, 503);

  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "";
  const status = url.searchParams.get("status") || "";
  const search = (url.searchParams.get("search") || "").trim().slice(0, 100);
  if (type && !["service", "quotation", "dental_chair"].includes(type))
    return adminJson({ error: "Invalid request type filter." }, 400);
  if (status && !ALLOWED_STATUSES.has(status))
    return adminJson({ error: "Invalid status filter." }, 400);

  const where = [];
  const bindings = [];
  if (type) {
    where.push("request_type = ?");
    bindings.push(type);
  }
  if (status) {
    where.push("status = ?");
    bindings.push(status);
  }
  if (search) {
    where.push(
      "(reference LIKE ? OR lower(customer_name) LIKE ? OR lower(email) LIKE ? OR lower(company) LIKE ?)",
    );
    const pattern = `%${search.toLowerCase()}%`;
    bindings.push(pattern, pattern, pattern, pattern);
  }

  const sql = `SELECT id, reference, request_type, status, customer_name, company, phone, email, service_slug, preferred_timing, message, details_json, created_at FROM requests ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT 200`;
  try {
    const result = await env.DB.prepare(sql)
      .bind(...bindings)
      .all();
    return adminJson({ ok: true, requests: result.results || [], limit: 200 });
  } catch (error) {
    console.error("Admin request list query failed", error);
    return adminJson({ error: "Unable to load requests right now." }, 500);
  }
}

export async function onRequestPatch(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB)
    return adminJson({ error: "Request storage is not configured." }, 503);
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json"))
    return adminJson({ error: "Submit JSON data." }, 415);

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 3000)
      return adminJson({ error: "Submitted data is too large." }, 413);
    body = JSON.parse(raw);
  } catch {
    return adminJson({ error: "Invalid JSON body." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return adminJson({ error: "Invalid JSON body." }, 400);

  const reference =
    typeof body.reference === "string"
      ? body.reference.trim().toUpperCase().slice(0, 40)
      : "";
  const status = typeof body.status === "string" ? body.status.trim() : "";
  if (!reference || !/^YR(?:S|Q|C)-[A-Z0-9-]+$/.test(reference))
    return adminJson({ error: "Enter a valid request reference." }, 400);
  if (!ALLOWED_STATUSES.has(status))
    return adminJson({ error: "Choose a valid request status." }, 400);

  try {
    const existing = await env.DB.prepare(
      "SELECT reference FROM requests WHERE reference = ? LIMIT 1",
    )
      .bind(reference)
      .first();
    if (!existing) return adminJson({ error: "Request not found." }, 404);
    await env.DB.prepare("UPDATE requests SET status = ? WHERE reference = ?")
      .bind(status, reference)
      .run();
    const updated = await env.DB.prepare(
      "SELECT reference, request_type, status, created_at FROM requests WHERE reference = ? LIMIT 1",
    )
      .bind(reference)
      .first();
    return adminJson({ ok: true, request: updated });
  } catch (error) {
    console.error("Admin request status update failed", error);
    return adminJson(
      { error: "Unable to update this request right now." },
      500,
    );
  }
}
