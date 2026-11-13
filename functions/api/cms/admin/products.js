import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";

const SLUG = /^[a-z0-9][a-z0-9-]{1,99}$/;
const MAX_BYTES = 100_000;

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  try {
    const result = await env.DB.prepare(`
      SELECT p.id, p.product_slug, p.published_version_id, p.updated_at,
        d.id AS draft_id, d.version_number AS draft_version, d.product_json AS draft_product,
        pv.version_number AS published_version, pv.product_json AS published_product
      FROM cms_products p
      LEFT JOIN cms_product_versions d ON d.product_id = p.id AND d.state = 'draft'
      LEFT JOIN cms_product_versions pv ON pv.id = p.published_version_id
      ORDER BY p.product_slug
    `).all();
    return adminJson({ ok: true, products: result.results || [] });
  } catch (error) {
    console.error("CMS product list failed", error);
    return adminJson({ error: "Unable to load CMS products. Has the CMS migration been applied?" }, 503);
  }
}

export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) return adminJson({ error: "Submit JSON data." }, 415);

  let product;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return adminJson({ error: "Product data is too large." }, 413);
    product = JSON.parse(raw);
  } catch { return adminJson({ error: "Invalid JSON body." }, 400); }
  if (!product || typeof product !== "object" || Array.isArray(product)) return adminJson({ error: "Invalid product data." }, 400);
  const slug = typeof product.slug === "string" ? product.slug.trim() : "";
  if (!SLUG.test(slug)) return adminJson({ error: "Product slug must use lowercase letters, numbers and hyphens." }, 400);
  if (typeof product.name !== "string" || !product.name.trim()) return adminJson({ error: "Product name is required." }, 400);
  if (!["cart", "quote"].includes(product.purchaseType)) return adminJson({ error: "Purchase type must be cart or quote." }, 400);
  if (product.stockStatus !== undefined && !["pending", "in-stock", "out-of-stock"].includes(product.stockStatus)) return adminJson({ error: "Invalid stock status." }, 400);
  if (product.price !== undefined && product.price !== null && !["string", "number"].includes(typeof product.price)) return adminJson({ error: "Price must be a number, text value or null." }, 400);

  const now = new Date().toISOString();
  const actor = auth.email || null;
  const json = JSON.stringify(product);
  try {
    let row = await env.DB.prepare("SELECT id FROM cms_products WHERE product_slug = ? LIMIT 1").bind(slug).first();
    if (!row) {
      const id = crypto.randomUUID();
      const versionId = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare("INSERT INTO cms_products (id, product_slug, updated_at) VALUES (?, ?, ?)").bind(id, slug, now),
        env.DB.prepare("INSERT INTO cms_product_versions (id, product_id, version_number, state, product_json, created_by, change_note) VALUES (?, ?, 1, 'draft', ?, ?, 'Initial product draft')").bind(versionId, id, json, actor),
        env.DB.prepare("INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'create_draft', 'product', ?, ?)").bind(crypto.randomUUID(), actor, id, JSON.stringify({ slug }))
      ]);
      return adminJson({ ok: true, productId: id, draftId: versionId, version: 1 }, 201);
    }

    const draft = await env.DB.prepare("SELECT id, version_number FROM cms_product_versions WHERE product_id = ? AND state = 'draft' LIMIT 1").bind(row.id).first();
    if (draft) {
      await env.DB.batch([
        env.DB.prepare("UPDATE cms_product_versions SET product_json = ?, created_by = ?, created_at = ?, change_note = 'Updated product draft' WHERE id = ? AND state = 'draft'").bind(json, actor, now, draft.id),
        env.DB.prepare("UPDATE cms_products SET updated_at = ? WHERE id = ?").bind(now, row.id),
        env.DB.prepare("INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'update_draft', 'product', ?, ?)").bind(crypto.randomUUID(), actor, row.id, JSON.stringify({ version: draft.version_number }))
      ]);
      return adminJson({ ok: true, productId: row.id, draftId: draft.id, version: draft.version_number });
    }
    const latest = await env.DB.prepare("SELECT COALESCE(MAX(version_number), 0) AS version FROM cms_product_versions WHERE product_id = ?").bind(row.id).first();
    const version = Number(latest?.version || 0) + 1;
    const versionId = crypto.randomUUID();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO cms_product_versions (id, product_id, version_number, state, product_json, created_by, change_note) VALUES (?, ?, ?, 'draft', ?, ?, 'New product draft')").bind(versionId, row.id, version, json, actor),
      env.DB.prepare("UPDATE cms_products SET updated_at = ? WHERE id = ?").bind(now, row.id),
      env.DB.prepare("INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'create_draft', 'product', ?, ?)").bind(crypto.randomUUID(), actor, row.id, JSON.stringify({ version }))
    ]);
    return adminJson({ ok: true, productId: row.id, draftId: versionId, version }, 201);
  } catch (error) {
    console.error("CMS product draft save failed", error);
    return adminJson({ error: "Unable to save product draft. Check the CMS migration and product data." }, 500);
  }
}
