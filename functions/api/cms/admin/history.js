import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";
import { validatePageContent, validatePageRoute, validateProductContent } from "../../../_utils/cms-content-validation.js";
import { validateSiteSetting } from "../../../_utils/cms-settings-validation.js";
import { validatePageDestinations, validateSettingDestinations } from "../../../_utils/cms-route-validation.js";

const CONFIG = {
  page: { table: "cms_pages", key: "page_key", versions: "cms_page_versions", fk: "page_id", json: "content_json" },
  product: { table: "cms_products", key: "product_slug", versions: "cms_product_versions", fk: "product_id", json: "product_json" },
  setting: { table: "cms_site_settings", key: "setting_key", versions: "cms_site_setting_versions", fk: "setting_key", json: "value_json" },
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
  let conflictSnapshot = null;
  try {
    const entity = type === "setting"
      ? await env.DB.prepare(`SELECT setting_key AS id, published_version_id FROM ${config.table} WHERE ${config.key} = ? LIMIT 1`).bind(key).first()
      : await env.DB.prepare(`SELECT id, published_version_id FROM ${config.table} WHERE ${config.key} = ? LIMIT 1`).bind(key).first();
    if (!entity) return adminJson({ error: "CMS item not found." }, 404);
    const cursorValue = params.get("cursor") || "";
    let cursor = null;
    if (cursorValue) {
      if (!/^\d{1,12}$/.test(cursorValue) || Number(cursorValue) < 1) {
        return adminJson({ error: "Invalid revision history cursor." }, 400);
      }
      cursor = Number(cursorValue);
    }
    const rows = await env.DB.prepare(`
      SELECT id, version_number, state, created_by, change_note, created_at, published_at,
        CASE WHEN id = ? THEN 1 ELSE 0 END AS is_current_published
      FROM ${config.versions}
      WHERE ${config.fk} = ? ${cursor ? "AND version_number < ?" : ""}
      ORDER BY version_number DESC
      LIMIT 101
    `).bind(...(cursor ? [entity.published_version_id || "", entity.id, cursor] : [entity.published_version_id || "", entity.id])).all();
    const allRows = rows.results || [];
    const hasMore = allRows.length > 100;
    const history = allRows.slice(0, 100);
    const nextCursor = hasMore && history.length ? String(history[history.length - 1].version_number) : null;
    return adminJson({ ok: true, history, limit: 100, hasMore, nextCursor });
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
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return adminJson({ error: "Submit JSON data." }, 415);
  }
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4096) return adminJson({ error: "Revision restore request is too large." }, 413);
    body = JSON.parse(raw);
  } catch { return adminJson({ error: "Submit valid JSON." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return adminJson({ error: "Submit a valid revision restore object." }, 400);
  }
  const type = clean(body.entityType, 20), key = clean(body.entityKey, 100), versionId = clean(body.versionId, 80);
  const config = CONFIG[type];
  if (!config || !key || !versionId) return adminJson({ error: "A valid entityType, entityKey and versionId are required." }, 400);
  try {
    const entity = type === "setting"
      ? await env.DB.prepare(`SELECT setting_key AS id FROM ${config.table} WHERE ${config.key} = ? LIMIT 1`).bind(key).first()
      : await env.DB.prepare(`SELECT id FROM ${config.table} WHERE ${config.key} = ? LIMIT 1`).bind(key).first();
    if (!entity) return adminJson({ error: "CMS item not found." }, 404);
    const metadataColumns = type === "page" ? ", title, route" : "";
    const source = await env.DB.prepare(`SELECT version_number, ${config.json} AS content${metadataColumns} FROM ${config.versions} WHERE id = ? AND ${config.fk} = ?`).bind(versionId, entity.id).first();
    if (!source) return adminJson({ error: "Revision does not belong to this item." }, 404);
    let restoredValue;
    try { restoredValue = JSON.parse(source.content); } catch {
      return adminJson({ error: "This archived revision contains invalid JSON and cannot be restored." }, 400);
    }
    const restoreError = type === "page"
      ? validatePageContent(restoredValue, key === "team")
      : type === "product"
        ? validateProductContent(restoredValue)
        : type === "setting"
        ? validateSiteSetting(key, restoredValue)
        : null;
    if (restoreError) return adminJson({ error: restoreError }, 400);
    if (type === "page") {
      const destinationError = await validatePageDestinations(env.DB, restoredValue, source.route);
      if (destinationError) return adminJson({ error: destinationError }, 400);
    }
    if (type === "setting") {
      const destinationError = await validateSettingDestinations(env.DB, key, restoredValue);
      if (destinationError) return adminJson({ error: destinationError }, 400);
    }
    if (type === "page") {
      if (typeof source.title !== "string" || !source.title.trim() || source.title.length > 120) {
        return adminJson({ error: "This archived page revision has invalid title metadata and cannot be restored." }, 400);
      }
      const routeError = key === "home" && source.route === "/" ? null : validatePageRoute(source.route);
      if (routeError) return adminJson({ error: routeError }, 400);
      const routeConflict = await env.DB.prepare(`
        SELECT p.id
        FROM cms_pages p
        LEFT JOIN cms_page_versions published ON published.id = p.published_version_id
        LEFT JOIN cms_page_versions draft ON draft.page_id = p.id AND draft.state = 'draft'
        WHERE p.id <> ? AND (p.route = ? OR published.route = ? OR draft.route = ?)
        LIMIT 1
      `).bind(entity.id, source.route, source.route, source.route).first();
      if (routeConflict) return adminJson({ error: "The archived page route is now assigned to another CMS page." }, 409);
    }
    if (!Object.prototype.hasOwnProperty.call(body, "expectedDraftId")) {
      return adminJson({ error: "Reload the item history before restoring; the current draft version was not supplied." }, 409);
    }
    const expectedDraftId = typeof body.expectedDraftId === "string" && body.expectedDraftId
      ? body.expectedDraftId.slice(0, 80)
      : null;
    if (!Object.prototype.hasOwnProperty.call(body, "expectedDraftCreatedAt")) {
      return adminJson({ error: "Reload the item history before restoring; the current draft timestamp was not supplied." }, 409);
    }
    const expectedDraftCreatedAt = typeof body.expectedDraftCreatedAt === "string" && body.expectedDraftCreatedAt
      ? body.expectedDraftCreatedAt.slice(0, 64)
      : null;
    if (expectedDraftId && !expectedDraftCreatedAt) {
      return adminJson({ error: "Reload the item history before restoring; the current draft snapshot is incomplete." }, 409);
    }
    conflictSnapshot = {
      versions: config.versions,
      foreignKey: config.fk,
      entityId: entity.id,
      expectedDraftId,
      expectedDraftCreatedAt,
    };
    const draft = await env.DB.prepare(`SELECT id, version_number, created_at FROM ${config.versions} WHERE ${config.fk} = ? AND state = 'draft'`).bind(entity.id).first();
    if ((draft?.id || null) !== expectedDraftId || (draft?.created_at || null) !== expectedDraftCreatedAt) {
      return adminJson({ error: "This CMS draft changed in another session. Reload its history before restoring again." }, 409);
    }
    const latest = await env.DB.prepare(`SELECT COALESCE(MAX(version_number), 0) AS version FROM ${config.versions} WHERE ${config.fk} = ?`).bind(entity.id).first();
    const nextVersion = Number(latest?.version || 0) + 1;
    const now = new Date().toISOString();
    const actor = auth.email || null;
    const newId = crypto.randomUUID();
    const statements = [];
    // The first statement is a compare-and-swap guard. A stale draft ID
    // cannot be archived; the no-draft branch confirms no draft appeared.
    if (expectedDraftId) {
      statements.push(
        env.DB.prepare(`UPDATE ${config.versions} SET state = 'archived' WHERE id = ? AND ${config.fk} = ? AND state = 'draft' AND created_at = ?`)
          .bind(expectedDraftId, entity.id, expectedDraftCreatedAt)
      );
    } else {
      statements.push(
        env.DB.prepare(`UPDATE ${config.versions} SET state = state WHERE ${config.fk} = ? AND state = 'draft'`)
          .bind(entity.id)
      );
    }
    if (type === "page") {
      statements.push(
        env.DB.prepare(`
          INSERT INTO cms_page_versions (
            id, page_id, version_number, state, title, route, content_json,
            created_by, change_note, created_at
          )
          SELECT ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?
          WHERE changes() = ?
        `).bind(
          newId, entity.id, nextVersion, source.title, source.route,
          source.content, actor, `Restored from V${source.version_number}`, now,
          expectedDraftId ? 1 : 0
        ),
        env.DB.prepare("UPDATE cms_pages SET title = ?, route = ?, updated_at = ? WHERE id = ? AND changes() = 1")
          .bind(source.title, source.route, now, entity.id)
      );
    } else {
      statements.push(
        env.DB.prepare(`
          INSERT INTO ${config.versions} (
            id, ${config.fk}, version_number, state, ${config.json},
            created_by, change_note, created_at
          )
          SELECT ?, ?, ?, 'draft', ?, ?, ?, ?
          WHERE changes() = ?
        `).bind(
          newId, entity.id, nextVersion, source.content, actor,
          `Restored from V${source.version_number}`, now,
          expectedDraftId ? 1 : 0
        )
      );
    }
    statements.push(
      env.DB.prepare(`
        INSERT INTO cms_audit_log (
          id, actor_email, action, entity_type, entity_id, metadata_json
        )
        SELECT ?, ?, CASE WHEN changes() = 1 THEN 'restore_revision_as_draft' END, ?, ?, ?
      `).bind(
        crypto.randomUUID(), actor, type, entity.id,
        JSON.stringify({ sourceVersion: source.version_number, newVersion: nextVersion })
      )
    );
    const results = await env.DB.batch(statements);
    const insertResult = results?.[1];
    if (Number(insertResult?.meta?.changes || 0) !== 1) {
      return adminJson({ error: "This CMS draft changed in another session. Reload its history before restoring again." }, 409);
    }
    if (type === "page" && Number(results?.[2]?.meta?.changes || 0) !== 1) {
      return adminJson({ error: "The page revision may have been restored as a draft, but its page metadata update could not be confirmed. Reload the page and inspect its draft before retrying." }, 500);
    }
    const auditResult = results?.[results.length - 1];
    if (Number(auditResult?.meta?.changes || 0) !== 1) {
      return adminJson({ error: "The revision may have been restored as a draft, but its audit record could not be confirmed. Reload the item history and inspect the current draft before retrying." }, 500);
    }
    return adminJson({ ok: true, auditRecorded: true, draftId: newId, version: nextVersion, restoredFrom: source.version_number }, 201);
  } catch (error) {
    console.error("CMS revision restore failed", error);
    if (
      conflictSnapshot &&
      typeof error?.message === "string" &&
      /NOT NULL constraint failed:\\s*cms_audit_log\\.action/i.test(error.message)
    ) {
      try {
        const latest = await env.DB.prepare(`
          SELECT id, created_at FROM ${conflictSnapshot.versions}
          WHERE ${conflictSnapshot.foreignKey} = ? AND state = 'draft'
          LIMIT 1
        `).bind(conflictSnapshot.entityId).first();
        if (
          (latest?.id || null) !== conflictSnapshot.expectedDraftId ||
          (latest?.created_at || null) !== conflictSnapshot.expectedDraftCreatedAt
        ) {
          return adminJson({ error: "This CMS draft changed in another session. Reload its history before restoring again." }, 409);
        }
      } catch (verificationError) {
        console.error("CMS revision restore conflict verification failed", verificationError);
      }
    }
    return adminJson({ error: "Unable to restore this revision as a draft." }, 500);
  }
}
