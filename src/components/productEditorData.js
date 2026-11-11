const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export function splitSpecificationString(text) {
  const colon = text.indexOf(":");
  if (colon < 0) return { hasColon: false, label: "", value: text };

  const rawLabel = text.slice(0, colon);
  const rawValue = text.slice(colon + 1);
  const label = rawLabel.trim();
  const value = rawValue.trim();

  return {
    hasColon: true,
    label,
    value,
    labelPrefix: rawLabel.slice(0, rawLabel.indexOf(label)),
    labelSuffix: rawLabel.slice(rawLabel.indexOf(label) + label.length),
    valuePrefix: rawValue.slice(0, rawValue.indexOf(value)),
    valueSuffix: rawValue.slice(rawValue.indexOf(value) + value.length),
  };
}

export function updateSpecificationRow(row, field, value) {
  if (typeof row === "string") {
    const parts = splitSpecificationString(row);
    if (!parts.hasColon) {
      return field === "label" ? `${value}: ${parts.value}` : value;
    }

    const label = field === "label" ? value : parts.label;
    const specValue = field === "value" ? value : parts.value;
    return `${parts.labelPrefix}${label}${parts.labelSuffix}:${parts.valuePrefix}${specValue}${parts.valueSuffix}`;
  }

  if (row && typeof row === "object" && !Array.isArray(row)) {
    const keys = Object.keys(row);
    const labelKey = ["label", "name", "key", "title"].find((key) => hasOwn(row, key)) || "label";
    const valueKey = ["value", "detail", "text", "description"].find((key) => hasOwn(row, key)) || "value";
    const next = { ...row };
    next[field === "label" ? labelKey : valueKey] = value;
    return next;
  }

  if (field !== "raw") return row;
  try {
    const next = JSON.parse(value);
    return typeof next === typeof row && Array.isArray(next) === Array.isArray(row) && (row !== null || next === null) ? next : row;
  } catch {
    return row;
  }
}

export function moveRow(rows, index, offset) {
  const target = index + offset;
  if (target < 0 || target >= rows.length) return rows;
  const next = rows.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function getDocumentFieldKeys(document) {
  return {
    label: ["name", "title", "label", "filename", "fileName"].find((key) => hasOwn(document, key)) || "label",
    location: ["url", "href", "path", "src", "file"].find((key) => hasOwn(document, key)) || "url",
  };
}

export function updateDocumentRow(document, field, value) {
  if (typeof document === "string") return field === "location" ? value : document;
  if (document === null || typeof document !== "object" || Array.isArray(document)) {
    if (field !== "location") return document;
    try {
      const next = JSON.parse(value);
      return typeof next === typeof document && Array.isArray(next) === Array.isArray(document) && (document !== null || next === null) ? next : document;
    } catch {
      return document;
    }
  }

  const keys = getDocumentFieldKeys(document);
  return { ...document, [keys[field]]: value };
}

export function mergeProductData(original, edited) {
  if (
    original && edited &&
    typeof original === "object" && typeof edited === "object" &&
    !Array.isArray(original) && !Array.isArray(edited)
  ) {
    const result = Object.fromEntries(Object.entries(original));
    for (const [key, value] of Object.entries(edited)) {
      Object.defineProperty(result, key, {
        value: hasOwn(original, key) ? mergeProductData(original[key], value) : value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return result;
  }

  return edited;
}

export function protectProductImage(original, edited) {
  const merged = mergeProductData(original, edited);
  if (!merged || typeof merged !== "object" || Array.isArray(merged)) return merged;
  if (!original || typeof original !== "object" || !hasOwn(original, "img")) {
    delete merged.img;
  } else {
    Object.defineProperty(merged, "img", {
      value: original.img,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return merged;
}

export function parseProductJson(json) {
  try {
    const product = JSON.parse(json);
    return product && typeof product === "object" && !Array.isArray(product) ? product : null;
  } catch {
    return null;
  }
}

export function createProductSnapshot(json) {
  const product = parseProductJson(json);
  return product ? JSON.parse(JSON.stringify(product)) : {};
}
