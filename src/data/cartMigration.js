import { isDentalChairProduct } from "./productWorkflow";

export function normalizeStoredQuantity(value) {
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1;
}

export function mergeLegacyChairRequests(existingItems, legacyChairItems) {
  const migrated = existingItems
    .filter((item) => item && typeof item === "object" && isDentalChairProduct(item))
    .map((item) => ({ ...item, quantity: normalizeStoredQuantity(item.quantity) }));

  const legacyBySlug = new Map();
  for (const chair of legacyChairItems) {
    if (!chair || typeof chair !== "object" || !isDentalChairProduct(chair)) continue;
    const slug = String(chair.slug || "");
    if (!slug) continue;
    legacyBySlug.set(
      slug,
      (legacyBySlug.get(slug) || 0) + normalizeStoredQuantity(chair.quantity)
    );
  }

  for (const [slug, legacyQuantity] of legacyBySlug) {
    const found = migrated.find((item) => item.slug === slug);
    if (!found) {
      const source = legacyChairItems.find((item) => item?.slug === slug && isDentalChairProduct(item));
      migrated.push({
        ...source,
        quantity: legacyQuantity,
        legacyCartMigratedQuantity: legacyQuantity,
      });
      continue;
    }

    const alreadyMigrated = Number(found.legacyCartMigratedQuantity);
    if (Number.isSafeInteger(alreadyMigrated) && alreadyMigrated >= 0) {
      found.quantity = normalizeStoredQuantity(found.quantity) + Math.max(0, legacyQuantity - alreadyMigrated);
    } else {
      found.quantity = normalizeStoredQuantity(found.quantity) + legacyQuantity;
    }
    found.legacyCartMigratedQuantity = legacyQuantity;
  }

  return migrated;
}

/**
 * Move legacy chair items into their dedicated store before the normal cart
 * is rewritten. If the second write fails, the original cart remains intact;
 * the marker makes a retry safe after the destination write has succeeded.
 */
export function migrateLegacyChairStorage(storage, cartItems, legacyChairItems) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
    throw new Error("Browser storage is unavailable.");
  }

  const raw = storage.getItem("yr-chair-requests") || "[]";
  const existing = JSON.parse(raw);
  if (!Array.isArray(existing)) {
    throw new Error("The saved dental chair request list is not a valid list.");
  }

  const migrated = mergeLegacyChairRequests(existing, legacyChairItems);
  storage.setItem("yr-chair-requests", JSON.stringify(migrated));
  storage.setItem("yr-cart", JSON.stringify(cartItems));
  return migrated;
}
