import React, { useEffect, useState } from "react";

export default function AdminEntry({ onAuthenticated, onCancel }) {
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", {
      method: "POST",
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) {
          const error = new Error(result.error || "Unable to verify your Admin access.");
          error.status = response.status;
          throw error;
        }
        if (active) {
          setStatus("active");
          onAuthenticated?.();
        }
      })
      .catch((error) => {
        if (!active) return;
        if (!Number.isInteger(error.status)) {
          window.location.assign("/api/admin/session?access_return=1");
          return;
        }
        setMessage(error.message || "Unable to verify your Admin access.");
        setStatus("error");
      });
    return () => { active = false; };
  }, [onAuthenticated]);

  return (
    <section className="admin-entry-page">
      <div className="admin-entry-card" role="status" aria-live="polite">
        <p className="eyebrow">YR Proservice · Secure Admin access</p>
        {status === "checking" && (
          <>
            <span className="access-choice-spinner" aria-hidden="true" />
            <h1>Verifying your Admin access</h1>
            <p>Checking your authorised account with Cloudflare Access.</p>
          </>
        )}
        {status === "error" && (
          <>
            <h1>Unable to verify Admin access</h1>
            <p>{message}</p>
            <button type="button" className="admin-primary-button" onClick={onCancel}>Return to website entry</button>
          </>
        )}
        {status === "active" && <p>Admin access verified. Opening the dashboard…</p>}
      </div>
    </section>
  );
}
