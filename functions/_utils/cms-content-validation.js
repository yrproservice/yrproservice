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


const SPEC_LABEL_KEYS = ["label", "name", "key", "title"];
const SPEC_VALUE_KEYS = ["value", "detail", "text", "description"];
const DOCUMENT_LABEL_KEYS = ["name", "title", "label", "filename", "fileName"];
const DOCUMENT_URL_KEYS = ["url", "href", "path", "src", "file"];

function validateSpecification(item, index) {
  if (typeof item === "string") {
    return item.length <= 2000 ? null : "Specification " + (index + 1) + " is too long.";
  }
  if (!isRecord(item)) return "Specification " + (index + 1) + " must be text or an object.";
  const labelKey = SPEC_LABEL_KEYS.find((key) => Object.prototype.hasOwnProperty.call(item, key));
  const valueKey = SPEC_VALUE_KEYS.find((key) => Object.prototype.hasOwnProperty.call(item, key));
  if (!labelKey || !valueKey) {
    return "Specification " + (index + 1) + " must contain a label and a value.";
  }
  if (typeof item[labelKey] !== "string" || item[labelKey].length > 200) {
    return "Specification " + (index + 1) + " has an invalid label.";
  }
  if (typeof item[valueKey] !== "string" && typeof item[valueKey] !== "number") {
    return "Specification " + (index + 1) + " has an invalid value.";
  }
  if (typeof item[valueKey] === "string" && item[valueKey].length > 2000) {
    return "Specification " + (index + 1) + " value is too long.";
  }
  return null;
}

function validateDocument(item, index) {
  if (typeof item === "string") {
    if (item.length > 1000) return "Document " + (index + 1) + " path is too long.";
    if (item && !validImageUrl(item)) return "Document " + (index + 1) + " must use a site path or HTTPS URL.";
    return null;
  }
  if (!isRecord(item)) return "Document " + (index + 1) + " must be a path or an object.";
  const labelKey = DOCUMENT_LABEL_KEYS.find((key) => Object.prototype.hasOwnProperty.call(item, key));
  const urlKey = DOCUMENT_URL_KEYS.find((key) => Object.prototype.hasOwnProperty.call(item, key));
  if (labelKey && (typeof item[labelKey] !== "string" || item[labelKey].length > 200)) {
    return "Document " + (index + 1) + " has an invalid label.";
  }
  if (!urlKey || typeof item[urlKey] !== "string" || item[urlKey].length > 1000) {
    return "Document " + (index + 1) + " must contain a valid path or URL field.";
  }
  if (item[urlKey] && !validImageUrl(item[urlKey])) {
    return "Document " + (index + 1) + " must use a site path or HTTPS URL.";
  }
  return null;
}

export function validateProductContent(value) {
  if (!isRecord(value)) return "Product data must be a JSON object.";
  if (typeof value.slug !== "string" || !SLUG.test(value.slug)) {
    return "Product slug must use lowercase letters, numbers and hyphens.";
  }
  for (const field of ["name", "brand", "brandLine", "category", "subcategory", "summary", "description", "reviewStatus"]) {
    if (value[field] !== undefined &&
        (typeof value[field] !== "string" || value[field].length > 5000)) {
      return "Product field " + field + " must be text.";
    }
  }
  if (typeof value.name !== "string" || !value.name.trim()) return "Product name is required.";
  if (!["cart", "quote"].includes(value.purchaseType)) return "Purchase type must be cart or quote.";
  if (value.requestFlow !== undefined &&
      !["cart", "quotation", "dental_chair", "chair-consultation", "cart-quotation", "quote"].includes(value.requestFlow)) {
    return "Product request flow is not supported.";
  }
  if (value.price !== undefined && value.price !== null &&
      !((typeof value.price === "string" && value.price.length <= 100) ||
        (typeof value.price === "number" && Number.isFinite(value.price) && value.price >= 0))) {
    return "Product price must be a non-negative number, short text value or null.";
  }
  if (value.stockStatus !== undefined && !["pending", "in-stock", "out-of-stock"].includes(value.stockStatus)) {
    return "Product stock status is not supported.";
  }
  if (value.img !== undefined && value.img !== "" && !validImageUrl(value.img)) {
    return "Product image must be a site path or HTTPS URL.";
  }
  if (value.manufacturerSource !== undefined && value.manufacturerSource !== "") {
    try {
      if (new URL(value.manufacturerSource).protocol !== "https:") throw new Error();
    } catch {
      return "Manufacturer source must be an HTTPS URL.";
    }
  }
  if (value.specifications !== undefined) {
    if (!Array.isArray(value.specifications) || value.specifications.length > 200) {
      return "Product specifications must be an array with no more than 200 entries.";
    }
    for (let index = 0; index < value.specifications.length; index += 1) {
      const error = validateSpecification(value.specifications[index], index);
      if (error) return error;
    }
  }
  if (value.highlights !== undefined &&
      (!Array.isArray(value.highlights) || value.highlights.length > 200 ||
       !value.highlights.every((item) => typeof item === "string" && item.length <= 2000))) {
    return "Product highlights must be an array of text values.";
  }
  if (value.docs !== undefined) {
    if (!Array.isArray(value.docs) || value.docs.length > 50) {
      return "Product documents must be an array with no more than 50 entries.";
    }
    for (let index = 0; index < value.docs.length; index += 1) {
      const error = validateDocument(value.docs[index], index);
      if (error) return error;
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
  const normalized = value.replace(/\/$/, "") || "/";
  const reserved = [
    "/", "/products", "/services", "/team", "/contact", "/cart",
    "/quote", "/dental-chair-request", "/service-request", "/track-request",
  ];
  if (reserved.includes(normalized) ||
      ["/products", "/services", "/api", "/assets", "/catalog"].some((prefix) =>
        normalized === prefix || normalized.startsWith(prefix + "/")
      ) ||
      normalized.startsWith("/admin")) {
    return "This route is reserved for an existing website page or system endpoint.";
  }
  return null;
}
