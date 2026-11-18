import { products as catalogueProducts } from "./products";
import { mergePublishedProduct } from "./productImages";

export function mergePublishedCatalogue(data, fallback = catalogueProducts) {
  if (!data?.ok || !Array.isArray(data.products)) return fallback;

  const published = data.products.filter((item) =>
    item && typeof item === "object" && !Array.isArray(item) &&
    typeof item.slug === "string" && item.slug
  );
  const overrides = new Map(published.map((item) => [item.slug, item]));
  const archived = new Set(
    Array.isArray(data.archivedSlugs)
      ? data.archivedSlugs.filter((slug) => typeof slug === "string")
      : []
  );
  const known = new Set(fallback.map((item) => item.slug));

  return [
    ...fallback
      .filter((item) => !archived.has(item.slug))
      .map((item) => overrides.has(item.slug)
        ? mergePublishedProduct(item, overrides.get(item.slug))
        : item),
    ...published
      .filter((item) => !known.has(item.slug))
      .map((item) => mergePublishedProduct(null, item)),
  ];
}

export async function loadPublishedCatalogue() {
  try {
    const response = await fetch("/api/cms/public/products", { cache: "no-store" });
    if (!response.ok) return catalogueProducts;
    const data = await response.json();
    return mergePublishedCatalogue(data);
  } catch {
    return catalogueProducts;
  }
}
