import React, { useEffect, useState } from "react";
import { mergePageDesign } from "../components/PageDesignScope";

const PAGE_OPTIONS = [
  ["home", "Home"],
  ["products", "Products listing"],
  ["product-detail", "Product details · all products"],
  ["services", "Services listing"],
  ["service-detail", "Service details · all services"],
  ["team", "Team"],
  ["cart", "Product cart"],
  ["dental-chair-request", "Dental chair request"],
  ["quote", "Quotation request"],
  ["service-request", "Service request"],
  ["track-request", "Track a request"]
];

const DEFAULTS = mergePageDesign();

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    },
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function readValue(value) {
  if (!value) return {};
  try { return typeof value === "string" ? JSON.parse(value) : value; }
  catch { return {}; }
}

export default function PageVisualDesignManager() {
  const [pageKey, setPageKey] = useState("products");
  const [design, setDesign] = useState(DEFAULTS);
  const [settings, setSettings] = useState([]);
  const [draftId, setDraftId] = useState("");
  const [draftVersion, setDraftVersion] = useState(null);
  const [publishedVersion, setPublishedVersion] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadSettings() {
    const result = await api("/api/cms/admin/settings");
    setSettings(result.settings || []);
    return result.settings || [];
  }

  function loadPage(key, rows = settings) {
    const settingKey = `page-design.${key}`;
    const row = rows.find((item) => item.setting_key === settingKey);
    const value = readValue(row?.draft_value || row?.published_value);
    setDesign(mergePageDesign(value));
    setDraftId(row?.draft_id || "");
    setDraftVersion(row?.draft_version || null);
    setPublishedVersion(row?.published_version || null);
    setError("");
    setNotice(row?.draft_id
      ? `Loaded saved ${PAGE_OPTIONS.find(([id]) => id === key)?.[1] || key} design draft V${row.draft_version}.`
      : row?.published_version
        ? "Loaded the current Preview design. Save changes to create a new draft."
        : "No design draft exists yet. Start with the current website appearance and save when ready.");
  }

  useEffect(() => {
    let active = true;
    api("/api/cms/admin/settings")
      .then((result) => {
        if (!active) return;
        const rows = result.settings || [];
        setSettings(rows);
        loadPage(pageKey, rows);
      })
      .catch((err) => { if (active) setError(err.message || "Unable to load page design settings."); });
    return () => { active = false; };
  }, []);

  function update(field, value) {
    setDesign((current) => ({ ...current, [field]: value }));
    setNotice("Unsaved design changes.");
  }

  async function saveDraft() {
    setBusy(true); setError(""); setNotice("");
    const key = `page-design.${pageKey}`;
    try {
      const result = await api("/api/cms/admin/settings", {
        method: "POST",
        body: JSON.stringify({ key, value: design, changeNote: `Visual design draft for ${pageKey}` })
      });
      setDraftId(result.draftId);
      setDraftVersion(result.version);
      setNotice(`Design draft V${result.version} saved. The public website has not changed.`);
      await loadSettings();
    } catch (err) {
      setError(err.message || "Unable to save the design draft.");
    } finally {
      setBusy(false);
    }
  }

  async function publishToPreview() {
    if (!draftId) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await api("/api/cms/admin/publish", {
        method: "POST",
        body: JSON.stringify({ entityType: "setting", entityKey: `page-design.${pageKey}`, versionId: draftId })
      });
      setPublishedVersion(result.version || draftVersion);
      setNotice(`Design V${result.version || draftVersion} published to the isolated Preview website only.`);
      await loadSettings();
    } catch (err) {
      setError(err.message || "Unable to publish the design to Preview.");
    } finally {
      setBusy(false);
    }
  }

  function openPreview() {
    if (!draftId && !publishedVersion) {
      setError("Save a design draft before opening its preview.");
      return;
    }
    window.open(`/admin/cms/design-preview?key=${encodeURIComponent(`page-design.${pageKey}`)}`, "_blank", "noopener,noreferrer");
  }

  function resetControls() {
    if (!window.confirm("Reset these design controls to their defaults? This changes the editor only until you save a new draft.")) return;
    setDesign(DEFAULTS);
    setNotice("Default design values loaded in the editor. Save to keep them as a draft.");
  }

  const colorFields = [
    ["backgroundColor", "Page background"],
    ["textColor", "Body text"],
    ["headingColor", "Headings"],
    ["primaryColor", "Primary colour"],
    ["accentColor", "Accent colour"],
    ["surfaceColor", "Card / panel background"],
    ["borderColor", "Borders"]
  ];

  return (
    <section className="page-visual-manager">
      <header className="page-visual-manager-header">
        <div>
          <p className="eyebrow">YR Proservice · Visual CMS</p>
          <h2>Website-wide Visual Design Studio</h2>
          <p>Choose a page, adjust its visual system, save a draft and inspect the real page layout in Preview. Content, product data and form behaviour are kept separate from these design settings.</p>
        </div>
      </header>

      {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
      {notice && <p className="admin-alert admin-alert-success" role="status">{notice}</p>}

      <div className="page-visual-manager-toolbar">
        <label>
          Page to design
          <select value={pageKey} onChange={(event) => {
            const next = event.target.value;
            setPageKey(next);
            loadPage(next);
          }}>
            {PAGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="page-visual-manager-actions">
          <button type="button" className="admin-secondary-button" disabled={busy} onClick={resetControls}>Reset controls</button>
          <button type="button" className="admin-primary-button" disabled={busy} onClick={saveDraft}>Save design draft</button>
          <button type="button" className="admin-secondary-button" disabled={busy || !draftId} onClick={publishToPreview}>Publish to Preview</button>
          <button type="button" className="admin-secondary-button" disabled={busy || (!draftId && !publishedVersion)} onClick={openPreview}>Preview page</button>
        </div>
      </div>

      <div className="page-visual-manager-grid">
        <section className="page-visual-panel">
          <h3>Colour system</h3>
          <p>Set the visual palette for this page. Text and background colours are independent so contrast can be checked deliberately.</p>
          <div className="page-visual-colour-grid">
            {colorFields.map(([field, label]) => <label key={field}>
              <span>{label}</span>
              <input type="color" value={design[field]} onChange={(event) => update(field, event.target.value)} />
              <code>{design[field]}</code>
            </label>)}
          </div>
        </section>

        <section className="page-visual-panel">
          <h3>Typography</h3>
          <div className="page-visual-control-grid">
            <label>Heading font<select value={design.headingFont} onChange={(event) => update("headingFont", event.target.value)}><option>Montserrat</option><option>Inter</option><option>Arial</option></select></label>
            <label>Body font<select value={design.bodyFont} onChange={(event) => update("bodyFont", event.target.value)}><option>Inter</option><option>Montserrat</option><option>Arial</option></select></label>
            <label>Heading scale · {Math.round(design.headingScale * 100)}%<input type="range" min="0.8" max="1.25" step="0.05" value={design.headingScale} onChange={(event) => update("headingScale", Number(event.target.value))} /></label>
            <label>Body text · {design.bodySize}px<input type="range" min="13" max="20" step="1" value={design.bodySize} onChange={(event) => update("bodySize", Number(event.target.value))} /></label>
            <label>Heading alignment<select value={design.headingAlign} onChange={(event) => update("headingAlign", event.target.value)}><option value="left">Left</option><option value="center">Centre</option></select></label>
          </div>
        </section>

        <section className="page-visual-panel">
          <h3>Page layout</h3>
          <div className="page-visual-control-grid">
            <label>Content width · {design.contentWidth}px<input type="range" min="960" max="1440" step="20" value={design.contentWidth} onChange={(event) => update("contentWidth", Number(event.target.value))} /></label>
            <label>Section spacing · {design.sectionSpacing}px<input type="range" min="36" max="120" step="4" value={design.sectionSpacing} onChange={(event) => update("sectionSpacing", Number(event.target.value))} /></label>
            <label>Hero layout<select value={design.heroLayout} onChange={(event) => update("heroLayout", event.target.value)}><option value="standard">Keep current layout</option><option value="centered">Centred content</option><option value="compact">Compact hero</option><option value="split">Balanced split</option></select></label>
            <label>Card columns<select value={design.cardColumns} onChange={(event) => update("cardColumns", event.target.value)}><option value="auto">Keep current grid</option><option value="2">2 columns</option><option value="3">3 columns</option><option value="4">4 columns</option></select></label>
            <label>Card appearance<select value={design.cardStyle} onChange={(event) => update("cardStyle", event.target.value)}><option value="soft">Soft shadow</option><option value="bordered">Bordered</option><option value="elevated">Elevated shadow</option><option value="flat">Flat</option></select></label>
            <label>Card corner radius · {design.cardRadius}px<input type="range" min="0" max="32" step="2" value={design.cardRadius} onChange={(event) => update("cardRadius", Number(event.target.value))} /></label>
            <label>Button corner radius · {design.buttonRadius}px<input type="range" min="0" max="32" step="2" value={design.buttonRadius} onChange={(event) => update("buttonRadius", Number(event.target.value))} /></label>
            <label>Image fit<select value={design.imageFit} onChange={(event) => update("imageFit", event.target.value)}><option value="contain">Contain · show full image</option><option value="cover">Cover · fill frame</option></select></label>
          </div>
        </section>
      </div>

      <p className="page-visual-manager-footnote">These settings are saved independently for each page template. Product details share one design configuration across all product models; service details share one configuration across all service entries. Saving creates a draft. Publishing here targets Preview only.</p>
    </section>
  );
}
