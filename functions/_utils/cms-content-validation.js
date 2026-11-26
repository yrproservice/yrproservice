const SECTION_TYPES = new Set([
  "hero", "text", "image-text", "product-grid", "feature-grid",
  "editorial", "brand-grid", "services-banner", "benefits-grid", "cta",
  "services-page", "team-page",
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

function validApprovedProductImage(value) {
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

const DESIGN_FONT_KEYS = new Set(["headingFont", "bodyFont"]);
const DESIGN_LENGTH_KEYS = new Set(["headingScale", "bodySize", "headingWeight", "headingLetterSpacing", "contentWidth", "sectionSpacing"]);
const DESIGN_SECTION_KEYS = new Set(["backgroundColor", "textColor", "accentColor", "textAlign", "cardColumns"]);
const HOME_HERO_LAYOUTS = new Set(["overlay-left", "overlay-center", "overlay-right", "overlay-bottom"]);
const SPLIT_LAYOUTS = new Set(["split-right", "split-left", "balanced", "stacked"]);
const SECTION_LAYOUT_VARIANTS = new Set([
  "split", "standard", "banner", "original-services-layout", "original-team-layout",
]);
const TEAM_SECTION_ORDER = new Set(["hero", "story", "process", "capabilities", "people", "cta"]);
const SERVICES_SECTION_ORDER = new Set(["hero", "intro", "listing", "process", "cta"]);
const REQUIRED_TEAM_ROLE_IDENTITIES = [
  "Technical Support",
  "Installation & Service",
  "Customer Support",
  "Project Coordination",
];

function validImagePosition(value) {
  if (["center", "top", "bottom", "left", "right"].includes(value)) return true;
  if (typeof value !== "string" || value.length > 32) return false;
  const match = /^(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%$/.exec(value);
  return Boolean(match && Number(match[1]) <= 100 && Number(match[2]) <= 100);
}

function validateDesignValue(label, key, value) {
  if (DESIGN_FONT_KEYS.has(key)) {
    return ["Montserrat", "Inter", "Arial"].includes(value)
      ? null
      : label + ' field "' + key + '" uses an unsupported font.';
  }
  if (key === "headingScale") {
    return typeof value === "number" && Number.isFinite(value) && value >= 0.8 && value <= 1.25
      ? null : label + " headingScale must be between 0.8 and 1.25.";
  }
  if (key === "bodySize") {
    return Number.isInteger(value) && value >= 13 && value <= 20
      ? null : label + " bodySize must be a whole number between 13 and 20.";
  }
  if (key === "headingWeight") {
    return Number.isInteger(value) && value >= 300 && value <= 900 && value % 100 === 0
      ? null : label + " headingWeight must be a supported font weight.";
  }
  if (key === "headingLetterSpacing") {
    return typeof value === "number" && Number.isFinite(value) && value >= -0.1 && value <= 0.1
      ? null : label + " headingLetterSpacing must be between -0.1 and 0.1.";
  }
  if (key === "contentWidth") {
    return ["compact", "standard", "wide"].includes(value)
      ? null : label + " contentWidth must be compact, standard or wide.";
  }
  if (key === "sectionSpacing") {
    return Number.isInteger(value) && value >= 36 && value <= 120
      ? null : label + " sectionSpacing must be a whole number between 36 and 120.";
  }
  if (key === "cardColumns") {
    return ["auto", "2", "3", "4"].includes(value)
      ? null : label + " cardColumns must be auto, 2, 3 or 4.";
  }
  if (key === "textAlign") {
    return ["left", "center", "right"].includes(value)
      ? null : label + " textAlign must be left, center or right.";
  }
  if (["backgroundColor", "textColor", "accentColor"].includes(key)) {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
      ? null : label + ' field "' + key + '" must be a six-digit hex colour.';
  }
  if (!DESIGN_LENGTH_KEYS.has(key) && !DESIGN_FONT_KEYS.has(key) &&
      !DESIGN_SECTION_KEYS.has(key) && key !== "cardColumns") {
    return label + ' uses unsupported property "' + key + '".';
  }
  return null;
}

function validateDesign(label, design) {
  if (design === undefined) return null;
  if (!isRecord(design)) return label + " must be an object.";
  const allowedTopLevel = new Set(["global", "sections"]);
  for (const key of Object.keys(design)) {
    if (!allowedTopLevel.has(key)) return label + ' uses unsupported property "' + key + '".';
  }
  if (design.global !== undefined) {
    if (!isRecord(design.global)) return label + " global must be an object.";
    for (const [key, value] of Object.entries(design.global)) {
      if (!DESIGN_FONT_KEYS.has(key) && !DESIGN_LENGTH_KEYS.has(key)) {
        return label + ' global uses unsupported property "' + key + '".';
      }
      const error = validateDesignValue(label + " global", key, value);
      if (error) return error;
    }
  }
  if (design.sections !== undefined) {
    if (!isRecord(design.sections)) return label + " sections must be an object.";
    for (const [sectionId, sectionDesign] of Object.entries(design.sections)) {
      if (!isRecord(sectionDesign)) return label + ' section "' + sectionId + '" design must be an object.';
      for (const [key, value] of Object.entries(sectionDesign)) {
        if (!DESIGN_SECTION_KEYS.has(key)) {
          return label + ' section "' + sectionId + '" uses unsupported property "' + key + '".';
        }
        const error = validateDesignValue(label + ' section "' + sectionId + '"', key, value);
        if (error) return error;
      }
    }
  }
  return null;
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

function validateTeamRoleIdentities(content) {
  const items = content?.people?.items;
  if (!Array.isArray(items) || items.length !== REQUIRED_TEAM_ROLE_IDENTITIES.length) {
    return "All four required Team role identities must be present.";
  }
  for (let index = 0; index < REQUIRED_TEAM_ROLE_IDENTITIES.length; index += 1) {
    if (!isRecord(items[index]) ||
        items[index].title !== REQUIRED_TEAM_ROLE_IDENTITIES[index]) {
      return "Team roles must appear in their required order: Technical Support, Installation & Service, Customer Support, and Project Coordination.";
    }
  }
  return null;
}

export function validatePageContent(value, requireTeamPage = false) {
  if (!isRecord(value)) return "Page content must be a JSON object.";
  if (!Array.isArray(value.sections)) return "Page content must contain a sections array.";
  if (value.sections.length > 80) return "A page cannot contain more than 80 sections.";
  const contentDesignError = validateDesign("Page content design", value.design);
  if (contentDesignError) return contentDesignError;
  const teamPageSections = value.sections.filter((section) => section?.type === "team-page");
  if ((requireTeamPage && teamPageSections.length !== 1) || teamPageSections.length > 1) {
    return "A Team page must contain exactly one Team page section.";
  }
  const hasTeamPage = teamPageSections.length === 1;
  const hasServicesPage = value.sections.some((section) => section?.type === "services-page");
  if (hasTeamPage && hasServicesPage) {
    return "A page cannot combine Team and Services page templates.";
  }
  const supportedSectionOrder = hasTeamPage
    ? TEAM_SECTION_ORDER
    : hasServicesPage
      ? SERVICES_SECTION_ORDER
      : new Set();
  if (value.sectionOrder !== undefined &&
      (!Array.isArray(value.sectionOrder) || value.sectionOrder.length > 80 ||
       !value.sectionOrder.every((key) => typeof key === "string" &&
         supportedSectionOrder.has(key)) ||
       new Set(value.sectionOrder).size !== value.sectionOrder.length)) {
    return "Page sectionOrder must be an array of supported section keys.";
  }

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
    if (isRecord(section.layout)) {
      for (const key of Object.keys(section.layout)) {
        if (!["variant", "columns", "align", "imagePosition", "imageHeight", "imageFit", "heroLayout"].includes(key)) {
          return label + ' layout uses unsupported property "' + key + '".';
        }
      }
      if (section.layout.variant !== undefined &&
          (typeof section.layout.variant !== "string" ||
           !SECTION_LAYOUT_VARIANTS.has(section.layout.variant))) {
        return label + " layout variant is not supported.";
      }
      if (section.layout.columns !== undefined &&
          !["auto", "2", "3", "4"].includes(section.layout.columns)) {
        return label + " layout columns must be auto, 2, 3 or 4.";
      }
      if (section.layout.align !== undefined &&
          !["left", "center", "right"].includes(section.layout.align)) {
        return label + " layout align must be left, center or right.";
      }
      if (section.layout.imageHeight !== undefined &&
          (!Number.isInteger(section.layout.imageHeight) ||
           section.layout.imageHeight < 200 ||
           section.layout.imageHeight > 1200)) {
        return label + " layout imageHeight must be a whole number between 200 and 1200.";
      }
      if (section.layout.imageFit !== undefined &&
          !["cover", "contain", "original"].includes(section.layout.imageFit)) {
        return label + " layout imageFit must be cover, contain or original.";
      }
      if (section.layout.imagePosition !== undefined &&
          !validImagePosition(section.layout.imagePosition)) {
        return label + " layout imagePosition must be a supported position.";
      }
      if (section.layout.heroLayout !== undefined &&
          !HOME_HERO_LAYOUTS.has(section.layout.heroLayout) &&
          !SPLIT_LAYOUTS.has(section.layout.heroLayout)) {
        return label + " layout heroLayout is not supported.";
      }
    }
    const sectionDesignError = validateDesign(label + " design", section.design);
    if (sectionDesignError) return sectionDesignError;
    if (!isRecord(section.content)) return label + " content must be an object.";

    const content = section.content;
    if (section.type === "team-page") {
      const roleError = validateTeamRoleIdentities(content);
      if (roleError) return label + ": " + roleError;
    }
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
    if (content.imageHeight !== undefined &&
        (!Number.isInteger(content.imageHeight) || content.imageHeight < 200 || content.imageHeight > 1200)) {
      return label + " imageHeight must be a whole number between 200 and 1200.";
    }
    if (content.imageFit !== undefined &&
        !["cover", "contain", "original"].includes(content.imageFit)) {
      return label + " imageFit must be cover, contain or original.";
    }
    if (content.imagePosition !== undefined &&
        !validImagePosition(content.imagePosition)) {
      return label + " imagePosition must be a supported position.";
    }
    if (content.layout !== undefined) {
      const allowedLayouts = section.type === "hero"
        ? HOME_HERO_LAYOUTS
        : section.type === "editorial" || section.type === "services-banner"
          ? SPLIT_LAYOUTS
          : null;
      if (!allowedLayouts || !allowedLayouts.has(content.layout)) {
        return label + " content layout is not supported for this section type.";
      }
    }
    if (section.type === "team-page" || section.type === "services-page") {
      if (content.hero !== undefined && !isRecord(content.hero)) {
        return label + " hero settings must be an object.";
      }
      const hero = content.hero;
      if (hero) {
        const allowedHeroLayouts = SPLIT_LAYOUTS;
        if (hero.layout !== undefined &&
            (typeof hero.layout !== "string" || !allowedHeroLayouts.has(hero.layout))) {
          return label + " hero layout is not supported.";
        }
        if (hero.imageHeight !== undefined &&
            (!Number.isInteger(hero.imageHeight) || hero.imageHeight < 200 || hero.imageHeight > 1200)) {
          return label + " hero imageHeight must be a whole number between 200 and 1200.";
        }
        if (hero.imagePosition !== undefined && !validImagePosition(hero.imagePosition)) {
          return label + " hero imagePosition must be a supported position.";
        }
        if (hero.imageUrl !== undefined && hero.imageUrl !== "" && !validImageUrl(hero.imageUrl)) {
          return label + " hero imageUrl must be a site path or HTTPS image URL.";
        }
      }
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
        for (let itemIndex = 0; itemIndex < content.items.length; itemIndex += 1) {
          const item = content.items[itemIndex];
          if (typeof item === "string" && item.length <= 200) continue;
          if (!isRecord(item) || typeof item.url !== "string" || item.url.length > 1000 || !validImageUrl(item.url)) {
            return label + " brand item " + (itemIndex + 1) + " must be a logo filename or a valid HTTPS image URL.";
          }
          for (const field of ["mediaId", "alt", "name"]) {
            if (item[field] !== undefined && (typeof item[field] !== "string" || item[field].length > 300)) {
              return label + " brand item " + (itemIndex + 1) + " has invalid " + field + " metadata.";
            }
          }
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

export function validateTeamPublishApproval(value, required = false) {
  if (!isRecord(value) || !Array.isArray(value.sections)) return null;
  const teamSection = value.sections.find((section) => section?.type === "team-page");
  if (!teamSection) {
    return required ? "A Team page section is required before publishing." : null;
  }
  const roleError = validateTeamRoleIdentities(teamSection.content);
  if (roleError) return roleError;
  const people = teamSection.content.people;
  for (let index = 0; index < people.items.length; index += 1) {
    const item = people.items[index];
    if (!isRecord(item) || typeof item.image !== "string" || !item.image.trim() || !validImageUrl(item.image)) {
      return "Team role image " + (index + 1) + " must be a valid site or HTTPS image before publishing.";
    }
    if (item.approvedForPublication !== true || item.approvedImageUrl !== item.image) {
      return "Team role image " + (index + 1) + " must be explicitly approved for its current image before publishing.";
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
  if (value.img !== undefined && value.img !== "" && !validApprovedProductImage(value.img)) {
    return "Product image must use an approved /catalog/ path or Preview R2 URL.";
  }
  if (value.gallery !== undefined) {
    if (!Array.isArray(value.gallery) || value.gallery.length > 24) {
      return "Product gallery must be an array with no more than 24 images.";
    }
    for (let index = 0; index < value.gallery.length; index += 1) {
      const image = value.gallery[index];
      if (!isRecord(image) || typeof image.url !== "string" || !validApprovedProductImage(image.url)) {
        return "Product gallery image " + (index + 1) + " must use an approved /catalog/ path or Preview R2 URL.";
      }
      if (image.alt !== undefined && (typeof image.alt !== "string" || image.alt.length > 300)) {
        return "Product gallery image " + (index + 1) + " has invalid alt text.";
      }
    }
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
