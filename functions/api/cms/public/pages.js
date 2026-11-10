import { adminJson } from "../../../_utils/admin-auth.js";

function publicJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return publicJson({ error: "CMS content is not available." }, 503);
  const url = new URL(request.url);
  const pageKey = (url.searchParams.get("key") || "").trim().slice(0, 60);
  try {
    if (pageKey) {
      const row = await env.DB.prepare(`
        SELECT p.page_key, p.title, p.route, v.version_number, v.content_json
        FROM cms_pages p
        JOIN cms_page_versions v ON v.id = p.published_version_id
        WHERE p.page_key = ? AND v.state = 'published'
        LIMIT 1
      `).bind(pageKey).first();
      if (!row) return publicJson({ error: "Published page not found." }, 404);
      return publicJson({ ok: true, page: { ...row, content: JSON.parse(row.content_json) } });
    }
    const result = await env.DB.prepare(`
      SELECT p.page_key, p.title, p.route, v.version_number, v.content_json
      FROM cms_pages p
      JOIN cms_page_versions v ON v.id = p.published_version_id
      WHERE v.state = 'published'
      ORDER BY p.title COLLATE NOCASE
    `).all();
    return publicJson({ ok: true, pages: (result.results || []).map((row) => ({
      pageKey: row.page_key, title: row.title, route: row.route,
      version: row.version_number, content: JSON.parse(row.content_json)
    })) });
  } catch (error) {
    console.error("Public CMS page read failed", error);
    return publicJson({ error: "Unable to load published page content." }, 500);
  }
}
