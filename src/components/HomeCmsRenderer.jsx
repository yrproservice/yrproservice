import React, { useEffect, useState } from "react";
import { Link } from "../components/Layout";
import { products } from "../data/products";
import { loadPublishedCatalogue } from "../data/publishedCatalogue";
import ProductMediaFrame from "./ProductMediaFrame";

function CmsLink({ to, navigate, className, children }) {
  if (!to) return null;
  return (
    <Link to={to} navigate={navigate} className={className}>
      {children}
    </Link>
  );
}

function HomeCmsSection({ section, navigate, design, catalogueProducts }) {
  const c = section.content || {};
  const items = Array.isArray(c.items) ? c.items : [];
  const sectionDesign = design?.sections?.[section.id] || {};
  const sectionStyle = {
    backgroundColor: sectionDesign.backgroundColor || undefined,
    textAlign: sectionDesign.textAlign || undefined,
    ...(sectionDesign.textColor ? { "--home-section-text": sectionDesign.textColor } : {}),
    ...(sectionDesign.accentColor ? { "--home-section-accent": sectionDesign.accentColor } : {}),
    "--home-card-columns": sectionDesign.cardColumns || "auto"
  };
  if (section.visible === false) return null;

  switch (section.type) {
    case "hero":
      return (
        <section
          className="bp-home-hero home-cms-section home-cms-hero"
          key={section.id}
          style={sectionStyle}
          data-card-columns={sectionDesign.cardColumns || "auto"}
          data-layout={c.layout || "overlay-left"}
        >
        <img
          src={c.imageUrl || "/assets/hero-operatory.jpg"}
          alt={c.imageAlt || ""}
          className="bp-hero-image"
          style={{
            objectPosition: c.imagePosition || "center",
            height:
              c.imageFit === "original"
                ? "auto"
                : c.imageHeight
                  ? `${c.imageHeight}px`
                  : undefined,
            objectFit:
              c.imageFit === "contain"
                ? "contain"
                : c.imageFit === "original"
                  ? "initial"
                  : undefined,
          }}
        />
        <div className="bp-hero-overlay" />
        <div className="bp-hero-lines" aria-hidden="true" />
        <div className="container bp-hero-content"><div className="bp-hero-copy">
          <p className="bp-eyebrow bp-eyebrow-light">{c.eyebrow}</p>
          <h1>
            {c.heading}
            {c.headingHighlight && (
              <>
                <br />
                <span>{c.headingHighlight}</span>
              </>
            )}
          </h1>
          <p>{c.description}</p>
          <div className="bp-actions">
            <CmsLink
              to={c.buttonUrl || "/products"}
              navigate={navigate}
              className="bp-btn bp-btn-primary"
            >
              {c.buttonText || "Explore Products"} <b>→</b>
            </CmsLink>
            {c.secondaryButtonText && (
              <CmsLink
                to={c.secondaryButtonUrl || "/services"}
                navigate={navigate}
                className="bp-btn bp-btn-outline"
              >
                {c.secondaryButtonText}
              </CmsLink>
            )}
          </div>
          <div className="bp-hero-proof">
            {(c.proofItems || []).map((item, index) => (
              <React.Fragment key={item}>
                {index > 0 && <i>•</i>}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </div>
        </div></div>
      </section>;
    case "feature-grid":
      return (
        <section
          className="bp-section bp-provide home-cms-section"
          key={section.id}
          style={sectionStyle}
          data-card-columns={sectionDesign.cardColumns || "auto"}
        >
          <div className="container">
        <div className="bp-section-head"><div><p className="bp-eyebrow">{c.eyebrow}</p><h2>{c.heading}</h2></div><p>{c.description}</p></div>
        <div className="bp-provide-grid">
          {items.map((item, index) => (
            <article
              key={item.number || index}
              className="bp-provide-card"
            >
              <div className="bp-icon">
                {item.heading === "Installation" ? "↗" : item.icon}
              </div>
              <span>{item.number || String(index + 1).padStart(2, "0")}</span>
              <h3>{item.heading}</h3>
              <p>{item.description}</p>
              <CmsLink to={item.url} navigate={navigate}>
                Explore <b>→</b>
              </CmsLink>
            </article>
          ))}
        </div>
      </div></section>;
    case "editorial":
      return (
        <section
          className="bp-home-editorial home-cms-section home-cms-editorial"
          key={section.id}
          style={sectionStyle}
          data-card-columns={sectionDesign.cardColumns || "auto"}
          data-layout={c.layout || "split-right"}
        >
          <div className="container bp-editorial-grid">
        <div className="bp-editorial-copy">
          <p className="bp-eyebrow">{c.eyebrow}</p>
          <h2>{c.heading}</h2>
          <p>{c.description}</p>
          <CmsLink
            to={c.buttonUrl}
            navigate={navigate}
            className="bp-text-link"
          >
            {c.buttonText} <b>→</b>
          </CmsLink>
        </div>
        <div className="bp-editorial-feature">
          <img
            src={c.imageUrl}
            alt={c.imageAlt || ""}
            style={{
              objectPosition: c.imagePosition || "center",
              height: c.imageHeight ? `${c.imageHeight}px` : undefined,
            }}
          />
          <div>
            <span>{c.imageNumber || "01"}</span>
            <strong>{c.imageTitle}</strong>
            <p>{c.imageDescription}</p>
          </div>
        </div>
      </div></section>;
    case "product-grid": {
      const featured = catalogueProducts.filter((p) => (c.productSlugs || []).includes(p.slug));
      return <section className="bp-featured home-cms-section" key={section.id} style={sectionStyle} data-card-columns={sectionDesign.cardColumns || "auto"}><div className="container">
        <div className="bp-section-head bp-head-light">
          <div>
            <p className="bp-eyebrow bp-eyebrow-light">{c.eyebrow}</p>
            <h2>{c.heading}</h2>
          </div>
          <CmsLink
            to={c.buttonUrl || "/products"}
            navigate={navigate}
            className="bp-outline-light"
          >
            {c.buttonText || "View All Products"} →
          </CmsLink>
        </div>
        <div className="bp-product-grid">
          {featured.map((product) => (
            <article className="bp-product-card" key={product.slug}>
              <Link
                to={`/products/${product.slug}`}
                navigate={navigate}
              >
                <div className="bp-product-img">
                  <ProductMediaFrame
                    src={product.img}
                    alt={
                      product.img
                        ? product.name
                        : `${product.name} image unavailable`
                    }
                    variant="featured"
                  />
                </div>
                <div className="bp-product-body">
                  <small>{product.brand || "YR Proservice"}</small>
                  <h3>{product.name}</h3>
                  <p>{product.summary}</p>
                  <span>View Details →</span>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div></section>;
    }
    case "brand-grid":
      return <section className="bp-brands home-cms-section" key={section.id} style={sectionStyle} data-card-columns={sectionDesign.cardColumns || "auto"}><div className="container">
        <div className="bp-section-head"><div><p className="bp-eyebrow">{c.eyebrow}</p><h2>{c.heading}</h2></div><p>{c.description}</p></div>
        <div className="yr-brand-grid">
          {items.map((file) => {
            const brandName = String(file).replace(/\.[^.]+$/, "");

            return (
              <div className="bp-brand-card" key={file}>
                <img
                  src={`/brand logo/fitted/${brandName}.png`}
                  alt={brandName + " dental equipment brand"}
                />
              </div>
            );
          })}
        </div>
      </div></section>;
    case "services-banner":
      return (
        <section
          className="bp-services-strip home-cms-section home-cms-services"
          key={section.id}
          style={sectionStyle}
          data-card-columns={sectionDesign.cardColumns || "auto"}
          data-layout={c.layout || "split-right"}
        >
          <div className="container">
            <div className="bp-services-banner">
        <img
          src={c.imageUrl}
          alt={c.imageAlt || ""}
          style={{
            objectPosition: c.imagePosition || "center",
            height: c.imageHeight ? `${c.imageHeight}px` : undefined,
          }}
        />
        <div className="bp-services-copy">
          <p className="bp-eyebrow bp-eyebrow-light">{c.eyebrow}</p>
          <h2>{c.heading}</h2>
          <p>{c.description}</p>
          <CmsLink
            to={c.buttonUrl || "/services"}
            navigate={navigate}
            className="bp-btn bp-btn-primary"
          >
            {c.buttonText || "View Services"} →
          </CmsLink>
        </div>
      </div></div></section>;
    case "benefits-grid":
      return <section className="bp-why home-cms-section" key={section.id} style={sectionStyle} data-card-columns={sectionDesign.cardColumns || "auto"}><div className="container">
        <div className="bp-section-head"><div><p className="bp-eyebrow">{c.eyebrow}</p><h2>{c.heading}</h2></div><p>{c.description}</p></div>
        <div className="bp-why-grid">
          {items.map((item, index) => (
            <div key={item.number || index}>
              <b>{item.number || String(index + 1).padStart(2, "0")}</b>
              <h3>{item.heading}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </div></section>;
    case "cta":
      return (
        <section
          className="bp-final-cta home-cms-section"
          key={section.id}
          style={sectionStyle}
          data-card-columns={sectionDesign.cardColumns || "auto"}
        >
          <div className="container">
            <div>
              <p className="bp-eyebrow bp-eyebrow-light">{c.eyebrow}</p>
              <h2>{c.heading}</h2>
              <p>{c.description}</p>
            </div>
            <div className="bp-actions">
        <CmsLink
          to={c.buttonUrl || "/products"}
          navigate={navigate}
          className="bp-btn bp-btn-white"
        >
          {c.buttonText || "Explore Products"} →
        </CmsLink>
        {c.secondaryButtonText && (
          <CmsLink
            to={c.secondaryButtonUrl || "/services"}
            navigate={navigate}
            className="bp-btn bp-btn-outline-white"
          >
            {c.secondaryButtonText}
          </CmsLink>
        )}
      </div></div></section>;
    default:
      return <section className="bp-section" key={section.id}><div className="container"><p className="bp-eyebrow">{c.eyebrow}</p><h2>{c.heading}</h2><p>{c.description}</p></div></section>;
  }
}

export default function HomeCmsRenderer({ content, navigate }) {
  const [catalogueProducts, setCatalogueProducts] = useState(products);

  useEffect(() => {
    let active = true;
    loadPublishedCatalogue().then((catalogue) => {
      if (active) setCatalogueProducts(catalogue);
    });
    return () => { active = false; };
  }, []);

  const sections = Array.isArray(content?.sections) ? [...content.sections].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
  const design = content?.design || {};
  const pageStyle = {
    "--home-heading-font": design.global?.headingFont || "Montserrat",
    "--home-body-font": design.global?.bodyFont || "Inter",
    "--home-heading-scale": Number(design.global?.headingScale || 1),
    "--home-body-size": `${Number(design.global?.bodySize || 16)}px`,
    "--home-heading-weight": Number(design.global?.headingWeight || 700),
    "--home-heading-letter-spacing": `${Number(design.global?.headingLetterSpacing ?? -0.025)}em`,
    "--home-container-width": ({ compact: "1040px", standard: "1180px", wide: "1380px" }[design.global?.contentWidth] || "1180px"),
    "--home-container-gutter": ({ compact: "28px", standard: "40px", wide: "48px" }[design.global?.contentWidth] || "40px")
  };
  return (
    <main className="bp-home home-cms-page" style={pageStyle}>
      {sections
        .filter((section) => section.visible !== false)
        .map((section) => (
          <HomeCmsSection
            key={section.id}
            section={section}
            navigate={navigate}
            design={design}
            catalogueProducts={catalogueProducts}
          />
        ))}
    </main>
  );
}
