import React, { useEffect, useState } from "react";
import { products } from "../data/products";
import { loadPublishedCatalogue } from "../data/publishedCatalogue";

export default function GenericCmsRenderer({ content, navigate }) {
  const [catalogueProducts, setCatalogueProducts] = useState(products);
  useEffect(() => {
    let active = true;
    loadPublishedCatalogue().then((catalogue) => {
      if (active) setCatalogueProducts(catalogue);
    });
    return () => { active = false; };
  }, []);

  const supportedTypes = new Set([
    "hero", "text", "image-text", "product-grid", "feature-grid",
    "editorial", "brand-grid", "services-banner", "benefits-grid", "cta",
  ]);
  const sections = (Array.isArray(content?.sections) ? content.sections : [])
    .filter((section) => section && typeof section === "object" && !Array.isArray(section))
    .filter((section) => supportedTypes.has(section.type) && section.visible !== false)
    .sort((first, second) => (Number(first.order) || 0) - (Number(second.order) || 0));

  return (
    <main className="cms-generic-page">
      {sections.map((section) => {
        const sectionContent = section.content && typeof section.content === "object" && !Array.isArray(section.content)
          ? section.content
          : {};
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
          const selectedProducts = (Array.isArray(sectionContent.productSlugs) ? sectionContent.productSlugs : [])
            .filter((slug) => typeof slug === "string")
            .map((slug) => catalogueProducts.find((product) => product.slug === slug))
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
                {(Array.isArray(sectionContent.items) ? sectionContent.items : []).filter((item) => typeof item === "string").map((item) => (
                  <span key={item}>
                    {String(item).replace(/\.[^.]+$/, "")}
                  </span>
                ))}
              </div>
            </section>
          );
        }

        const items = Array.isArray(sectionContent.items)
          ? sectionContent.items.filter((item) => item && typeof item === "object" && !Array.isArray(item))
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
