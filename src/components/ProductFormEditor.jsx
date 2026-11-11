import React, { useEffect, useRef, useState } from "react";
import DocumentManager from "./DocumentManager";
import SpecBuilder from "./SpecBuilder";
import { createProductSnapshot, mergeProductData, parseProductJson, protectProductImage } from "./productEditorData";

const PRODUCT_FIELDS = [
  ["slug", "Slug"],
  ["name", "Name"],
  ["brand", "Brand"],
  ["brandLine", "Brand line"],
  ["category", "Category"],
  ["purchaseType", "Purchase type"],
  ["summary", "Summary"],
  ["description", "Description"],
  ["price", "Price"],
  ["stockStatus", "Stock status"],
  ["reviewStatus", "Review status"],
];

export default function ProductFormEditor({ json, onJsonChange, slugLocked = false }) {
  const [advancedJson, setAdvancedJson] = useState(json);
  const [advancedError, setAdvancedError] = useState("");
  const initialProduct = useRef(createProductSnapshot(json));
  const advancedEditing = useRef(false);
  const originalProduct = initialProduct.current || {};
  const product = parseProductJson(json);

  function protectProduct(edited) {
    const protectedProduct = protectProductImage(originalProduct, edited);
    if (slugLocked && Object.prototype.hasOwnProperty.call(originalProduct, "slug")) {
      Object.defineProperty(protectedProduct, "slug", {
        value: originalProduct.slug,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return protectedProduct;
  }

  useEffect(() => {
    if (!advancedEditing.current) setAdvancedJson(json);
  }, [json]);

  function commit(next) {
    const protectedProduct = protectProduct(next);
    const formatted = JSON.stringify(protectedProduct, null, 2);
    setAdvancedJson(formatted);
    setAdvancedError("");
    onJsonChange(formatted);
  }

  function updateField(key, value) {
    if (!product) return;
    const current = mergeProductData(originalProduct, product);
    commit({ ...current, [key]: value });
  }

  function updateAdvanced(value) {
    setAdvancedJson(value);
    const edited = parseProductJson(value);
    if (!edited) {
      setAdvancedError("Enter a valid product JSON object.");
      onJsonChange(value);
      return;
    }

    const protectedProduct = protectProduct(edited);
    if (JSON.stringify(edited.img) !== JSON.stringify(originalProduct.img)) {
      const formatted = JSON.stringify(protectedProduct, null, 2);
      setAdvancedJson(formatted);
      onJsonChange(formatted);
    } else {
      onJsonChange(JSON.stringify(protectedProduct, null, 2));
    }
    setAdvancedError("");
  }

  function formatAdvanced() {
    const current = parseProductJson(json);
    if (current) setAdvancedJson(JSON.stringify(protectProduct(current), null, 2));
  }

  function updateArray(key, value) {
    if (!product) return;
    updateField(key, value);
  }

  return (
    <div className="cms-product-form">
      {!product && <p className="admin-alert admin-alert-error" role="alert">Product JSON must be a valid object before structured fields can be edited.</p>}
      <div className="cms-editor-fields">
        {PRODUCT_FIELDS.map(([key, label]) => (
          <label key={key} className={key === "summary" || key === "description" ? "cms-editor-field-wide" : ""}>
            {label}
            <textarea
              rows={key === "description" ? 4 : key === "summary" ? 2 : 1}
              value={String(product?.[key] ?? "")}
              disabled={!product || (key === "slug" && slugLocked)}
              onChange={(event) => updateField(key, event.target.value)}
            />
          </label>
        ))}
        <label className="cms-editor-field-wide">
          Existing image path (read-only)
          <input value={String(product?.img ?? "")} readOnly aria-readonly="true" />
        </label>
      </div>
      <SpecBuilder specifications={product?.specifications} onChange={(value) => updateArray("specifications", value)} />
      <DocumentManager documents={product?.docs} onChange={(value) => updateArray("docs", value)} />
      <details className="cms-advanced-json">
        <summary>Advanced JSON (optional fallback)</summary>
        <p>Unedited product metadata is retained, nested objects are merged, and the original image path is protected.</p>
        <textarea
          className="cms-json-editor"
          spellCheck="false"
          value={advancedJson}
          rows={18}
          onFocus={() => { advancedEditing.current = true; }}
          onChange={(event) => updateAdvanced(event.target.value)}
          onBlur={() => { advancedEditing.current = false; formatAdvanced(); }}
        />
        {advancedError && <p className="admin-alert admin-alert-error" role="alert">{advancedError}</p>}
      </details>
    </div>
  );
}
