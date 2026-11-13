import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";

const CONFIG = {
  page: { table: "cms_pages", keyColumn: "page_key", versions: "cms_page_versions", foreignKey: "page_id", label: "page" },
  product: { table: "cms_products", keyColumn: "product_slug", versions: "cms_product_versions", foreignKey: "product_id", label: "product" },
  setting: { table: "cms_site_settings", keyColumn: "setting_key", versions: "cms_site_setting_versions", foreignKey: "setting_key", label: "site setting" }
};

function clean(value, max = 100) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function onRequestDelete(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);

  let body;
  try { body = await request.json(); }
  catch { return adminJson({ error: "Submit valid JSON." }, 400); }

  const type = clean(body?.entityType, 20);
  const key = clean(body?.entityKey, 100);
  const versionId = clean(body?.versionId, 80);
  const config = CONFIG[type];
  if (!config || !key || !versionId) {
    return adminJson({ error: "A valid entityType, entityKey and versionId are required." }, 400);
  }

  try {
    const entity = type === "setting"
      ? await env.DB.prepare(`SELECT setting_key AS id, published_version_id FROM ${config.table} WHERE ${config.keyColumn} = ? LIMIT 1`).bind(key).first()
      : await env.DB.prepare(`SELECT id, published_version_id FROM ${config.table} WHERE ${config.keyColumn} = ? LIMIT 1`).bind(key).first();

    if (!entity) return adminJson({ error: `CMS ${config.label} not found.` }, 404);

    const draft = await env.DB.prepare(
      `SELECT id, version_number, state FROM ${config.versions} WHERE id = ? AND ${config.foreignKey} = ? LIMIT 1`
    ).bind(versionId, entity.id).first();

    if (!draft) return adminJson({ error: "The selected revision does not belong to this item." }, 404);
    if (draft.state !== "draft") {
      return adminJson({ error: "Only an unpublished draft can be deleted. Published and archived revisions are protected." }, 409);
    }
    if (entity.published_version_id === versionId) {
      return adminJson({ error: "The currently published revision cannot be deleted." }, 409);
    }

    const actor = auth.email || null;
    const statements = [
      env.DB.prepare(`DELETE FROM ${config.versions} WHERE id = ? AND ${config.foreignKey} = ? AND state = 'draft'`).bind(versionId, entity.id),
      env.DB.prepare(
        "INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'delete_draft', ?, ?, ?)"
      ).bind(crypto.randomUUID(), actor, type, entity.id, JSON.stringify({ version: draft.version_number, versionId }))
    ];
    await env.DB.batch(statements);

    return adminJson({ ok: true, entityType: type, entityKey: key, deletedVersion: draft.version_number });
  } catch (error) {
    console.error("CMS draft deletion failed", error);
    return adminJson({ error: "Unable to delete this draft." }, 500);
  }
}
