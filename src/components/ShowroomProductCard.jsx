import React from "react";
import { Link } from "./Layout";
import ProductMediaFrame from "./ProductMediaFrame";
import { getProductRequestFlow, PRODUCT_REQUEST_FLOWS } from "../data/productWorkflow";

export default function ShowroomProductCard({ product, navigate, onPrimaryAction, added = false }) {
  const flow = getProductRequestFlow(product);
  const isChair = flow === PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR;
  const isQuotation = flow === PRODUCT_REQUEST_FLOWS.QUOTATION;
  const actionLabel = isChair
    ? "Request Chair"
    : isQuotation
      ? "Request Quote"
      : added
        ? "Added ✓"
        : "Add to Cart";
  const badgeLabel = isChair ? "Chair consultation" : isQuotation ? "Quotation" : "Catalogue";

  return (
    <article className="bp-catalog-card">
      <Link
        to={`/products/${product.slug}`}
        navigate={navigate}
        className="bp-catalog-main-link"
      >
        <div className="bp-catalog-image">
          <ProductMediaFrame
            src={product.img}
            alt={product.img ? product.name : `${product.name} image unavailable`}
            variant="catalog"
            onError={(event) => {
              event.currentTarget.src = "/favicon.png";
              event.currentTarget.onerror = null;
            }}
          />
          <span className="bp-image-badge">{badgeLabel}</span>
        </div>
        <div className="bp-catalog-body">
          <small>{product.brand || "YR Proservice"}</small>
          <h3>{product.name}</h3>
          <span className="bp-product-type">{product.brandLine || product.category}</span>
          <p>{product.summary}</p>
        </div>
      </Link>
      <div className="bp-card-actions">
        <Link
          to={`/products/${product.slug}`}
          navigate={navigate}
          className="bp-card-detail"
        >
          View Details <span>→</span>
        </Link>
        <button
          type="button"
          className="bp-card-action-primary"
          onClick={() => onPrimaryAction(product)}
        >
          {actionLabel}
        </button>
      </div>
    </article>
  );
}
