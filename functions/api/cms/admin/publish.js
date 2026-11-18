import { validateSiteSetting } from "../../../_utils/cms-settings-validation.js";
import { validatePageDestinations, validateSettingDestinations } from "../../../_utils/cms-route-validation.js";
import { validatePageContent, validatePageRoute, validateProductContent } from "../../../_utils/cms-content-validation.js";
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
  if (!["page", "product", "setting"].includes(entityType)) return adminJson({ error: "Unsupported CMS entity type." }, 400);
  if (!entityKey || !versionId) return adminJson({ error: "Entity key and version ID are required." }, 400);

  const config = entityType === "page"
    ? { table: "cms_pages", keyColumn: "page_key", versions: "cms_page_versions", foreignKey: "page_id", label: "page" }
    : entityType === "product"
      ? { table: "cms_products", keyColumn: "product_slug", versions: "cms_product_versions", foreignKey: "product_id", label: "product" }
      : { table: "cms_site_settings", keyColumn: "setting_key", versions: "cms_site_setting_versions", foreignKey: "setting_key", label: "setting" };

  try {
    const entity = entityType === "setting"
      ? await env.DB.prepare(`SELECT setting_key AS id, published_version_id FROM ${config.table} WHERE ${config.keyColumn} = ? LIMIT 1`).bind(entityKey).first()
      : await env.DB.prepare(`SELECT id, published_version_id FROM ${config.table} WHERE ${config.keyColumn} = ? LIMIT 1`).bind(entityKey).first();
    if (!entity) return adminJson({ error: `CMS ${config.label} not found.` }, 404);
    const valueColumn = entityType === "setting" ? "value_json" : entityType === "page" ? "content_json AS value_json, title, route" : entityType === "product" ? "product_json AS value_json" : "NULL AS value_json";
    const target = await env.DB.prepare(`
      SELECT id, version_number, state, ${valueColumn}
      FROM ${config.versions}
      WHERE id = ? AND ${config.foreignKey} = ?
      LIMIT 1
    `)
      .bind(versionId, entity.id)
      .first();
    if (!target) return adminJson({ error: "The selected revision does not belong to this item." }, 404);
    if (target.state === "published" && entity.published_version_id === versionId) {
      return adminJson({ ok: true, alreadyPublished: true, version: target.version_number });
    }
    // Publishing is only allowed from the current draft workflow. Archived
    // revisions must first be restored as a new draft through the history API.
    // This prevents stale editor state or a forged request from republishing an
    // older archived revision directly over the current public version.
    if (target.state !== "draft") {
      return adminJson({ error: "Only a saved draft can be published. Restore an archived revision as a draft first." }, 409);
    }
    if (entityType === "product") {
      let product;
      try { product = JSON.parse(target.value_json); } catch {
        return adminJson({ error: "The selected product revision contains invalid JSON and cannot be published." }, 400);
      }
      const validationError = validateProductContent(product);
      if (validationError) return adminJson({ error: validationError }, 400);
      if (product.slug !== entityKey) {
        return adminJson({ error: "Product slug does not match the CMS product record." }, 400);
      }
    }
    if (entityType === "page") {
      let content;
      try { content = JSON.parse(target.value_json); } catch {
        return adminJson({ error: "The selected page revision contains invalid JSON and cannot be published." }, 400);
      }
      const validationError = validatePageContent(content);
      if (validationError) return adminJson({ error: validationError }, 400);
      const destinationError = await validatePageDestinations(env.DB, content, target.route);
      if (destinationError) return adminJson({ error: destinationError }, 400);
      if (typeof target.title !== "string" || !target.title.trim() || target.title.length > 120) {
        return adminJson({ error: "The page revision must have a valid title before publishing." }, 400);
      }
      const routeError = entityKey === "home" && target.route === "/" ? null : validatePageRoute(target.route);
      if (routeError) return adminJson({ error: routeError }, 400);
      const routeConflict = await env.DB.prepare(`
        SELECT p.id
        FROM cms_pages p
        LEFT JOIN cms_page_versions published ON published.id = p.published_version_id
        LEFT JOIN cms_page_versions draft ON draft.page_id = p.id AND draft.state = 'draft'
        WHERE p.id <> ? AND (p.route = ? OR published.route = ? OR draft.route = ?)
        LIMIT 1
      `).bind(entity.id, target.route, target.route, target.route).first();
      if (routeConflict) return adminJson({ error: "This page route is already assigned to another CMS page." }, 409);
    }
    if (entityType === "setting") {
      let value;
      try { value = JSON.parse(target.value_json); } catch {
        return adminJson({ error: "The selected site setting contains invalid JSON and cannot be published." }, 400);
      }
      const validationError = validateSiteSetting(entityKey, value);
      if (validationError) return adminJson({ error: validationError }, 400);
      const destinationError = await validateSettingDestinations(env.DB, entityKey, value);
      if (destinationError) return adminJson({ error: destinationError }, 400);
    }

    const now = new Date().toISOString();
    const batch = [];
    if (entity.published_version_id) {
      batch.push(env.DB.prepare(`UPDATE ${config.versions} SET state = 'archived' WHERE id = ? AND state = 'published'`).bind(entity.published_version_id));
    }
    batch.push(env.DB.prepare(`UPDATE ${config.versions} SET state = 'published', published_at = ? WHERE id = ? AND ${config.foreignKey} = ?`)
      .bind(now, versionId, entity.id));
    if (entityType === "setting") {
      batch.push(env.DB.prepare(`UPDATE ${config.table} SET published_version_id = ?, updated_at = ? WHERE setting_key = ?`).bind(versionId, now, entity.id));
    } else if (entityType === "page") {
      batch.push(env.DB.prepare("UPDATE cms_pages SET title = ?, route = ?, published_version_id = ?, updated_at = ? WHERE id = ?")
        .bind(target.title, target.route, versionId, now, entity.id));
    } else {
      batch.push(env.DB.prepare(`UPDATE ${config.table} SET published_version_id = ?, updated_at = ? WHERE id = ?`).bind(versionId, now, entity.id));
    }
    batch.push(env.DB.prepare("INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'publish', ?, ?, ?)")
      .bind(crypto.randomUUID(), auth.email || null, entityType, entity.id, JSON.stringify({ version: target.version_number })));
    await env.DB.batch(batch);
    return adminJson({ ok: true, entityType, entityKey, version: target.version_number, publishedAt: now });
  } catch (error) {
    console.error("CMS publish failed", error);
    return adminJson({ error: "Unable to publish this CMS revision." }, 500);
  }
}
