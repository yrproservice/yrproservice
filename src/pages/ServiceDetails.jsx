import React, { useEffect, useState } from "react";
import { getServicesCmsContent } from "../data/servicesCmsTemplate";
import { Link } from "../components/Layout";

export default function ServiceDetails({ service: fallbackService, navigate }) {
  const [service, setService] = useState(fallbackService || null);
  useEffect(() => {
    let active = true;
    fetch("/api/cms/public/pages?key=services", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!active || !result?.ok) return;
        const page = getServicesCmsContent(result.page?.content);
        const current = page?.listing?.items?.find((item) => item.slug === fallbackService?.slug);
        if (current) setService(current);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [fallbackService?.slug]);
  useEffect(() => {
    if (service?.title) document.title = `${service.title} | YR Proservice`;
  }, [service?.title]);
  if (!service) return null;
  return (
    <section className="service-detail-page">
      <div className="service-detail-hero">
        <div className="container">
          <div className="service-breadcrumb">
            <Link to="/services" navigate={navigate}>
              Services
            </Link>
            <span>›</span>
            <strong>{service.title}</strong>
          </div>
          <div className="service-detail-grid">
            <div>
              <span className="service-detail-number">{service.number}</span>
              <p className="eyebrow">YR Proservice · Technical Service</p>
              <h1>{service.title}</h1>
              <p className="service-detail-lead">{service.text}</p>
              <div className="service-detail-actions">
                <button
                  type="button"
                  className="button"
                  onClick={() =>
                    navigate(`/service-request?service=${service.slug}`)
                  }
                >
                  Request This Service
                </button>
                <Link
                  to="/services"
                  navigate={navigate}
                  className="button secondary"
                >
                  Back to Services
                </Link>
              </div>
            </div>
            <div className="service-detail-symbol" aria-hidden="true">
              {service.icon}
            </div>
          </div>
        </div>
      </div>
      <div className="container service-detail-body section">
        <div className="service-detail-main">
          <p className="eyebrow">Service overview</p>
          <h2>What we can help with</h2>
          <p>{service.detail}</p>
          <ul className="service-detail-points">
            {service.points.map((point) => (
              <li key={point}>
                <span>✓</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <aside className="service-detail-card">
          <p className="eyebrow">Need this service?</p>
          <h3>Send us your requirement.</h3>
          <p>
            Tell us about your clinic, equipment and preferred timing. Our team
            can review the request with you.
          </p>
          <button
            type="button"
            className="button"
            onClick={() => navigate(`/service-request?service=${service.slug}`)}
          >
            Request a Service
          </button>
        </aside>
      </div>
    </section>
  );
}
