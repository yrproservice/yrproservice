import React, { useCallback, useEffect, useMemo, useState } from "react";
import { homeCmsTemplate } from "../data/homeCmsTemplate";

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

function SectionPreview({ section, selected, onClick }) {
  const content = section.content || {};
  return (
    <button type="button" className={`cms-preview-section ${selected ? "is-selected" : ""}`}
      onClick={onClick} aria-pressed={selected}>
      <span className="cms-preview-type">{SECTION_TYPES.find((item) => item.value === section.type)?.label || section.type}</span>
      {section.type === "hero" ? <div className="cms-preview-hero">
        <div><h1>{content.heading || "Your heading"}{content.headingHighlight && <><br /><span>{content.headingHighlight}</span></>}</h1><p>{content.description || "Your description"}</p>
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
  const [structuredJson, setStructuredJson] = useState("{}");
  const dragSectionId = React.useRef(null);
  const homeDesign = content.design || {};

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
      setStructuredJson(JSON.stringify(result.page.content.sections?.[0]?.content || {}, null, 2));
    } catch (err) { setError(err.message || "Unable to load this page."); }
    finally { setBusy(false); }
  }

  function loadHomeTemplate() {
    const initial = JSON.parse(JSON.stringify(homeCmsTemplate));
    setPageKey("home"); setPageTitle("Home"); setRoute("/"); setContent(initial);
    setSelectedSectionId(initial.sections[0].id); setDraftId(""); setDraftVersion(null); setPublishedVersion(null);
    setStructuredJson(JSON.stringify(initial.sections[0].content, null, 2));
    setNotice("Existing homepage template loaded into a new Home draft. Save it before publishing.");
    setError("");
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
    setPublishedVersion(null); setStructuredJson(JSON.stringify(initial.sections[0].content, null, 2)); setNotice("New page started. Save it as a draft when ready.");
  }

  function updateSection(field, value) {
    if (!selectedSection) return;
    setContent((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id !== selectedSection.id
        ? section : { ...section, content: { ...(section.content || {}), [field]: value } })
    }));
    setStructuredJson(JSON.stringify({ ...(selectedSection.content || {}), [field]: value }, null, 2));
  }

  function addSection(type) {
    const section = { id: crypto.randomUUID(), type, visible: true, order: content.sections.length + 1,
      content: { heading: "", description: "", buttonText: "", buttonUrl: "", imageUrl: "", imageAlt: "" },
      layout: { variant: type === "hero" ? "split" : "standard" } };
    setContent((current) => ({ ...current, sections: [...current.sections, section] }));
    setSelectedSectionId(section.id);
    setStructuredJson(JSON.stringify(section.content, null, 2));
  }

  function moveSection(id, direction) {
    setContent((current) => {
      const items = [...current.sections]; const index = items.findIndex((item) => item.id === id);
      const next = index + direction; if (index < 0 || next < 0 || next >= items.length) return current;
      [items[index], items[next]] = [items[next], items[index]];
      return { ...current, sections: items.map((item, i) => ({ ...item, order: i + 1 })) };
    });
  }

  function updateHomeGlobalDesign(field, value) {
    setContent((current) => ({
      ...current,
      design: { ...(current.design || {}), global: { ...(current.design?.global || {}), [field]: value } }
    }));
  }

  function updateHomeSectionDesign(sectionId, field, value) {
    setContent((current) => ({
      ...current,
      design: {
        ...(current.design || {}),
        sections: {
          ...(current.design?.sections || {}),
          [sectionId]: { ...(current.design?.sections?.[sectionId] || {}), [field]: value }
        }
      }
    }));
  }

  function resetHomeSectionDesign(sectionId) {
    setContent((current) => ({
      ...current,
      design: {
        ...(current.design || {}),
        sections: { ...(current.design?.sections || {}), [sectionId]: {} }
      }
    }));
  }

  function reorderSections(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    setContent((current) => {
      const items = [...current.sections];
      const from = items.findIndex((item) => item.id === fromId);
      const to = items.findIndex((item) => item.id === toId);
      if (from < 0 || to < 0) return current;
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return { ...current, sections: items.map((item, i) => ({ ...item, order: i + 1 })) };
    });
    dragSectionId.current = null;
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
          <div className="cms-header-links"><a className="admin-public-link" href="/admin/cms/manage">Management Centre →</a><a className="admin-public-link" href="/admin">← Request Dashboard</a></div>
        </header>
        {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
        {notice && <p className="admin-alert admin-alert-success" role="status">{notice}</p>}
        <div className="cms-admin-toolbar">
          <div><strong>{pageTitle || "No page selected"}</strong><small>{pageKey ? `${route} · ${draftVersion ? `Draft V${draftVersion}` : publishedVersion ? `Published V${publishedVersion}` : "Not saved"}` : "Choose a page or create a draft"}</small></div>
          <div className="cms-toolbar-actions">
            <button type="button" className="admin-secondary-button" onClick={loadHomeTemplate} disabled={busy || pages.some((page) => page.page_key === "home")}>Load Home template</button>
            <button type="button" className="admin-secondary-button" onClick={createPage}>New page</button>
            <button type="button" className="admin-secondary-button" onClick={saveDraft} disabled={busy || !pageKey}>Save draft</button>
            <button type="button" className="admin-secondary-button" onClick={() => window.open(`/admin/cms/preview?key=${encodeURIComponent(pageKey)}`, "_blank", "noopener,noreferrer")} disabled={busy || !draftId}>Preview saved draft</button>
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
                  <div key={section.id} className="cms-home-draggable-section" draggable onDragStart={()=>{dragSectionId.current=section.id;}} onDragOver={(e)=>e.preventDefault()} onDrop={()=>reorderSections(dragSectionId.current,section.id)} onDragEnd={()=>{dragSectionId.current=null;}}>
                    <SectionPreview section={section} selected={section.id === selectedSectionId} onClick={() => { setSelectedSectionId(section.id); setStructuredJson(JSON.stringify(section.content || {}, null, 2)); }} />
                  </div>)} 
            </div>
            {pageKey && <div className="cms-add-section"><label htmlFor="cms-add-section">Add section</label><select id="cms-add-section" value="" onChange={(event) => event.target.value && addSection(event.target.value)}><option value="">Choose a section type…</option>{SECTION_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>}
          </section>
          <aside className="cms-inspector-panel">
            <h2>Management panel</h2>
            {pageKey && <div className="cms-page-settings"><label>Page title<input value={pageTitle} onChange={(event) => setPageTitle(event.target.value)} /></label><label>Route<input value={route} onChange={(event) => setRoute(event.target.value)} /></label></div>}

            {pageKey === "home" && <details className="cms-home-design-panel" open>
              <summary>Visual Design Studio</summary>
              <p className="cms-home-design-note">Adjust the Home page appearance without replacing its existing content. All changes are saved as a Preview draft.</p>
              <div className="cms-home-design-subpanel">
                <h3>Global typography</h3>
                <label>Heading font<select value={homeDesign.global?.headingFont || "Montserrat"} onChange={(e) => updateHomeGlobalDesign("headingFont", e.target.value)}><option>Montserrat</option><option>Inter</option><option>Arial</option></select></label>
                <label>Body font<select value={homeDesign.global?.bodyFont || "Inter"} onChange={(e) => updateHomeGlobalDesign("bodyFont", e.target.value)}><option>Inter</option><option>Montserrat</option><option>Arial</option></select></label>
                <label>Heading size · {Math.round(Number(homeDesign.global?.headingScale || 1) * 100)}%<input type="range" min="0.8" max="1.25" step="0.05" value={homeDesign.global?.headingScale || 1} onChange={(e) => updateHomeGlobalDesign("headingScale", Number(e.target.value))} /></label>
                <label>Body text size · {homeDesign.global?.bodySize || 16}px<input type="range" min="13" max="20" step="1" value={homeDesign.global?.bodySize || 16} onChange={(e) => updateHomeGlobalDesign("bodySize", Number(e.target.value))} /></label>
              </div>
              <div className="cms-home-design-subpanel">
                <h3>Section order</h3>
                <p>Drag sections in the page preview to reorder them, or use the move buttons below.</p>
                <ol className="cms-home-order-list">{[...content.sections].sort((a,b)=>(a.order||0)-(b.order||0)).map((section,index)=><li key={section.id} draggable onDragStart={()=>{dragSectionId.current=section.id;}} onDragOver={(e)=>e.preventDefault()} onDrop={()=>reorderSections(dragSectionId.current,section.id)} onDragEnd={()=>{dragSectionId.current=null;}}>
                  <span>⠿</span><strong>{index+1}. {section.content?.heading || section.type}</strong><small>{section.visible===false?"Hidden":"Visible"}</small>
                  <button type="button" disabled={index===0} onClick={()=>moveSection(section.id,-1)}>↑</button><button type="button" disabled={index===content.sections.length-1} onClick={()=>moveSection(section.id,1)}>↓</button>
                </li>)}</ol>
              </div>
              <div className="cms-home-design-subpanel">
                <h3>Colours and alignment · all sections</h3>
                <div className="cms-home-style-grid">{content.sections.map((section)=>{
                  const style=homeDesign.sections?.[section.id]||{};
                  const label=section.content?.heading || section.type;
                  return <div className="cms-home-style-card" key={section.id}>
                    <strong>{label}</strong>
                    <label><span>Background</span><input aria-label={label+" background colour"} type="color" value={style.backgroundColor||"#ffffff"} onChange={(e)=>updateHomeSectionDesign(section.id,"backgroundColor",e.target.value)} /></label>
                    <label><span>Text</span><input aria-label={label+" text colour"} type="color" value={style.textColor||"#1f2937"} onChange={(e)=>updateHomeSectionDesign(section.id,"textColor",e.target.value)} /></label>
                    <label><span>Accent</span><input aria-label={label+" accent colour"} type="color" value={style.accentColor||"#1e7ed8"} onChange={(e)=>updateHomeSectionDesign(section.id,"accentColor",e.target.value)} /></label>
                    <label><span>Text alignment</span><select value={style.textAlign||"left"} onChange={(e)=>updateHomeSectionDesign(section.id,"textAlign",e.target.value)}><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select></label>
                    <button type="button" className="admin-secondary-button" onClick={()=>resetHomeSectionDesign(section.id)}>Reset styling</button>
                  </div>;
                })}</div>
              </div>
              {selectedSection && <div className="cms-home-design-subpanel">
                <h3>Selected section layout</h3>
                {(selectedSection.type==="hero" || selectedSection.type==="editorial" || selectedSection.type==="services-banner") && <label>Layout preset<select value={selectedSection.content?.layout || (selectedSection.type==="hero"?"overlay-left":"split-right")} onChange={(e)=>updateSection("layout",e.target.value)}>
                  {selectedSection.type==="hero" ? <><option value="overlay-left">Full image · text left</option><option value="overlay-center">Full image · centred text</option><option value="overlay-right">Full image · text right</option><option value="overlay-bottom">Full image · text bottom-left</option></> : <><option value="split-right">Text left · image right</option><option value="split-left">Image left · text right</option><option value="balanced">Equal columns</option><option value="stacked">Text above · image below</option></>}
                </select></label>}
                {(selectedSection.type==="hero" || selectedSection.type==="editorial" || selectedSection.type==="services-banner") && <label>Image position<select value={selectedSection.content?.imagePosition||"center"} onChange={(e)=>updateSection("imagePosition",e.target.value)}><option value="center">Centre</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option><option value="50% 35%">50% · 35%</option></select></label>}
                {(selectedSection.type==="hero" || selectedSection.type==="editorial" || selectedSection.type==="services-banner") && <label>Image height · {selectedSection.content?.imageHeight||420}px<input type="range" min="220" max="720" step="10" value={selectedSection.content?.imageHeight||420} onChange={(e)=>updateSection("imageHeight",Number(e.target.value))}/></label>}
              </div>}
            </details>}
            {!selectedSection ? <p className="admin-empty">Select a section in the preview to edit its content.</p> : <>
              <div className="cms-inspector-title"><strong>{SECTION_TYPES.find((item) => item.value === selectedSection.type)?.label || selectedSection.type}</strong><small>Section settings</small></div>
              <label>Show section<input type="checkbox" checked={selectedSection.visible !== false} onChange={(event) => setContent((current) => ({ ...current, sections: current.sections.map((item) => item.id === selectedSection.id ? { ...item, visible: event.target.checked } : item) }))} /></label>
              <label>Layout variant<input value={selectedSection.layout?.variant || "standard"} onChange={(event) => setContent((current) => ({ ...current, sections: current.sections.map((item) => item.id === selectedSection.id ? { ...item, layout: { ...(item.layout || {}), variant: event.target.value } } : item) }))} /></label>
              <label>Heading<input value={selectedSection.content?.heading || ""} onChange={(event) => updateSection("heading", event.target.value)} /></label>
              {selectedSection.type === "hero" && <label>Heading highlight (second line)<input value={selectedSection.content?.headingHighlight || ""} onChange={(event) => updateSection("headingHighlight", event.target.value)} /></label>}
              <label>Description<textarea rows="5" value={selectedSection.content?.description || ""} onChange={(event) => updateSection("description", event.target.value)} /></label>
              <label>Image URL<input value={selectedSection.content?.imageUrl || ""} onChange={(event) => updateSection("imageUrl", event.target.value)} placeholder="/assets/example.jpg" /></label>
              <label>Image alt text<input value={selectedSection.content?.imageAlt || ""} onChange={(event) => updateSection("imageAlt", event.target.value)} /></label>
              <label>Button text<input value={selectedSection.content?.buttonText || ""} onChange={(event) => updateSection("buttonText", event.target.value)} /></label>
              <label>Button destination<input value={selectedSection.content?.buttonUrl || ""} onChange={(event) => updateSection("buttonUrl", event.target.value)} placeholder="/products" /></label>
              <label>Advanced section content (JSON)<textarea rows="12" spellCheck="false" value={structuredJson} onChange={(event) => setStructuredJson(event.target.value)} onBlur={() => { try { const parsed = JSON.parse(structuredJson); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); setContent((current) => ({ ...current, sections: current.sections.map((item) => item.id === selectedSection.id ? { ...item, content: parsed } : item) })); setError(""); } catch { setError("Advanced section content must be valid JSON object data."); } }} /></label>
              <div className="cms-section-actions"><button type="button" className="admin-secondary-button" onClick={() => moveSection(selectedSection.id, -1)}>Move up</button><button type="button" className="admin-secondary-button" onClick={() => moveSection(selectedSection.id, 1)}>Move down</button><button type="button" className="admin-secondary-button" onClick={() => { setContent((current) => ({...current, sections: current.sections.filter((item) => item.id !== selectedSection.id).map((item, i) => ({...item, order:i+1}))})); setSelectedSectionId(""); }}>Remove</button></div>
            </>}
          </aside>
        </div>
      </div>
    </section>
  );
}
