import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";

const CONFIG = {
  page: { table: "cms_pages", key: "page_key", versions: "cms_page_versions", fk: "page_id", json: "content_json" },
  product: { table: "cms_products", key: "product_slug", versions: "cms_product_versions", fk: "product_id", json: "product_json" },
};

function clean(value, max = 100) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  const params = new URL(request.url).searchParams;
  const type = clean(params.get("entityType"), 20);
  const key = clean(params.get("entityKey"), 100);
  const config = CONFIG[type];
  if (!config || !key) return adminJson({ error: "A valid entityType and entityKey are required." }, 400);
  try {
    const entity = await env.DB.prepare(`SELECT id, published_version_id FROM ${config.table} WHERE ${config.key} = ? LIMIT 1`).bind(key).first();
    if (!entity) return adminJson({ error: "CMS item not found." }, 404);
    const rows = await env.DB.prepare(`
      SELECT id, version_number, state, created_by, change_note, created_at, published_at,
        CASE WHEN id = ? THEN 1 ELSE 0 END AS is_current_published
      FROM ${config.versions} WHERE ${config.fk} = ? ORDER BY version_number DESC LIMIT 100
    `).bind(entity.published_version_id || "", entity.id).all();
    return adminJson({ ok: true, history: rows.results || [] });
  } catch (error) {
    console.error("CMS revision history failed", error);
    return adminJson({ error: "Unable to load revision history." }, 500);
  }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  let body;
  try { body = await request.json(); } catch { return adminJson({ error: "Submit valid JSON." }, 400); }
  const type = clean(body?.entityType, 20), key = clean(body?.entityKey, 100), versionId = clean(body?.versionId, 80);
  const config = CONFIG[type];
  if (!config || !key || !versionId) return adminJson({ error: "A valid entityType, entityKey and versionId are required." }, 400);
  try {
    const entity = await env.DB.prepare(`SELECT id FROM ${config.table} WHERE ${config.key} = ? LIMIT 1`).bind(key).first();
    if (!entity) return adminJson({ error: "CMS item not found." }, 404);
    const source = await env.DB.prepare(`SELECT version_number, ${config.json} AS content FROM ${config.versions} WHERE id = ? AND ${config.fk} = ?`).bind(versionId, entity.id).first();
    if (!source) return adminJson({ error: "Revision does not belong to this item." }, 404);
    const draft = await env.DB.prepare(`SELECT id, version_number FROM ${config.versions} WHERE ${config.fk} = ? AND state = 'draft'`).bind(entity.id).first();
    const latest = await env.DB.prepare(`SELECT COALESCE(MAX(version_number), 0) AS version FROM ${config.versions} WHERE ${config.fk} = ?`).bind(entity.id).first();
    const nextVersion = Number(latest?.version || 0) + 1;
    const now = new Date().toISOString();
    const actor = auth.email || null;
    const statements = [];
    if (draft) statements.push(env.DB.prepare(`UPDATE ${config.versions} SET state = 'archived' WHERE id = ? AND state = 'draft'`).bind(draft.id));
    const newId = crypto.randomUUID();
    statements.push(env.DB.prepare(`INSERT INTO ${config.versions} (id, ${config.fk}, version_number, state, ${config.json}, created_by, change_note, created_at) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)`).bind(newId, entity.id, nextVersion, source.content, actor, `Restored from V${source.version_number}`, now));
    statements.push(env.DB.prepare(`INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'restore_revision_as_draft', ?, ?, ?)`).bind(crypto.randomUUID(), actor, type, entity.id, JSON.stringify({ sourceVersion: source.version_number, newVersion: nextVersion })));
    await env.DB.batch(statements);
    return adminJson({ ok: true, draftId: newId, version: nextVersion, restoredFrom: source.version_number }, 201);
  } catch (error) {
    console.error("CMS revision restore failed", error);
    return adminJson({ error: "Unable to restore this revision as a draft." }, 500);
  }
}
