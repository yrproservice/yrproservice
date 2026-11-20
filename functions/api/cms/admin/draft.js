import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";

const CONFIG = {
  page: { table: "cms_pages", keyColumn: "page_key", versions: "cms_page_versions", foreignKey: "page_id", jsonColumn: "content_json", label: "page" },
  product: { table: "cms_products", keyColumn: "product_slug", versions: "cms_product_versions", foreignKey: "product_id", jsonColumn: "product_json", label: "product" },
  setting: { table: "cms_site_settings", keyColumn: "setting_key", versions: "cms_site_setting_versions", foreignKey: "setting_key", jsonColumn: "value_json", label: "site setting" }
};

function clean(value, max = 100) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function onRequestDelete(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);

  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return adminJson({ error: "Submit JSON data." }, 415);
  }
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return adminJson({ error: "Draft deletion request is too large." }, 413);
    body = JSON.parse(raw);
  } catch { return adminJson({ error: "Submit valid JSON." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return adminJson({ error: "Submit a valid draft deletion object." }, 400);
  }

  const type = clean(body?.entityType, 20);
  const key = clean(body?.entityKey, 100);
  const versionId = clean(body?.versionId, 80);
  const expectedDraftCreatedAt = clean(body?.expectedDraftCreatedAt, 64);
  const config = CONFIG[type];
  if (!config || !key || !versionId) {
    return adminJson({ error: "A valid entityType, entityKey and versionId are required." }, 400);
  }
  if (!expectedDraftCreatedAt) {
    return adminJson({ error: "Reload the item before deleting; the current draft timestamp was not supplied." }, 409);
  }

  try {
    const entity = type === "setting"
      ? await env.DB.prepare(`SELECT setting_key AS id, published_version_id FROM ${config.table} WHERE ${config.keyColumn} = ? LIMIT 1`).bind(key).first()
      : await env.DB.prepare(`SELECT id, published_version_id FROM ${config.table} WHERE ${config.keyColumn} = ? LIMIT 1`).bind(key).first();

    if (!entity) return adminJson({ error: `CMS ${config.label} not found.` }, 404);

    const draft = await env.DB.prepare(
      `SELECT id, version_number, state, created_at, ${config.jsonColumn} AS snapshot FROM ${config.versions} WHERE id = ? AND ${config.foreignKey} = ? LIMIT 1`
    ).bind(versionId, entity.id).first();

    if (!draft) return adminJson({ error: "The selected revision does not belong to this item." }, 404);
    if (draft.state !== "draft") {
      return adminJson({ error: "Only an unpublished draft can be deleted. Published and archived revisions are protected." }, 409);
    }
    if (draft.created_at !== expectedDraftCreatedAt) {
      return adminJson({ error: "This draft changed in another session and was not deleted. Reload the item before trying again." }, 409);
    }
    if (entity.published_version_id === versionId) {
      return adminJson({ error: "The currently published revision cannot be deleted." }, 409);
    }

    const actor = auth.email || null;
    const statements = [
      // Compare the exact revision snapshot selected above. A concurrent save
      // cannot have its newer content deleted by a stale delete request.
      env.DB.prepare(`DELETE FROM ${config.versions} WHERE id = ? AND ${config.foreignKey} = ? AND state = 'draft' AND created_at = ? AND ${config.jsonColumn} = ?`)
        .bind(versionId, entity.id, draft.created_at, draft.snapshot),
    ];
    if (type === "page" && entity.published_version_id) {
      const publishedPage = await env.DB.prepare(
        "SELECT title, route FROM cms_page_versions WHERE id = ? AND state = 'published'"
      ).bind(entity.published_version_id).first();
      if (publishedPage) {
        statements.push(
          env.DB.prepare("UPDATE cms_pages SET title = ?, route = ?, updated_at = ? WHERE id = ? AND changes() = 1")
            .bind(publishedPage.title, publishedPage.route, new Date().toISOString(), entity.id)
        );
      }
    }
    // Record the audit event only when the conditional DELETE actually removed
    // this draft. If a concurrent publish/restore won, do not create a false
    // delete event for a revision that was not deleted.
    statements.push(
      env.DB.prepare(`
        INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json)
        SELECT ?, ?, 'delete_draft', ?, ?, ?
        WHERE changes() = 1
      `).bind(
        crypto.randomUUID(), actor, type, entity.id,
        JSON.stringify({ version: draft.version_number, versionId })
      )
    );
    const results = await env.DB.batch(statements);
    if (Number(results?.[0]?.meta?.changes || 0) !== 1) {
      return adminJson({ error: "This draft changed in another session and was not deleted. Reload the item before trying again." }, 409);
    }
    if (Number(results?.[results.length - 1]?.meta?.changes || 0) !== 1) {
      return adminJson({ error: "The draft deletion audit record could not be confirmed. Reload the item and inspect its draft state before retrying." }, 500);
    }

    return adminJson({ ok: true, entityType: type, entityKey: key, deletedVersion: draft.version_number });
  } catch (error) {
    console.error("CMS draft deletion failed", error);
    return adminJson({ error: "Unable to delete this draft." }, 500);
  }
}
