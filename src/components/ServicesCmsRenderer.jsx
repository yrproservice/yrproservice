import React from "react";
import { Link } from "./Layout";
import { getServicesCmsContent } from "../data/servicesCmsTemplate";

export default function ServicesCmsRenderer({ content, navigate, previewMode = false }) {
  const page = getServicesCmsContent(content);
  if (!page) return null;
  const { hero, intro, listing, process, cta } = page;
  return (
    <>
      <section className="services-hero services-pattern-page">
        <div className="container services-hero-grid">
          <div className="services-hero-copy">
            <p className="eyebrow">{hero.eyebrow}</p>
            <h1>{hero.title}</h1>
            <p className="services-hero-lead">{hero.lead}</p>
          </div>
          <div className="services-hero-visual">
            {hero.imageUrl && <img src={hero.imageUrl} alt={hero.imageAlt || ""} />}
            <div className="services-hero-badge">
              <strong>{hero.badgeTitle}</strong>
              <span>{hero.badgeText}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="services-intro section">
        <div className="container services-intro-grid">
          <div>
            <p className="eyebrow">{intro.eyebrow}</p>
            <h2>{intro.title}</h2>
          </div>
          <p>{intro.body}</p>
        </div>
      </section>

      <section className="services-list-section section light">
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

      <section className="services-process section services-pattern-process">
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

      <section className="services-cta-wrap section">
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
    </>
  );
}
