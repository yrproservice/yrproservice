import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  const url = new URL(request.url);
  const pageKey = (url.searchParams.get("key") || "").trim().slice(0, 60);
  if (!pageKey) return adminJson({ error: "A page key is required." }, 400);
  try {
    const row = await env.DB.prepare(`
      SELECT p.page_key, COALESCE(d.title, pv.title, p.title) AS title,
        COALESCE(d.route, pv.route, p.route) AS route, d.id AS draft_id,
        d.version_number AS draft_version, d.created_at AS draft_created_at, d.content_json AS draft_content,
        pv.version_number AS published_version, pv.content_json AS published_content
      FROM cms_pages p
      LEFT JOIN cms_page_versions d ON d.page_id = p.id AND d.state = 'draft'
      LEFT JOIN cms_page_versions pv ON pv.id = p.published_version_id AND pv.state = 'published'
      WHERE p.page_key = ? LIMIT 1
    `).bind(pageKey).first();
    if (!row) return adminJson({ error: "Page not found." }, 404);
    const contentJson = row.draft_content || row.published_content;
    if (!contentJson) return adminJson({ error: "This page has no saved content yet." }, 404);
    return adminJson({ ok: true, page: {
      pageKey: row.page_key, title: row.title, route: row.route,
      draftId: row.draft_id, draftCreatedAt: row.draft_created_at, draftVersion: row.draft_version,
      publishedVersion: row.published_version, isDraft: Boolean(row.draft_content),
      content: JSON.parse(contentJson)
    }});
  } catch (error) {
    console.error("CMS preview read failed", error);
    return adminJson({ error: "Unable to load page preview." }, 500);
  }
}
