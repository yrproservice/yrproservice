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
  const url = new URL(request.url);
  // A minimal authenticated session check avoids returning customer request data
  // merely to decide whether the public header should show Admin navigation.
  if (url.searchParams.get("access_check") === "1")
    return adminJson({ ok: true, authorized: true });
  if (!env.DB)
    return adminJson({ error: "Request storage is not configured." }, 503);

  const type = url.searchParams.get("type") || "";
  const status = url.searchParams.get("status") || "";
  const search = (url.searchParams.get("search") || "").trim().slice(0, 100);
  if (type && !["service", "quotation", "dental_chair"].includes(type))
    return adminJson({ error: "Invalid request type filter." }, 400);
  if (status && !ALLOWED_STATUSES.has(status))
    return adminJson({ error: "Invalid status filter." }, 400);

  const filterWhere = [];
  const filterBindings = [];
  if (type) {
    filterWhere.push("request_type = ?");
    filterBindings.push(type);
  }
  if (status) {
    filterWhere.push("status = ?");
    filterBindings.push(status);
  }
  if (search) {
    filterWhere.push(
      "(reference LIKE ? OR lower(customer_name) LIKE ? OR lower(email) LIKE ? OR lower(company) LIKE ?)",
    );
    const pattern = `%${search.toLowerCase()}%`;
    filterBindings.push(pattern, pattern, pattern, pattern);
  }

  const where = [...filterWhere];
  const bindings = [...filterBindings];
  if (cursor) {
    where.push("(created_at < ? OR (created_at = ? AND id < ?))");
    bindings.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }

  const sql = `
    SELECT
      id,
      reference,
      request_type,
      status,
      customer_name,
      company,
      phone,
      email,
      service_slug,
      preferred_timing,
      message,
      details_json,
      created_at
    FROM requests
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at DESC, id DESC
    LIMIT 51
  `;
  try {
    const [result, statusResult] = await Promise.all([
      env.DB.prepare(sql).bind(...bindings).all(),
      env.DB.prepare(`
        SELECT status, COUNT(*) AS total
        FROM requests
        ${filterWhere.length ? `WHERE ${filterWhere.join(" AND ")}` : ""}
        GROUP BY status
      `).bind(...filterBindings).all(),
    ]);
    const rows = result.results || [];
    const hasMore = rows.length > 50;
    const requests = rows.slice(0, 50);
    const last = requests[requests.length - 1];
    const nextCursor = hasMore && last
      ? JSON.stringify({ createdAt: last.created_at, id: last.id })
      : null;
    const statusCounts = Object.fromEntries(
      (statusResult.results || []).map((row) => [row.status, Number(row.total || 0)]),
    );
    return adminJson({ ok: true, requests, limit: 50, hasMore, nextCursor, statusCounts });

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
      "SELECT id, reference, status FROM requests WHERE reference = ? LIMIT 1",
    )
      .bind(reference)
      .first();
    if (!existing) return adminJson({ error: "Request not found." }, 404);
    if (existing.status === status) {
      const current = await env.DB.prepare(
        "SELECT reference, request_type, status, created_at FROM requests WHERE reference = ? LIMIT 1"
      ).bind(reference).first();
      return adminJson({ ok: true, alreadyApplied: true, request: current });
    }
    const historyResults = await env.DB.batch([
      env.DB.prepare(
        "UPDATE requests SET status = ? WHERE reference = ? AND status = ?"
      ).bind(status, reference, existing.status),
      env.DB.prepare(`
        INSERT INTO request_status_history
          (id, request_id, reference, previous_status, new_status, actor_email)
        SELECT ?, id, reference, ?, ?, ?
        FROM requests
        WHERE reference = ? AND status = ? AND changes() = 1
      `).bind(
        crypto.randomUUID(),
        existing.status,
        status,
        auth.email || null,
        reference,
        status,
      ),
    ]);
    if (Number(historyResults?.[0]?.meta?.changes || 0) !== 1) {
      const current = await env.DB.prepare(
        "SELECT reference, request_type, status, created_at FROM requests WHERE reference = ? LIMIT 1"
      ).bind(reference).first();
      if (!current) return adminJson({ error: "Request not found." }, 404);
      if (current.status === status) {
        return adminJson({ ok: true, alreadyApplied: true, request: current });
      }
      return adminJson({
        error: "This request status changed in another session. Refresh the request before updating it.",
        request: current,
      }, 409);
    }
    if (Number(historyResults?.[1]?.meta?.changes || 0) !== 1) {
      return adminJson({
        error: "The request status history could not be recorded. Refresh the request before trying again.",
      }, 500);
    }
    const updated = await env.DB.prepare(
      "SELECT reference, request_type, status, created_at FROM requests WHERE reference = ? LIMIT 1",
    ).bind(reference).first();
    return adminJson({ ok: true, request: updated, historyRecorded: true });
  } catch (error) {
    console.error("Admin request status update failed", error);
    return adminJson(
      { error: "Unable to update this request right now." },
      500,
    );
  }
}
