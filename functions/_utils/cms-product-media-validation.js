const R2_HOST_SUFFIX = ".r2.dev";

function isR2PublicUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(R2_HOST_SUFFIX);
  } catch {
    return false;
  }
}

function collectProductR2Images(product) {
  const values = [];
  if (typeof product.img === "string" && isR2PublicUrl(product.img)) values.push(product.img);
  for (const image of Array.isArray(product.gallery) ? product.gallery : []) {
    if (image && typeof image.url === "string" && isR2PublicUrl(image.url)) values.push(image.url);
  }
  return [...new Set(values)];
}

function canonicalMediaUrl(publicBase, objectKey) {
  return publicBase.replace(/\/$/, "") + "/" +
    objectKey.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

/**
 * Verify every CMS-hosted product image against an active media record in
 * this environment and the corresponding R2 object. Static /catalog assets
 * are deliberately left to the static asset pipeline.
 */
export async function validateProductMediaReferences(db, env, product) {
  const urls = collectProductR2Images(product);
  if (!urls.length) return null;

  if (!env.CMS_MEDIA || !env.CMS_MEDIA_PUBLIC_BASE) {
    return "CMS media storage is not configured for this environment. Product images cannot be verified for publishing.";
  }

  let base;
  try {
    base = new URL(String(env.CMS_MEDIA_PUBLIC_BASE).replace(/\/$/, ""));
    if (base.protocol !== "https:" || !base.hostname.endsWith(R2_HOST_SUFFIX) ||
        base.search || base.hash) throw new Error("Invalid media base");
  } catch {
    return "The configured CMS media public base is invalid. Product images cannot be verified for publishing.";
  }

  for (const value of urls) {
    let image;
    try { image = new URL(value); } catch {
      return "A CMS product image has an invalid media URL.";
    }
    if (image.origin !== base.origin || image.search || image.hash ||
        !image.pathname.startsWith(base.pathname.replace(/\/$/, "") + "/")) {
      return "A product image does not belong to this environment's configured CMS media bucket.";
    }
  }

  const placeholders = urls.map(() => "?").join(", ");
  let result;
  try {
    result = await db.prepare(`
      SELECT id, storage_provider, object_key, public_url, byte_size, deleted_at
      FROM cms_media
      WHERE public_url IN (${placeholders})
    `).bind(...urls).all();
  } catch (error) {
    console.error("CMS product media record verification failed", error);
    return "CMS media records could not be verified. Publishing was stopped.";
  }

  const rows = result.results || [];
  const byUrl = new Map();
  for (const row of rows) {
    if (!byUrl.has(row.public_url)) byUrl.set(row.public_url, []);
    byUrl.get(row.public_url).push(row);
  }

  const objects = [];
  for (const value of urls) {
    const matches = byUrl.get(value) || [];
    if (matches.length !== 1) {
      return "A product image is not registered as a unique CMS media item in this environment.";
    }
    const media = matches[0];
    if (media.storage_provider !== "r2" || media.deleted_at) {
      return "A product image is archived or is not an active CMS R2 media item.";
    }
    if (typeof media.object_key !== "string" || !media.object_key.startsWith("cms/") ||
        canonicalMediaUrl(String(env.CMS_MEDIA_PUBLIC_BASE).replace(/\/$/, ""), media.object_key) !== value) {
      return "A product image does not match its registered CMS media storage key.";
    }
    objects.push({ media, value });
  }

  try {
    const checks = await Promise.all(objects.map(({ media }) => env.CMS_MEDIA.head(media.object_key)));
    for (let index = 0; index < checks.length; index += 1) {
      if (!checks[index]) {
        return "A product image is missing from CMS media storage. Restore or upload the image before publishing.";
      }
      if (Number.isFinite(Number(objects[index].media.byte_size)) &&
          Number(checks[index].size) !== Number(objects[index].media.byte_size)) {
        return "A product image's stored size does not match its CMS media record. Inspect the media item before publishing.";
      }
    }
  } catch (error) {
    console.error("CMS product R2 object verification failed", error);
    return "CMS media storage could not confirm every product image. Publishing was stopped; try again when storage is available.";
  }

  return null;
}
