import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";

function clean(value, max = 100) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) return adminJson({ error: "Submit JSON data." }, 415);

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4000) return adminJson({ error: "Submitted data is too large." }, 413);
    body = JSON.parse(raw);
  } catch { return adminJson({ error: "Invalid JSON body." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return adminJson({ error: "Invalid JSON body." }, 400);

  const entityType = clean(body.entityType || "page", 20);
  const entityKey = clean(body.entityKey || body.pageKey, 100);
  const versionId = clean(body.versionId, 80);
  if (!["page", "product"].includes(entityType)) return adminJson({ error: "Unsupported CMS entity type." }, 400);
  if (!entityKey || !versionId) return adminJson({ error: "Entity key and version ID are required." }, 400);

  const config = entityType === "page"
    ? { table: "cms_pages", keyColumn: "page_key", versions: "cms_page_versions", foreignKey: "page_id", label: "page" }
    : { table: "cms_products", keyColumn: "product_slug", versions: "cms_product_versions", foreignKey: "product_id", label: "product" };

  try {
    const entity = await env.DB.prepare(`SELECT id, published_version_id FROM ${config.table} WHERE ${config.keyColumn} = ? LIMIT 1`).bind(entityKey).first();
    if (!entity) return adminJson({ error: `CMS ${config.label} not found.` }, 404);
    const target = await env.DB.prepare(`SELECT id, version_number, state FROM ${config.versions} WHERE id = ? AND ${config.foreignKey} = ? LIMIT 1`)
      .bind(versionId, entity.id).first();
    if (!target) return adminJson({ error: "The selected revision does not belong to this item." }, 404);
    if (target.state === "published" && entity.published_version_id === versionId) {
      return adminJson({ ok: true, alreadyPublished: true, version: target.version_number });
    }

    const now = new Date().toISOString();
    const batch = [];
    if (entity.published_version_id) {
      batch.push(env.DB.prepare(`UPDATE ${config.versions} SET state = 'archived' WHERE id = ? AND state = 'published'`).bind(entity.published_version_id));
    }
    batch.push(env.DB.prepare(`UPDATE ${config.versions} SET state = 'published', published_at = ? WHERE id = ? AND ${config.foreignKey} = ?`)
      .bind(now, versionId, entity.id));
    batch.push(env.DB.prepare(`UPDATE ${config.table} SET published_version_id = ?, updated_at = ? WHERE id = ?`)
      .bind(versionId, now, entity.id));
    batch.push(env.DB.prepare("INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'publish', ?, ?, ?)")
      .bind(crypto.randomUUID(), auth.email || null, entityType, entity.id, JSON.stringify({ version: target.version_number })));
    await env.DB.batch(batch);
    return adminJson({ ok: true, entityType, entityKey, version: target.version_number, publishedAt: now });
  } catch (error) {
    console.error("CMS publish failed", error);
    return adminJson({ error: "Unable to publish this CMS revision." }, 500);
  }
}
