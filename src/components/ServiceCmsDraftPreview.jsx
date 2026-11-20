import React from "react";
import { Link } from "./Layout";

export default function ServiceCmsDraftPreview({ services, serviceSlug = "", mode = "detail", navigate }) {
  const service = services.find((item) => item.slug === serviceSlug) || null;
  const requestUrl = `/admin/cms/preview?key=services&request=${encodeURIComponent(service?.slug || "")}`;

  if (mode === "request") {
    return (
      <section className="page-section service-request-page cms-service-request-preview">
        <div className="container two-col">
          <div>
            <p className="eyebrow">Request a Service · Draft Preview</p>
            <h1>Tell us what your clinic needs.</h1>
            <p className="lead">
              Complete the form below and include as much detail as possible about
              the equipment, site or service requirement.
            </p>
            <div className="form service-request-form" aria-label="Non-submitting service request form preview">
              <label>
                Full Name
                <input disabled name="name" placeholder="Dr. Ali" />
              </label>
              <label>
                Company / Clinic
                <input disabled name="clinic" placeholder="Smile Dental Clinic" />
              </label>
              <label>
                Phone
                <input disabled name="phone" placeholder="011-000 0000" />
              </label>
              <label>
                Email
                <input disabled type="email" name="email" placeholder="name@example.com" />
              </label>
              <label className="form-full">
                Service Required
                <select disabled value={service?.slug || ""} onChange={() => {}}>
                  <option value="">Select a service</option>
                  {services.map((item) => (
                    <option key={item.slug} value={item.slug}>{item.title}</option>
                  ))}
                </select>
              </label>
              <label className="form-full">
                Preferred Date / Timing
                <input disabled name="timing" placeholder="e.g. Weekday morning / 15 October" />
              </label>
              <label className="form-full">
                Message
                <textarea disabled name="message" rows="6" placeholder="Tell us about the equipment, issue, clinic site or service requirement..." />
              </label>
              <p className="cms-service-preview-notice" role="status">
                Preview only. Form fields are disabled and no service request can be submitted from this draft preview.
              </p>
              <button className="button" type="button" disabled>
                Send Service Request · Preview only
              </button>
            </div>
          </div>
          <aside className="service-request-side">
            <div className="service-request-card">
              <p className="eyebrow">Selected service</p>
              <h2>{service ? service.title : "Choose a service"}</h2>
              <p>{service ? service.text : "This preview shows the service selection area. Choose a service from the draft navigation above to preview its preselected state."}</p>
              {service && <ul>{(service.points || []).map((point, index) => <li key={index}>{point}</li>)}</ul>}
            </div>
            <div className="service-request-contact">
              <strong>Prefer to talk to us?</strong>
              <p>011-1608 0623<br />yr.proservice@gmail.com</p>
            </div>
            {service && <Link to={`/admin/cms/preview?key=services&service=${encodeURIComponent(service.slug)}`} navigate={navigate} className="button secondary">Back to Service Details</Link>}
          </aside>
        </div>
      </section>
    );
  }

  if (!service) {
    return (
      <section className="page-section container center">
        <h1>Service not found in this draft</h1>
        <p>Choose one of the services in the draft preview navigation.</p>
        <Link to="/admin/cms/preview?key=services" navigate={navigate} className="button">Back to Services Preview</Link>
      </section>
    );
  }

  return (
    <section className="service-detail-page">
      <div className="service-detail-hero">
        <div className="container">
          <div className="service-breadcrumb">
            <Link to="/admin/cms/preview?key=services" navigate={navigate}>Services</Link>
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
                <button type="button" className="button" onClick={() => navigate(requestUrl)}>Request This Service</button>
                <Link to="/admin/cms/preview?key=services" navigate={navigate} className="button secondary">Back to Services</Link>
              </div>
            </div>
            <div className="service-detail-symbol" aria-hidden="true">{service.icon}</div>
          </div>
        </div>
      </div>
      <div className="container service-detail-body section">
        <div className="service-detail-main">
          <p className="eyebrow">Service overview</p>
          <h2>What we can help with</h2>
          <p>{service.detail}</p>
          <ul className="service-detail-points">
            {(service.points || []).map((point, index) => (
              <li key={index}><span>✓</span>{point}</li>
            ))}
          </ul>
        </div>
        <aside className="service-detail-card">
          <p className="eyebrow">Need this service?</p>
          <h3>Send us your requirement.</h3>
          <p>Tell us about your clinic, equipment and preferred timing. Our team can review the request with you.</p>
          <button type="button" className="button" onClick={() => navigate(requestUrl)}>Request a Service</button>
        </aside>
      </div>
    </section>
  );
}
