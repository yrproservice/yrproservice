import React from "react";

export default function AccessChoice({ onClient, onAdmin, checking = false, message = "" }) {
  return (
    <section className="access-choice-page">
      <section className="access-choice-shell" aria-labelledby="access-choice-title">
        <img className="access-choice-logo" src="/YR%20LOGO.jpg" alt="YR Proservice Sdn Bhd" />
        {checking ? (
          <div className="access-choice-status" role="status" aria-live="polite">
            <span className="access-choice-spinner" aria-hidden="true" />
            <p className="eyebrow">Secure access</p>
            <h1 id="access-choice-title">Checking your admin session</h1>
            <p>Please wait while we verify your existing administrator access.</p>
          </div>
        ) : (
          <>
            <p className="eyebrow">YR Proservice · Dental solutions</p>
            <h1 id="access-choice-title">Welcome to YR Proservice</h1>
            <p className="access-choice-intro">Choose how you would like to enter the website.</p>
            {message && <p className="access-choice-message" role="status">{message}</p>}
            <div className="access-choice-options">
              <button type="button" className="access-choice-card" onClick={onClient}>
                <span className="access-choice-symbol" aria-hidden="true">↗</span>
                <span className="access-choice-card-title">Continue as Client</span>
                <span className="access-choice-card-copy">Explore our dental equipment, services and customer support.</span>
                <span className="access-choice-action">Enter public website <span aria-hidden="true">→</span></span>
              </button>
              <button type="button" className="access-choice-card access-choice-admin" onClick={onAdmin}>
                <span className="access-choice-symbol" aria-hidden="true">⌑</span>
                <span className="access-choice-card-title">Continue as Admin</span>
                <span className="access-choice-card-copy">Sign in through the existing secure administrator authentication.</span>
                <span className="access-choice-action">Admin sign in <span aria-hidden="true">→</span></span>
              </button>
            </div>
            <p className="access-choice-footnote">Both options open the same YR Proservice website. Admin tools appear only after your administrator access is verified.</p>
          </>
        )}
      </section>
    </section>
  );
}
