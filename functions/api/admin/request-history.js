import { adminJson, requireAdmin } from "../../_utils/admin-auth.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "Request storage is not configured." }, 503);

  const reference = (new URL(request.url).searchParams.get("reference") || "")
    .trim()
    .toUpperCase()
    .slice(0, 40);
  if (!/^YR(?:S|Q|C)-[A-Z0-9-]+$/.test(reference)) {
    return adminJson({ error: "Enter a valid request reference." }, 400);
  }

  try {
    const rows = await env.DB.prepare(`
      SELECT id, reference, previous_status, new_status, actor_email, created_at
      FROM request_status_history
      WHERE reference = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 51
    `).bind(reference).all();
    return adminJson({
      ok: true,
      reference,
      history: (rows.results || []).slice(0, 50).map((row) => ({
        id: row.id,
        reference: row.reference,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        actorEmail: row.actor_email || null,
        createdAt: row.created_at,
      })),
      limit: 50,
      hasMore: (rows.results || []).length > 50,
      note: "Status history is recorded from the feature activation date; earlier status changes were not historically captured.",
    });
  } catch (error) {
    console.error("Admin request history query failed", error);
    return adminJson({ error: "Unable to load request status history right now." }, 500);
  }
}
