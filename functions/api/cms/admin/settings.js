import { validateSiteSetting } from "../../../_utils/cms-settings-validation.js";
import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";

const KEY = /^[a-z0-9][a-z0-9._-]{1,79}$/;
export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  if (!context.env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  try {
    const rows = await context.env.DB.prepare(`
      SELECT s.setting_key, d.id AS draft_id, d.version_number AS draft_version, d.value_json AS draft_value,
        p.version_number AS published_version, p.value_json AS published_value
      FROM cms_site_settings s
      LEFT JOIN cms_site_setting_versions d ON d.setting_key=s.setting_key AND d.state='draft'
      LEFT JOIN cms_site_setting_versions p ON p.id=s.published_version_id
      ORDER BY s.setting_key
    `).all();
    return adminJson({ ok: true, settings: rows.results || [] });
  } catch (error) {
    console.error("CMS settings list failed", error);
    return adminJson({ error: "Unable to load CMS settings." }, 500);
  }
}
export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  if (!context.env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  if (!(context.request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    return adminJson({ error: "Submit JSON data." }, 415);
  }
  let body;
  try {
    const raw = await context.request.text();
    if (new TextEncoder().encode(raw).byteLength > 60000) return adminJson({ error: "Setting data is too large." }, 413);
    body = JSON.parse(raw);
  } catch { return adminJson({ error: "Invalid JSON body." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return adminJson({ error: "Invalid JSON body." }, 400);
  }
  const key = typeof body.key === "string" ? body.key.trim() : "";
  if (!KEY.test(key) || !Object.prototype.hasOwnProperty.call(body || {}, "value")) return adminJson({ error: "A valid setting key and value are required." }, 400);
  const validationError = validateSiteSetting(key, body.value);
  if (validationError) return adminJson({ error: validationError }, 400);
  const json = JSON.stringify(body.value);
  if (new TextEncoder().encode(json).byteLength > 50000) return adminJson({ error: "Setting value is too large." }, 413);
  try {
    const db = context.env.DB, now = new Date().toISOString(), actor = auth.email || null;
    const draft = await db.prepare("SELECT id, version_number FROM cms_site_setting_versions WHERE setting_key=? AND state='draft'").bind(key).first();
    const latest = await db.prepare("SELECT COALESCE(MAX(version_number),0) AS version FROM cms_site_setting_versions WHERE setting_key=?").bind(key).first();
    const version = Number(latest?.version || 0) + 1, id = crypto.randomUUID();
    const statements = [
      db.prepare("INSERT OR IGNORE INTO cms_site_settings (setting_key, updated_at) VALUES (?, ?)").bind(key, now)
    ];
    // Keep revision history immutable: archive the current draft and create a new
    // numbered draft for every explicit Save action.
    if (draft) statements.push(
      db.prepare("UPDATE cms_site_setting_versions SET state='archived' WHERE id=? AND state='draft'").bind(draft.id)
    );
    statements.push(
      db.prepare(
        "INSERT INTO cms_site_setting_versions (id,setting_key,version_number,state,value_json,created_by,change_note) VALUES (?, ?, ?, 'draft', ?, ?, ?)"
      ).bind(
        id,
        key,
        version,
        json,
        actor,
        (typeof body.changeNote === "string" ? body.changeNote.trim().slice(0, 240) : "") ||
          (draft ? "Updated settings draft" : "New settings draft")
      ),
      db.prepare("UPDATE cms_site_settings SET updated_at=? WHERE setting_key=?").bind(now,key),
      db.prepare(
        "INSERT INTO cms_audit_log (id,actor_email,action,entity_type,entity_id,metadata_json) VALUES (?,?,'save_draft','setting',?,?)"
      ).bind(
        crypto.randomUUID(),
        actor,
        key,
        JSON.stringify({
          version,
          previousDraftVersion: draft?.version_number ?? null,
        })
      )
    );
    await db.batch(statements);
    return adminJson({ ok: true, draftId: id, version }, 201);
  } catch (error) {
    console.error("CMS settings save failed", error);
    return adminJson({ error: "Unable to save settings draft." }, 500);
  }
}
