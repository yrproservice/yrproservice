import { validateProductMediaReferences } from "./cms-product-media-validation.js";

function collectPageImageUrls(content) {
  const urls = new Set();
  const add = (value) => {
    if (typeof value === "string" && /^https:\/\//i.test(value)) urls.add(value);
  };

  for (const section of Array.isArray(content?.sections) ? content.sections : []) {
    const data = section?.content;
    if (!data || typeof data !== "object" || Array.isArray(data)) continue;

    add(data.imageUrl);
    add(data.hero?.imageUrl);

    if (section.type === "brand-grid" && Array.isArray(data.items)) {
      for (const item of data.items) add(item?.url);
    }
    if (section.type === "team-page" && Array.isArray(data.people?.items)) {
      for (const person of data.people.items) add(person?.image);
    }
  }

  return [...urls];
}

/**
 * Verify every HTTPS image URL in supported page image fields. External
 * manufacturer/brand images remain permitted; R2-hosted URLs must resolve to
 * one active media record and an existing object in this environment.
 * Local /catalog and /assets paths are intentionally unaffected.
 */
export async function validatePageMediaReferences(db, env, content) {
  const urls = collectPageImageUrls(content);
  for (const url of urls) {
    let parsed;
    try { parsed = new URL(url); } catch { continue; }
    if (!parsed.hostname.endsWith(".r2.dev")) continue;
    const error = await validateProductMediaReferences(db, env, { img: url });
    if (error) return error;
  }
  return null;
}
