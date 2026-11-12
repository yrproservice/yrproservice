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
          const error = new Error(result.error || "Unable to start your Admin session.");
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
        setMessage(error.message || "Unable to start your Admin session.");
        setStatus(error.status === 409 ? "in-use" : "error");
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
            <h1>Verifying your Admin session</h1>
            <p>Checking that no other device is currently using the Admin area.</p>
          </>
        )}
        {status === "in-use" && (
          <>
            <h1>Admin is already in use</h1>
            <p>{message}</p>
            <p>Only one device can access the Admin area at a time. Ask the active user to log out, or wait up to 90 seconds after their session stops responding.</p>
            <button type="button" className="admin-primary-button" onClick={onCancel}>Return to website entry</button>
          </>
        )}
        {status === "error" && (
          <>
            <h1>Unable to start Admin access</h1>
            <p>{message}</p>
            <button type="button" className="admin-primary-button" onClick={onCancel}>Return to website entry</button>
          </>
        )}
        {status === "active" && <p>Admin session secured. Returning to the website…</p>}
      </div>
    </section>
  );
}
