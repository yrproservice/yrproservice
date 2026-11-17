const MAX_ITEMS = 12;
const MAX_LABEL = 60;
const MAX_ROUTE = 180;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validInternalRoute(value) {
  return typeof value === "string" &&
    value.length <= MAX_ROUTE &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\?#]/.test(value) &&
    !/[\u0000-\u001f]/.test(value);
}

function validLinks(items, { allowServicesType = false } = {}) {
  if (!Array.isArray(items) || items.length < 1 || items.length > MAX_ITEMS) return false;
  return items.every((item) =>
    isRecord(item) &&
    typeof item.label === "string" &&
    item.label.trim().length > 0 &&
    item.label.trim().length <= MAX_LABEL &&
    validInternalRoute(item.url) &&
    (item.visible === undefined || typeof item.visible === "boolean") &&
    (!allowServicesType || item.type === undefined || item.type === "services")
  );
}

export function validateSiteSetting(key, value) {
  if (key === "site.navigation") {
    if (!isRecord(value) || !validLinks(value.items, { allowServicesType: true })) {
      return "Navigation must contain 1–12 items with a label and safe internal URL.";
    }
    if (!value.items.some((item) => item.visible !== false)) {
      return "At least one navigation item must remain visible.";
    }
    return null;
  }

  if (key === "site.footer") {
    if (!isRecord(value)) return "Footer settings must be a JSON object.";
    for (const field of ["companyName", "description", "contactPhone", "contactEmail", "copyright"]) {
      if (value[field] !== undefined &&
          (typeof value[field] !== "string" || value[field].length > 500)) {
        return "Footer field \"" + field + "\" must be text no longer than 500 characters.";
      }
    }
    if (value.links !== undefined && !validLinks(value.links)) {
      return "Footer links must contain 1–12 items with a label and safe internal URL.";
    }
    if (value.contactPhoneHref !== undefined &&
        (typeof value.contactPhoneHref !== "string" ||
         !/^tel:[+0-9(). -]{3,40}$/.test(value.contactPhoneHref))) {
      return "Footer phone link must use a valid tel: destination.";
    }
    if (value.contactEmail !== undefined &&
        value.contactEmail !== "" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contactEmail)) {
      return "Enter a valid footer contact email address.";
    }
    return null;
  }

  return null;
}
