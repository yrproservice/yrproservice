import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";
import { validatePageContent, validatePageRoute } from "../../../_utils/cms-content-validation.js";

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
  const routeError = pageKey === "home" && route === "/" ? null : validatePageRoute(route);
  if (routeError) return routeError;
  const contentError = validatePageContent(body.content);
  if (contentError) return contentError;
  return null;
}

async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.toLowerCase().includes("application/json")) return { error: "Submit JSON data.", status: 415 };
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_CONTENT_BYTES) return { error: "Page content is too large.", status: 413 };
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
      SELECT p.id, p.page_key, COALESCE(d.title, pv.title, p.title) AS title,
        COALESCE(d.route, pv.route, p.route) AS route, p.published_version_id, p.updated_at,
        d.id AS draft_id, d.version_number AS draft_version, d.created_at AS draft_created_at, d.content_json AS draft_content,
        pv.version_number AS published_version
      FROM cms_pages p
      LEFT JOIN cms_page_versions d ON d.page_id = p.id AND d.state = 'draft'
      LEFT JOIN cms_page_versions pv ON pv.id = p.published_version_id
      ORDER BY COALESCE(d.title, pv.title, p.title) COLLATE NOCASE
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
  const expectedDraftId = body.expectedDraftId === null || body.expectedDraftId === undefined
    ? null
    : typeof body.expectedDraftId === "string" && body.expectedDraftId.length <= 80
      ? body.expectedDraftId || null
      : undefined;
  const expectedDraftCreatedAt = body.expectedDraftCreatedAt === null || body.expectedDraftCreatedAt === undefined
    ? null
    : typeof body.expectedDraftCreatedAt === "string" && body.expectedDraftCreatedAt.length <= 64
      ? body.expectedDraftCreatedAt
      : undefined;
  if (expectedDraftId === undefined || expectedDraftCreatedAt === undefined ||
      (expectedDraftId && !expectedDraftCreatedAt)) {
    return adminJson({ error: "Invalid expected draft snapshot." }, 400);
  }
  const invalid = validPageInput(body);
  if (invalid) return adminJson({ error: invalid }, 400);

  const pageKey = clean(body.pageKey, 60);
  const title = clean(body.title, 120);
  const route = clean(body.route, 160);
  const content = JSON.stringify(body.content);
  const now = new Date().toISOString();
  const actor = auth.email || null;

  try {
    let page = await env.DB.prepare("SELECT id FROM cms_pages WHERE page_key = ? LIMIT 1")
      .bind(pageKey).first();
    const conflict = await env.DB.prepare(`
      SELECT p.id
      FROM cms_pages p
      LEFT JOIN cms_page_versions published ON published.id = p.published_version_id
      LEFT JOIN cms_page_versions draft ON draft.page_id = p.id AND draft.state = 'draft'
      WHERE (p.page_key = ? OR p.route = ? OR published.route = ? OR draft.route = ?)
        AND (? IS NULL OR p.id <> ?)
      LIMIT 1
    `).bind(pageKey, route, route, route, page?.id || null, page?.id || null).first();
    if (conflict) return adminJson({ error: "That page key or route is already assigned to another page." }, 409);

    if (!page) {
      if (expectedDraftId || expectedDraftCreatedAt) return adminJson({ error: "The page changed or was removed. Reload the page list before saving." }, 409);
      const id = crypto.randomUUID();
      const versionId = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO cms_pages (id, page_key, title, route, updated_at) VALUES (?, ?, ?, ?, ?)")
          .bind(id, pageKey, title, route, now),
        env.DB.prepare("INSERT INTO cms_page_versions (id, page_id, version_number, state, title, route, content_json, created_by, change_note, created_at) VALUES (?, ?, 1, 'draft', ?, ?, ?, ?, ?, ?)")
          .bind(versionId, id, title, route, content, actor, clean(body.changeNote, 240) || "Initial draft", now),
        env.DB.prepare("INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'create_draft', 'page', ?, ?)")
          .bind(crypto.randomUUID(), actor, id, JSON.stringify({ pageKey, route }))
      ]);
      return adminJson({ ok: true, pageId: id, draftId: versionId, draftCreatedAt: now, version: 1 }, 201);
    }

    const draft = await env.DB.prepare("SELECT id, version_number, created_at, content_json FROM cms_page_versions WHERE page_id = ? AND state = 'draft' LIMIT 1")
      .bind(page.id).first();
    if ((draft?.id || null) !== expectedDraftId || (draft?.created_at || null) !== expectedDraftCreatedAt) {
      return adminJson({ error: "This page draft changed in another session. Reload it before saving again." }, 409);
    }
    if (draft) {
      const results = await env.DB.batch([
        env.DB.prepare("UPDATE cms_page_versions SET title = ?, route = ?, content_json = ?, change_note = ?, created_by = ?, created_at = ? WHERE id = ? AND state = 'draft' AND created_at = ? AND content_json = ?")
          .bind(title, route, content, clean(body.changeNote, 240) || "Updated draft", actor, now, draft.id, draft.created_at, draft.content_json),
        env.DB.prepare("UPDATE cms_pages SET title = ?, route = ?, updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM cms_page_versions WHERE id = ? AND state = 'draft' AND created_at = ? AND content_json = ?)")
          .bind(title, route, now, page.id, draft.id, now, content),
        env.DB.prepare("INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) SELECT ?, ?, 'update_draft', 'page', ?, ? WHERE EXISTS (SELECT 1 FROM cms_page_versions WHERE id = ? AND state = 'draft' AND created_at = ? AND content_json = ?)")
          .bind(crypto.randomUUID(), actor, page.id, JSON.stringify({ version: draft.version_number }), draft.id, now, content)
      ]);
      if (Number(results?.[0]?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "This page draft changed in another session. Reload it before saving again." }, 409);
      }
      if (Number(results?.[2]?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "The page draft audit record could not be confirmed. Reload the page before retrying; the draft update may have been applied." }, 500);
      }
      return adminJson({ ok: true, pageId: page.id, draftId: draft.id, draftCreatedAt: now, version: draft.version_number });
    }

    const latest = await env.DB.prepare("SELECT COALESCE(MAX(version_number), 0) AS version FROM cms_page_versions WHERE page_id = ?")
      .bind(page.id).first();
    const version = Number(latest?.version || 0) + 1;
    const versionId = crypto.randomUUID();
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE cms_page_versions SET state = state WHERE page_id = ? AND state = 'draft'").bind(page.id),
      env.DB.prepare(`
        INSERT INTO cms_page_versions (id, page_id, version_number, state, title, route, content_json, created_by, change_note, created_at)
        SELECT ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?
        WHERE changes() = 0
      `).bind(versionId, page.id, version, title, route, content, actor, clean(body.changeNote, 240) || "New draft", now),
      env.DB.prepare("UPDATE cms_pages SET title = ?, route = ?, updated_at = ? WHERE id = ? AND changes() = 1")
        .bind(title, route, now, page.id),
      env.DB.prepare(`
        INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json)
        SELECT ?, ?, 'create_draft', 'page', ?, ?
        WHERE changes() = 1
      `).bind(crypto.randomUUID(), actor, page.id, JSON.stringify({ version }))
    ]);
    if (Number(results?.[1]?.meta?.changes || 0) !== 1) {
      return adminJson({ error: "A page draft was created in another session. Reload the page before saving again." }, 409);
    }
    if (Number(results?.[3]?.meta?.changes || 0) !== 1) {
      return adminJson({ error: "The new page draft audit record could not be confirmed. Reload the page list before retrying; the draft may have been created." }, 500);
    }
    return adminJson({ ok: true, pageId: page.id, draftId: versionId, draftCreatedAt: now, version }, 201);
  } catch (error) {
    console.error("CMS page draft save failed", error);
    return adminJson({ error: "Unable to save page draft. Check that the CMS migration is applied and the page key/route are unique." }, 500);
  }
}
