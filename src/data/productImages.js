export function isApprovedProductImage(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  const image = value.trim();
  if (image.startsWith("/catalog/") && !image.includes("..") && !image.includes("\\")) return true;
  try {
    const url = new URL(image);
    return url.protocol === "https:" && url.hostname.endsWith(".r2.dev");
  } catch {
    return false;
  }
}

export function mergePublishedProduct(catalogueProduct, publishedProduct) {
  const base = catalogueProduct && typeof catalogueProduct === "object" ? catalogueProduct : {};
  const published = publishedProduct && typeof publishedProduct === "object" ? publishedProduct : {};
  const image = isApprovedProductImage(published.img)
    ? published.img
    : isApprovedProductImage(base.img) ? base.img : "";
  return { ...base, ...published, img: image };
}
