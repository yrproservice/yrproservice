import React from "react";

export default function Contact({ navigate }) {
  return (
    <main className="bp-contact-page">
      <section className="bp-contact-hero">
        <div className="container bp-contact-grid">
          <div className="bp-contact-intro">
            <p className="bp-eyebrow">YR PROSERVICE · HUMAN RESOURCES</p>
            <h1>Careers &amp; HR Enquiries</h1>
            <p>
              For employment opportunities and other human-resources enquiries,
              please contact the YR Proservice team by email.
            </p>
          </div>
          <section className="bp-contact-card" aria-labelledby="hr-contact-title">
            <p className="bp-eyebrow">HUMAN RESOURCES</p>
            <h2 id="hr-contact-title">Get in touch with our team.</h2>
            <p>
              Send your HR enquiry by email. Please include a clear subject and
              enough information for the team to understand your enquiry.
            </p>
            <a
              className="bp-btn bp-btn-primary"
              href="mailto:yr.proservice@gmail.com?subject=HR%20Enquiry"
            >
              Email HR <span aria-hidden="true">→</span>
            </a>
          </section>
        </div>
      </section>
    </main>
  );
}
