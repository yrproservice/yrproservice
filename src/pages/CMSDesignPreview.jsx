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