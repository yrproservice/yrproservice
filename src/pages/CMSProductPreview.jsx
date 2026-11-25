import React, { useEffect, useState } from "react";
import ProductDetails from "./ProductDetails";
import ShowroomProductCard from "../components/ShowroomProductCard";
import { products as catalogue } from "../data/products";
import { mergePublishedProduct } from "../data/productImages";

export default function CMSProductPreview() {
  const [product, setProduct] = useState(null);
  const [version, setVersion] = useState(null);
  const [isDraft, setIsDraft] = useState(false);
  const [previewView, setPreviewView] = useState("details");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const slug = new URLSearchParams(window.location.search).get("slug") || "";
    if (!slug) {
      setError("A product slug is required to preview a product.");
      setLoading(false);
      return () => { active = false; };
    }
    fetch(`/api/cms/admin/product-preview?slug=${encodeURIComponent(slug)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store"
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load product preview.");
        return result;
      })
      .then((result) => {
        if (!active) return;
        const base = catalogue.find((item) => item.slug === result.product?.slug);
        setProduct(mergePublishedProduct(base, result.product));
        setVersion(result.version);
        setIsDraft(result.isDraft);
      })
      .catch((err) => { if (active) setError(err.message || "Unable to load product preview."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="cms-full-preview">
      <div className="cms-full-preview-bar">
        <div><strong>{product?.name || "Product Preview"}</strong><span>{isDraft ? `Draft V${version} · Not published` : `Published V${version} · Read-only preview`}</span></div>
        <div className="cms-product-preview-tools">
          <div className="cms-product-preview-switch" role="group" aria-label="Product preview layout">
            <button type="button" className={previewView === "details" ? "active" : ""} aria-pressed={previewView === "details"} onClick={() => setPreviewView("details")}>Product details</button>
            <button type="button" className={previewView === "card" ? "active" : ""} aria-pressed={previewView === "card"} onClick={() => setPreviewView("card")}>Showroom card</button>
          </div>
          <button type="button" className="admin-secondary-button" onClick={() => window.close()}>Close preview</button>
        </div>
      </div>
      {loading ? <div className="cms-full-preview-message">Loading product preview…</div>
        : error ? <div className="cms-full-preview-message" role="alert">{error}</div>
        : product ? previewView === "card" ? (
          <section className="cms-product-card-preview" aria-label="Unpublished showroom card preview">
            <div className="cms-product-card-preview-heading">
              <strong>Showroom card · {isDraft ? `Draft V${version}` : `Published V${version}`}</strong>
              <span>This is a preview only. The public Products page is unchanged.</span>
            </div>
            <div className="cms-product-card-preview-stage">
              <div className="cms-product-card-preview-item">
                <ShowroomProductCard product={product} navigate={() => {}} onPrimaryAction={() => {}} />
              </div>
            </div>
          </section>
        ) : <ProductDetails product={product} navigate={(to) => { window.location.href = to; }} previewMode />
        : <div className="cms-full-preview-message">No product preview is available.</div>}
    </div>
  );
}
