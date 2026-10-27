import React, { useState } from "react";
import { Link } from "../components/Layout";
import { products } from "../data/products";
import { useCart } from "../components/CartContext";
import { useChairRequests } from "../components/ChairRequestContext";

function stockLabel(status) {
  if (status === "in-stock") return "In Stock";
  if (status === "out-of-stock") return "Out of Stock";
  return "Availability to be updated";
}

export default function ProductDetails({ product, navigate }) {
  const { addToCart } = useCart();
  const { addChair } = useChairRequests();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [tab, setTab] = useState("description");
  const chair = product.purchaseType === "quote";
  const related = products
    .filter((p) => p.slug !== product.slug && p.category === product.category)
    .slice(0, 4);

  function submitSelection() {
    if (chair) {
      addChair(product, quantity);
      navigate("/dental-chair-request");
      return;
    }
    addToCart(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  const description = product.description || product.summary;
  const specifications = product.specifications || product.highlights || [];

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
            <img
              src={product.img}
              onError={(event) => {
                event.currentTarget.src = "/favicon.png";
                event.currentTarget.onerror = null;
              }}
              alt={product.name}
            />
          </div>
          <div className="bp-thumb-row">
            <span className="active">
              <img
                src={product.img}
                onError={(event) => {
                  event.currentTarget.src = "/favicon.png";
                  event.currentTarget.onerror = null;
                }}
                alt="Product view"
              />
            </span>
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
              <strong>{product.price || "Price on request"}</strong>
            </div>
            <div>
              <small>AVAILABILITY</small>
              <strong className={`stock-${product.stockStatus}`}>
                {stockLabel(product.stockStatus)}
              </strong>
            </div>
          </div>
          <p className="bp-detail-summary">{description}</p>
          <div className="bp-detail-qty">
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
          </div>
          <button
            className="bp-btn bp-btn-primary bp-detail-main-action"
            type="button"
            onClick={submitSelection}
          >
            {chair
              ? "Request a Quote →"
              : added
                ? "Added to Cart ✓"
                : "Add to Cart →"}
          </button>
          <p className="bp-admin-note">
            Price and availability are catalogue fields reserved for future
            admin updates. Manufacturer-specific technical details are shown
            below when verified.
          </p>
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
              {product.manufacturerSource && (
                <p className="bp-source-note">
                  Manufacturer information:{" "}
                  <a
                    href={product.manufacturerSource}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View official product page ↗
                  </a>
                </p>
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
                      {item}
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
                    <img
                      src={item.img}
                      onError={(event) => {
                        event.currentTarget.src = "/favicon.png";
                        event.currentTarget.onerror = null;
                      }}
                      alt={item.name}
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
