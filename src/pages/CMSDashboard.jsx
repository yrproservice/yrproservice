import React, { useCallback, useEffect, useMemo, useState } from "react";

const SECTION_TYPES = [
  { value: "hero", label: "Hero section" },
  { value: "text", label: "Text section" },
  { value: "image-text", label: "Image and text" },
  { value: "product-grid", label: "Product grid" },
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

function SectionPreview({ section, selected, onClick }) {
  const content = section.content || {};
  return (
    <button type="button" className={`cms-preview-section ${selected ? "is-selected" : ""}`}
      onClick={onClick} aria-pressed={selected}>
      <span className="cms-preview-type">{SECTION_TYPES.find((item) => item.value === section.type)?.label || section.type}</span>
      {section.type === "hero" ? <div className="cms-preview-hero">
        <div><h1>{content.heading || "Your heading"}</h1><p>{content.description || "Your description"}</p>
          {content.buttonText && <span className="cms-preview-button">{content.buttonText}</span>}</div>
        {content.imageUrl && <img src={content.imageUrl} alt={content.imageAlt || ""} />}
      </div> : section.type === "image-text" ? <div className="cms-preview-image-text">
        {content.imageUrl && <img src={content.imageUrl} alt={content.imageAlt || ""} />}
        <div><h2>{content.heading || "Section heading"}</h2><p>{content.description || "Section description"}</p></div>
      </div> : section.type === "product-grid" ? <div><h2>{content.heading || "Featured Products"}</h2><p>Product cards will be connected to the published product catalogue.</p></div>
        : <div><h2>{content.heading || "Section heading"}</h2><p>{content.description || "Section description"}</p>
          {content.buttonText && <span className="cms-preview-button">{content.buttonText}</span>}</div>}
    </button>
  );
}

export default function CMSDashboard() {
  const [pages, setPages] = useState([]);
  const [pageKey, setPageKey] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [route, setRoute] = useState("/");
  const [content, setContent] = useState({ sections: [] });
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [draftId, setDraftId] = useState("");
  const [draftVersion, setDraftVersion] = useState(null);
  const [publishedVersion, setPublishedVersion] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedSection = useMemo(
    () => content.sections.find((section) => section.id === selectedSectionId) || null,
    [content.sections, selectedSectionId]
  );

  const loadPages = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/cms/admin/pages", { headers: { Accept: "application/json" }, cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load CMS pages.");
      setPages(result.pages || []);
    } catch (err) { setError(err.message || "Unable to load CMS pages."); }
  }, []);

  useEffect(() => { loadPages(); }, [loadPages]);

  async function openPage(page) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/cms/admin/preview?key=${encodeURIComponent(page.page_key)}`, { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load this page.");
      setPageKey(result.page.pageKey); setPageTitle(result.page.title); setRoute(result.page.route);
      setContent(result.page.content); setDraftId(result.page.draftId || "");
      setDraftVersion(result.page.draftVersion || null); setPublishedVersion(result.page.publishedVersion || null);
      setSelectedSectionId(result.page.content.sections?.[0]?.id || "");
    } catch (err) { setError(err.message || "Unable to load this page."); }
    finally { setBusy(false); }
  }

  function createPage() {
    const title = window.prompt("New page title");
    if (!title?.trim()) return;
    const key = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!key) { setError("Please use a title containing letters or numbers."); return; }
    const pageRoute = key === "home" ? "/" : `/${key}`;
    const initial = starterContent(title.trim());
    setPageKey(key); setPageTitle(title.trim()); setRoute(pageRoute); setContent(initial);
    setSelectedSectionId(initial.sections[0].id); setDraftId(""); setDraftVersion(null);
    setPublishedVersion(null); setNotice("New page started. Save it as a draft when ready.");
  }

  function updateSection(field, value) {
    if (!selectedSection) return;
    setContent((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id !== selectedSection.id
        ? section : { ...section, content: { ...(section.content || {}), [field]: value } })
    }));
  }

  function addSection(type) {
    const section = { id: crypto.randomUUID(), type, visible: true, order: content.sections.length + 1,
      content: { heading: "", description: "", buttonText: "", buttonUrl: "", imageUrl: "", imageAlt: "" },
      layout: { variant: type === "hero" ? "split" : "standard" } };
    setContent((current) => ({ ...current, sections: [...current.sections, section] }));
    setSelectedSectionId(section.id);
  }

  function moveSection(id, direction) {
    setContent((current) => {
      const items = [...current.sections]; const index = items.findIndex((item) => item.id === id);
      const next = index + direction; if (index < 0 || next < 0 || next >= items.length) return current;
      [items[index], items[next]] = [items[next], items[index]];
      return { ...current, sections: items.map((item, i) => ({ ...item, order: i + 1 })) };
    });
  }

  async function saveDraft() {
    if (!pageKey || !pageTitle.trim()) { setError("Choose a page title first."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/cms/admin/pages", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ pageKey, title: pageTitle, route, content, changeNote: "Visual editor update" }),
        cache: "no-store"
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to save draft.");
      setDraftId(result.draftId); setDraftVersion(result.version);
      setNotice(`Draft V${result.version} saved. The public website has not changed.`);
      await loadPages();
    } catch (err) { setError(err.message || "Unable to save draft."); }
    finally { setBusy(false); }
  }

  async function publishDraft() {
    if (!draftId || !pageKey) { setError("Save a draft before publishing."); return; }
    if (!window.confirm("Publish this page revision to the public website?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/cms/admin/publish", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ pageKey, versionId: draftId }), cache: "no-store"
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || "Unable to publish this page.");
      setPublishedVersion(result.version); setDraftId(""); setDraftVersion(null);
      setNotice(`Page revision V${result.version} published.`);
      await loadPages();
    } catch (err) { setError(err.message || "Unable to publish this page."); }
    finally { setBusy(false); }
  }

  return (
    <section className="cms-admin-page">
      <div className="cms-admin-shell">
        <header className="cms-admin-header">
          <div><p className="eyebrow">YR Proservice · Content Management</p><h1>Visual Website Editor</h1>
            <p>Edit page sections in the preview and manage their content in the inspector. Changes remain drafts until published.</p></div>
          <a className="admin-public-link" href="/admin">← Request Dashboard</a>
        </header>
        {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
        {notice && <p className="admin-alert admin-alert-success" role="status">{notice}</p>}
        <div className="cms-admin-toolbar">
          <div><strong>{pageTitle || "No page selected"}</strong><small>{pageKey ? `${route} · ${draftVersion ? `Draft V${draftVersion}` : publishedVersion ? `Published V${publishedVersion}` : "Not saved"}` : "Choose a page or create a draft"}</small></div>
          <div className="cms-toolbar-actions">
            <button type="button" className="admin-secondary-button" onClick={createPage}>New page</button>
            <button type="button" className="admin-secondary-button" onClick={saveDraft} disabled={busy || !pageKey}>Save draft</button>
            <button type="button" className="admin-primary-button" onClick={publishDraft} disabled={busy || !draftId}>Publish</button>
          </div>
        </div>
        <div className="cms-editor-grid">
          <aside className="cms-pages-panel">
            <h2>Pages</h2>
            {pages.length === 0 && <p className="admin-empty">No CMS pages yet. Create a page draft to begin. Existing website pages are not changed automatically.</p>}
            {pages.map((page) => <button key={page.id} type="button" className={pageKey === page.page_key ? "cms-page-link active" : "cms-page-link"} onClick={() => openPage(page)}>
              <strong>{page.title}</strong><small>{page.route}</small><span>{page.draft_id ? `Draft V${page.draft_version}` : page.published_version ? `Published V${page.published_version}` : "No content"}</span>
            </button>)}
          </aside>
          <section className="cms-canvas-panel">
            <div className="cms-canvas-heading"><div><h2>Page preview</h2><small>Click a section to select it for editing</small></div><span className="cms-preview-label">Draft preview</span></div>
            <div className="cms-canvas">
              {!pageKey ? <div className="cms-empty-canvas">Select a page or create a new page draft.</div> :
                content.sections.filter((section) => section.visible !== false).sort((a,b) => a.order-b.order).map((section) =>
                  <SectionPreview key={section.id} section={section} selected={section.id === selectedSectionId} onClick={() => setSelectedSectionId(section.id)} />)}
            </div>
            {pageKey && <div className="cms-add-section"><label htmlFor="cms-add-section">Add section</label><select id="cms-add-section" value="" onChange={(event) => event.target.value && addSection(event.target.value)}><option value="">Choose a section type…</option>{SECTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>}
          </section>
          <aside className="cms-inspector-panel">
            <h2>Management panel</h2>
            {pageKey && <div className="cms-page-settings"><label>Page title<input value={pageTitle} onChange={(event) => setPageTitle(event.target.value)} /></label><label>Route<input value={route} onChange={(event) => setRoute(event.target.value)} /></label></div>}
            {!selectedSection ? <p className="admin-empty">Select a section in the preview to edit its content.</p> : <>
              <div className="cms-inspector-title"><strong>{SECTION_TYPES.find((item) => item.value === selectedSection.type)?.label || selectedSection.type}</strong><small>Section settings</small></div>
              <label>Heading<input value={selectedSection.content?.heading || ""} onChange={(event) => updateSection("heading", event.target.value)} /></label>
              <label>Description<textarea rows="5" value={selectedSection.content?.description || ""} onChange={(event) => updateSection("description", event.target.value)} /></label>
              <label>Image URL<input value={selectedSection.content?.imageUrl || ""} onChange={(event) => updateSection("imageUrl", event.target.value)} placeholder="/assets/example.jpg" /></label>
              <label>Image alt text<input value={selectedSection.content?.imageAlt || ""} onChange={(event) => updateSection("imageAlt", event.target.value)} /></label>
              <label>Button text<input value={selectedSection.content?.buttonText || ""} onChange={(event) => updateSection("buttonText", event.target.value)} /></label>
              <label>Button destination<input value={selectedSection.content?.buttonUrl || ""} onChange={(event) => updateSection("buttonUrl", event.target.value)} placeholder="/products" /></label>
              <div className="cms-section-actions"><button type="button" className="admin-secondary-button" onClick={() => moveSection(selectedSection.id, -1)}>Move up</button><button type="button" className="admin-secondary-button" onClick={() => moveSection(selectedSection.id, 1)}>Move down</button><button type="button" className="admin-secondary-button" onClick={() => { setContent((current) => ({...current, sections: current.sections.filter((item) => item.id !== selectedSection.id).map((item, i) => ({...item, order:i+1}))})); setSelectedSectionId(""); }}>Remove</button></div>
            </>}
          </aside>
        </div>
      </div>
    </section>
  );
}
