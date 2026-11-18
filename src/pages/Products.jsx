import React, { useEffect, useState } from "react";
import { products } from "../data/products";
import { useCart } from "../components/CartContext";
import { useChairRequests } from "../components/ChairRequestContext";
import { Link } from "../components/Layout";
import { mergePublishedProduct } from "../data/productImages";
import ShowroomProductCard from "../components/ShowroomProductCard";
import ProductMediaFrame from "../components/ProductMediaFrame";
import { getProductRequestFlow, isDentalChairProduct, PRODUCT_REQUEST_FLOWS } from "../data/productWorkflow";
import { matchesProductSearch } from "../data/productSearch";

export default function Products({ navigate }) {
  const [search, setSearch] = useState("");
  const [cmsProducts, setCmsProducts] = useState([]);
  const [archivedSlugs, setArchivedSlugs] = useState([]);
  useEffect(() => {
    let active = true;
    fetch("/api/cms/public/products", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data?.ok && Array.isArray(data.products)) { setCmsProducts(data.products); setArchivedSlugs(Array.isArray(data.archivedSlugs) ? data.archivedSlugs : []); } })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const overrides = new Map(cmsProducts.map((item) => [item.slug, item]));
  const merged = products
    .filter((item) => !archivedSlugs.includes(item.slug))
    .map((item) => overrides.has(item.slug)
      ? mergePublishedProduct(item, overrides.get(item.slug))
      : item);
  const known = new Set(products.map((item) => item.slug));
  const catalogueProducts = [
    ...merged,
    ...cmsProducts
      .filter((item) => !known.has(item.slug))
      .map((item) => mergePublishedProduct(null, item)),
  ];

  const [category, setCategory] = useState("All");
  const [brand, setBrand] = useState("All");
  const [addedSlug, setAddedSlug] = useState("");
  const { addToCart } = useCart();
  const { addChair } = useChairRequests();

  const categories = [
    "All",
    ...new Set(catalogueProducts.map((product) => product.category).filter(Boolean)),
  ];
  const brands = [
    "All",
    ...new Set(catalogueProducts.map((product) => product.brand || "Other")),
  ];
  const filtered = catalogueProducts.filter((product) => {
    const matchesCategory = category === "All" || product.category === category;
    const matchesBrand = brand === "All" || (product.brand || "Other") === brand;
    return matchesCategory && matchesBrand && matchesProductSearch(product, search);
  });
  const chairs = catalogueProducts.filter(isDentalChairProduct);
  const showcaseChair =
    chairs.find((p) => p.slug === "signo-t100") || chairs[0];
  const spotlight = catalogueProducts.filter((p) =>
    ["mocom-m10", "signo-t100", "cingol-x3"].includes(p.slug),
  );

  function handleAction(product) {
    const flow = getProductRequestFlow(product);
    if (flow === PRODUCT_REQUEST_FLOWS.DENTAL_CHAIR) {
      addChair(product);
      navigate("/dental-chair-request");
      return;
    }
    addToCart(product);
    if (flow === PRODUCT_REQUEST_FLOWS.QUOTATION) {
      navigate("/quote");
      return;
    }
    setAddedSlug(product.slug);
    window.setTimeout(
      () =>
        setAddedSlug((current) => (current === product.slug ? "" : current)),
      1400,
    );
  }

  return (
    <main className="bp-products">
      <section className="products-showroom-hero">
        <div className="container products-showroom-grid">
          <div>
            <p className="bp-eyebrow">YR PROSERVICE · PRODUCT SHOWROOM</p>
            <h1>
              Equipment worth
              <br />
              <span>looking closer at.</span>
            </h1>
            <p>
              Explore dental chairs, handpieces and clinic equipment with
              dedicated product information and a clear quotation path.
            </p>
            <div className="products-hero-stats">
              <span>
                <b>{catalogueProducts.length}</b> products
              </span>
              <span>
                <b>{chairs.length}</b> chair models
              </span>
              <span>
                <b>{new Set(catalogueProducts.map((p) => p.brand)).size}</b> brands
              </span>
            </div>
          </div>
          <div className="products-hero-image">
            <ProductMediaFrame
              src={showcaseChair?.img}
              alt={showcaseChair?.name || "Featured dental chair"}
              variant="hero"
            />
            <div className="products-hero-label">
              <small>{showcaseChair?.brand}</small>
              <strong>{showcaseChair?.name}</strong>
              <Link to={`/products/${showcaseChair?.slug}`} navigate={navigate}>
                View featured chair →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bp-catalog">
        <div className="container">
          <div className="catalog-intro-v7">
            <div>
              <p className="bp-eyebrow">THE SHOWROOM</p>
              <h2>Choose by what you need.</h2>
            </div>
            <p>
              Start with a category, narrow by brand, then open a product detail
              to see the information available before adding it to your request.
            </p>
          </div>
          <div className="bp-filter-tabs">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? "active" : ""}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="bp-toolbar">
            <label className="catalog-search">
              <span>⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products, brands or types..."
                aria-label="Search products"
              />
            </label>
            <select value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="All">All Brands</option>
              {brands.slice(1).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <span>{filtered.length} products</span>
          </div>

          <div className="spotlight-row">
            {spotlight.map((p, index) => (
              <Link
                key={p.slug}
                to={`/products/${p.slug}`}
                navigate={navigate}
                className={`spotlight-card spotlight-${index + 1}`}
              >
                <div>
                  <p className="bp-eyebrow">{p.brand}</p>
                  <h3>{p.name}</h3>
                  <span>{p.brandLine}</span>
                </div>
                <ProductMediaFrame
                  src={p.img}
                  alt={p.name}
                  variant="spotlight"
                />
                <b>Explore →</b>
              </Link>
            ))}
          </div>

          <div className="bp-catalog-grid">
            {filtered.map((product) => (
              <ShowroomProductCard
                key={product.slug}
                product={product}
                navigate={navigate}
                onPrimaryAction={handleAction}
                added={addedSlug === product.slug}
              />
            ))}
          </div>

          {!filtered.length && (
            <div className="bp-empty">
              <h2>No products found</h2>
              <p>Try another product name, brand or category.</p>
              <button
                className="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                  setBrand("All");
                }}
              >
                Reset Catalogue
              </button>
            </div>
          )}
          <div className="bp-catalog-bottom">
            <div>
              <p className="bp-eyebrow">NEED A HAND?</p>
              <h2>Not sure which product fits?</h2>
              <p>
                Send your clinic requirement through the quotation route and let
                us help narrow down the equipment.
              </p>
            </div>
            <Link
              to="/quote"
              navigate={navigate}
              className="bp-btn bp-btn-primary"
            >
              Ask for Product Guidance →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
