export function matchesProductSearch(product, query) {
  const term = String(query ?? "").trim().toLowerCase();
  if (!term) return true;

  const searchableText = [
    product?.name,
    product?.brand,
    product?.category,
    product?.brandLine,
    product?.summary,
    product?.slug,
  ]
    .filter((value) => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return searchableText.includes(term);
}
