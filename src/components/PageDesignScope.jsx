import React, { useEffect, useMemo, useState } from "react";

const DEFAULT_DESIGN = {
  backgroundColor: "#ffffff",
  textColor: "#1f2937",
  headingColor: "#0b3158",
  primaryColor: "#1e7ed8",
  accentColor: "#00a9df",
  surfaceColor: "#ffffff",
  borderColor: "#dbe5ee",
  headingFont: "Montserrat",
  bodyFont: "Inter",
  headingScale: 1,
  bodySize: 16,
  contentWidth: 1200,
  sectionSpacing: 64,
  cardRadius: 16,
  buttonRadius: 8,
  cardStyle: "soft",
  cardColumns: "auto",
  imageFit: "contain",
  headingAlign: "left",
  heroLayout: "standard"
};

export function mergePageDesign(value) {
  return { ...DEFAULT_DESIGN, ...(value && typeof value === "object" ? value : {}) };
}

export default function PageDesignScope({ pageKey, designOverride, children }) {
  const [publishedDesign, setPublishedDesign] = useState(null);
  useEffect(() => {
    if (!pageKey || designOverride) return undefined;
    let active = true;
    fetch(`/api/cms/public/settings?key=${encodeURIComponent(`page-design.${pageKey}`)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active && result?.ok) setPublishedDesign(result.setting?.value || {});
      })
      .catch(() => {});
    return () => { active = false; };
  }, [pageKey, designOverride]);

  const design = useMemo(
    () => mergePageDesign(designOverride || publishedDesign),
    [designOverride, publishedDesign]
  );
  if (!pageKey || (!designOverride && !publishedDesign)) return children;

  const style = {
    "--page-design-bg": design.backgroundColor,
    "--page-design-text": design.textColor,
    "--page-design-heading": design.headingColor,
    "--page-design-primary": design.primaryColor,
    "--page-design-accent": design.accentColor,
    "--page-design-surface": design.surfaceColor,
    "--page-design-border": design.borderColor,
    "--page-design-heading-font": design.headingFont,
    "--page-design-body-font": design.bodyFont,
    "--page-design-heading-scale": String(design.headingScale),
    "--page-design-body-size": `${design.bodySize}px`,
    "--page-design-content-width": `${design.contentWidth}px`,
    "--page-design-section-space": `${design.sectionSpacing}px`,
    "--page-design-card-radius": `${design.cardRadius}px`,
    "--page-design-button-radius": `${design.buttonRadius}px`,
    "--page-design-card-shadow": design.cardStyle === "elevated"
      ? "0 16px 38px rgba(15, 42, 68, 0.12)"
      : design.cardStyle === "bordered"
        ? "none"
        : design.cardStyle === "flat" ? "none" : "0 8px 24px rgba(15, 42, 68, 0.07)"
  };

  return (
    <div
      className="page-design-scope"
      data-page-design={pageKey}
      data-card-style={design.cardStyle}
      data-card-columns={design.cardColumns}
      data-image-fit={design.imageFit}
      data-heading-align={design.headingAlign}
      data-hero-layout={design.heroLayout}
      style={style}
    >
      {children}
    </div>
  );
}
