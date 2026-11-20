import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  const slug = new URL(request.url).searchParams.get("slug")?.trim().slice(0, 100) || "";
  if (!slug) return adminJson({ error: "A product slug is required." }, 400);
  try {
    const row = await env.DB.prepare(`
      SELECT p.product_slug, d.product_json AS draft_product, d.version_number AS draft_version,
        pv.product_json AS published_product, pv.version_number AS published_version
      FROM cms_products p
      LEFT JOIN cms_product_versions d ON d.product_id = p.id AND d.state = 'draft'
      LEFT JOIN cms_product_versions pv ON pv.id = p.published_version_id AND pv.state = 'published'
      WHERE p.product_slug = ? LIMIT 1
    `).bind(slug).first();
    if (!row) return adminJson({ error: "CMS product not found." }, 404);
    const productJson = row.draft_product || row.published_product;
    if (!productJson) return adminJson({ error: "This product has no saved draft or published version to preview." }, 404);
    return adminJson({
      ok: true,
      product: JSON.parse(productJson),
      version: row.draft_product ? row.draft_version : row.published_version,
      isDraft: Boolean(row.draft_product),
      publishedVersion: row.published_version
    });
  } catch (error) {
    console.error("CMS product preview failed", error);
    return adminJson({ error: "Unable to load product preview." }, 500);
  }
}
