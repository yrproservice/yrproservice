import React, { useEffect, useState } from "react";
import { Link } from "../components/Layout";
import { services } from "../data/services";

export default function ServiceRequest({ navigate }) {
  const [sent, setSent] = useState(false);
  const [service, setService] = useState("");
  const [submittedReference, setSubmittedReference] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("service");
    setService(
      value && services.some((item) => item.slug === value) ? value : "",
    );
  }, []);

  const selected = services.find((item) => item.slug === service);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!service) {
      setError("Please select a service before submitting your request.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      requestType: "service",
      name: String(formData.get("name") || "").trim(),
      clinic: String(formData.get("clinic") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      service: service,
      timing: String(formData.get("timing") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    };

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.error || "Your service request could not be sent right now.",
        );
      }

      setSubmittedReference(result.reference || "");
      setSent(true);
    } catch (submitError) {
      setError(
        submitError.message ||
          "Your service request could not be sent right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <section className="page-section">
        <div className="container service-request-success center">
          <p className="eyebrow">Request received</p>
          <h1>Thank you for your service enquiry.</h1>
          <p>Your request has been saved and sent to YR Proservice.</p>
          {submittedReference && (
            <p>
              <strong>Reference:</strong> {submittedReference}
            </p>
          )}
          <div className="success-actions">
            <Link to="/services" navigate={navigate} className="button">
              Back to Services
            </Link>
            <Link to="/quote" navigate={navigate} className="button secondary">
              Request a Quotation
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section service-request-page">
      <div className="container two-col">
        <div>
          <p className="eyebrow">Request a Service</p>
          <h1>Tell us what your clinic needs.</h1>
          <p className="lead">
            Complete the form below and include as much detail as possible about
            the equipment, site or service requirement.
          </p>
          <form className="form service-request-form" onSubmit={handleSubmit}>
            <label>
              Full Name
              <input required name="name" placeholder="Dr. Ali" />
            </label>
            <label>
              Company / Clinic
              <input required name="clinic" placeholder="Smile Dental Clinic" />
            </label>
            <label>
              Phone
              <input required name="phone" placeholder="011-000 0000" />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                name="email"
                placeholder="name@example.com"
              />
            </label>
            <label className="form-full">
              Service Required
              <select
                required
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                <option value="">Select a service</option>
                {services.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-full">
              Preferred Date / Timing
              <input
                name="timing"
                placeholder="e.g. Weekday morning / 15 October"
              />
            </label>
            <label className="form-full">
              Message
              <textarea
                required
                name="message"
                rows="6"
                placeholder="Tell us about the equipment, issue, clinic site or service requirement..."
              ></textarea>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Service Request"}
            </button>
          </form>
        </div>
        <aside className="service-request-side">
          <div className="service-request-card">
            <p className="eyebrow">Selected service</p>
            <h2>{selected ? selected.title : "Choose a service"}</h2>
            <p>
              {selected
                ? selected.text
                : "Select the service that matches your requirement and tell us more in the message field."}
            </p>
            {selected && (
              <ul>
                {selected.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="service-request-contact">
            <strong>Prefer to talk to us?</strong>
            <p>
              011-1608 0623
              <br />
              yr.proservice@gmail.com
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
