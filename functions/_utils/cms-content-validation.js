const SECTION_TYPES = new Set([
  "hero", "text", "image-text", "product-grid", "feature-grid",
  "editorial", "brand-grid", "services-banner", "benefits-grid", "cta",
]);
const TEXT_FIELDS = [
  "eyebrow", "heading", "headingHighlight", "description", "imageAlt",
  "imageNumber", "imageTitle", "imageDescription", "buttonText",
  "buttonUrl", "secondaryButtonText", "secondaryButtonUrl", "imageUrl",
];
const INTERNAL_ROUTE = /^\/(?!\/)[^\\?#\u0000-\u001f]*$/;
const SLUG = /^[a-z0-9][a-z0-9-]{1,99}$/;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validInternalRoute(value) {
  return typeof value === "string" && value.length <= 180 && INTERNAL_ROUTE.test(value);
}

function validImageUrl(value) {
  if (typeof value !== "string" || value.length > 1000) return false;
  if (validInternalRoute(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function validateSectionItem(item, index) {
  if (!isRecord(item)) return "Section item " + (index + 1) + " must be an object.";
  for (const field of ["id", "slug", "number", "title", "heading", "description", "text", "icon"]) {
    if (item[field] !== undefined &&
        (typeof item[field] !== "string" || item[field].length > 2000)) {
      return "Section item " + (index + 1) + " has an invalid " + field + " field.";
    }
  }
  if (item.url !== undefined && item.url !== "" && !validInternalRoute(item.url)) {
    return "Section item " + (index + 1) + " must use a supported internal URL.";
  }
  return null;
}

export function validatePageContent(value) {
  if (!isRecord(value)) return "Page content must be a JSON object.";
  if (!Array.isArray(value.sections)) return "Page content must contain a sections array.";
  if (value.sections.length > 80) return "A page cannot contain more than 80 sections.";

  const ids = new Set();
  for (let index = 0; index < value.sections.length; index += 1) {
    const section = value.sections[index];
    const label = "Section " + (index + 1);
    if (!isRecord(section)) return label + " must be an object.";
    if (typeof section.id !== "string" || !section.id.trim() || section.id.length > 100) {
      return label + " must have a valid ID.";
    }
    if (ids.has(section.id)) return 'Section ID "' + section.id + '" is duplicated.';
    ids.add(section.id);
    if (!SECTION_TYPES.has(section.type)) return label + " uses an unsupported section type.";
    if (section.visible !== undefined && typeof section.visible !== "boolean") {
      return label + " visibility must be true or false.";
    }
    if (section.order !== undefined &&
        (typeof section.order !== "number" || !Number.isFinite(section.order) || section.order < 0)) {
      return label + " order must be a non-negative number.";
    }
    if (section.layout !== undefined && !isRecord(section.layout)) {
      return label + " layout must be an object.";
    }
    if (!isRecord(section.content)) return label + " content must be an object.";

    const content = section.content;
    for (const field of TEXT_FIELDS) {
      if (content[field] !== undefined &&
          (typeof content[field] !== "string" || content[field].length > 4000)) {
        return label + " has an invalid " + field + " field.";
      }
    }
    for (const field of ["buttonUrl", "secondaryButtonUrl"]) {
      if (content[field] && !validInternalRoute(content[field])) {
        return label + " " + field + " must use a supported internal route.";
      }
    }
    if (content.imageUrl && !validImageUrl(content.imageUrl)) {
      return label + " imageUrl must be a site path or HTTPS image URL.";
    }
    if (content.productSlugs !== undefined &&
        (!Array.isArray(content.productSlugs) || content.productSlugs.length > 100 ||
         !content.productSlugs.every((slug) => typeof slug === "string" && SLUG.test(slug)))) {
      return label + " productSlugs must be an array of valid product slugs.";
    }
    if (content.proofItems !== undefined &&
        (!Array.isArray(content.proofItems) || content.proofItems.length > 30 ||
         !content.proofItems.every((item) => typeof item === "string" && item.length <= 200))) {
      return label + " proofItems must be an array of short text values.";
    }
    if (content.items !== undefined) {
      if (!Array.isArray(content.items) || content.items.length > 100) {
        return label + " items must be an array with no more than 100 entries.";
      }
      if (section.type === "brand-grid") {
        if (!content.items.every((item) => typeof item === "string" && item.length <= 200)) {
          return label + " brand items must be text values.";
        }
      } else {
        for (let itemIndex = 0; itemIndex < content.items.length; itemIndex += 1) {
          const itemError = validateSectionItem(content.items[itemIndex], itemIndex);
          if (itemError) return label + ": " + itemError;
        }
      }
    }
  }
  return null;
}

export function validatePageRoute(value) {
  if (typeof value !== "string" || value.length > 160 ||
      !value.startsWith("/") || value.startsWith("//") ||
      /[?#\\\u0000-\u001f]/.test(value)) {
    return "Enter a valid site route.";
  }
  return null;
}
