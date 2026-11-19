import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";
import { detectImageDimensions, detectImageMime } from "../../../_utils/image-validation.js";

function safeName(value) {
  return String(value || "upload").normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-100) || "upload";
}

async function getMediaUsage(db, media) {
  const [pages, products, settings, pageCount, productCount, settingCount] = await Promise.all([
    db.prepare(`
      SELECT p.page_key AS key, COALESCE(v.title, p.title) AS title,
        v.content_json, v.version_number AS version, v.state, v.created_at
      FROM cms_page_versions v
      JOIN cms_pages p ON p.id = v.page_id
      WHERE instr(v.content_json, ?) > 0
      ORDER BY v.created_at DESC LIMIT 50
    `).bind(media.public_url).all(),
    db.prepare(`
      SELECT p.product_slug AS key,
        COALESCE(json_extract(v.product_json, '$.name'), p.product_slug) AS title,
        v.product_json, v.version_number AS version, v.state, v.created_at
      FROM cms_product_versions v
      JOIN cms_products p ON p.id = v.product_id
      WHERE instr(v.product_json, ?) > 0
      ORDER BY v.created_at DESC LIMIT 50
    `).bind(media.public_url).all(),
    db.prepare(`
      SELECT v.setting_key AS key, v.setting_key AS title,
        v.value_json, v.version_number AS version, v.state, v.created_at
      FROM cms_site_setting_versions v
      WHERE instr(v.value_json, ?) > 0
      ORDER BY v.created_at DESC LIMIT 50
    `).bind(media.public_url).all(),
    db.prepare("SELECT COUNT(*) AS total FROM cms_page_versions WHERE instr(content_json, ?) > 0").bind(media.public_url).first(),
    db.prepare("SELECT COUNT(*) AS total FROM cms_product_versions WHERE instr(product_json, ?) > 0").bind(media.public_url).first(),
    db.prepare("SELECT COUNT(*) AS total FROM cms_site_setting_versions WHERE instr(value_json, ?) > 0").bind(media.public_url).first(),
  ]);
  const productsWithImageLocations = (products.results || []).map((row) => {
    let product = null;
    try { product = JSON.parse(row.product_json || "{}"); } catch {}
    const references = [];
    const visit = (value, path = "$") => {
      if (typeof value === "string") {
        if (value === media.public_url) references.push(path);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((entry, index) => visit(entry, path + "[" + index + "]"));
        return;
      }
      if (value && typeof value === "object") {
        Object.entries(value).forEach(([key, entry]) => visit(entry, path + "." + key));
      }
    };
    visit(product);
    return { ...row, product_json: undefined, references };
  });
  const pagesWithImageLocations = (pages.results || []).map((row) => {
    let page = null;
    try { page = JSON.parse(row.content_json || "{}"); } catch {}
    const references = [];
    const visit = (value, path = "$") => {
      if (typeof value === "string") {
        if (value === media.public_url) references.push(path);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach((entry, index) => visit(entry, path + "[" + index + "]"));
        return;
      }
      if (value && typeof value === "object") {
        Object.entries(value).forEach(([key, entry]) => visit(entry, path + "." + key));
      }
    };
    visit(page);
    return { ...row, content_json: undefined, references };
  });
  const settingsWithImageLocations = (settings.results || []).map((row) => {
    let value = null;
    try { value = JSON.parse(row.value_json || "null"); } catch {}
    const references = [];
    const visit = (entry, path = "$") => {
      if (typeof entry === "string") {
        if (entry === media.public_url) references.push(path);
        return;
      }
      if (Array.isArray(entry)) {
        entry.forEach((child, index) => visit(child, path + "[" + index + "]"));
        return;
      }
      if (entry && typeof entry === "object") {
        Object.entries(entry).forEach(([key, child]) => visit(child, path + "." + key));
      }
    };
    visit(value);
    return { ...row, value_json: undefined, references };
  });
  const groups = {
    pages: pagesWithImageLocations,
    products: productsWithImageLocations,
    settings: settingsWithImageLocations,
  };
  const counts = {
    pages: Number(pageCount?.total || 0),
    products: Number(productCount?.total || 0),
    settings: Number(settingCount?.total || 0),
  };
  return {
    groups,
    counts,
    total: counts.pages + counts.products + counts.settings,
    truncated: Object.keys(groups).some((key) => counts[key] > groups[key].length),
  };
}

export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  if (!context.env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  const requestedId = new URL(context.request.url).searchParams.get("id");
  if (requestedId) {
    try {
      const media = await context.env.DB.prepare(
        "SELECT id, public_url, original_file_name, mime_type, byte_size, width, height, alt_text, created_at FROM cms_media WHERE id=? AND deleted_at IS NULL"
      ).bind(requestedId).first();
      if (!media) return adminJson({ error: "Media item not found." }, 404);
      const usage = await getMediaUsage(context.env.DB, media);
      return adminJson({ ok: true, media, usage });
    } catch (error) {
      console.error("CMS media usage lookup failed", error);
      return adminJson({ error: "Unable to load image usage information." }, 500);
    }
  }
  try {
    const rows = await context.env.DB.prepare(`
      SELECT
        id,
        storage_provider,
        object_key,
        public_url,
        original_file_name,
        mime_type,
        byte_size,
        width,
        height,
        alt_text,
        created_at
      FROM cms_media
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 300
    `).all();
    return adminJson({ ok: true, media: rows.results || [], storageReady: Boolean(context.env.CMS_MEDIA) });
  } catch (error) {
    console.error("CMS media list failed", error);
    return adminJson({ error: "Unable to load media library." }, 500);
  }
}
export async function onRequestPost(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  if (!env.CMS_MEDIA) return adminJson({ error: "Preview media storage is not connected yet. Add the CMS_MEDIA R2 binding to the Preview environment before uploading." }, 503);
  let form;
  try { form = await request.formData(); } catch { return adminJson({ error: "Upload a multipart form." }, 400); }
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") return adminJson({ error: "Choose an image file." }, 400);
  if (file.size <= 0) return adminJson({ error: "The selected image is empty." }, 400);
  if (file.size > 12 * 1024 * 1024) return adminJson({ error: "Image must be 12 MB or smaller." }, 413);
  let bytes;
  try { bytes = new Uint8Array(await file.arrayBuffer()); }
  catch { return adminJson({ error: "Unable to read the selected image." }, 400); }
  const contentType = detectImageMime(bytes);
  if (!contentType) return adminJson({ error: "Unsupported image format. Upload a valid JPEG, PNG, GIF or WebP image. SVG and other active or unverified formats are not accepted." }, 415);
  const dimensions = detectImageDimensions(bytes, contentType);
  const declaredType = String(file.type || "").toLowerCase();
  if (declaredType && declaredType !== contentType && !(declaredType === "image/jpg" && contentType === "image/jpeg")) {
    return adminJson({ error: "The file contents do not match the selected image type." }, 415);
  }
  const id = crypto.randomUUID(), key = `cms/${new Date().toISOString().slice(0,10)}/${id}-${safeName(file.name)}`;
  try {
    await env.CMS_MEDIA.put(key, bytes, { httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" } });
    const publicBase = String(env.CMS_MEDIA_PUBLIC_BASE || "").replace(/\/$/, "");
    if (!publicBase) {
      await env.CMS_MEDIA.delete(key);
      return adminJson({ error: "Set CMS_MEDIA_PUBLIC_BASE to the public URL of the Preview R2 bucket before uploading." }, 503);
    }
    const url = `${publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`;
    const alt = String(form.get("altText") || "").slice(0,300);
    await env.DB.prepare("INSERT INTO cms_media (id,storage_provider,object_key,public_url,original_file_name,mime_type,byte_size,width,height,alt_text,uploaded_by) VALUES (?,'r2',?,?,?,?,?,?,?,?,?)")
      .bind(id,key,url,file.name,contentType,file.size,dimensions?.width || null,dimensions?.height || null,alt,auth.email || null).run();
    return adminJson({ ok: true, media: { id, object_key:key, public_url:url, original_file_name:file.name, mime_type:contentType, byte_size:file.size, width:dimensions?.width || null, height:dimensions?.height || null, alt_text:alt } }, 201);
  } catch (error) {
    console.error("CMS media upload failed", error);
    try { await env.CMS_MEDIA.delete(key); } catch {}
    return adminJson({ error: "Unable to store this image in Preview media storage." }, 500);
  }
}
export async function onRequestPatch(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return adminJson({ error: "Media ID is required." }, 400);
  let body;
  try { body = await request.json(); } catch { return adminJson({ error: "Send valid JSON." }, 400); }
  if (typeof body.altText !== "string" || body.altText.length > 300) {
    return adminJson({ error: "Alt text must be a string of 300 characters or fewer." }, 400);
  }
  try {
    const result = await env.DB.prepare(
      "UPDATE cms_media SET alt_text=? WHERE id=? AND deleted_at IS NULL"
    ).bind(body.altText.trim(), id).run();
    if (result?.meta?.changes === 0) {
      const existing = await env.DB.prepare("SELECT id FROM cms_media WHERE id=? AND deleted_at IS NULL").bind(id).first();
      if (!existing) return adminJson({ error: "Media item not found." }, 404);
    }
    const media = await env.DB.prepare(
      "SELECT id, public_url, original_file_name, mime_type, byte_size, width, height, alt_text, created_at FROM cms_media WHERE id=? AND deleted_at IS NULL"
    ).bind(id).first();
    return adminJson({ ok: true, media });
  } catch (error) {
    console.error("CMS media metadata update failed", error);
    return adminJson({ error: "Unable to update image metadata." }, 500);
  }
}

export async function onRequestDelete(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  const { env, request } = context;
  if (!env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return adminJson({ error: "Media ID is required." }, 400);
  try {
    const row = await env.DB.prepare("SELECT id, storage_provider, object_key, public_url FROM cms_media WHERE id=? AND deleted_at IS NULL").bind(id).first();
    if (!row) return adminJson({ error: "Media item not found." }, 404);
    const references = await Promise.all([
      env.DB.prepare("SELECT id FROM cms_product_versions WHERE instr(product_json, ?) > 0 LIMIT 1").bind(row.public_url).first(),
      env.DB.prepare("SELECT id FROM cms_page_versions WHERE instr(content_json, ?) > 0 LIMIT 1").bind(row.public_url).first(),
      env.DB.prepare("SELECT id FROM cms_site_setting_versions WHERE instr(value_json, ?) > 0 LIMIT 1").bind(row.public_url).first(),
    ]);
    if (references.some(Boolean)) {
      return adminJson({ error: "This image is referenced by saved CMS content or revision history. Replace those references first; the media file has been kept." }, 409);
    }
    if (row.storage_provider === "r2" && !env.CMS_MEDIA) {
      return adminJson({ error: "Preview R2 storage is unavailable. The media record has been kept." }, 503);
    }
    const deletedAt = new Date().toISOString();
    const softDelete = await env.DB.prepare(
      "UPDATE cms_media SET deleted_at=? WHERE id=? AND deleted_at IS NULL"
    ).bind(deletedAt, id).run();
    if (softDelete?.meta?.changes === 0) {
      return adminJson({ error: "This media item has already been removed." }, 409);
    }
    if (row.storage_provider === "r2") {
      try {
        await env.CMS_MEDIA.delete(row.object_key);
      } catch (storageError) {
        try {
          await env.DB.prepare(
            "UPDATE cms_media SET deleted_at=NULL WHERE id=? AND deleted_at=?"
          ).bind(id, deletedAt).run();
        } catch (rollbackError) {
          console.error("CMS media delete rollback failed; record remains soft-deleted", rollbackError);
        }
        throw storageError;
      }
    }
    return adminJson({ ok: true });
  } catch (error) {
    console.error("CMS media delete failed", error);
    return adminJson({ error: "Unable to remove this media item." }, 500);
  }
}
