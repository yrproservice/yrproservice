import React, { useCallback, useEffect, useMemo, useState } from "react";

const TYPE_LABELS = {
  service: "Service Request",
  quotation: "Quotation Request",
  dental_chair: "Dental Chair Request",
};
const STATUS_LABELS = {
  received: "Received",
  in_review: "In Review",
  contacted: "Customer Contacted",
  completed: "Completed",
  cancelled: "Cancelled",
};
const STATUSES = Object.keys(STATUS_LABELS);

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export default function AdminDashboard() {
  const [requests, setRequests] = useState([]);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [draftStatus, setDraftStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/admin/requests?${params.toString()}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok)
        throw new Error(
          result.error || `Unable to load requests (HTTP ${response.status}).`,
        );
      const loadedRequests = Array.isArray(result.requests)
        ? result.requests
        : [];
      setRequests(loadedRequests);
      setSelected((current) =>
        current
          ? loadedRequests.find(
              (item) => item.reference === current.reference,
            ) || null
          : null,
      );
    } catch (loadError) {
      setError(loadError.message || "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  }, [type, status, search]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const counts = useMemo(
    () =>
      STATUSES.reduce(
        (result, key) => ({
          ...result,
          [key]: requests.filter((item) => item.status === key).length,
        }),
        {},
      ),
    [requests],
  );

  async function saveStatus() {
    if (!selected || !STATUSES.includes(draftStatus) || saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          reference: selected.reference,
          status: draftStatus,
        }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok)
        throw new Error(
          result.error || `Unable to update status (HTTP ${response.status}).`,
        );
      setNotice(`Status updated for ${selected.reference}.`);
      setSelected((current) =>
        current ? { ...current, status: result.request.status } : current,
      );
      await loadRequests();
    } catch (saveError) {
      setError(saveError.message || "Unable to update this request.");
    } finally {
      setSaving(false);
    }
  }

  function openRequest(item) {
    setSelected(item);
    setDraftStatus(item.status);
    setNotice("");
    setError("");
  }

  return (
    <section className="admin-page">
      <div className="admin-shell">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">YR Proservice · Internal</p>
            <h1>Request Dashboard</h1>
            <p>
              Manage service, quotation and dental chair enquiries. Counts
              reflect the current filters.
            </p>
          </div>
          <a className="admin-public-link" href="/">
            View public website ↗
          </a>
        </header>

        {error && (
          <p className="admin-alert admin-alert-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="admin-alert admin-alert-success" role="status">
            {notice}
          </p>
        )}

        <div className="admin-stats" aria-label="Request status counts">
          {STATUSES.map((key) => (
            <article className="admin-stat" key={key}>
              <span>{STATUS_LABELS[key]}</span>
              <strong>{counts[key] ?? 0}</strong>
            </article>
          ))}
        </div>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Incoming requests</h2>
              <p>Showing up to 200 matching records, newest first.</p>
            </div>
            <button
              type="button"
              className="admin-secondary-button"
              onClick={loadRequests}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <div className="admin-filters">
            <label>
              Search
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                maxLength={100}
                placeholder="Reference, customer, email or company"
              />
            </label>
            <label>
              Request type
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="">All types</option>
                <option value="service">Service</option>
                <option value="quotation">Quotation</option>
                <option value="dental_chair">Dental chair</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">All statuses</option>
                {STATUSES.map((key) => (
                  <option key={key} value={key}>
                    {STATUS_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Customer</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {!loading && requests.length === 0 && (
                  <tr>
                    <td colSpan="6" className="admin-empty">
                      No matching requests found.
                    </td>
                  </tr>
                )}
                {requests.map((item) => (
                  <tr
                    key={item.id}
                    className={selected?.id === item.id ? "is-selected" : ""}
                  >
                    <td data-label="Reference">
                      <strong>{item.reference}</strong>
                    </td>
                    <td data-label="Type">
                      {TYPE_LABELS[item.request_type] || item.request_type}
                    </td>
                    <td data-label="Customer">
                      <strong>{item.customer_name}</strong>
                      <small>{item.company || item.email}</small>
                    </td>
                    <td data-label="Submitted">
                      {formatDate(item.created_at)}
                    </td>
                    <td data-label="Status">
                      <span className={`admin-status status-${item.status}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td data-label="Action">
                      <button
                        type="button"
                        className="admin-open-button"
                        onClick={() => openRequest(item)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && <p className="admin-loading">Loading requests…</p>}
          </div>
        </section>

        {selected && (
          <section
            className="admin-panel admin-detail-panel"
            aria-label={`Details for ${selected.reference}`}
          >
            <div className="admin-panel-heading">
              <div>
                <p className="eyebrow">Request details</p>
                <h2>{selected.reference}</h2>
                <p>
                  {TYPE_LABELS[selected.request_type] || selected.request_type}{" "}
                  · Submitted {formatDate(selected.created_at)}
                </p>
              </div>
              <button
                type="button"
                className="admin-secondary-button"
                onClick={() => setSelected(null)}
              >
                Close details
              </button>
            </div>
            <dl className="admin-detail-grid">
              <div>
                <dt>Customer</dt>
                <dd>{selected.customer_name || "—"}</dd>
              </div>
              <div>
                <dt>Company / Clinic</dt>
                <dd>{selected.company || "—"}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${selected.email}`}>
                    {selected.email || "—"}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{selected.phone || "—"}</dd>
              </div>
              <div>
                <dt>Service</dt>
                <dd>{selected.service_slug || "Not applicable"}</dd>
              </div>
              <div>
                <dt>Preferred timing</dt>
                <dd>{selected.preferred_timing || "—"}</dd>
              </div>
              <div className="admin-detail-message">
                <dt>Message / product requirements</dt>
                <dd>{selected.message || "—"}</dd>
              </div>
            </dl>
            <div className="admin-status-editor">
              <label>
                Update status
                <select
                  value={draftStatus}
                  onChange={(event) => setDraftStatus(event.target.value)}
                >
                  {STATUSES.map((key) => (
                    <option key={key} value={key}>
                      {STATUS_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="admin-primary-button"
                onClick={saveStatus}
                disabled={saving || !STATUSES.includes(draftStatus)}
              >
                {saving ? "Saving…" : "Save status"}
              </button>
            </div>
          </section>
        )}
        <p className="admin-security-note">
          <span aria-hidden="true">●</span> Internal request information. Keep
          this dashboard restricted to authorized staff.
        </p>
      </div>
    </section>
  );
}
