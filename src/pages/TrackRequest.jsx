import React, { useState } from "react";

const TYPE_LABELS = {
  service: "Service Request",
  quotation: "Product Quotation",
  dental_chair: "Dental Chair Request",
};

const STATUS_LABELS = {
  received: "Received",
  in_review: "In Review",
  contacted: "Customer Contacted",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_HELP = {
  received: "Your request has been received and is awaiting review.",
  in_review: "The YR Proservice team is reviewing your request.",
  contacted: "The team has marked that contact has been made about your request.",
  completed: "This request has been marked as completed.",
  cancelled: "This request has been marked as cancelled. Contact YR Proservice if you need clarification.",
};

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function readableService(value) {
  return typeof value === "string"
    ? value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
    : "";
}

export default function TrackRequest() {
  const [reference, setReference] = useState("");
  const [referenceEmail, setReferenceEmail] = useState("");
  const [request, setRequest] = useState(null);
  const [referenceError, setReferenceError] = useState("");
  const [referenceLoading, setReferenceLoading] = useState(false);

  async function handleReferenceSubmit(event) {
    event.preventDefault();
    if (referenceLoading) return;
    setReferenceLoading(true);
    setReferenceError("");
    setRequest(null);
    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference: reference.trim(),
          email: referenceEmail.trim(),
        }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok || !result.request) {
        throw new Error(result.error || "We could not check this request. Please try again.");
      }
      setRequest(result.request);
    } catch (error) {
      setReferenceError(error.message || "Unable to reach the tracking service. Please try again.");
    } finally {
      setReferenceLoading(false);
    }
  }

  return (
    <section className="page-section track-request-page">
      <div className="container track-request-container">
        <div className="track-request-intro">
          <p className="eyebrow">Request Tracking</p>
          <h1>Track your requests.</h1>
          <p className="lead">
            Check the status of an individual request using its reference number
            and the email address used when submitting it. Viewing all requests
            by email is not available yet.
          </p>
        </div>

        <section className="form track-request-form customer-request-access-form" aria-labelledby="view-all-requests-title">
          <h2 id="view-all-requests-title">View all your requests</h2>
          <p className="customer-request-access-copy">
            Enter the email address you used when submitting your requests.
          </p>
          <label>
            Email Address
            <input
              type="email"
              name="email"
              disabled
              aria-describedby="customer-request-verification-notice"
              placeholder="Email verification unavailable"
            />
          </label>
          <p className="customer-request-access-notice" id="customer-request-verification-notice" role="status">
            Email verification is not enabled yet. Please use your request reference for now.
          </p>
          <button className="button" type="button" disabled aria-disabled="true">
            Continue
          </button>
        </section>

        <details className="customer-reference-tracking" open>
          <summary>Have a request reference number? Check one request instead</summary>
          <form className="form track-request-form" onSubmit={handleReferenceSubmit}>
            <label>
              Request Reference
              <input
                required
                name="reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                disabled={referenceLoading}
                maxLength={40}
                autoCapitalize="characters"
                autoComplete="off"
                placeholder="e.g. YRQ-20261113-0123456789ABCDEF"
              />
            </label>
            <label>
              Email Address Used for the Request
              <input
                required
                type="email"
                name="email"
                value={referenceEmail}
                onChange={(event) => setReferenceEmail(event.target.value)}
                disabled={referenceLoading}
                maxLength={254}
                autoComplete="email"
                placeholder="name@example.com"
              />
            </label>
            {referenceError && <p className="track-request-error" role="alert">{referenceError}</p>}
            <button className="button" type="submit" disabled={referenceLoading}>
              {referenceLoading ? "Checking Status…" : "Check Request Status"}
            </button>
          </form>
          {request && (
            <section className="track-result" aria-live="polite" aria-label="Request status result">
              <p className="eyebrow">Request Found</p>
              <h2>{STATUS_LABELS[request.status] || "Status Updated"}</h2>
              <p>{STATUS_HELP[request.status] || "Please contact YR Proservice if you need more information."}</p>
              <dl className="track-result-details">
                <div><dt>Reference</dt><dd>{request.reference}</dd></div>
                <div><dt>Request Type</dt><dd>{TYPE_LABELS[request.requestType] || "Customer Request"}</dd></div>
                <div><dt>Date Submitted</dt><dd>{formatDate(request.createdAt)}</dd></div>
              </dl>
            </section>
          )}
        </details>

        <p className="track-request-help">
          Need help? Call <a href="tel:+601116080623">011-1608 0623</a> or email{" "}
          <a href="mailto:yr.proservice@gmail.com">yr.proservice@gmail.com</a>.
        </p>
      </div>
    </section>
  );
}
