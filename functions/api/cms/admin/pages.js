import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";

const KEY_PATTERN = /^[a-z0-9][a-z0-9-]{1,59}$/;
const MAX_CONTENT_BYTES = 100_000;

function clean(value, max = 120) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validPageInput(body) {
  const pageKey = clean(body.pageKey, 60);
  const title = clean(body.title, 120);
  const route = clean(body.route, 160);
  if (!KEY_PATTERN.test(pageKey)) return "Page key must use lowercase letters, numbers and hyphens.";
  if (!title) return "Page title is required.";
  if (!route.startsWith("/") || route.startsWith("//") || /[?#\\\\]/.test(route)) return "Enter a valid site route.";
  if (!body.content || typeof body.content !== "object" || Array.isArray(body.content)) return "Page content must be a JSON object.";
  if (!Array.isArray(body.content.sections)) return "Page content must contain a sections array.";
  if (body.content.sections.length > 80) return "A page cannot contain more than 80 sections.";
  return null;
}

async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) return { error: "Submit JSON data.", status: 415 };
  const raw = await request.text();
  if (raw.length > MAX_CONTENT_BYTES) return { error: "Page content is too large.", status: 413 };
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return { body };
  } catch {
    return { error: "Invalid JSON body.", status: 400 };
  }
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  try {
    const result = await env.DB.prepare(`
      SELECT p.id, p.page_key, p.title, p.route, p.published_version_id,
        p.updated_at,
        d.id AS draft_id, d.version_number AS draft_version, d.content_json AS draft_content,
        pv.version_number AS published_version
      FROM cms_pages p
      LEFT JOIN cms_page_versions d ON d.page_id = p.id AND d.state = 'draft'
      LEFT JOIN cms_page_versions pv ON pv.id = p.published_version_id
      ORDER BY p.title COLLATE NOCASE
    `).all();
    return adminJson({ ok: true, pages: result.results || [] });
  } catch (error) {
    console.error("CMS page list failed", error);
    return adminJson({ error: "Unable to load CMS pages. Has the CMS migration been applied to this environment?" }, 503);
  }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  const parsed = await readBody(context.request);
  if (parsed.error) return adminJson({ error: parsed.error }, parsed.status);
  const body = parsed.body;
  const invalid = validPageInput(body);
  if (invalid) return adminJson({ error: invalid }, 400);

  const pageKey = clean(body.pageKey, 60);
  const title = clean(body.title, 120);
  const route = clean(body.route, 160);
  const content = JSON.stringify(body.content);
  const now = new Date().toISOString();
  const actor = auth.email || null;

  try {
    let page = await env.DB.prepare("SELECT id FROM cms_pages WHERE page_key = ? OR route = ? LIMIT 1")
      .bind(pageKey, route).first();
    if (!page) {
      const id = crypto.randomUUID();
      const versionId = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO cms_pages (id, page_key, title, route, updated_at) VALUES (?, ?, ?, ?, ?)")
          .bind(id, pageKey, title, route, now),
        env.DB.prepare("INSERT INTO cms_page_versions (id, page_id, version_number, state, content_json, created_by, change_note) VALUES (?, ?, 1, 'draft', ?, ?, ?)")
          .bind(versionId, id, content, actor, clean(body.changeNote, 240) || "Initial draft"),
        env.DB.prepare("INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'create_draft', 'page', ?, ?)")
          .bind(crypto.randomUUID(), actor, id, JSON.stringify({ pageKey, route }))
      ]);
      return adminJson({ ok: true, pageId: id, draftId: versionId, version: 1 }, 201);
    }

    const existing = await env.DB.prepare("SELECT id, page_key, route FROM cms_pages WHERE id = ?").bind(page.id).first();
    if (existing.page_key !== pageKey || existing.route !== route) {
      const conflict = await env.DB.prepare("SELECT id FROM cms_pages WHERE (page_key = ? OR route = ?) AND id <> ? LIMIT 1")
        .bind(pageKey, route, page.id).first();
      if (conflict) return adminJson({ error: "That page key or route is already assigned to another page." }, 409);
    }
    const draft = await env.DB.prepare("SELECT id, version_number FROM cms_page_versions WHERE page_id = ? AND state = 'draft' LIMIT 1")
      .bind(page.id).first();
    if (draft) {
      await env.DB.batch([
        env.DB.prepare("UPDATE cms_page_versions SET content_json = ?, change_note = ?, created_by = ?, created_at = ? WHERE id = ? AND state = 'draft'")
          .bind(content, clean(body.changeNote, 240) || "Updated draft", actor, now, draft.id),
        env.DB.prepare("UPDATE cms_pages SET title = ?, route = ?, updated_at = ? WHERE id = ?")
          .bind(title, route, now, page.id),
        env.DB.prepare("INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'update_draft', 'page', ?, ?)")
          .bind(crypto.randomUUID(), actor, page.id, JSON.stringify({ version: draft.version_number }))
      ]);
      return adminJson({ ok: true, pageId: page.id, draftId: draft.id, version: draft.version_number });
    }

    const latest = await env.DB.prepare("SELECT COALESCE(MAX(version_number), 0) AS version FROM cms_page_versions WHERE page_id = ?")
      .bind(page.id).first();
    const version = Number(latest?.version || 0) + 1;
    const versionId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare("UPDATE cms_pages SET title = ?, updated_at = ? WHERE id = ?").bind(title, now, page.id),
      env.DB.prepare("INSERT INTO cms_page_versions (id, page_id, version_number, state, content_json, created_by, change_note) VALUES (?, ?, ?, 'draft', ?, ?, ?)")
        .bind(versionId, page.id, version, content, actor, clean(body.changeNote, 240) || "New draft"),
      env.DB.prepare("INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'create_draft', 'page', ?, ?)")
        .bind(crypto.randomUUID(), actor, page.id, JSON.stringify({ version }))
    ]);
    return adminJson({ ok: true, pageId: page.id, draftId: versionId, version }, 201);
  } catch (error) {
    console.error("CMS page draft save failed", error);
    return adminJson({ error: "Unable to save page draft. Check that the CMS migration is applied and the page key/route are unique." }, 500);
  }
}
