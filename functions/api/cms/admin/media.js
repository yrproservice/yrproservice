import { adminJson, requireAdmin } from "../../../_utils/admin-auth.js";

function safeName(value) {
  return String(value || "upload").normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(-100) || "upload";
}
export async function onRequestGet(context) {
  const auth = await requireAdmin(context);
  if (!auth.ok) return auth.response;
  if (!context.env.DB) return adminJson({ error: "CMS database is not configured." }, 503);
  try {
    const rows = await context.env.DB.prepare("SELECT id, storage_provider, object_key, public_url, original_file_name, mime_type, byte_size, width, height, alt_text, created_at FROM cms_media WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 300").all();
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
  if (!file.type?.startsWith("image/")) return adminJson({ error: "Only image files are accepted." }, 415);
  if (file.size > 12 * 1024 * 1024) return adminJson({ error: "Image must be 12 MB or smaller." }, 413);
  const id = crypto.randomUUID(), key = `cms/${new Date().toISOString().slice(0,10)}/${id}-${safeName(file.name)}`;
  try {
    await env.CMS_MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
    const publicBase = String(env.CMS_MEDIA_PUBLIC_BASE || "").replace(/\/$/, "");
    if (!publicBase) {
      await env.CMS_MEDIA.delete(key);
      return adminJson({ error: "Set CMS_MEDIA_PUBLIC_BASE to the public URL of the Preview R2 bucket before uploading." }, 503);
    }
    const url = `${publicBase}/${key.split("/").map(encodeURIComponent).join("/")}`;
    const alt = String(form.get("altText") || "").slice(0,300);
    await env.DB.prepare("INSERT INTO cms_media (id,storage_provider,object_key,public_url,original_file_name,mime_type,byte_size,alt_text,uploaded_by) VALUES (?,'r2',?,?,?,?,?,?,?)")
      .bind(id,key,url,file.name,file.type,file.size,alt,auth.email || null).run();
    return adminJson({ ok: true, media: { id, object_key:key, public_url:url, original_file_name:file.name, mime_type:file.type, byte_size:file.size, alt_text:alt } }, 201);
  } catch (error) {
    console.error("CMS media upload failed", error);
    try { await env.CMS_MEDIA.delete(key); } catch {}
    return adminJson({ error: "Unable to store this image in Preview media storage." }, 500);
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
    const row = await env.DB.prepare("SELECT id, storage_provider, object_key FROM cms_media WHERE id=? AND deleted_at IS NULL").bind(id).first();
    if (!row) return adminJson({ error: "Media item not found." }, 404);
    if (row.storage_provider === "r2" && env.CMS_MEDIA) await env.CMS_MEDIA.delete(row.object_key);
    await env.DB.prepare("UPDATE cms_media SET deleted_at=? WHERE id=?").bind(new Date().toISOString(),id).run();
    return adminJson({ ok: true });
  } catch (error) {
    console.error("CMS media delete failed", error);
    return adminJson({ error: "Unable to remove this media item." }, 500);
  }
}
