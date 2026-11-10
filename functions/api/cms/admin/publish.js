import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";

function clean(value, max = 80) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) return adminJson({ error: "Submit JSON data." }, 415);

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4000) return adminJson({ error: "Submitted data is too large." }, 413);
    body = JSON.parse(raw);
  } catch {
    return adminJson({ error: "Invalid JSON body." }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return adminJson({ error: "Invalid JSON body." }, 400);

  const pageKey = clean(body.pageKey, 60);
  const versionId = clean(body.versionId, 80);
  if (!pageKey || !versionId) return adminJson({ error: "Page key and version ID are required." }, 400);

  try {
    const page = await env.DB.prepare("SELECT id, published_version_id FROM cms_pages WHERE page_key = ? LIMIT 1").bind(pageKey).first();
    if (!page) return adminJson({ error: "Page not found." }, 404);
    const target = await env.DB.prepare("SELECT id, version_number, state FROM cms_page_versions WHERE id = ? AND page_id = ? LIMIT 1")
      .bind(versionId, page.id).first();
    if (!target) return adminJson({ error: "The selected revision does not belong to this page." }, 404);
    if (target.state === "published" && page.published_version_id === versionId) {
      return adminJson({ ok: true, alreadyPublished: true, version: target.version_number });
    }

    const now = new Date().toISOString();
    const batch = [];
    if (page.published_version_id) {
      batch.push(env.DB.prepare("UPDATE cms_page_versions SET state = 'archived' WHERE id = ? AND state = 'published'").bind(page.published_version_id));
    }
    batch.push(env.DB.prepare("UPDATE cms_page_versions SET state = 'published', published_at = ? WHERE id = ? AND page_id = ?")
      .bind(now, versionId, page.id));
    batch.push(env.DB.prepare("UPDATE cms_pages SET published_version_id = ?, updated_at = ? WHERE id = ?")
      .bind(versionId, now, page.id));
    batch.push(env.DB.prepare("INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'publish', 'page', ?, ?)")
      .bind(crypto.randomUUID(), auth.email || null, page.id, JSON.stringify({ version: target.version_number })));
    await env.DB.batch(batch);
    return adminJson({ ok: true, pageKey, version: target.version_number, publishedAt: now });
  } catch (error) {
    console.error("CMS page publish failed", error);
    return adminJson({ error: "Unable to publish this page revision." }, 500);
  }
}
