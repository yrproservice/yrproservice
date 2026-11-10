import React from "react";
import { Link } from "../components/Layout";
import { products } from "../data/products";

function CmsLink({ to, navigate, className, children }) {
  return to ? <Link to={to} navigate={navigate} className={className}>{children}</Link> : null;
}

function HomeCmsSection({ section, navigate }) {
  const c = section.content || {};
  const items = Array.isArray(c.items) ? c.items : [];
  if (section.visible === false) return null;

  switch (section.type) {
    case "hero":
      return <section className="bp-home-hero" key={section.id}>
        <img src={c.imageUrl || "/assets/hero-operatory.jpg"} alt={c.imageAlt || ""} className="bp-hero-image" />
        <div className="bp-hero-overlay" /><div className="bp-hero-lines" aria-hidden="true" />
        <div className="container bp-hero-content"><div className="bp-hero-copy">
          <p className="bp-eyebrow bp-eyebrow-light">{c.eyebrow}</p>
          <h1>{c.heading}</h1><p>{c.description}</p>
          <div className="bp-actions">
            <CmsLink to={c.buttonUrl || "/products"} navigate={navigate} className="bp-btn bp-btn-primary">{c.buttonText || "Explore Products"} <b>→</b></CmsLink>
            {c.secondaryButtonText && <CmsLink to={c.secondaryButtonUrl || "/services"} navigate={navigate} className="bp-btn bp-btn-outline">{c.secondaryButtonText}</CmsLink>}
          </div>
          <div className="bp-hero-proof">{(c.proofItems || []).map((item, i) => <React.Fragment key={item}>{i > 0 && <i>•</i>}<span>{item}</span></React.Fragment>)}</div>
        </div></div>
        {Array.isArray(c.trustCards) && <div className="bp-hero-cards container">{c.trustCards.map((item) => <div key={item.number}><strong>{item.number}</strong><h3>{item.heading}</h3><p>{item.description}</p></div>)}</div>}
      </section>;
    case "feature-grid":
      return <section className="bp-section bp-provide" key={section.id}><div className="container">
        <div className="bp-section-head"><div><p className="bp-eyebrow">{c.eyebrow}</p><h2>{c.heading}</h2></div><p>{c.description}</p></div>
        <div className="bp-provide-grid">{items.map((item, i) => <article key={item.number || i} className="bp-provide-card"><div className="bp-icon">{item.icon}</div><span>{item.number || String(i + 1).padStart(2, "0")}</span><h3>{item.heading}</h3><p>{item.description}</p><CmsLink to={item.url} navigate={navigate}>Explore <b>→</b></CmsLink></article>)}</div>
      </div></section>;
    case "editorial":
      return <section className="bp-home-editorial" key={section.id}><div className="container bp-editorial-grid">
        <div className="bp-editorial-copy"><p className="bp-eyebrow">{c.eyebrow}</p><h2>{c.heading}</h2><p>{c.description}</p><CmsLink to={c.buttonUrl} navigate={navigate} className="bp-text-link">{c.buttonText} <b>→</b></CmsLink></div>
        <div className="bp-editorial-feature"><img src={c.imageUrl} alt={c.imageAlt || ""} /><div><span>{c.imageNumber || "01"}</span><strong>{c.imageTitle}</strong><p>{c.imageDescription}</p></div></div>
      </div></section>;
    case "product-grid": {
      const featured = products.filter((p) => (c.productSlugs || []).includes(p.slug));
      return <section className="bp-featured" key={section.id}><div className="container">
        <div className="bp-section-head bp-head-light"><div><p className="bp-eyebrow bp-eyebrow-light">{c.eyebrow}</p><h2>{c.heading}</h2></div><CmsLink to={c.buttonUrl || "/products"} navigate={navigate} className="bp-outline-light">{c.buttonText || "View All Products"} →</CmsLink></div>
        <div className="bp-product-grid">{featured.map((p) => <article className="bp-product-card" key={p.slug}><Link to={`/products/${p.slug}`} navigate={navigate}><div className="bp-product-img"><img src={p.img} alt={p.name} /></div><div className="bp-product-body"><small>{p.brand || "YR Proservice"}</small><h3>{p.name}</h3><p>{p.summary}</p><span>View Details →</span></div></Link></article>)}</div>
      </div></section>;
    }
    case "brand-grid":
      return <section className="bp-brands" key={section.id}><div className="container">
        <div className="bp-section-head"><div><p className="bp-eyebrow">{c.eyebrow}</p><h2>{c.heading}</h2></div><p>{c.description}</p></div>
        <div className="bp-brand-grid">{items.map((file) => <div className="bp-brand-card" key={file}><img src={`/brand logo/fitted/${String(file).replace(/\.[^.]+$/, ".png")}`} alt={String(file).replace(/\.[^.]+$/, "") + " dental equipment brand"} /></div>)}</div>
      </div></section>;
    case "services-banner":
      return <section className="bp-services-strip" key={section.id}><div className="container"><div className="bp-services-banner">
        <img src={c.imageUrl} alt={c.imageAlt || ""} /><div className="bp-services-copy"><p className="bp-eyebrow bp-eyebrow-light">{c.eyebrow}</p><h2>{c.heading}</h2><p>{c.description}</p><CmsLink to={c.buttonUrl || "/services"} navigate={navigate} className="bp-btn bp-btn-primary">{c.buttonText || "View Services"} →</CmsLink></div>
      </div></div></section>;
    case "benefits-grid":
      return <section className="bp-why" key={section.id}><div className="container">
        <div className="bp-section-head"><div><p className="bp-eyebrow">{c.eyebrow}</p><h2>{c.heading}</h2></div><p>{c.description}</p></div>
        <div className="bp-why-grid">{items.map((item, i) => <div key={item.number || i}><b>{item.number || String(i + 1).padStart(2, "0")}</b><h3>{item.heading}</h3><p>{item.description}</p></div>)}</div>
      </div></section>;
    case "cta":
      return <section className="bp-final-cta" key={section.id}><div className="container"><div><p className="bp-eyebrow bp-eyebrow-light">{c.eyebrow}</p><h2>{c.heading}</h2><p>{c.description}</p></div><div className="bp-actions">
        <CmsLink to={c.buttonUrl || "/products"} navigate={navigate} className="bp-btn bp-btn-white">{c.buttonText || "Explore Products"} →</CmsLink>
        {c.secondaryButtonText && <CmsLink to={c.secondaryButtonUrl || "/services"} navigate={navigate} className="bp-btn bp-btn-outline-white">{c.secondaryButtonText}</CmsLink>}
      </div></div></section>;
    default:
      return <section className="bp-section" key={section.id}><div className="container"><p className="bp-eyebrow">{c.eyebrow}</p><h2>{c.heading}</h2><p>{c.description}</p></div></section>;
  }
}

export default function HomeCmsRenderer({ content, navigate }) {
  const sections = Array.isArray(content?.sections) ? [...content.sections].sort((a, b) => (a.order || 0) - (b.order || 0)) : [];
  return <main className="bp-home">{sections.filter((section) => section.visible !== false).map((section) => <HomeCmsSection key={section.id} section={section} navigate={navigate} />)}</main>;
}
