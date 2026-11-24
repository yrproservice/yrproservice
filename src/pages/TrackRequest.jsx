import React, { useEffect, useState } from "react";

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
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState("email");
  const [requests, setRequests] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [historyMessage, setHistoryMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [reference, setReference] = useState("");
  const [referenceEmail, setReferenceEmail] = useState("");
  const [request, setRequest] = useState(null);
  const [referenceError, setReferenceError] = useState("");
  const [referenceLoading, setReferenceLoading] = useState(false);

  async function loadHistory() {
    const response = await fetch("/api/customer/requests", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setStage("email");
      setRequests([]);
      return false;
    }
    if (!response.ok || !result.ok) {
      throw new Error(result.error || "Unable to load your requests.");
    }
    setRequests(Array.isArray(result.requests) ? result.requests : []);
    setStage("history");
    return true;
  }

  useEffect(() => {
    let active = true;
    fetch("/api/customer/requests", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!active) return;
        if (response.status === 401) {
          setStage("email");
          return;
        }
        if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load your requests.");
        setRequests(Array.isArray(result.requests) ? result.requests : []);
        setStage("history");
      })
      .catch((error) => {
        if (active) {
          setStage("email");
          setHistoryError(error.message || "Unable to load your requests.");
        }
      });
    return () => { active = false; };
  }, []);

  async function handleRequestCode(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setHistoryError("");
    setHistoryMessage("");
    try {
      const response = await fetch("/api/customer/access/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim() }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to send a verification code.");
      setStage("code");
      setHistoryMessage(result.message || "If email verification is available, a code will be sent shortly.");
    } catch (error) {
      setHistoryError(error.message || "Unable to send a verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setHistoryError("");
    setHistoryMessage("");
    try {
      const response = await fetch("/api/customer/access/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to verify your email.");
      await loadHistory();
      setCode("");
    } catch (error) {
      setHistoryError(error.message || "Unable to verify your email.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    setHistoryError("");
    try {
      await fetch("/api/customer/access/logout", {
        method: "DELETE",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
    } catch {
      // The browser session is cleared locally below; the server cookie expires.
    }
    setRequests([]);
    setCode("");
    setStage("email");
    setHistoryMessage("You have signed out of request history.");
    setLoading(false);
  }

  async function handleReferenceSubmit(event) {
    event.preventDefault();
    if (referenceLoading) return;
    setReferenceLoading(true);
    setReferenceError("");
    setRequest(null);
    try {
      const params = new URLSearchParams({
        reference: reference.trim(),
        email: referenceEmail.trim(),
      });
      const response = await fetch(`/api/track?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
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
            View your product quotations, dental chair requests and service requests together.
            Verify the email address used when submitting your requests.
          </p>
        </div>

        {stage !== "history" ? (
          <form className="form track-request-form customer-request-access-form" onSubmit={stage === "code" ? handleVerify : handleRequestCode}>
            <h2>{stage === "code" ? "Verify your email address" : "View all your requests"}</h2>
            <p className="customer-request-access-copy">
              {stage === "code"
                ? "Enter the six-digit verification code sent to your email address."
                : "Enter the email address you used when submitting your requests."}
            </p>
            <label>
              Email Address
              <input
                required
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading || stage === "code"}
                maxLength={254}
                autoComplete="email"
                placeholder="name@example.com"
              />
            </label>
            {stage === "code" && (
              <label>
                Verification Code
                <input
                  required
                  name="code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={loading}
                  maxLength={6}
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                />
              </label>
            )}
            {historyMessage && <p className="customer-request-access-message" role="status">{historyMessage}</p>}
            {historyError && <p className="track-request-error" role="alert">{historyError}</p>}
            <button className="button" type="submit" disabled={loading}>
              {loading ? "Please wait…" : stage === "code" ? "Verify Email" : "Continue"}
            </button>
            {stage === "code" && (
              <button className="button secondary" type="button" disabled={loading} onClick={() => { setStage("email"); setCode(""); setHistoryError(""); setHistoryMessage(""); }}>
                Change Email Address
              </button>
            )}
          </form>
        ) : (
          <section className="customer-request-history" aria-live="polite">
            <div className="customer-request-history-header">
              <div>
                <p className="eyebrow">Verified Email</p>
                <h2>Your request history</h2>
                <p>Showing requests submitted using your verified email address.</p>
              </div>
              <button type="button" className="button secondary" onClick={handleLogout} disabled={loading}>Sign Out</button>
            </div>
            {requests.length === 0 ? (
              <div className="track-result">
                <h3>No requests found yet</h3>
                <p>We could not find requests associated with this email address.</p>
              </div>
            ) : (
              <div className="customer-request-history-list">
                {requests.map((item) => (
                  <article className="track-result customer-request-history-card" key={item.reference}>
                    <div className="customer-request-card-heading">
                      <div>
                        <p className="eyebrow">{TYPE_LABELS[item.requestType] || "Customer Request"}</p>
                        <h3>{item.reference}</h3>
                      </div>
                      <span className={`customer-request-status status-${item.status}`}>
                        {STATUS_LABELS[item.status] || "Status Updated"}
                      </span>
                    </div>
                    <p>{STATUS_HELP[item.status] || "Please contact YR Proservice if you need more information."}</p>
                    <dl className="track-result-details">
                      <div><dt>Date Submitted</dt><dd>{formatDate(item.createdAt)}</dd></div>
                      {item.service && <div><dt>Service</dt><dd>{readableService(item.service)}</dd></div>}
                      {item.selection && <div className="customer-request-selection"><dt>{item.requestType === "dental_chair" ? "Dental Chair Models" : "Products Requested"}</dt><dd>{item.selection}</dd></div>}
                      {item.location && <div><dt>Location</dt><dd>{item.location}</dd></div>}
                      {item.preferredTiming && <div><dt>Preferred Timing</dt><dd>{item.preferredTiming}</dd></div>}
                      {item.message && <div><dt>Request Details</dt><dd>{item.message}</dd></div>}
                    </dl>
                  </article>
                ))}
              </div>
            )}
            <button type="button" className="button secondary" onClick={loadHistory} disabled={loading}>Refresh Request History</button>
          </section>
        )}

        <details className="customer-reference-tracking">
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
