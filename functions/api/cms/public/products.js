function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=60, stale-while-revalidate=300", "X-Content-Type-Options": "nosniff" }
  });
}

export async function onRequest({ env, request }) {
  if (!env.DB) return json({ error: "Published products are not available." }, 503);
  const slug = new URL(request.url).searchParams.get("slug")?.trim().slice(0, 100) || "";
  try {
    if (slug) {
      const row = await env.DB.prepare(`
        SELECT p.product_slug, v.product_json, v.version_number
        FROM cms_products p JOIN cms_product_versions v ON v.id = p.published_version_id
        WHERE p.product_slug = ? AND v.state = 'published' LIMIT 1
      `).bind(slug).first();
      if (!row) return json({ error: "Published product not found." }, 404);
      const product = JSON.parse(row.product_json);
      if (product.isArchived) return json({ ok: false, archived: true, error: "This product is no longer available." }, 410);
      return json({ ok: true, product, version: row.version_number });
    }
    const result = await env.DB.prepare(`
      SELECT p.product_slug, v.product_json FROM cms_products p
      JOIN cms_product_versions v ON v.id = p.published_version_id
      WHERE v.state = 'published' ORDER BY p.product_slug
    `).all();
    const products = [];
    const archivedSlugs = [];
    for (const row of result.results || []) {
      const product = JSON.parse(row.product_json);
      if (product.isArchived) archivedSlugs.push(row.product_slug);
      else products.push(product);
    }
    return json({ ok: true, products, archivedSlugs });
  } catch (error) {
    console.error("Public CMS product read failed", error);
    return json({ error: "Unable to load published products." }, 500);
  }
}
