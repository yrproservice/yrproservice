import React from "react";
import { products } from "../data/products";

export default function GenericCmsRenderer({ content, navigate }) {
  const sections = [...(content?.sections || [])]
    .filter((section) => section.visible !== false)
    .sort((first, second) => (first.order || 0) - (second.order || 0));

  return (
    <main className="cms-generic-page">
      {sections.map((section) => {
        const sectionContent = section.content || {};
        const sectionKey = section.id || section.type;

        function goToButtonPage() {
          if (sectionContent.buttonUrl) {
            navigate(sectionContent.buttonUrl);
          }
        }

        if (section.type === "hero") {
          return (
            <section className="cms-generic-hero" key={sectionKey}>
              <div>
                <small>{sectionContent.eyebrow}</small>
                <h1>
                  {sectionContent.heading} {sectionContent.headingHighlight}
                </h1>
                <p>{sectionContent.description}</p>
                {sectionContent.buttonText && (
                  <button onClick={goToButtonPage}>
                    {sectionContent.buttonText}
                  </button>
                )}
              </div>
              {sectionContent.imageUrl && (
                <img
                  src={sectionContent.imageUrl}
                  alt={sectionContent.imageAlt || ""}
                />
              )}
            </section>
          );
        }

        if (section.type === "product-grid") {
          const selectedProducts = (sectionContent.productSlugs || [])
            .map((slug) => products.find((product) => product.slug === slug))
            .filter(Boolean);

          return (
            <section className="cms-generic-section" key={sectionKey}>
              <small>{sectionContent.eyebrow}</small>
              <h2>{sectionContent.heading || "Products"}</h2>
              <div className="cms-generic-cards">
                {selectedProducts.map((product) => (
                  <article key={product.slug}>
                    <img src={product.img} alt={product.name} />
                    <h3>{product.name}</h3>
                    <p>{product.summary}</p>
                    <button onClick={() => navigate("/products/" + product.slug)}>
                      View details
                    </button>
                  </article>
                ))}
              </div>
            </section>
          );
        }

        if (section.type === "brand-grid") {
          return (
            <section className="cms-generic-section" key={sectionKey}>
              <small>{sectionContent.eyebrow}</small>
              <h2>{sectionContent.heading}</h2>
              <p>{sectionContent.description}</p>
              <div className="cms-generic-brands">
                {(sectionContent.items || []).map((item) => (
                  <span key={item}>
                    {String(item).replace(/\.[^.]+$/, "")}
                  </span>
                ))}
              </div>
            </section>
          );
        }

        const items = Array.isArray(sectionContent.items)
          ? sectionContent.items
          : [];

        return (
          <section
            className={"cms-generic-section cms-generic-" + section.type}
            key={sectionKey}
          >
            <small>{sectionContent.eyebrow}</small>
            <h2>{sectionContent.heading}</h2>
            <p>{sectionContent.description}</p>

            {sectionContent.imageUrl && (
              <img
                className="cms-generic-image"
                src={sectionContent.imageUrl}
                alt={sectionContent.imageAlt || ""}
              />
            )}

            {items.length > 0 && (
              <div className="cms-generic-cards">
                {items.map((item, index) => (
                  <article key={item.id || item.slug || index}>
                    <strong>{item.number || item.title || item.heading}</strong>
                    <h3>{item.heading || item.title}</h3>
                    <p>{item.description || item.text}</p>
                    {item.url && (
                      <button onClick={() => navigate(item.url)}>
                        Explore
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}

            {sectionContent.buttonText && (
              <button onClick={goToButtonPage}>
                {sectionContent.buttonText}
              </button>
            )}
          </section>
        );
      })}
    </main>
  );
}
