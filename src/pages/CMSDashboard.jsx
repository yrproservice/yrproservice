import React, { useEffect, useState } from "react";
import { homeCmsTemplate } from "../data/homeCmsTemplate";
import { products as catalogueProducts } from "../data/products";
import { catalogMedia } from "../data/catalogMedia";
import { removeSectionFromContent, restoreSectionToContent } from "../utils/sectionRecovery";

const SECTION_TYPES = [
  { value: "hero", label: "Hero section" },
  { value: "text", label: "Text section" },
  { value: "image-text", label: "Image and text" },
  { value: "product-grid", label: "Product grid" },
  { value: "feature-grid", label: "Feature cards grid" },
  { value: "editorial", label: "Editorial image and text" },
  { value: "brand-grid", label: "Brand logo grid" },
  { value: "services-banner", label: "Services banner" },
  { value: "benefits-grid", label: "Benefits grid" },
  { value: "cta", label: "Call to action" },
];

function starterContent(title) {
  return {
    sections: [{
      id: crypto.randomUUID(),
      type: "hero",
      visible: true,
      order: 1,
      content: { heading: title, description: "Add approved page content here.", buttonText: "", buttonUrl: "" },
      layout: { variant: "split" }
    }]
  };
}

const HERO_LAYOUT_PRESETS = [
  { value: "overlay-left", label: "Text left", kind: "hero-left" },
  { value: "overlay-center", label: "Centred text", kind: "hero-center" },
  { value: "overlay-right", label: "Text right", kind: "hero-right" },
  { value: "overlay-bottom", label: "Text bottom-left", kind: "hero-bottom" }
];
const SPLIT_LAYOUT_PRESETS = [
  { value: "split-right", label: "Text left · image right", kind: "split-right" },
  { value: "split-left", label: "Image left · text right", kind: "split-left" },
  { value: "balanced", label: "Equal columns", kind: "split-balanced" },
  { value: "stacked", label: "Text above · image below", kind: "split-stacked" }
];

function LayoutPresetPicker({ value, options, onChange }) {
  return <div className="cms-layout-preset-picker" role="group" aria-label="Layout preset">
    {options.map((option) => <button
      type="button"
      key={option.value}
      className={`cms-layout-preset-option ${value === option.value ? "is-selected" : ""}`}
      aria-pressed={value === option.value}
      onClick={() => onChange(option.value)}
    >
      <span className={`cms-layout-preset-thumb ${option.kind}`} aria-hidden="true">
        <span className="cms-layout-thumb-copy"><i /><i /><i /></span>
        <span className="cms-layout-thumb-image" />
      </span>
      <span className="cms-layout-preset-label">{option.label}</span>
    </button>)}
  </div>;
}

function SectionPreview({ section, selected, onClick, design }) {
  const content = section.content || {};
  const sectionDesign = design?.sections?.[section.id] || {};
  const items = Array.isArray(content.items) ? content.items : [];
  const proofItems = Array.isArray(content.proofItems) ? content.proofItems : [];
  const selectedProducts = content.productSlugs?.length
    ? catalogueProducts.filter((product) => content.productSlugs.includes(product.slug))
    : catalogueProducts.slice(0, 3);
  const renderActions = () => (
    <span className="cms-preview-actions">
      {content.buttonText && <span className="cms-preview-button">{content.buttonText} →</span>}
      {content.secondaryButtonText && <span className="cms-preview-button cms-preview-button-secondary">{content.secondaryButtonText}</span>}
    </span>
  );
  const renderEyebrow = () => content.eyebrow
    ? <span className="cms-preview-eyebrow">{content.eyebrow}</span>
    : null;
  const renderImage = (className = "") => content.imageUrl
    ? <img className={className} src={content.imageUrl} alt={content.imageAlt || ""} style={previewImageStyle} />
    : <span className="cms-preview-image-placeholder">Image not selected</span>;
  const previewImageStyle = {
    objectPosition: content.imagePosition || "center",
    height: content.imageFit === "original" ? "auto" : content.imageHeight ? `${content.imageHeight}px` : undefined,
    objectFit: content.imageFit === "contain" ? "contain" : content.imageFit === "original" ? "initial" : "cover"
  };
  const gridColumns = sectionDesign.cardColumns && sectionDesign.cardColumns !== "auto"
    ? `repeat(${sectionDesign.cardColumns}, minmax(0, 1fr))`
    : undefined;
  const previewStyle = {
    backgroundColor: sectionDesign.backgroundColor || "#ffffff",
    color: sectionDesign.textColor || "#1f2937",
    textAlign: sectionDesign.textAlign || "left",
    "--cms-home-heading-color": sectionDesign.textColor || "#0b4a88",
    "--cms-home-accent-color": sectionDesign.accentColor || "#1e7ed8",
    "--cms-home-section-text": sectionDesign.textColor || "#687280",
    "--cms-home-heading-font": design?.global?.headingFont || "Montserrat",
    "--cms-home-body-font": design?.global?.bodyFont || "Inter",
    "--cms-home-heading-scale": Number(design?.global?.headingScale || 1),
    "--cms-home-body-size": `${Number(design?.global?.bodySize || 16)}px`,
    "--cms-home-heading-weight": Number(design?.global?.headingWeight || 700),
    "--cms-home-heading-letter-spacing": `${Number(design?.global?.headingLetterSpacing ?? -0.025)}em`
  };

  return (
    <button type="button" className={`cms-preview-section ${selected ? "is-selected" : ""} cms-preview-type-${section.type}`}
      style={previewStyle} onClick={onClick} aria-pressed={selected}>
      <span className="cms-preview-type">{SECTION_TYPES.find((item) => item.value === section.type)?.label || section.type}</span>
      {section.type === "hero" ? (
        <span className="cms-preview-hero">
          <span className="cms-preview-copy">
            {renderEyebrow()}
            <strong className="cms-preview-hero-heading">{content.heading || "Your heading"}{content.headingHighlight && <><br /><span>{content.headingHighlight}</span></>}</strong>
            <span className="cms-preview-description">{content.description || "Your description"}</span>
            {renderActions()}
            {proofItems.length > 0 && <span className="cms-preview-proof">{proofItems.slice(0, 4).map((item, index) => <span key={index}>{item}</span>)}</span>}
          </span>
          {content.imageUrl && renderImage()}
        </span>
      ) : section.type === "image-text" ? (
        <span className="cms-preview-image-text">
          {renderImage()}
          <span className="cms-preview-copy">{renderEyebrow()}<strong>{content.heading || "Section heading"}</strong><span>{content.description || "Section description"}</span>{renderActions()}</span>
        </span>
      ) : section.type === "editorial" ? (
        <span className="cms-preview-editorial">
          <span className="cms-preview-copy">{renderEyebrow()}<strong>{content.heading || "Editorial heading"}</strong><span>{content.description || "Editorial description"}</span>{renderActions()}</span>
          <span className="cms-preview-editorial-image">{renderImage()}<span className="cms-preview-image-caption"><b>{content.imageNumber || "01"}</b><strong>{content.imageTitle || "Image title"}</strong><span>{content.imageDescription || "Image caption"}</span></span></span>
        </span>
      ) : section.type === "services-banner" ? (
        <span className="cms-preview-services">
          {renderImage()}
          <span className="cms-preview-copy">{renderEyebrow()}<strong>{content.heading || "Services banner"}</strong><span>{content.description || "Services introduction"}</span>{renderActions()}</span>
        </span>
      ) : section.type === "product-grid" ? (
        <span className="cms-preview-content-grid">
          {renderEyebrow()}<strong>{content.heading || "Featured Products"}</strong><span>{content.description}</span>
          <span className="cms-preview-product-grid" style={gridColumns ? { gridTemplateColumns: gridColumns } : undefined}>
            {selectedProducts.slice(0, 3).map((product) => (
              <span className="cms-preview-product-card" key={product.slug}>
                <span>{product.img ? <img src={product.img} alt="" /> : "Product image"}</span>
                <small>{product.brand || "YR Proservice"}</small><b>{product.name}</b><span>View details →</span>
              </span>
            ))}
          </span>
        </span>
      ) : ["feature-grid", "benefits-grid"].includes(section.type) ? (
        <span className="cms-preview-content-grid">
          {renderEyebrow()}<strong>{content.heading || (section.type === "benefits-grid" ? "Why choose us" : "What We Provide")}</strong><span>{content.description || "Section introduction"}</span>
          <span className="cms-preview-feature-grid" style={gridColumns ? { gridTemplateColumns: gridColumns } : undefined}>
            {items.slice(0, 4).map((item, index) => (
              <span key={item.id || item.number || item.heading || index}>
                <small>{item.number || String(index + 1).padStart(2, "0")}</small><b>{item.heading || item.title || "Card heading"}</b><span>{item.description || "Card description"}</span>
              </span>
            ))}
            {items.length === 0 && <span className="cms-preview-empty-item">Add items in the section inspector</span>}
          </span>
        </span>
      ) : section.type === "brand-grid" ? (
        <span className="cms-preview-content-grid">
          {renderEyebrow()}<strong>{content.heading || "Trusted Brands We Carry"}</strong><span>{content.description || "Brand partners"}</span>
          <span className="cms-preview-brand-grid" style={gridColumns ? { gridTemplateColumns: gridColumns } : undefined}>
            {items.slice(0, 6).map((file, index) => {
              const brandName = String(file).replace(/\.[^.]+$/, "");
              return <span key={file || index}><img src={`/brand logo/fitted/${brandName}.png`} alt={brandName} /></span>;
            })}
            {items.length === 0 && <span className="cms-preview-empty-item">Add brand logo filenames in the section inspector</span>}
          </span>
        </span>
      ) : section.type === "cta" ? (
        <span className="cms-preview-cta">
          <span className="cms-preview-copy">{renderEyebrow()}<strong>{content.heading || "Call to action"}</strong><span>{content.description || "Supporting call-to-action text"}</span></span>
          {renderActions()}
        </span>
      ) : (
        <span className="cms-preview-copy cms-preview-text-section">
          {renderEyebrow()}<strong>{content.heading || "Section heading"}</strong><span>{content.description || "Section description"}</span>{renderActions()}
        </span>
      )}
    </button>
  );
}

export default function CMSDashboard({ onAdminLogout }) {
  const [pages, setPages] = useState([]);
  const [uploadedMedia, setUploadedMedia] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const [mediaSearch, setMediaSearch] = useState("");
  const [pageKey, setPageKey] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [route, setRoute] = useState("/");
  const [content, setContent] = useState({ sections: [] });
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [draftId, setDraftId] = useState("");
  const [draftVersion, setDraftVersion] = useState(null);
  const [publishedVersion, setPublishedVersion] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [removedSections, setRemovedSections] = useState([]);
  const [structuredJson, setStructuredJson] = useState("{}");
  const dragSectionId = React.useRef(null);
  const historyRef = React.useRef({ past: [], future: [], previous: JSON.stringify({ sections: [] }), suppressNext: false });
  const [, setHistoryRevision] = useState(0);
  const homeDesign = content.design || {};
  const selectedSection =
    content.sections.find((section) => section.id === selectedSectionId) || null;
  const hasUnappliedStructuredJson = Boolean(selectedSection) && (() => {
    try {
      const parsed = JSON.parse(structuredJson);
      return !parsed || typeof parsed !== "object" || Array.isArray(parsed)
        || JSON.stringify(parsed) !== JSON.stringify(selectedSection.content || {});
    } catch {
      return true;
    }
  })();
  const currentSnapshot = JSON.stringify({ pageKey, pageTitle, route, content });
  const hasUnsavedChanges = Boolean(pageKey) && (hasUnappliedStructuredJson || savedSnapshot !== currentSnapshot);
  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  useEffect(() => {
    let active = true;
    setMediaLoading(true);
    fetch("/api/cms/admin/media", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data.ok === false) throw new Error(data.error || `Media request failed (${response.status})`);
        if (active) setUploadedMedia(Array.isArray(data.media) ? data.media : []);
      })
      .catch((error) => { if (active) setMediaError(error.message); })
      .finally(() => { if (active) setMediaLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const snapshot = JSON.stringify(content);
    const history = historyRef.current;
    if (history.suppressNext) {
      history.suppressNext = false;
      history.previous = snapshot;
      setHistoryRevision((revision) => revision + 1);
      return;
    }
    if (history.previous !== snapshot) {
      if (history.previous) {
        history.past.push(history.previous);
        if (history.past.length > 50) history.past.shift();
      }
      history.future = [];
      history.previous = snapshot;
      setHistoryRevision((revision) => revision + 1);
    }
  }, [content]);

  function resetEditorHistory(nextContent) {
    historyRef.current = {
      past: [],
      future: [],
      previous: JSON.stringify(nextContent),
      suppressNext: false
    };
    setHistoryRevision((revision) => revision + 1);
  }

  function applyHistorySnapshot(direction) {
    const history = historyRef.current;
    const current = JSON.stringify(content);
    if (direction === "undo") {
      if (!history.past.length) return;
      const previous = history.past.pop();
      history.future.push(current);
      history.suppressNext = true;
      history.previous = previous;
      const restored = JSON.parse(previous);
      setContent(restored);
      const selected = restored.sections?.find((section) => section.id === selectedSectionId) || restored.sections?.[0];
      setSelectedSectionId(selected?.id || "");
      setStructuredJson(JSON.stringify(selected?.content || {}, null, 2));
    } else {
      if (!history.future.length) return;
      const next = history.future.pop();
      history.past.push(current);
      history.suppressNext = true;
      history.previous = next;
      const restored = JSON.parse(next);
      setContent(restored);
      const selected = restored.sections?.find((section) => section.id === selectedSectionId) || restored.sections?.[0];
      setSelectedSectionId(selected?.id || "");
      setStructuredJson(JSON.stringify(selected?.content || {}, null, 2));
    }
    setError("");
    setNotice(direction === "undo" ? "Last editor change undone." : "Editor change restored.");
    setHistoryRevision((revision) => revision + 1);
  }

  async function loadPages(isActive = () => true) {
    setError("");

    try {
      const response = await fetch("/api/cms/admin/pages", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to load CMS pages.");
      }

      if (isActive()) {
        setPages(result.pages || []);
      }
    } catch (loadError) {
      if (isActive()) {
        setError(loadError.message || "Unable to load CMS pages.");
      }
    }
  }

  useEffect(() => {
    let active = true;
    loadPages(() => active);

    return () => {
      active = false;
    };
  }, []);

  async function openPage(page) {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/cms/admin/preview?key=${encodeURIComponent(page.page_key)}`,
        { cache: "no-store" }
      );
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to load this page.");
      }

      const pageData = result.page;
      const firstSection = pageData.content.sections?.[0];

      setPageKey(pageData.pageKey);
      setPageTitle(pageData.title);
      setRoute(pageData.route);
      resetEditorHistory(pageData.content);
      setContent(pageData.content);
      setDraftId(pageData.draftId || "");
      setSavedSnapshot(
        JSON.stringify({
          pageKey: pageData.pageKey,
          pageTitle: pageData.title,
          route: pageData.route,
          content: pageData.content,
        })
      );
      setDraftVersion(pageData.draftVersion || null);
      setPublishedVersion(pageData.publishedVersion || null);
      setSelectedSectionId(firstSection?.id || "");
      setStructuredJson(
        JSON.stringify(firstSection?.content || {}, null, 2)
      );
    } catch (loadError) {
      setError(loadError.message || "Unable to load this page.");
    } finally {
      setBusy(false);
    }
  }

  function loadHomeTemplate() {
    const initial = JSON.parse(JSON.stringify(homeCmsTemplate));
    const firstSection = initial.sections[0];

    resetEditorHistory(initial);
    setPageKey("home");
    setPageTitle("Home");
    setRoute("/");
    setContent(initial);
    setSelectedSectionId(firstSection.id);
    setDraftId("");
    setDraftVersion(null);
    setPublishedVersion(null);
    setSavedSnapshot("");
    setStructuredJson(JSON.stringify(firstSection.content, null, 2));
    setNotice(
      "Existing homepage template loaded into a new Home draft. Save it before publishing."
    );
    setError("");
  }

  function createPage() {
    const title = window.prompt("New page title");
    if (!title?.trim()) return;

    const trimmedTitle = title.trim();
    const key = trimmedTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    if (!key) {
      setError("Please use a title containing letters or numbers.");
      return;
    }

    const pageRoute = key === "home" ? "/" : `/${key}`;
    const initial = starterContent(trimmedTitle);
    const firstSection = initial.sections[0];

    resetEditorHistory(initial);
    setPageKey(key);
    setPageTitle(trimmedTitle);
    setRoute(pageRoute);
    setContent(initial);
    setSelectedSectionId(firstSection.id);
    setDraftId("");
    setDraftVersion(null);
    setPublishedVersion(null);
    setSavedSnapshot("");
    setStructuredJson(JSON.stringify(firstSection.content, null, 2));
    setNotice("New page started. Save it as a draft when ready.");
  }

  function updateSectionFields(patch) {
    if (!selectedSection || !patch || typeof patch !== "object") return;
    const nextSectionContent = { ...(selectedSection.content || {}), ...patch };
    setContent((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === selectedSection.id
        ? { ...section, content: { ...(section.content || {}), ...patch } }
        : section),
    }));
    setStructuredJson(JSON.stringify(nextSectionContent, null, 2));
  }

  function updateSection(field, value) {
    if (!selectedSection) return;

    setContent((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.id !== selectedSection.id) return section;

        return {
          ...section,
          content: {
            ...(section.content || {}),
            [field]: value,
          },
        };
      }),
    }));

    setStructuredJson(
      JSON.stringify(
        { ...(selectedSection.content || {}), [field]: value },
        null,
        2
      )
    );
  }


  function updateSectionItem(index, field, value) {
    if (!selectedSection) return;
    const currentItems = Array.isArray(selectedSection.content?.items) ? selectedSection.content.items : [];
    const nextItems = currentItems.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      if (selectedSection.type === "brand-grid") return value;
      return { ...(item || {}), [field]: value };
    });
    updateSection("items", nextItems);
  }

  function addSectionItem() {
    if (!selectedSection) return;
    const currentItems = Array.isArray(selectedSection.content?.items) ? selectedSection.content.items : [];
    if (currentItems.length >= 100) return setError("A section can contain no more than 100 items.");
    const item = selectedSection.type === "brand-grid" ? "" : { id: crypto.randomUUID(), heading: "", description: "" };
    updateSection("items", [...currentItems, item]);
  }

  function removeSectionItem(index) {
    if (!selectedSection) return;
    const currentItems = Array.isArray(selectedSection.content?.items) ? selectedSection.content.items : [];
    updateSection("items", currentItems.filter((_, itemIndex) => itemIndex !== index));
  }

  function toggleFeaturedProduct(slug, checked) {
    if (!selectedSection) return;
    const currentSlugs = Array.isArray(selectedSection.content?.productSlugs) ? selectedSection.content.productSlugs : [];
    updateSection("productSlugs", checked ? [...new Set([...currentSlugs, slug])] : currentSlugs.filter((item) => item !== slug));
  }

  function updateProofItem(index, value) {
    if (!selectedSection) return;
    const currentItems = Array.isArray(selectedSection.content?.proofItems) ? selectedSection.content.proofItems : [];
    updateSection("proofItems", currentItems.map((item, itemIndex) => itemIndex === index ? value : item));
  }

  function addProofItem() {
    if (!selectedSection) return;
    const currentItems = Array.isArray(selectedSection.content?.proofItems) ? selectedSection.content.proofItems : [];
    if (currentItems.length >= 30) return setError("A hero section can contain no more than 30 proof items.");
    updateSection("proofItems", [...currentItems, ""]);
  }

  function removeProofItem(index) {
    if (!selectedSection) return;
    const currentItems = Array.isArray(selectedSection.content?.proofItems) ? selectedSection.content.proofItems : [];
    updateSection("proofItems", currentItems.filter((_, itemIndex) => itemIndex !== index));
  }

  function removeSectionToRecoveryBin() {
    if (!selectedSection || !pageKey) return;

    const result = removeSectionFromContent(
      content,
      selectedSection.id,
      crypto.randomUUID(),
      pageKey
    );
    if (!result.entry) return;

    setRemovedSections((current) => [
      ...current.filter(
        (item) =>
          !(
            item.pageKey === pageKey &&
            item.section.id === selectedSection.id
          )
      ),
      result.entry,
    ]);
    setContent(result.content);

    const nextSelected =
      result.content.sections.find(
        (section) => section.id === result.nextSelectedId
      ) || null;

    setSelectedSectionId(nextSelected?.id || "");
    setStructuredJson(
      JSON.stringify(nextSelected?.content || {}, null, 2)
    );
    setNotice(
      "Section moved to the recovery bin. You can restore it or use Undo."
    );
    setError("");
  }

  function restoreRemovedSection(entry) {
    if (!entry) return;

    const alreadyExists = content.sections.some(
      (section) => section.id === entry.section.id
    );

    if (entry.pageKey !== pageKey || alreadyExists) return;

    setContent((current) =>
      restoreSectionToContent(current, entry, pageKey)
    );
    setSelectedSectionId(entry.section.id);
    setStructuredJson(
      JSON.stringify(entry.section.content || {}, null, 2)
    );
    setNotice(
      "Section restored to its original position. Save the Preview draft to keep this change."
    );
    setError("");
  }

  function permanentlyDiscardRemovedSection(entry) {
    const label =
      entry.section.content?.heading || entry.section.type || "this section";
    const confirmed = window.confirm(
      `Permanently discard “${label}” from the recovery bin? This cannot be undone.`
    );

    if (!confirmed) return;

    setRemovedSections((current) =>
      current.filter((item) => item.id !== entry.id)
    );
    setNotice("Removed section permanently discarded from this editor session.");
  }

  function addSection(type) {
    const section = {
      id: crypto.randomUUID(),
      type,
      visible: true,
      order: content.sections.length + 1,
      content: {
        heading: "",
        description: "",
        buttonText: "",
        buttonUrl: "",
        imageUrl: "",
        imageAlt: "",
      },
      layout: {
        variant: type === "hero" ? "split" : "standard",
      },
    };

    setContent((current) => ({
      ...current,
      sections: [...current.sections, section],
    }));
    setSelectedSectionId(section.id);
    setStructuredJson(JSON.stringify(section.content, null, 2));
  }

  function moveSection(id, direction) {
    setContent((current) => {
      const items = [...current.sections];
      const index = items.findIndex((item) => item.id === id);
      const nextIndex = index + direction;

      if (
        index < 0 ||
        nextIndex < 0 ||
        nextIndex >= items.length
      ) {
        return current;
      }

      [items[index], items[nextIndex]] = [
        items[nextIndex],
        items[index],
      ];

      return {
        ...current,
        sections: items.map((item, itemIndex) => ({
          ...item,
          order: itemIndex + 1,
        })),
      };
    });
  }

  function updateHomeGlobalDesign(field, value) {
    setContent((current) => ({
      ...current,
      design: {
        ...(current.design || {}),
        global: {
          ...(current.design?.global || {}),
          [field]: value,
        },
      },
    }));
  }

  function updateHomeSectionDesign(sectionId, field, value) {
    setContent((current) => ({
      ...current,
      design: {
        ...(current.design || {}),
        sections: {
          ...(current.design?.sections || {}),
          [sectionId]: {
            ...(current.design?.sections?.[sectionId] || {}),
            [field]: value,
          },
        },
      },
    }));
  }

  function updateHomeSectionColor(sectionId, field, value) {
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
    updateHomeSectionDesign(sectionId, field, value.toLowerCase());
  }

  function resetHomeSectionDesign(sectionId) {
    setContent((current) => ({
      ...current,
      design: {
        ...(current.design || {}),
        sections: {
          ...(current.design?.sections || {}),
          [sectionId]: {},
        },
      },
    }));
  }

  function reorderSections(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;

    setContent((current) => {
      const items = [...current.sections];
      const fromIndex = items.findIndex((item) => item.id === fromId);
      const toIndex = items.findIndex((item) => item.id === toId);

      if (fromIndex < 0 || toIndex < 0) return current;

      const [movedSection] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, movedSection);

      return {
        ...current,
        sections: items.map((item, index) => ({
          ...item,
          order: index + 1,
        })),
      };
    });

    dragSectionId.current = null;
  }

  function restoreSavedDraft() {
    if (!savedSnapshot) return;
    try {
      const snapshot = JSON.parse(savedSnapshot);
      setPageKey(snapshot.pageKey);
      setPageTitle(snapshot.pageTitle);
      setRoute(snapshot.route);
      resetEditorHistory(snapshot.content);
      setContent(snapshot.content);
      const selected = snapshot.content.sections?.find((section) => section.id === selectedSectionId) || snapshot.content.sections?.[0];
      setSelectedSectionId(selected?.id || "");
      setStructuredJson(JSON.stringify(selected?.content || {}, null, 2));
      setError("");
      setNotice("Restored the last saved page revision in the editor. No content was published.");
    } catch {
      setError("The saved snapshot could not be restored. Reload the page and try again.");
    }
  }

  async function saveDraft() {
    if (!pageKey || !pageTitle.trim()) {
      setError("Choose a page title first.");
      return;
    }

    const sectionIds = content.sections
      .map((section) => section?.id)
      .filter(Boolean);
    const hasMissingOrDuplicateIds =
      sectionIds.length !== content.sections.length ||
      new Set(sectionIds).size !== sectionIds.length;

    if (hasMissingOrDuplicateIds) {
      setError(
        "Every section must have a unique ID before this draft can be saved. Existing content has not been changed."
      );
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/cms/admin/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          pageKey,
          title: pageTitle,
          route,
          content,
          changeNote: "Visual editor update",
        }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to save draft.");
      }

      setDraftId(result.draftId);
      setDraftVersion(result.version);
      setSavedSnapshot(
        JSON.stringify({ pageKey, pageTitle, route, content })
      );
      setNotice(
        `Draft V${result.version} saved. The public website has not changed.`
      );
      await loadPages();
    } catch (saveError) {
      setError(saveError.message || "Unable to save draft.");
    } finally {
      setBusy(false);
    }
  }

  async function publishDraft() {
    if (!draftId || !pageKey) {
      setError("Save a draft before publishing.");
      return;
    }

    if (hasUnsavedChanges) {
      setError("Save or correct all page edits before publishing.");
      return;
    }

    const confirmed = window.confirm(
      "Publish this page revision to the public website?"
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/cms/admin/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ pageKey, versionId: draftId }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Unable to publish this page.");
      }

      setPublishedVersion(result.version);
      setDraftId("");
      setDraftVersion(null);
      setNotice(`Page revision V${result.version} published.`);
      await loadPages();
    } catch (publishError) {
      setError(publishError.message || "Unable to publish this page.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cms-admin-page">
      <div className="cms-admin-shell">
        <header className="cms-admin-header">
          <div><p className="eyebrow">YR Proservice · Content Management</p><h1>Visual Website Editor</h1>
            <p>Edit page sections in the preview and manage their content in the inspector. Changes remain drafts until published.</p></div>
          <div className="cms-header-links">
            <a className="admin-public-link" href="/admin/cms/manage">
              Management Centre →
            </a>
            <a className="admin-public-link" href="/admin">
              ← Request Dashboard
            </a>
          </div>
        </header>
        {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
        {notice && <p className="admin-alert admin-alert-success" role="status">{notice}</p>}
        <div className="cms-admin-toolbar">
          <div>
            <strong>{pageTitle || "No page selected"}</strong>
            <small>
              {pageKey
                ? `${route} · ${draftVersion
                    ? `Draft V${draftVersion}`
                    : publishedVersion
                      ? `Published V${publishedVersion}`
                      : "Not saved"}`
                : "Choose a page or create a draft"}
            </small>
          </div>
          <div className="cms-toolbar-actions">
            <button type="button" className="admin-secondary-button" onClick={loadHomeTemplate} disabled={busy || pages.some((page) => page.page_key === "home")}>Load Home template</button>
            <button type="button" className="admin-secondary-button" onClick={createPage}>New page</button>
            <button type="button" className="admin-secondary-button" onClick={() => applyHistorySnapshot("undo")} disabled={busy || !canUndo} title="Undo the last editor change">Undo</button>
            <button type="button" className="admin-secondary-button" onClick={() => applyHistorySnapshot("redo")} disabled={busy || !canRedo} title="Redo the last undone editor change">Redo</button>
            <button type="button" className="admin-secondary-button" onClick={saveDraft} disabled={busy || !pageKey}>Save Preview draft</button>
            <button type="button" className="admin-secondary-button" onClick={restoreSavedDraft} disabled={busy || !savedSnapshot || !hasUnsavedChanges}>Restore last saved draft</button>
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() =>
                window.open(
                  `/admin/cms/preview?key=${encodeURIComponent(pageKey)}`,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              disabled={busy || !draftId || hasUnsavedChanges}
            >
              Preview saved draft
            </button>
            {hasUnsavedChanges && <small role="status">Unsaved or invalid edits · correct the JSON and save before previewing</small>}
            <button type="button" className="admin-primary-button" onClick={publishDraft} disabled={busy || !draftId || hasUnsavedChanges}>Publish</button>
            <div className="cms-admin-session" role="status"><span>Admin access active</span><button type="button" onClick={onAdminLogout}>Log out</button></div>
          </div>
        </div>
        <div className="cms-editor-grid">
          <aside className="cms-pages-panel">
            <h2>Pages</h2>
            {pages.length === 0 && <p className="admin-empty">No CMS pages yet. Create a page draft to begin. Existing website pages are not changed automatically.</p>}
            {pages.map((page) => <button key={page.id} type="button" className={pageKey === page.page_key ? "cms-page-link active" : "cms-page-link"} onClick={() => openPage(page)}>
              <strong>{page.title}</strong>
              <small>{page.route}</small>
              <span>
                {page.draft_id
                  ? `Draft V${page.draft_version}`
                  : page.published_version
                    ? `Published V${page.published_version}`
                    : "No content"}
              </span>
            </button>)}
          </aside>
          <section className="cms-canvas-panel">
            <div className="cms-canvas-heading">
              <div><h2>Page preview</h2><small>Click a section to select it for editing</small></div>
              <div className="cms-canvas-heading-actions">
                <div className="cms-device-switcher" role="group" aria-label="Preview device size">
                  {["desktop", "tablet", "mobile"].map((device) => (
                    <button
                      key={device}
                      type="button"
                      className={previewDevice === device ? "is-active" : ""}
                      aria-pressed={previewDevice === device}
                      disabled={!pageKey}
                      onClick={() => setPreviewDevice(device)}
                    >
                      {device[0].toUpperCase() + device.slice(1)}
                    </button>
                  ))}
                </div>
                <span className="cms-preview-label">Draft preview</span>
              </div>
            </div>
            <div className={`cms-canvas-viewport cms-canvas-viewport-${previewDevice}`} data-device={previewDevice}>
              <div className="cms-canvas" style={{ "--cms-home-heading-font": homeDesign.global?.headingFont || "Montserrat", "--cms-home-body-font": homeDesign.global?.bodyFont || "Inter" }}>
              {!pageKey ? <div className="cms-empty-canvas">Select a page or create a new page draft.</div> :
                content.sections.filter((section) => section.visible !== false).sort((a,b) => a.order-b.order).map((section) =>
                  <div
                    key={section.id}
                    className="cms-home-draggable-section"
                    draggable
                    onDragStart={() => {
                      dragSectionId.current = section.id;
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() =>
                      reorderSections(dragSectionId.current, section.id)
                    }
                    onDragEnd={() => {
                      dragSectionId.current = null;
                    }}
                  >
                    <SectionPreview
                      section={section}
                      selected={section.id === selectedSectionId}
                      design={homeDesign}
                      onClick={() => {
                        setSelectedSectionId(section.id);
                        setStructuredJson(
                          JSON.stringify(section.content || {}, null, 2)
                        );
                      }}
                    />
                  </div>)} 
              </div>
            </div>
            {pageKey && (
              <div className="cms-add-section">
                <label htmlFor="cms-add-section">Add section</label>
                <select
                  id="cms-add-section"
                  value=""
                  onChange={(event) =>
                    event.target.value && addSection(event.target.value)
                  }
                >
                  <option value="">Choose a section type…</option>
                  {SECTION_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </section>
          <aside className="cms-inspector-panel">
            <h2>Management panel</h2>
            {pageKey && (
              <div className="cms-page-settings">
                <label>
                  Page title
                  <input
                    value={pageTitle}
                    onChange={(event) => setPageTitle(event.target.value)}
                  />
                </label>
                <label>
                  Route
                  <input
                    value={route}
                    onChange={(event) => setRoute(event.target.value)}
                  />
                </label>
              </div>
            )}


            <details className="cms-recovery-bin">
              <summary>Removed sections · {removedSections.filter((item) => item.pageKey === pageKey).length}</summary>
              <p className="cms-recovery-note">
                This recovery bin lasts for this editor session only. Restoring
                preserves section content, ID, styling reference and original
                position. Save the Preview draft to keep the restored version.
              </p>
              {removedSections.filter((item) => item.pageKey === pageKey).length === 0
                ? <p className="cms-recovery-empty">No removed sections for this page.</p>
                : <ul className="cms-recovery-list">{removedSections.filter((item) => item.pageKey === pageKey).map((entry) => {
                  const alreadyPresent = content.sections.some((section) => section.id === entry.section.id);
                  const label = entry.section.content?.heading || SECTION_TYPES.find((type) => type.value === entry.section.type)?.label || entry.section.type;
                  return <li key={entry.id}>
                    <div><strong>{label}</strong><small>Original position: {entry.originalIndex + 1}{alreadyPresent ? " · Already in page" : ""}</small></div>
                    <div className="cms-recovery-actions">
                      <button type="button" className="admin-secondary-button" onClick={() => restoreRemovedSection(entry)} disabled={alreadyPresent || busy}>Restore</button>
                      <button type="button" className="cms-recovery-discard" onClick={() => permanentlyDiscardRemovedSection(entry)} disabled={busy}>Discard</button>
                    </div>
                  </li>;
                })}</ul>}
            </details>
            {pageKey === "home" && <details className="cms-home-design-panel" open>
              <summary>Visual Design Studio</summary>
              <p className="cms-home-design-note">Adjust the Home page appearance without replacing its existing content. All changes are saved as a Preview draft.</p>
              <div className="cms-home-design-subpanel">
                <h3>Global typography</h3>
                <label>
                  Heading font
                  <select
                    value={homeDesign.global?.headingFont || "Montserrat"}
                    onChange={(event) =>
                      updateHomeGlobalDesign("headingFont", event.target.value)
                    }
                  >
                    <option>Montserrat</option>
                    <option>Inter</option>
                    <option>Arial</option>
                  </select>
                </label>
                <label>
                  Body font
                  <select
                    value={homeDesign.global?.bodyFont || "Inter"}
                    onChange={(event) =>
                      updateHomeGlobalDesign("bodyFont", event.target.value)
                    }
                  >
                    <option>Inter</option>
                    <option>Montserrat</option>
                    <option>Arial</option>
                  </select>
                </label>
                <label>
                  Heading size · {Math.round(Number(homeDesign.global?.headingScale || 1) * 100)}%
                  <input
                    type="range"
                    min="0.8"
                    max="1.25"
                    step="0.05"
                    value={homeDesign.global?.headingScale || 1}
                    onChange={(event) =>
                      updateHomeGlobalDesign("headingScale", Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  Body text size · {homeDesign.global?.bodySize || 16}px
                  <input
                    type="range"
                    min="13"
                    max="20"
                    step="1"
                    value={homeDesign.global?.bodySize || 16}
                    onChange={(event) =>
                      updateHomeGlobalDesign("bodySize", Number(event.target.value))
                    }
                  />
                </label>
                <label>
                  Heading weight
                  <select
                    value={homeDesign.global?.headingWeight || 700}
                    onChange={(event) =>
                      updateHomeGlobalDesign("headingWeight", Number(event.target.value))
                    }
                  >
                    <option value="500">Medium</option>
                    <option value="600">Semi-bold</option>
                    <option value="700">Bold</option>
                    <option value="800">Extra-bold</option>
                    <option value="900">Black</option>
                  </select>
                </label>
                <label>
                  Heading letter spacing · {Number(homeDesign.global?.headingLetterSpacing ?? -0.025).toFixed(3)}em
                  <input
                    type="range"
                    min="-0.06"
                    max="0.08"
                    step="0.005"
                    value={homeDesign.global?.headingLetterSpacing ?? -0.025}
                    onChange={(event) =>
                      updateHomeGlobalDesign(
                        "headingLetterSpacing",
                        Number(event.target.value)
                      )
                    }
                  />
                </label>
                <label>
                  Content width
                  <select
                    value={homeDesign.global?.contentWidth || "standard"}
                    onChange={(event) =>
                      updateHomeGlobalDesign("contentWidth", event.target.value)
                    }
                  >
                    <option value="compact">Compact · 1040px</option>
                    <option value="standard">Standard · 1180px</option>
                    <option value="wide">Wide · 1380px</option>
                  </select>
                </label>
              </div>
              <div className="cms-home-design-subpanel">
                <h3>Section order</h3>
                <p>Drag sections in the page preview to reorder them, or use the move buttons below.</p>
                <ol className="cms-home-order-list">
                  {[...content.sections]
                    .sort((first, second) => (first.order || 0) - (second.order || 0))
                    .map((section, index) => (
                      <li
                        key={section.id}
                        draggable
                        onDragStart={() => {
                          dragSectionId.current = section.id;
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() =>
                          reorderSections(dragSectionId.current, section.id)
                        }
                        onDragEnd={() => {
                          dragSectionId.current = null;
                        }}
                      >
                        <span aria-hidden="true">⠿</span>
                        <button
                          type="button"
                          className="cms-home-section-select"
                          aria-pressed={section.id === selectedSectionId}
                          onClick={() => {
                            setSelectedSectionId(section.id);
                            setStructuredJson(
                              JSON.stringify(section.content || {}, null, 2)
                            );
                          }}
                        >
                          {index + 1}. {section.content?.heading || section.type}
                        </button>
                  <small>{section.visible===false?"Hidden":"Visible"}</small>
                        <button
                          type="button"
                          className="cms-home-visibility-toggle"
                          aria-label={`${section.visible === false ? "Show" : "Hide"} ${section.content?.heading || section.type}`}
                          onClick={() =>
                            setContent((current) => ({
                              ...current,
                              sections: current.sections.map((item) =>
                                item.id === section.id
                                  ? { ...item, visible: item.visible === false }
                                  : item
                              ),
                            }))
                          }
                        >
                          {section.visible === false ? "Show" : "Hide"}
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${section.content?.heading || section.type} up`}
                          disabled={index === 0}
                          onClick={() => moveSection(section.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          aria-label={`Move ${section.content?.heading || section.type} down`}
                          disabled={index === content.sections.length - 1}
                          onClick={() => moveSection(section.id, 1)}
                        >
                          ↓
                        </button>
                      </li>
                    ))}
                </ol>
              </div>
              <div className="cms-home-design-subpanel">
                <h3>Colours and alignment · all sections</h3>
                <div className="cms-home-style-grid">{content.sections.map((section)=>{
                  const style=homeDesign.sections?.[section.id]||{};
                  const label=section.content?.heading || section.type;
                  return <details className="cms-home-style-card" key={section.id}>
                    <summary><strong>{label}</strong><small>{section.visible===false?"Hidden section":"Section styling"}</small></summary>
                    <div className="cms-home-style-controls">
                      {[
                        ["backgroundColor", "Background", "#ffffff"],
                        ["textColor", "Text", "#1f2937"],
                        ["accentColor", "Accent", "#1e7ed8"],
                      ].map(([field, name, fallback]) => (
                        <label key={field}>
                          <span>{name}</span>
                          <input
                            aria-label={`${label} ${name.toLowerCase()} colour`}
                            type="color"
                            value={style[field] || fallback}
                            onChange={(event) =>
                              updateHomeSectionColor(section.id, field, event.target.value)
                            }
                          />
                          <input
                            aria-label={`${label} ${name.toLowerCase()} HEX`}
                            className="cms-home-hex-input"
                            type="text"
                            key={`${section.id}-${field}-${style[field] || fallback}`}
                            defaultValue={style[field] || fallback}
                            maxLength={7}
                            pattern="^#[0-9a-fA-F]{6}$"
                            onBlur={(event) => {
                              if (/^#[0-9a-fA-F]{6}$/.test(event.target.value)) {
                                updateHomeSectionColor(section.id, field, event.target.value);
                              } else {
                                event.target.value = style[field] || fallback;
                              }
                            }}
                          />
                        </label>
                      ))}
                      <label>
                        <span>Text alignment</span>
                        <select
                          value={style.textAlign || "left"}
                          onChange={(event) =>
                            updateHomeSectionDesign(section.id, "textAlign", event.target.value)
                          }
                        >
                          <option value="left">Left</option>
                          <option value="center">Centre</option>
                          <option value="right">Right</option>
                        </select>
                      </label>
                      <button type="button" className="admin-secondary-button" onClick={()=>resetHomeSectionDesign(section.id)}>Reset styling</button>
                    </div>
                  </details>;
                })}</div>
              </div>
              {selectedSection && <div className="cms-home-design-subpanel">
                <h3>Selected section layout</h3>
                {(selectedSection.type==="hero" || selectedSection.type==="editorial" || selectedSection.type==="services-banner") && <div className="cms-layout-preset-field">
                  <strong>Layout preset</strong>
                  <LayoutPresetPicker
                    value={selectedSection.content?.layout || (selectedSection.type==="hero"?"overlay-left":"split-right")}
                    options={selectedSection.type==="hero" ? HERO_LAYOUT_PRESETS : SPLIT_LAYOUT_PRESETS}
                    onChange={(value)=>updateSection("layout",value)}
                  />
                </div>}
                {(selectedSection.type === "hero" ||
                  selectedSection.type === "editorial" ||
                  selectedSection.type === "services-banner") && (
                  <label>
                    Image position
                    <select
                      value={selectedSection.content?.imagePosition || "center"}
                      onChange={(event) =>
                        updateSection("imagePosition", event.target.value)
                      }
                    >
                      <option value="center">Centre</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                      <option value="50% 35%">50% · 35%</option>
                    </select>
                  </label>
                )}
                {(selectedSection.type==="hero" || selectedSection.type==="editorial" || selectedSection.type==="services-banner") && <>
                  <label>
                    Image height · {selectedSection.content?.imageHeight || 420}px
                    <input
                      type="range"
                      min="220"
                      max="720"
                      step="10"
                      value={selectedSection.content?.imageHeight || 420}
                      onChange={(event) =>
                        updateSection("imageHeight", Number(event.target.value))
                      }
                    />
                  </label>
                  <label>
                    Image fit
                    <select
                      value={selectedSection.content?.imageFit || "cover"}
                      onChange={(event) => updateSection("imageFit", event.target.value)}
                    >
                      <option value="contain">Contain · show full image</option>
                      <option value="cover">Cover · fill frame</option>
                      <option value="original">Original ratio</option>
                    </select>
                  </label>
                </>}
                {["feature-grid", "product-grid", "brand-grid", "benefits-grid"].includes(
                  selectedSection.type
                ) && (
                  <label>
                    Grid columns
                    <select
                      value={homeDesign.sections?.[selectedSection.id]?.cardColumns || "auto"}
                      onChange={(event) =>
                        updateHomeSectionDesign(
                          selectedSection.id,
                          "cardColumns",
                          event.target.value
                        )
                      }
                    >
                      <option value="auto">Use responsive default</option>
                      <option value="2">2 columns</option>
                      <option value="3">3 columns</option>
                      <option value="4">4 columns</option>
                    </select>
                  </label>
                )}
              </div>}
            </details>}
            {!selectedSection ? <p className="admin-empty">Select a section in the preview to edit its content.</p> : <>
              <div className="cms-inspector-title">
                <strong>
                  {SECTION_TYPES.find((item) => item.value === selectedSection.type)?.label ||
                    selectedSection.type}
                </strong>
                <small>Section settings</small>
              </div>
              <label>
                Show section
                <input
                  type="checkbox"
                  checked={selectedSection.visible !== false}
                  onChange={(event) =>
                    setContent((current) => ({
                      ...current,
                      sections: current.sections.map((item) =>
                        item.id === selectedSection.id
                          ? { ...item, visible: event.target.checked }
                          : item
                      ),
                    }))
                  }
                />
              </label>
              <label>
                Layout variant
                <input
                  value={selectedSection.layout?.variant || "standard"}
                  onChange={(event) =>
                    setContent((current) => ({
                      ...current,
                      sections: current.sections.map((item) =>
                        item.id === selectedSection.id
                          ? {
                              ...item,
                              layout: {
                                ...(item.layout || {}),
                                variant: event.target.value,
                              },
                            }
                          : item
                      ),
                    }))
                  }
                />
              </label>
              <label>Eyebrow / overline<input value={selectedSection.content?.eyebrow || ""} onChange={(event) => updateSection("eyebrow", event.target.value)} placeholder="SECTION LABEL" /></label>
              <label>Heading<input value={selectedSection.content?.heading || ""} onChange={(event) => updateSection("heading", event.target.value)} /></label>
              {selectedSection.type === "hero" && (
                <label>
                  Heading highlight (second line)
                  <input
                    value={selectedSection.content?.headingHighlight || ""}
                    onChange={(event) =>
                      updateSection("headingHighlight", event.target.value)
                    }
                  />
                </label>
              )}
              <label>Description<textarea rows="5" value={selectedSection.content?.description || ""} onChange={(event) => updateSection("description", event.target.value)} /></label>
              <label>Image URL<input value={selectedSection.content?.imageUrl || ""} onChange={(event) => updateSection("imageUrl", event.target.value)} placeholder="/assets/example.jpg" /></label>
              <div className="cms-section-media-picker">
                <div className="cms-section-media-heading"><strong>Choose from media library</strong><span>{uploadedMedia.length} uploaded · {catalogMedia.length} catalogue assets</span></div>
                <input aria-label="Search media library" value={mediaSearch} onChange={(event) => setMediaSearch(event.target.value)} placeholder="Search filename, brand or category" />
                {mediaError && <p className="cms-media-picker-error">{mediaError} You can still enter an image path manually.</p>}
                {mediaLoading && <p className="cms-media-picker-note">Loading uploaded media…</p>}
                <details className="cms-section-media-group">
                  <summary>Uploaded Preview media ({uploadedMedia.length})</summary>
                  {uploadedMedia.length ? <div className="cms-section-media-grid">
                    {uploadedMedia.filter((item) => `${item.original_file_name} ${item.mime_type}`.toLowerCase().includes(mediaSearch.toLowerCase())).map((item) => (
                      <button type="button" key={item.id} className={selectedSection.content?.imageUrl === item.public_url ? "is-selected" : ""} onClick={() => updateSectionFields({ imageUrl: item.public_url, imageAlt: item.alt_text || "" })}>
                        <img src={item.public_url} alt="" loading="lazy" /><span>{item.original_file_name}</span><small>{item.width && item.height ? `${item.width} × ${item.height} · ` : ""}{Math.round(item.byte_size / 1024)} KB</small>
                      </button>
                    ))}
                  </div> : <p className="cms-media-picker-note">No uploaded Preview images are available.</p>}
                </details>
                <details className="cms-section-media-group">
                  <summary>Original catalogue images ({catalogMedia.length})</summary>
                  <div className="cms-section-media-grid">
                    {catalogMedia.filter((item) => `${item.file} ${item.brand} ${item.category} ${item.folder}`.toLowerCase().includes(mediaSearch.toLowerCase())).map((item) => (
                      <button type="button" key={item.src} className={selectedSection.content?.imageUrl === item.src ? "is-selected" : ""} onClick={() => updateSection("imageUrl", item.src)}>
                        <img src={item.src} alt="" loading="lazy" /><span>{item.file}</span><small>{item.brand} · {item.category}</small>
                      </button>
                    ))}
                  </div>
                </details>
                {selectedSection.content?.imageUrl && <button type="button" className="admin-secondary-button" onClick={() => updateSection("imageUrl", "")}>Clear selected image</button>}
              </div>
              <label>Image alt text<input value={selectedSection.content?.imageAlt || ""} onChange={(event) => updateSection("imageAlt", event.target.value)} /></label>
              {["editorial", "image-text", "services-banner"].includes(selectedSection.type) && (
                <>
                  <label>Image number / marker<input value={selectedSection.content?.imageNumber || ""} onChange={(event) => updateSection("imageNumber", event.target.value)} /></label>
                  <label>Image title<input value={selectedSection.content?.imageTitle || ""} onChange={(event) => updateSection("imageTitle", event.target.value)} /></label>
                  <label>Image caption<input value={selectedSection.content?.imageDescription || ""} onChange={(event) => updateSection("imageDescription", event.target.value)} /></label>
                </>
              )}
              <label>Button text<input value={selectedSection.content?.buttonText || ""} onChange={(event) => updateSection("buttonText", event.target.value)} /></label>
              <label>Button destination<input value={selectedSection.content?.buttonUrl || ""} onChange={(event) => updateSection("buttonUrl", event.target.value)} placeholder="/products" /></label>
              {["hero", "editorial", "image-text", "services-banner", "cta"].includes(selectedSection.type) && (
                <div className="cms-inspector-secondary-action">
                  <strong>Secondary action</strong>
                  <label>Button text<input value={selectedSection.content?.secondaryButtonText || ""} onChange={(event) => updateSection("secondaryButtonText", event.target.value)} /></label>
                  <label>Button destination<input value={selectedSection.content?.secondaryButtonUrl || ""} onChange={(event) => updateSection("secondaryButtonUrl", event.target.value)} placeholder="/services" /></label>
                </div>
              )}
              {selectedSection.type === "product-grid" && (
                <section className="cms-inspector-collection">
                  <div className="cms-inspector-collection-heading"><div><h3>Featured products</h3><p>Choose which catalogue products appear in this section.</p></div></div>
                  <div className="cms-inspector-product-options">
                    {catalogueProducts.map((product) => {
                      const selectedSlugs = Array.isArray(selectedSection.content?.productSlugs) ? selectedSection.content.productSlugs : [];
                      return <label key={product.slug}><input type="checkbox" checked={selectedSlugs.includes(product.slug)} onChange={(event) => toggleFeaturedProduct(product.slug, event.target.checked)} /><span>{product.name}</span><small>{product.brand || product.slug}</small></label>;
                    })}
                  </div>
                </section>
              )}
              {["feature-grid", "benefits-grid", "brand-grid"].includes(selectedSection.type) && (
                <section className="cms-inspector-collection">
                  <div className="cms-inspector-collection-heading">
                    <div><h3>{selectedSection.type === "brand-grid" ? "Brand items" : selectedSection.type === "benefits-grid" ? "Benefits" : "Feature cards"}</h3><p>{selectedSection.type === "brand-grid" ? "Manage the logo filenames used by this grid." : "Edit each card without opening the JSON editor."}</p></div>
                    <button type="button" className="admin-secondary-button" onClick={addSectionItem} disabled={busy || (selectedSection.content?.items || []).length >= 100}>＋ Add item</button>
                  </div>
                  {(Array.isArray(selectedSection.content?.items) ? selectedSection.content.items : []).map((item, index) => (
                    <article className="cms-inspector-collection-item" key={item?.id || item?.slug || index}>
                      <div className="cms-inspector-collection-item-heading"><strong>{selectedSection.type === "brand-grid" ? `Brand ${index + 1}` : `Item ${index + 1}`}</strong><button type="button" className="cms-recovery-discard" onClick={() => removeSectionItem(index)} disabled={busy}>Remove</button></div>
                      {selectedSection.type === "brand-grid" ? (
                        <label>Image filename<input value={typeof item === "string" ? item : ""} onChange={(event) => updateSectionItem(index, "", event.target.value)} placeholder="manufacturer-logo.png" /></label>
                      ) : (
                        <>
                          <div className="cms-inspector-item-fields">
                            <label>Number / label<input value={item?.number || ""} onChange={(event) => updateSectionItem(index, "number", event.target.value)} /></label>
                            <label>Heading<input value={item?.heading || item?.title || ""} onChange={(event) => updateSectionItem(index, "heading", event.target.value)} /></label>
                            <label>Icon<input value={item?.icon || ""} onChange={(event) => updateSectionItem(index, "icon", event.target.value)} /></label>
                          </div>
                          <label>Description<textarea rows="3" value={item?.description || ""} onChange={(event) => updateSectionItem(index, "description", event.target.value)} /></label>
                          <label>Destination<input value={item?.url || ""} onChange={(event) => updateSectionItem(index, "url", event.target.value)} placeholder="/products" /></label>
                        </>
                      )}
                    </article>
                  ))}
                  {(selectedSection.content?.items || []).length === 0 && <p className="admin-empty">No items yet. Add the first item to populate this section.</p>}
                </section>
              )}
              {selectedSection.type === "hero" && (
                <section className="cms-inspector-collection">
                  <div className="cms-inspector-collection-heading"><div><h3>Hero proof points</h3><p>Short labels displayed below the hero actions.</p></div><button type="button" className="admin-secondary-button" onClick={addProofItem} disabled={busy || (selectedSection.content?.proofItems || []).length >= 30}>＋ Add point</button></div>
                  {(Array.isArray(selectedSection.content?.proofItems) ? selectedSection.content.proofItems : []).map((item, index) => (
                    <div className="cms-inspector-inline-item" key={index}><input aria-label={`Proof point ${index + 1}`} value={item} onChange={(event) => updateProofItem(index, event.target.value)} /><button type="button" className="cms-recovery-discard" onClick={() => removeProofItem(index)} disabled={busy}>Remove</button></div>
                  ))}
                </section>
              )}
              <details className="cms-advanced-section-json">
                <summary>Advanced section content (JSON)</summary>
                <label>
                  JSON content
                  <textarea
                    rows="12"
                    spellCheck="false"
                    value={structuredJson}
                    onChange={(event) => setStructuredJson(event.target.value)}
                    onBlur={() => {
                      try {
                        const parsed = JSON.parse(structuredJson);

                        if (
                          !parsed ||
                          typeof parsed !== "object" ||
                          Array.isArray(parsed)
                        ) {
                          throw new Error();
                        }

                        setContent((current) => ({
                          ...current,
                          sections: current.sections.map((item) =>
                            item.id === selectedSection.id
                              ? { ...item, content: parsed }
                              : item
                          ),
                        }));
                        setError("");
                      } catch {
                        setError(
                          "Advanced section content must be valid JSON object data."
                        );
                      }
                    }}
                  />
                </label>
              </details>
              <div className="cms-section-actions">
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() => moveSection(selectedSection.id, -1)}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={() => moveSection(selectedSection.id, 1)}
                >
                  Move down
                </button>
                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={removeSectionToRecoveryBin}
                  disabled={busy}
                >
                  Move to recovery bin
                </button>
              </div>
            </>}
          </aside>
        </div>
      </div>
    </section>
  );
}
