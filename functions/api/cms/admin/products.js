import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";
import { validateProductContent } from "../../../_utils/cms-content-validation.js";

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
        d.id AS draft_id, d.version_number AS draft_version, d.created_at AS draft_created_at, d.product_json AS draft_product,
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

  let payload;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) return adminJson({ error: "Product data is too large." }, 413);
    payload = JSON.parse(raw);
  } catch { return adminJson({ error: "Invalid JSON body." }, 400); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return adminJson({ error: "Invalid product data." }, 400);
  const product = payload.product && typeof payload.product === "object" && !Array.isArray(payload.product)
    ? payload.product
    : payload;
  const expectedDraftId = Object.prototype.hasOwnProperty.call(payload, "expectedDraftId")
    ? payload.expectedDraftId
    : null;
  const expectedDraftCreatedAt = Object.prototype.hasOwnProperty.call(payload, "expectedDraftCreatedAt")
    ? payload.expectedDraftCreatedAt
    : null;
  if ((expectedDraftId !== null && (typeof expectedDraftId !== "string" || expectedDraftId.length > 80)) ||
      (expectedDraftCreatedAt !== null && (typeof expectedDraftCreatedAt !== "string" || expectedDraftCreatedAt.length > 64)) ||
      (expectedDraftId && !expectedDraftCreatedAt)) {
    return adminJson({ error: "Invalid expected draft snapshot." }, 400);
  }
  const slug = typeof product.slug === "string" ? product.slug.trim() : "";
  if (!SLUG.test(slug)) return adminJson({ error: "Product slug must use lowercase letters, numbers and hyphens." }, 400);
  if (typeof product.name !== "string" || !product.name.trim()) return adminJson({ error: "Product name is required." }, 400);
  if (!["cart", "quote"].includes(product.purchaseType)) return adminJson({ error: "Purchase type must be cart or quote." }, 400);
  if (product.requestFlow !== undefined && !["cart", "quotation", "dental_chair", "chair-consultation", "cart-quotation", "quote"].includes(product.requestFlow)) {
    return adminJson({ error: "Request flow must be cart, quotation or dental_chair." }, 400);
  }
  const confirmedChairSlugs = new Set([
    "cingol-x1", "cingol-x3", "cingol-x5",
    "mocom-f10", "mocom-m10", "mocom-v10",
    "signo-g10ii", "signo-g20", "signo-t100", "signo-t500", "signo-z300",
  ]);
  if (confirmedChairSlugs.has(slug.toLowerCase()) && product.requestFlow !== undefined &&
      !["dental_chair", "chair-consultation"].includes(product.requestFlow)) {
    return adminJson({ error: "Confirmed dental chair models must use the Dental Chair Request flow." }, 400);
  }
  if (confirmedChairSlugs.has(slug.toLowerCase())) product.requestFlow = "dental_chair";
  const contentError = validateProductContent(product);
  if (contentError) return adminJson({ error: contentError }, 400);
  if (product.stockStatus !== undefined && !["pending", "in-stock", "out-of-stock"].includes(product.stockStatus)) return adminJson({ error: "Invalid stock status." }, 400);
  if (
    product.price !== undefined &&
    product.price !== null &&
    !["string", "number"].includes(typeof product.price)
  ) {
    return adminJson(
      { error: "Price must be a number, text value or null." },
      400
    );
  }

  const now = new Date().toISOString();
  const actor = auth.email || null;
  const json = JSON.stringify(product);
  let conflictSnapshot = null;
  try {
    let row = await env.DB.prepare("SELECT id FROM cms_products WHERE product_slug = ? LIMIT 1").bind(slug).first();
    if (!row) {
      if (expectedDraftId || expectedDraftCreatedAt) return adminJson({ error: "The product changed or was removed. Reload the product list before saving." }, 409);
      const id = crypto.randomUUID();
      const versionId = crypto.randomUUID();
      const results = await env.DB.batch([
        env.DB.prepare("INSERT INTO cms_products (id, product_slug, updated_at) VALUES (?, ?, ?)").bind(id, slug, now),
        env.DB.prepare(
          "INSERT INTO cms_product_versions (id, product_id, version_number, state, product_json, created_by, change_note, created_at) VALUES (?, ?, 1, 'draft', ?, ?, 'Initial product draft', ?)"
        ).bind(versionId, id, json, actor, now),
        env.DB.prepare(
          "INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) VALUES (?, ?, 'create_draft', 'product', ?, ?)"
        ).bind(crypto.randomUUID(), actor, id, JSON.stringify({ slug }))
      ]);
      if (Number(results?.[0]?.meta?.changes || 0) !== 1 || Number(results?.[1]?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "The new product record or draft could not be confirmed. Reload the product list and inspect the item before retrying." }, 500);
      }
      if (Number(results?.[2]?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "The new product and draft may have been created, but the audit record could not be confirmed. Reload the product list and inspect the item before retrying." }, 500);
      }
      return adminJson({ ok: true, auditRecorded: true, productId: id, draftId: versionId, draftCreatedAt: now, version: 1 }, 201);
    }

    const draft = await env.DB.prepare("SELECT id, version_number, created_at, product_json FROM cms_product_versions WHERE product_id = ? AND state = 'draft' LIMIT 1").bind(row.id).first();
    conflictSnapshot = { productId: row.id, expectedDraftId, expectedDraftCreatedAt };
    if ((draft?.id || null) !== expectedDraftId || (draft?.created_at || null) !== expectedDraftCreatedAt) {
      return adminJson({ error: "This product draft changed in another session. Reload it before saving again." }, 409);
    }
    if (draft) {
      const results = await env.DB.batch([
        env.DB.prepare(
          "UPDATE cms_product_versions SET product_json = ?, created_by = ?, created_at = ?, change_note = 'Updated product draft' WHERE id = ? AND state = 'draft' AND created_at = ? AND product_json = ?"
        ).bind(json, actor, now, draft.id, draft.created_at, draft.product_json),
        env.DB.prepare("UPDATE cms_products SET updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM cms_product_versions WHERE id = ? AND state = 'draft' AND created_at = ? AND product_json = ?)").bind(now, row.id, draft.id, now, json),
        env.DB.prepare(
          "INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json) SELECT ?, ?, CASE WHEN changes() = 1 THEN 'update_draft' END, 'product', ?, ?"
        ).bind(crypto.randomUUID(), actor, row.id, JSON.stringify({ version: draft.version_number }))
      ]);
      if (Number(results?.[0]?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "This product draft changed in another session. Reload it before saving again." }, 409);
      }
      if (Number(results?.[1]?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "The product record update could not be confirmed. Reload the product and inspect its draft before retrying." }, 500);
      }
      if (Number(results?.[2]?.meta?.changes || 0) !== 1) {
        return adminJson({ error: "The product draft audit record could not be confirmed. Reload the product before retrying; the draft update may have been applied." }, 500);
      }
      return adminJson({ ok: true, auditRecorded: true, productId: row.id, draftId: draft.id, draftCreatedAt: now, version: draft.version_number });
    }
    const latest = await env.DB.prepare("SELECT COALESCE(MAX(version_number), 0) AS version FROM cms_product_versions WHERE product_id = ?").bind(row.id).first();
    const version = Number(latest?.version || 0) + 1;
    const versionId = crypto.randomUUID();
    const results = await env.DB.batch([
      env.DB.prepare("UPDATE cms_product_versions SET state = state WHERE product_id = ? AND state = 'draft'").bind(row.id),
      env.DB.prepare(`
        INSERT INTO cms_product_versions (id, product_id, version_number, state, product_json, created_by, change_note, created_at)
        SELECT ?, ?, ?, 'draft', ?, ?, 'New product draft', ?
        WHERE changes() = 0
      `).bind(versionId, row.id, version, json, actor, now),
      env.DB.prepare("UPDATE cms_products SET updated_at = ? WHERE id = ? AND changes() = 1").bind(now, row.id),
      env.DB.prepare(`
        INSERT INTO cms_audit_log (id, actor_email, action, entity_type, entity_id, metadata_json)
        SELECT ?, ?, CASE WHEN changes() = 1 THEN 'create_draft' END, 'product', ?, ?
      `).bind(crypto.randomUUID(), actor, row.id, JSON.stringify({ version }))
    ]);
    if (Number(results?.[1]?.meta?.changes || 0) !== 1) {
      return adminJson({ error: "A product draft was created in another session. Reload the product before saving again." }, 409);
    }
    if (Number(results?.[3]?.meta?.changes || 0) !== 1) {
      return adminJson({ error: "The new product draft audit record could not be confirmed. Reload the product list before retrying; the draft may have been created." }, 500);
    }
    return adminJson({ ok: true, productId: row.id, draftId: versionId, draftCreatedAt: now, version }, 201);
  } catch (error) {
    console.error("CMS product draft save failed", error);
    if (
      conflictSnapshot &&
      typeof error?.message === "string" &&
      /NOT NULL constraint failed:\s*cms_audit_log\.action/i.test(error.message)
    ) {
      try {
        const latestDraft = await env.DB.prepare(`
          SELECT id, created_at
          FROM cms_product_versions
          WHERE product_id = ? AND state = 'draft'
          LIMIT 1
        `).bind(conflictSnapshot.productId).first();
        if (
          (latestDraft?.id || null) !== conflictSnapshot.expectedDraftId ||
          (latestDraft?.created_at || null) !== conflictSnapshot.expectedDraftCreatedAt
        ) {
          return adminJson({ error: "This product draft changed in another session. Reload it before saving again." }, 409);
        }
      } catch (verificationError) {
        console.error("CMS product draft conflict verification failed", verificationError);
      }
    }
    return adminJson({ error: "Unable to save product draft. Check the CMS migration and product data." }, 500);
  }
}
