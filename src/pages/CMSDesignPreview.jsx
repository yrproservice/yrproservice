import React, { useEffect, useState } from "react";
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
import { SiteHeader, SiteFooter } from "../components/Layout";
import { products } from "../data/products";
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
  "track-request": "Track a request"
};

export default function CMSDesignPreview() {
  const [pageKey, setPageKey] = useState("");
  const [design, setDesign] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
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
        const value = row?.draft_value || row?.published_value || "{}";
        return { selectedPage, value: typeof value === "string" ? JSON.parse(value) : value };
      })
      .then((result) => {
        if (!active) return;
        if (!PAGE_LABELS[result.selectedPage]) throw new Error("This page template is not supported by the design preview.");
        setPageKey(result.selectedPage);
        setDesign(result.value || {});
      })
      .catch((err) => { if (active) setError(err.message || "Unable to load the design preview."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  let page = null;
  switch (pageKey) {
    case "site-chrome": page = <><SiteHeader path="/" navigate={navigatePreview} /><Home navigate={navigatePreview} /><SiteFooter navigate={navigatePreview} /></>; break;
    case "home": page = <Home navigate={navigatePreview} />; break;
    case "products": page = <Products navigate={navigatePreview} />; break;
    case "product-detail": page = <ProductDetails product={products[0]} navigate={navigatePreview} />; break;
    case "services": page = <Services navigate={navigatePreview} />; break;
    case "service-detail": page = <ServiceDetails service={services[0]} navigate={navigatePreview} />; break;
    case "team": page = <Team navigate={navigatePreview} />; break;
    case "cart": page = <Cart navigate={navigatePreview} />; break;
    case "dental-chair-request": page = <DentalChairRequest navigate={navigatePreview} />; break;
    case "quote": page = <Quote navigate={navigatePreview} />; break;
    case "service-request": page = <ServiceRequest navigate={navigatePreview} />; break;
    case "track-request": page = <TrackRequest />; break;
    default: page = null;
  }

  return (
    <div className="cms-full-preview cms-design-preview">
      <div className="cms-full-preview-bar">
        <div>
          <strong>{PAGE_LABELS[pageKey] || "Page design preview"}</strong>
          <span>Visual draft preview · Not published to the public website</span>
        </div>
        <button type="button" className="admin-secondary-button" onClick={() => window.close()}>Close preview</button>
      </div>
      {loading ? <div className="cms-full-preview-message">Loading saved design…</div>
        : error ? <div className="cms-full-preview-message">{error}</div>
        : design && page ? (
          <div className="cms-design-preview-content" onClickCapture={(event) => { event.preventDefault(); event.stopPropagation(); }} onSubmitCapture={(event) => { event.preventDefault(); event.stopPropagation(); }}>
            <PageDesignScope pageKey={pageKey} designOverride={design}>{page}</PageDesignScope>
          </div>
        ) : <div className="cms-full-preview-message">This page preview could not be rendered.</div>}
    </div>
  );
}
