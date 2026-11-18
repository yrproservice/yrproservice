import React, { useEffect, useState } from "react";
import { Link } from "../components/Layout";
import { products } from "../data/products";
import { mergePublishedProduct } from "../data/productImages";
import { useCart } from "../components/CartContext";
import { useChairRequests } from "../components/ChairRequestContext";
import ProductMediaFrame from "../components/ProductMediaFrame";
import { getProductRequestFlow, PRODUCT_REQUEST_FLOWS } from "../data/productWorkflow";

function safeHttpsUrl(value) {
  if (typeof value !== "string") return "";
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

function safeDocumentUrl(value) {
  if (typeof value !== "string" || value.length > 1000) return "";
  const trimmed = value.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !/[\\?#\u0000-\u001f]/.test(trimmed)) return trimmed;
  return safeHttpsUrl(trimmed);
}

function formatSpecification(item) {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object" || Array.isArray(item)) return "";
  const labelKey = ["label", "name", "key", "title"].find((key) => Object.prototype.hasOwnProperty.call(item, key));
  const valueKey = ["value", "detail", "text", "description"].find((key) => Object.prototype.hasOwnProperty.call(item, key));
  const label = labelKey ? String(item[labelKey] ?? "").trim() : "";
  const value = valueKey ? String(item[valueKey] ?? "").trim() : "";
  return [label, value].filter(Boolean).join(": ");
}

function getProductDocuments(value) {
  if (!Array.isArray(value)) return [];
  return value.map((document) => {
    if (typeof document === "string") {
      const url = safeDocumentUrl(document);
      const label = document.split("/").filter(Boolean).pop() || "Product document";
      return url ? { url, label } : null;
    }
    if (!document || typeof document !== "object" || Array.isArray(document)) return null;
    const labelKey = ["name", "title", "label", "filename", "fileName"].find((key) => Object.prototype.hasOwnProperty.call(document, key));
    const urlKey = ["url", "href", "path", "src", "file"].find((key) => Object.prototype.hasOwnProperty.call(document, key));
    const url = urlKey ? safeDocumentUrl(document[urlKey]) : "";
    const label = labelKey ? String(document[labelKey] || "").trim() : "Product document";
    return url ? { url, label: label || "Product document" } : null;
  }).filter(Boolean);
}

function stockLabel(status) {
  if (status === "in-stock") return "In Stock";
  if (status === "out-of-stock") return "Out of Stock";
  return "Availability to be updated";
}

function formatProductPrice(price) {
  if (price === null || price === undefined || price === "") {
    return "Price on request";
  }

  const numericPrice =
    typeof price === "number"
      ? price
      : Number(String(price).replace(/[^0-9.-]/g, ""));

  if (!Number.isFinite(numericPrice)) return String(price);

  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericPrice);
}

export default function ProductDetails({ product, navigate, previewMode = false }) {
  const { addToCart } = useCart();
  const { addChair } = useChairRequests();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [tab, setTab] = useState("description");
  const [catalogueProducts, setCatalogueProducts] = useState(products);
  useEffect(() => {
    let active = true;

    async function loadCatalogue() {
      try {
        const response = await fetch("/api/cms/public/products", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = await response.json();
        if (!active || !data?.ok || !Array.isArray(data.products)) return;

        const overrides = new Map(
          data.products.map((item) => [item.slug, item])
        );
        const archived = new Set(
          Array.isArray(data.archivedSlugs) ? data.archivedSlugs : []
        );
        const known = new Set(products.map((item) => item.slug));

        const mergedCatalogue = [
          ...products
            .filter((item) => !archived.has(item.slug))
            .map((item) =>
              overrides.has(item.slug)
                ? mergePublishedProduct(item, overrides.get(item.slug))
                : item
            ),
          ...data.products
            .filter((item) => !known.has(item.slug))
            .map((item) => mergePublishedProduct(null, item)),
        ];

        if (active) {
          setCatalogueProducts(mergedCatalogue);
        }
      } catch {
        // Keep the built-in catalogue if CMS products cannot be loaded.
      }
    }

    loadCatalogue();
    return () => {
      active = false;
    };
  }, []);
  const requestFlow = getProductRequestFlow(product);
  const chair = requestFlow === PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR;
  const related = catalogueProducts
    .filter((p) => p.slug !== product.slug && p.category === product.category)
    .slice(0, 4);

  function submitSelection() {
    if (chair) {
      addChair(product, quantity);
      navigate("/dental-chair-request");
      return;
    }
    addToCart(product, quantity);
    if (requestFlow === PRODUCT_REQUEST_FLOWS.QUOTATION) {
      navigate("/quote");
      return;
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  const description = product.description || product.summary;
  const specifications = Array.isArray(product.specifications)
    ? product.specifications
    : Array.isArray(product.highlights) ? product.highlights : [];
  const documents = getProductDocuments(product.docs);
  const manufacturerSource = safeHttpsUrl(product.manufacturerSource);

  return (
    <main className="bp-detail">
      <div className="container bp-breadcrumb">
        <Link to="/products" navigate={navigate}>
          Products
        </Link>
        <span>›</span>
        <span>{product.category}</span>
        <span>›</span>
        <b>{product.name}</b>
      </div>
      <section className="container bp-detail-main">
        <div className="bp-detail-photo">
          <div className="bp-detail-photo-frame">
            <ProductMediaFrame
              src={product.img}
              alt={product.img ? product.name : `${product.name} image unavailable`}
              variant="detail"
            />
          </div>
        </div>
        <div className="bp-detail-info">
          <p className="bp-eyebrow">{product.brand || "YR Proservice"}</p>
          <h1>{product.name}</h1>
          <p className="bp-detail-model">
            {product.brandLine || product.category}
            {product.subcategory ? ` · ${product.subcategory}` : ""}
          </p>
          <div className="bp-detail-commercial">
            <div>
              <small>PRICE</small>
              <strong>{formatProductPrice(product.price)}</strong>
            </div>
            <div>
              <small>AVAILABILITY</small>
              <strong className={`stock-${product.stockStatus}`}>
                {stockLabel(product.stockStatus)}
              </strong>
            </div>
          </div>
          <p className="bp-detail-summary">{description}</p>
          {!previewMode && <div className="bp-detail-qty">
            <span>Quantity</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              −
            </button>
            <b>{quantity}</b>
            <button type="button" onClick={() => setQuantity((q) => q + 1)}>
              +
            </button>
          </div>}
          <button
            className="bp-btn bp-btn-primary bp-detail-main-action"
            type="button"
            onClick={submitSelection}
            disabled={previewMode}
          >
            {previewMode
              ? "Preview only — ordering disabled"
              : chair
                ? "Request Chair Consultation →"
                : requestFlow === PRODUCT_REQUEST_FLOWS.QUOTATION
                  ? "Request a Quote →"
                  : added
                    ? "Added to Cart ✓"
                    : "Add to Cart →"}
          </button>
          {previewMode ? <p className="bp-admin-note">This is an administrator preview. No cart or quotation action will be submitted.</p> : <p className="bp-admin-note">
            Price and availability are catalogue fields reserved for future
            admin updates. Manufacturer-specific technical details are shown
            below when verified.
          </p>}
        </div>
      </section>

      <section className="container bp-detail-lower">
        <div className="bp-detail-content">
          <div
            className="bp-detail-tabs"
            role="tablist"
            aria-label="Product information"
          >
            <button
              type="button"
              className={tab === "description" ? "active" : ""}
              onClick={() => setTab("description")}
            >
              Description
            </button>
            <button
              type="button"
              className={tab === "specifications" ? "active" : ""}
              onClick={() => setTab("specifications")}
            >
              Specifications
            </button>
            <button
              type="button"
              className={tab === "reviews" ? "active" : ""}
              onClick={() => setTab("reviews")}
            >
              Reviews
            </button>
          </div>
          {tab === "description" && (
            <div className="bp-tab-panel">
              <p className="bp-eyebrow">PRODUCT DESCRIPTION</p>
              <h2>Designed for the way the clinic works.</h2>
              <p>{description}</p>
              {manufacturerSource && (
                <p className="bp-source-note">
                  Manufacturer information:{" "}
                  <a
                    href={manufacturerSource}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View manufacturer information ↗
                  </a>
                </p>
              )}
              {documents.length > 0 && (
                <div className="bp-product-documents">
                  <h3>Product documents</h3>
                  <ul>
                    {documents.map((document, index) => (
                      <li key={index}>
                        <a href={document.url} target="_blank" rel="noreferrer">
                          {document.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {tab === "specifications" && (
            <div className="bp-tab-panel">
              <p className="bp-eyebrow">SPECIFICATIONS</p>
              <h2>Key product information</h2>
              <ul className="bp-spec-list">
                {specifications.length ? (
                  specifications.map((item, index) => (
                    <li key={index}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {formatSpecification(item)}
                    </li>
                  ))
                ) : (
                  <li>
                    <span>—</span>Technical values for this exact model have not
                    yet been verified from manufacturer documentation. This page
                    shows only confirmed product information; no figures have
                    been invented.
                  </li>
                )}
              </ul>
            </div>
          )}
          {tab === "reviews" && (
            <div className="bp-tab-panel">
              <p className="bp-eyebrow">CUSTOMER REVIEWS</p>
              <h2>Reviews will appear here.</h2>
              <p>
                {product.reviewStatus || "No customer reviews published yet."}
              </p>
              <div className="bp-review-empty">
                <span>—</span>
                <div>
                  <strong>No rating displayed</strong>
                  <p>
                    We are not displaying a star rating until genuine customer
                    reviews are collected.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <aside className="bp-detail-aside">
          <p className="bp-eyebrow">KEY INFORMATION</p>
          <h3>Product Details</h3>
          <dl>
            <dt>Brand</dt>
            <dd>{product.brand || "Other"}</dd>
            <dt>Category</dt>
            <dd>{product.category}</dd>
            {product.subcategory && (
              <>
                <dt>Type</dt>
                <dd>{product.subcategory}</dd>
              </>
            )}
          </dl>
          <div className="bp-detail-aside-status">
            <span>Availability</span>
            <b>{stockLabel(product.stockStatus)}</b>
          </div>
        </aside>
      </section>

      {related.length > 0 && (
        <section className="bp-related">
          <div className="container">
            <div className="bp-section-head">
              <div>
                <p className="bp-eyebrow">YOU MAY ALSO LIKE</p>
                <h2>Related Products</h2>
              </div>
              <Link
                to="/products"
                navigate={navigate}
                className="bp-btn bp-btn-outline-blue"
              >
                Browse Catalogue →
              </Link>
            </div>
            <div className="bp-product-grid">
              {related.map((item) => (
                <Link
                  key={`${item.slug}-${item.name}`}
                  to={`/products/${item.slug}`}
                  navigate={navigate}
                  className="bp-product-card"
                >
                  <div className="bp-product-img">
                    <ProductMediaFrame
                      src={item.img}
                      alt={item.name}
                      variant="related"
                    />
                  </div>
                  <div className="bp-product-body">
                    <small>{item.brand}</small>
                    <h3>{item.name}</h3>
                    <span>View Details →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
