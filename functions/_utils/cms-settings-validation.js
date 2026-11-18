const MAX_ITEMS = 12;
const MAX_LABEL = 60;
const MAX_ROUTE = 180;
const PAGE_DESIGN_KEYS = new Set([
  "site-chrome", "home", "products", "product-detail", "services",
  "service-detail", "team", "cart", "dental-chair-request", "quote",
  "service-request", "track-request", "contact",
]);
const DESIGN_FIELDS = {
  backgroundColor: "color", textColor: "color", headingColor: "color",
  primaryColor: "color", accentColor: "color", surfaceColor: "color",
  borderColor: "color", headingFont: "font", bodyFont: "font",
  headingScale: "headingScale", bodySize: "bodySize",
  contentWidth: "contentWidth", sectionSpacing: "sectionSpacing",
  cardRadius: "radius", buttonRadius: "radius", cardStyle: "cardStyle",
  cardColumns: "cardColumns", imageFit: "imageFit",
  headingAlign: "headingAlign", heroLayout: "heroLayout",
};

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

function validatePageDesign(value) {
  if (!isRecord(value)) return "Page design settings must be a JSON object.";
  for (const [field, fieldType] of Object.entries(DESIGN_FIELDS)) {
    if (value[field] === undefined) continue;
    const current = value[field];
    if (fieldType === "color" && !(typeof current === "string" && /^#[0-9a-fA-F]{6}$/.test(current))) {
      return 'Page design field "' + field + '" must be a six-digit hex colour.';
    }
    if (fieldType === "font" && !["Montserrat", "Inter", "Arial"].includes(current)) {
      return 'Page design field "' + field + '" must use a supported font.';
    }
    if (fieldType === "headingScale" && !(typeof current === "number" && current >= 0.8 && current <= 1.25)) {
      return "Heading scale must be between 0.8 and 1.25.";
    }
    if (fieldType === "bodySize" && !(Number.isInteger(current) && current >= 13 && current <= 20)) {
      return "Body size must be a whole number between 13 and 20.";
    }
    if (fieldType === "contentWidth" && !(Number.isInteger(current) && current >= 960 && current <= 1440)) {
      return "Content width must be a whole number between 960 and 1440.";
    }
    if (fieldType === "sectionSpacing" && !(Number.isInteger(current) && current >= 36 && current <= 120)) {
      return "Section spacing must be a whole number between 36 and 120.";
    }
    if (fieldType === "radius" && !(Number.isInteger(current) && current >= 0 && current <= 32)) {
      return 'Page design field "' + field + '" must be a whole number between 0 and 32.';
    }
    if (fieldType === "cardStyle" && !["soft", "bordered", "elevated", "flat"].includes(current)) {
      return "Card style is not supported.";
    }
    if (fieldType === "cardColumns" && !["auto", "2", "3", "4"].includes(current)) {
      return "Card columns must be auto, 2, 3 or 4.";
    }
    if (fieldType === "imageFit" && !["contain", "cover"].includes(current)) {
      return "Image fit must be contain or cover.";
    }
    if (fieldType === "headingAlign" && !["left", "center"].includes(current)) {
      return "Heading alignment must be left or center.";
    }
    if (fieldType === "heroLayout" && !["standard", "centered", "compact", "split"].includes(current)) {
      return "Hero layout is not supported.";
    }
  }
  return null;
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
        return 'Footer field "' + field + '" must be text no longer than 500 characters.';
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

  if (key.startsWith("page-design.")) {
    const pageKey = key.slice("page-design.".length);
    if (!PAGE_DESIGN_KEYS.has(pageKey)) return "This page-design setting key is not supported.";
    return validatePageDesign(value);
  }

  return "This CMS setting key is not supported.";
}
