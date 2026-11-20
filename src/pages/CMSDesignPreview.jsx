import React, { useEffect, useRef, useState } from "react";
import PageDesignScope from "../components/PageDesignScope";
import Home from "./Home";
import Products from "./Products";
import ProductDetails from "./ProductDetails";
import Services from "./Services";
import ServiceDetails from "./ServiceDetails";
import Team from "./Team";
import Cart from "./Cart";
import DentalChairRequest from "./DentalChairRequest";
import Quote from "./Quote";
import ServiceRequest from "./ServiceRequest";
import TrackRequest from "./TrackRequest";
import Contact from "./Contact";
import { SiteHeader, SiteFooter } from "../components/Layout";
import { products } from "../data/products";
import { mergePublishedProduct } from "../data/productImages";
import { services } from "../data/services";

const PAGE_LABELS = {
  "site-chrome": "Shared header and footer",
  home: "Home",
  products: "Products listing",
  "product-detail": "Product details",
  services: "Services listing",
  "service-detail": "Service details",
  team: "Team",
  cart: "Product cart",
  "dental-chair-request": "Dental chair request",
  quote: "Quotation request",
  "service-request": "Service request",
  "track-request": "Track a request",
  contact: "HR Contact"
};

export default function CMSDesignPreview() {
  const [pageKey, setPageKey] = useState("");
  const [design, setDesign] = useState(null);
  const [versionStatus, setVersionStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [productChoices, setProductChoices] = useState([]);
  const [selectedProductSlug, setSelectedProductSlug] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(false);
  const productPreviewRequest = useRef(0);
  const navigatePreview = (to) => { window.location.href = to; };

  useEffect(() => {
    let active = true;
    const key = new URLSearchParams(window.location.search).get("key") || "";
    const prefix = "page-design.";
    if (!key.startsWith(prefix)) {
      setError("A page design key is required.");
      setLoading(false);
      return () => { active = false; };
    }
    const selectedPage = key.slice(prefix.length);
    fetch("/api/cms/admin/settings", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load the saved design.");
        const row = (result.settings || []).find((item) => item.setting_key === key);
        const isDraft = Boolean(row?.draft_id);
        const version = isDraft ? row.draft_version : row?.published_version;
        const value = row?.draft_value || row?.published_value || "{}";
        return {
          selectedPage,
          value: typeof value === "string" ? JSON.parse(value) : value,
          versionStatus: version
            ? isDraft ? `Saved draft V${version} · Not published` : `Published Preview V${version} · Read-only`
            : "No saved design version"
        };
      })
      .then(async (result) => {
        if (!active) return;
        if (!PAGE_LABELS[result.selectedPage]) throw new Error("This page template is not supported by the design preview.");
        setPageKey(result.selectedPage);
        setDesign(result.value || {});
        setVersionStatus(result.versionStatus);
        if (result.selectedPage === "product-detail") {
          const requestedSlug = new URLSearchParams(window.location.search).get("slug") || "";
          const listResponse = await fetch("/api/cms/admin/products", { headers: { Accept: "application/json" }, cache: "no-store" });
          const listData = await listResponse.json().catch(() => ({}));
          if (!listResponse.ok || !listData.ok || !Array.isArray(listData.products)) {
            throw new Error(listData.error || "Unable to load products for the design preview.");
          }
          const cmsSlugs = listData.products.map((item) => item.product_slug).filter(Boolean);
          const allSlugs = [...new Set([...products.map((item) => item.slug), ...cmsSlugs])];
          const slug = allSlugs.includes(requestedSlug) ? requestedSlug : (cmsSlugs[0] || products[0]?.slug || "");
          setProductChoices(allSlugs.map((value) => {
            const row = listData.products.find((item) => item.product_slug === value);
            let cmsName = "";
            for (const raw of [row?.draft_product, row?.published_product]) {
              if (!raw) continue;
              try {
                const parsed = JSON.parse(raw);
                if (typeof parsed?.name === "string" && parsed.name.trim()) {
                  cmsName = parsed.name.trim();
                  break;
                }
              } catch {
                // Ignore malformed legacy JSON and use the static catalogue label.
              }
            }
            return {
              slug: value,
              name: cmsName || products.find((item) => item.slug === value)?.name || value
            };
          }));
          setSelectedProductSlug(slug);
          if (slug) {
            const productResponse = await fetch("/api/cms/admin/product-preview?slug=" + encodeURIComponent(slug), { headers: { Accept: "application/json" }, cache: "no-store" });
            const productData = await productResponse.json().catch(() => ({}));
            if (productResponse.ok && productData.ok && productData.product) {
              if (active) setSelectedProduct(mergePublishedProduct(products.find((item) => item.slug === slug), productData.product));
            } else {
              const staticProduct = products.find((item) => item.slug === slug);
              if (active) setSelectedProduct(staticProduct || null);
            }
          }
        }
      })
      .catch((err) => { if (active) setError(err.message || "Unable to load the design preview."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function changePreviewProduct(slug) {
    const requestId = ++productPreviewRequest.current;
    setSelectedProductSlug(slug);
    setProductLoading(true);
    setSelectedProduct(null);
    setError("");
    try {
      const response = await fetch("/api/cms/admin/product-preview?slug=" + encodeURIComponent(slug), { headers: { Accept: "application/json" }, cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok || !result.product) {
        const staticProduct = products.find((item) => item.slug === slug);
        if (!staticProduct) throw new Error(result.error || "Unable to load this product preview.");
        if (requestId === productPreviewRequest.current) setSelectedProduct(staticProduct);
      } else if (requestId === productPreviewRequest.current) {
        setSelectedProduct(mergePublishedProduct(products.find((item) => item.slug === slug), result.product));
      }
    } catch (err) {
      if (requestId === productPreviewRequest.current) setError(err.message || "Unable to load this product preview.");
    } finally {
      if (requestId === productPreviewRequest.current) setProductLoading(false);
    }
  }

  let page = null;
  switch (pageKey) {
    case "site-chrome": page = <><SiteHeader path="/" navigate={navigatePreview} /><Home navigate={navigatePreview} /><SiteFooter navigate={navigatePreview} /></>; break;
    case "home": page = <Home navigate={navigatePreview} />; break;
    case "products": page = <Products navigate={navigatePreview} />; break;
    case "product-detail": page = selectedProduct ? <ProductDetails product={selectedProduct} navigate={navigatePreview} previewMode /> : null; break;
    case "services": page = <Services navigate={navigatePreview} />; break;
    case "service-detail": page = <ServiceDetails service={services[0]} navigate={navigatePreview} />; break;
    case "team": page = <Team navigate={navigatePreview} />; break;
    case "cart": page = <Cart navigate={navigatePreview} />; break;
    case "dental-chair-request": page = <DentalChairRequest navigate={navigatePreview} />; break;
    case "quote": page = <Quote navigate={navigatePreview} />; break;
    case "service-request": page = <ServiceRequest navigate={navigatePreview} />; break;
    case "track-request": page = <TrackRequest />; break;
    case "contact": page = <Contact navigate={navigatePreview} />; break;
    default: page = null;
  }

  return (
    <div className="cms-full-preview cms-design-preview">
      <div className="cms-full-preview-bar">
        <div>
          <strong>{PAGE_LABELS[pageKey] || "Page design preview"}</strong>
          <span>{versionStatus} · Public website unchanged</span>
        </div>
        <div className="cms-design-preview-tools">
          {pageKey === "product-detail" && (
            <label className="cms-design-preview-product-select">
              Preview product
              <select value={selectedProductSlug} onChange={(event) => changePreviewProduct(event.target.value)} disabled={productLoading}>
                {productChoices.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
              </select>
            </label>
          )}
          <button type="button" className="admin-secondary-button" onClick={() => window.close()}>Close preview</button>
        </div>
      </div>
      {loading ? <div className="cms-full-preview-message">Loading saved design…</div>
        : error ? <div className="cms-full-preview-message">{error}</div>
        : productLoading ? <div className="cms-full-preview-message">Loading selected product…</div>
        : design && page ? (
          <div
            className="cms-design-preview-content"
            onClickCapture={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onSubmitCapture={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <PageDesignScope pageKey={pageKey} designOverride={design}>{page}</PageDesignScope>
          </div>
        ) : <div className="cms-full-preview-message">This page preview could not be rendered.</div>}
    </div>
  );
}
