import React from "react";
import { Link } from "./Layout";
import { getServicesCmsContent } from "../data/servicesCmsTemplate";

function sectionStyle(design, key) {
  const value = design?.sections?.[key] || {};
  return {
    backgroundColor: value.backgroundColor || undefined,
    textAlign: value.textAlign || undefined,
    ...(value.textColor ? { "--services-section-text": value.textColor } : {}),
    ...(value.accentColor ? { "--services-section-accent": value.accentColor } : {})
  };
}

export default function ServicesCmsRenderer({ content, navigate, previewMode = false }) {
  const page = getServicesCmsContent(content);
  if (!page) return null;
  const { hero, intro, listing, process, cta } = page;
  const design = page.design || {};
  const defaultOrder = ["hero", "intro", "listing", "process", "cta"];
  const sectionOrder = Array.isArray(page.sectionOrder) ? page.sectionOrder.filter((key) => defaultOrder.includes(key)) : defaultOrder;
  const orderedKeys = [...sectionOrder, ...defaultOrder.filter((key) => !sectionOrder.includes(key))];
  const pageStyle = {
    "--services-heading-font": design.global?.headingFont || "Montserrat",
    "--services-body-font": design.global?.bodyFont || "Inter",
    "--services-heading-scale": Number(design.global?.headingScale || 1),
    "--services-body-size": `${Number(design.global?.bodySize || 16)}px`
  };
  const sectionOrderValue = (key) => orderedKeys.indexOf(key);
  return (
    <main className="services-cms-page" style={pageStyle}>
      <div className="services-cms-order-item" style={{ order: sectionOrderValue("hero") }}>
      <section className="services-hero services-pattern-page services-cms-section services-cms-hero" style={sectionStyle(design, "hero")} data-layout={hero.layout || "split-right"}>
        <div className="container services-hero-grid">
          <div className="services-hero-copy">
            <p className="eyebrow">{hero.eyebrow}</p>
            <h1>{hero.title}</h1>
            <p className="services-hero-lead">{hero.lead}</p>
          </div>
          <div className="services-hero-visual">
            {hero.imageUrl && <img src={hero.imageUrl} alt={hero.imageAlt || ""} style={{ height: hero.imageHeight ? `${hero.imageHeight}px` : undefined, objectPosition: hero.imagePosition || "center" }} />}
            <div className="services-hero-badge">
              <strong>{hero.badgeTitle}</strong>
              <span>{hero.badgeText}</span>
            </div>
          </div>
        </div>
      </section>
      </div>

      <div className="services-cms-order-item" style={{ order: sectionOrderValue("intro") }}>
      <section className="services-intro section services-cms-section" style={sectionStyle(design, "intro")}>
        <div className="container services-intro-grid">
          <div>
            <p className="eyebrow">{intro.eyebrow}</p>
            <h2>{intro.title}</h2>
          </div>
          <p>{intro.body}</p>
        </div>
      </section>
      </div>

      <div className="services-cms-order-item" style={{ order: sectionOrderValue("listing") }}>
      <section className="services-list-section section light services-cms-section" style={sectionStyle(design, "listing")}>
        <div className="container">
          <div className="section-heading services-heading">
            <p className="eyebrow">{listing.eyebrow}</p>
            <h2>{listing.title}</h2>
            <p>{listing.description}</p>
          </div>
          <div className="services-card-grid">
            {listing.items.map((service) => (
              <article className="premium-service-card" key={service.slug}>
                <div className="premium-service-top">
                  <span className="service-number">{service.number}</span>
                  <span className="service-icon" aria-hidden="true">{service.icon}</span>
                </div>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <ul>{(service.points || []).map((point, index) => <li key={index}>{point}</li>)}</ul>
                <Link to={previewMode ? `/admin/cms/preview?key=services&service=${encodeURIComponent(service.slug)}` : `/services/${service.slug}`} navigate={navigate} className="service-view-button">
                  View Service <span>↗</span>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      </div>

      <div className="services-cms-order-item" style={{ order: sectionOrderValue("process") }}>
      <section className="services-process section services-pattern-process services-cms-section" style={sectionStyle(design, "process")}>
        <div className="container">
          <div className="section-heading services-heading">
            <p className="eyebrow">{process.eyebrow}</p>
            <h2>{process.title}</h2>
          </div>
          <div className="process-grid">
            {process.steps.map((step) => (
              <div className="process-step" key={step.number}>
                <span>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </div>

      <div className="services-cms-order-item" style={{ order: sectionOrderValue("cta") }}>
      <section className="services-cta-wrap section services-cms-section" style={sectionStyle(design, "cta")}>
        <div className="container">
          <div className="services-cta">
            <div>
              <p className="eyebrow">{cta.eyebrow}</p>
              <h2>{cta.title}</h2>
              <p>{cta.body}</p>
            </div>
            <div className="services-cta-actions">
              <Link to={previewMode ? "/admin/cms/preview?key=services&request=" : cta.serviceUrl} navigate={navigate} className="button">{cta.serviceButton}</Link>
              <Link to={cta.quoteUrl} navigate={navigate} className="button secondary">{cta.quoteButton}</Link>
            </div>
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}
