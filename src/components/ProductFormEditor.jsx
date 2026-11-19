import React, { useEffect, useRef, useState } from "react";
import DocumentManager from "./DocumentManager";
import { catalogMedia } from "../data/catalogMedia";
import SpecBuilder from "./SpecBuilder";
import { createProductSnapshot, mergeProductData, parseProductJson, protectProductImage } from "./productEditorData";
import { getProductRequestFlow, PRODUCT_REQUEST_FLOWS } from "../data/productWorkflow";

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

export default function ProductFormEditor({ json, onJsonChange, slugLocked = false, media = [], onInspectMedia }) {
  const [advancedJson, setAdvancedJson] = useState(json);
  const [advancedError, setAdvancedError] = useState("");
  const [galleryReplacementIndex, setGalleryReplacementIndex] = useState(null);
  const [productMediaSearch, setProductMediaSearch] = useState("");
  const initialProduct = useRef(createProductSnapshot(json));
  const advancedEditing = useRef(false);
  const imageChanged = useRef(false);
  const originalProduct = initialProduct.current || {};
  const product = parseProductJson(json);
  const referencedUploadedMedia = media.filter((item) => product && JSON.stringify(product).includes(item.public_url));
  const mediaSearchTerm = productMediaSearch.trim().toLowerCase();
  const visibleCatalogMedia = mediaSearchTerm
    ? catalogMedia.filter((item) => `${item.file} ${item.brand} ${item.category} ${item.folder}`.toLowerCase().includes(mediaSearchTerm))
    : catalogMedia;
  const visibleUploadedMedia = mediaSearchTerm
    ? media.filter((item) => `${item.original_file_name} ${item.alt_text || ""} ${item.mime_type || ""} ${item.object_key || ""}`.toLowerCase().includes(mediaSearchTerm))
    : media;

  function protectProduct(edited) {
    const protectedProduct = protectProductImage(originalProduct, edited, imageChanged.current);
    if (getProductRequestFlow({ slug: protectedProduct.slug }) === PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR) {
      protectedProduct.requestFlow = PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR;
    }
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

  useEffect(() => {
    // A JSON edit can reorder or replace gallery entries; never carry an index-based
    // replacement target over to a potentially different image.
    setGalleryReplacementIndex(null);
  }, [json]);

  function commit(next) {
    const protectedProduct = protectProduct(next);
    const formatted = JSON.stringify(protectedProduct, null, 2);
    setAdvancedJson(formatted);
    setAdvancedError("");
    onJsonChange(formatted);
  }

  function selectProductImage(url) {
    if (!product) return;
    imageChanged.current = true;
    const current = mergeProductData(originalProduct, product);
    commit({ ...current, img: url });
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

  function addGalleryImage(url, alt = "") {
    if (!product || !url) return;
    const gallery = Array.isArray(product.gallery) ? product.gallery : [];
    if (gallery.some((image) => image?.url === url)) return;
    if (gallery.length >= 24) return;
    updateField("gallery", [...gallery, { url, alt: alt || product.name || "Product image" }]);
  }

  function updateGalleryImage(index, patch) {
    if (!product || !Array.isArray(product.gallery) || !Number.isInteger(index) || index < 0 || index >= product.gallery.length) return;
    updateField("gallery", product.gallery.map((image, imageIndex) =>
      imageIndex === index ? { ...image, ...patch } : image
    ));
  }

  function moveGalleryImage(index, offset) {
    if (!product || !Array.isArray(product.gallery)) return;
    const target = index + offset;
    if (target < 0 || target >= product.gallery.length) return;
    setGalleryReplacementIndex(null);
    const gallery = product.gallery.slice();
    [gallery[index], gallery[target]] = [gallery[target], gallery[index]];
    updateField("gallery", gallery);
  }

  function removeGalleryImage(index) {
    if (!product || !Array.isArray(product.gallery)) return;
    setGalleryReplacementIndex(null);
    updateField("gallery", product.gallery.filter((_, imageIndex) => imageIndex !== index));
  }

  function updateArray(key, value) {
    if (!product) return;
    updateField(key, value);
  }

  return (
    <div className="cms-product-form">
      {!product && <p className="admin-alert admin-alert-error" role="alert">Product JSON must be a valid object before structured fields can be edited.</p>}
      <div className="cms-editor-fields">
        <label>
          Request flow
          <select
            value={product ? getProductRequestFlow(product) : PRODUCT_REQUEST_FLOWS.CART}
            disabled={!product || getProductRequestFlow({ slug: product.slug }) === PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR}
            onChange={(event) => updateField("requestFlow", event.target.value)}
          >
            <option value={PRODUCT_REQUEST_FLOWS.CART}>Product Cart</option>
            <option value={PRODUCT_REQUEST_FLOWS.QUOTATION}>General Quotation</option>
            <option value={PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR}>Dental Chair Request</option>
          </select>
          <small>
            {getProductRequestFlow({ slug: product?.slug }) ===
            PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR
              ? "Confirmed dental chair model — requests are locked to Dental Chair Request."
              : "Controls where this product is sent when a customer requests it. This is separate from the legacy purchase type below."}
          </small>
        </label>
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
          Selected product image
          <input value={String(product?.img ?? "")} readOnly aria-readonly="true" />
        </label>
        {product?.img && <div className="cms-editor-field-wide cms-product-selected-image-preview">
          <strong>Image preview</strong>
          <div>
            <img src={product.img} alt={(product.name || "Selected product") + " image preview"} onError={(event) => { event.currentTarget.style.display = "none"; }} />
            <span>Image shown at full aspect ratio · contain fit</span>
          </div>
        </div>}
        {referencedUploadedMedia.length > 0 && (
          <section className="cms-editor-field-wide cms-product-image-references">
            <strong>Uploaded images referenced by this product ({referencedUploadedMedia.length})</strong>
            <p>References are detected throughout the product JSON, not only the primary image field. This includes nested image arrays or gallery data if present. Use the advanced JSON editor to manage fields that do not have a dedicated structured editor.</p>
            {referencedUploadedMedia.map((item) => (
              <div key={item.id}>
                <img src={item.public_url} alt={item.alt_text || item.original_file_name} />
                <span>{item.original_file_name}</span>
                <button type="button" className="admin-secondary-button" onClick={() => onInspectMedia?.(item)}>
                  Inspect saved references
                </button>
              </div>
            ))}
          </section>
        )}
        <section className="cms-editor-field-wide cms-product-gallery-editor">
          <div>
            <h3>Product detail gallery</h3>
            <p>Gallery images appear as selectable thumbnails on the product detail page. The primary product image remains separate. Choose Replace from library on an image, then select a catalogue or uploaded image below. The picker will identify the gallery image being replaced. Changes affect this product draft only; the published product remains unchanged until you explicitly publish to Preview.</p>
          </div>
          {(Array.isArray(product?.gallery) ? product.gallery : []).map((image, index) => (
            <article key={image?.url || index}>
              <img src={image?.url || ""} alt={image?.alt || product?.name || "Gallery image"} />
              <div>
                <label>
                  Image URL
                  <input value={image?.url || ""} readOnly aria-readonly="true" />
                </label>
                <label>
                  Alt text
                  <input value={image?.alt || ""} maxLength={300} onChange={(event) => updateGalleryImage(index, { alt: event.target.value })} />
                </label>
                <div className="cms-gallery-row-actions">
                  <button type="button" className="admin-secondary-button" disabled={index === 0} onClick={() => moveGalleryImage(index, -1)}>Move up</button>
                  <button type="button" className="admin-secondary-button" disabled={index === product.gallery.length - 1} onClick={() => moveGalleryImage(index, 1)}>Move down</button>
                  <button type="button" className="admin-secondary-button" onClick={() => setGalleryReplacementIndex(index)}>Replace from library</button>
                  {galleryReplacementIndex === index && <button type="button" className="admin-secondary-button" onClick={() => setGalleryReplacementIndex(null)}>Cancel replacement</button>}
                  <button type="button" className="admin-secondary-button" onClick={() => removeGalleryImage(index)}>Remove</button>
                </div>
              </div>
            </article>
          ))}
          <p>{(product?.gallery || []).length} of 24 gallery images</p>
        </section>
        <section className="cms-editor-field-wide cms-product-image-library">
          <h3>{galleryReplacementIndex === null ? "Choose a replacement for the primary product image" : `Choose a replacement for gallery image ${galleryReplacementIndex + 1}`}</h3>
          <p>These are the original static website images. Selecting one changes only the indicated image field in this product draft; it does not copy, move, or delete the file. The published product is unchanged until you explicitly publish to Preview.</p>
          <label className="cms-product-media-search">Find an image
            <input value={productMediaSearch} onChange={(event) => setProductMediaSearch(event.target.value)} placeholder="Search filename, brand, category or storage key" />
          </label>
          <small>{visibleCatalogMedia.length} catalogue image(s) and {visibleUploadedMedia.length} uploaded image(s) match{mediaSearchTerm ? " your search" : ""}.</small>
          <div className="cms-product-media-picker-grid">
            {visibleCatalogMedia.map((item) => (
              <article key={item.src} className={(galleryReplacementIndex !== null && product?.gallery?.[galleryReplacementIndex]?.url === item.src) || (galleryReplacementIndex === null && product?.img === item.src) ? "selected" : ""}>
                <img src={item.src} alt={item.file} loading="lazy" />
                <strong>{item.file}</strong>
                <small>{item.brand} · {item.category}</small>
                <button
                  type="button"
                  className="admin-secondary-button"
                  disabled={!product}
                  onClick={() => {
                    if (galleryReplacementIndex !== null) {
                      updateGalleryImage(galleryReplacementIndex, { url: item.src, alt: item.file });
                      setGalleryReplacementIndex(null);
                    } else selectProductImage(item.src);
                  }}
                >
                  {galleryReplacementIndex !== null && product?.gallery?.[galleryReplacementIndex]?.url === item.src ? "Selected for this gallery image" : galleryReplacementIndex === null && product?.img === item.src ? "Current primary image" : galleryReplacementIndex === null ? "Replace primary image" : "Replace gallery image"}
                </button>
                <button type="button" className="admin-secondary-button" disabled={!product || (product?.gallery || []).length >= 24 || (product?.gallery || []).some((image) => image?.url === item.src)} onClick={() => addGalleryImage(item.src, item.file)}>
                  Add to gallery
                </button>
              </article>
            ))}
          </div>
          {visibleCatalogMedia.length === 0 && <p className="cms-media-picker-note">No catalogue images match this search.</p>}
          {media.length > 0 && <>
            <h3>Uploaded Preview media ({visibleUploadedMedia.length} matching · {media.length} loaded)</h3>
            <div className="cms-product-media-picker-grid">
              {visibleUploadedMedia.map((item) => (
                <article key={item.id} className={(galleryReplacementIndex !== null && product?.gallery?.[galleryReplacementIndex]?.url === item.public_url) || (galleryReplacementIndex === null && product?.img === item.public_url) ? "selected" : ""}>
                  <img src={item.public_url} alt={item.alt_text || item.original_file_name} loading="lazy" />
                  <strong>{item.original_file_name}</strong>
                  <small>Preview upload</small>
                  <button
                    type="button"
                    className="admin-secondary-button"
                    disabled={!product}
                    onClick={() => {
                      if (galleryReplacementIndex !== null) {
                        updateGalleryImage(galleryReplacementIndex, { url: item.public_url, alt: item.alt_text || item.original_file_name });
                        setGalleryReplacementIndex(null);
                      } else selectProductImage(item.public_url);
                    }}
                  >
                    {galleryReplacementIndex !== null && product?.gallery?.[galleryReplacementIndex]?.url === item.public_url
                      ? "Selected for this gallery image"
                      : galleryReplacementIndex === null && product?.img === item.public_url
                        ? "Current primary image"
                        : galleryReplacementIndex === null
                          ? "Replace primary image"
                          : "Replace gallery image"}
                  </button>
                  <button type="button" className="admin-secondary-button" disabled={!product || (product?.gallery || []).length >= 24 || (product?.gallery || []).some((image) => image?.url === item.public_url)} onClick={() => addGalleryImage(item.public_url, item.alt_text || item.original_file_name)}>
                    Add to gallery
                  </button>
                </article>
              ))}
            </div>
            {visibleUploadedMedia.length === 0 && <p className="cms-media-picker-note">No uploaded Preview images match this search.</p>}
          </>}
        </section>
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
