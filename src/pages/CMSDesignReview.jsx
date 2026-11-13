import React from "react";

const REVIEW_PAGES = [
  ["site-chrome", "Shared header & footer"],
  ["home", "Home"],
  ["products", "Products listing"],
  ["product-detail", "Product details"],
  ["services", "Services listing"],
  ["service-detail", "Service details"],
  ["team", "Team"],
  ["cart", "Product cart"],
  ["dental-chair-request", "Dental chair request"],
  ["quote", "Quotation request"],
  ["service-request", "Service request"],
  ["track-request", "Track My Request"]
];

export default function CMSDesignReview() {
  return (
    <main className="cms-design-review">
      <header className="cms-design-review-header">
        <div>
          <p className="eyebrow">YR Proservice · Preview review</p>
          <h1>All Page Design Review</h1>
          <p>Review the current Preview appearance of every customer-facing page template in one place. Each panel loads its own page preview; the design editors and saved drafts remain separate.</p>
        </div>
        <a className="admin-secondary-button" href="/admin/cms/manage">Back to CMS Management</a>
      </header>
      <div className="cms-design-review-grid">
        {REVIEW_PAGES.map(([key, label]) => (
          <section className="cms-design-review-card" key={key}>
            <header>
              <h2>{label}</h2>
              <a href={`/admin/cms/design-preview?key=${encodeURIComponent(`page-design.${key}`)}`} target="_blank" rel="noreferrer">Open full preview ↗</a>
            </header>
            <iframe
              title={`${label} visual preview`}
              src={`/admin/cms/design-preview?key=${encodeURIComponent(`page-design.${key}`)}`}
              loading="eager"
            />
          </section>
        ))}
      </div>
    </main>
  );
}
