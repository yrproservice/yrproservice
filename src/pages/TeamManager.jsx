import React, { useEffect, useState } from "react";
import { teamCmsTemplate } from "../data/teamCmsTemplate";
import { SECTION_LABELS } from "../components/TeamCmsRenderer";

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function cloneTemplate() {
  return JSON.parse(JSON.stringify(teamCmsTemplate));
}

function Field({ label, value, onChange, multiline = false, rows = 3, hint = "" }) {
  return (
    <label className="cms-services-field">
      <span>{label}</span>
      {multiline
        ? <textarea rows={rows} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />
        : <input value={value ?? ""} onChange={(event) => onChange(event.target.value)} />}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function MediaPicker({ media, value, onSelect, label }) {
  return (
    <div className="cms-team-media">
      <strong>{label}</strong>
      <Field label="Image URL" value={value} onChange={onSelect} hint="Existing website asset paths are supported. You can also select an image from Preview Media Library below." />
      {media.length > 0 ? (
        <div className="cms-team-media-grid">
          {media.map((item) => (
            <button type="button" key={item.id} className={value === item.public_url ? "selected" : ""} onClick={() => onSelect(item.public_url)}>
              <img src={item.public_url} alt={item.alt_text || item.original_file_name} />
              <span>{item.original_file_name}</span>
            </button>
          ))}
        </div>
      ) : <p className="admin-empty">No Preview media uploaded. Existing website assets remain available by their current paths.</p>}
    </div>
  );
}

export default function TeamManager() {
  const [content, setContent] = useState(() => cloneTemplate());
  const [media, setMedia] = useState([]);
  const [draftId, setDraftId] = useState("");
  const [draftVersion, setDraftVersion] = useState(null);
  const [publishedVersion, setPublishedVersion] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dragIndex = React.useRef(null);
  const teamSection = content.sections.find((section) => section.type === "team-page");
  const data = teamSection.content;
  const design = teamSection.design || {};
  const sectionOrder = content.sectionOrder || ["hero", "story", "process", "capabilities", "people", "cta"];

  useEffect(() => {
    let active = true;
    Promise.all([
      request("/api/cms/admin/preview?key=team").catch((err) => err.message === "Page not found." ? null : Promise.reject(err)),
      request("/api/cms/admin/media")
    ]).then(([page, mediaResult]) => {
      if (!active) return;
      setMedia(mediaResult.media || []);
      if (page?.page?.content) {
        setContent(page.page.content);
        setDraftId(page.page.draftId || "");
        setDraftVersion(page.page.draftVersion || null);
        setPublishedVersion(page.page.publishedVersion || null);
        setNotice(page.page.draftId ? `Loaded saved Team draft V${page.page.draftVersion}.` : "Loaded the published Team content. Save changes to create a draft.");
      } else {
        setNotice("The existing Team page is loaded as the starting point. Save to create the first Team draft.");
      }
    }).catch((err) => { if (active) setError(err.message || "Unable to load Team content."); });
    return () => { active = false; };
  }, []);

  function update(group, field, value) {
    setContent((current) => ({
      ...current,
      sections: current.sections.map((section) => section.type !== "team-page" ? section : {
        ...section, content: { ...section.content, [group]: { ...section.content[group], [field]: value } }
      })
    }));
  }

  function updateItem(group, index, field, value, arrayKey = "items") {
    setContent((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.type !== "team-page") return section;
        const items = [...(section.content[group][arrayKey] || [])];
        items[index] = { ...items[index], [field]: value };
        return { ...section, content: { ...section.content, [group]: { ...section.content[group], [arrayKey]: items } } };
      })
    }));
  }

  function updateGlobalDesign(field, value) {
    setContent((current) => ({
      ...current,
      sections: current.sections.map((section) => section.type !== "team-page" ? section : {
        ...section,
        design: { ...(section.design || {}), global: { ...(section.design?.global || {}), [field]: value } }
      })
    }));
  }

  function updateSectionDesign(sectionKey, field, value) {
    setContent((current) => ({
      ...current,
      sections: current.sections.map((section) => section.type !== "team-page" ? section : {
        ...section,
        design: {
          ...(section.design || {}),
          sections: {
            ...(section.design?.sections || {}),
            [sectionKey]: { ...(section.design?.sections?.[sectionKey] || {}), [field]: value }
          }
        }
      })
    }));
  }

  function moveSection(from, to) {
    setContent((current) => {
      const order = [...(current.sectionOrder || ["hero", "story", "process", "capabilities", "people", "cta"])];
      if (to < 0 || to >= order.length || from === to) return current;
      const [moved] = order.splice(from, 1);
      order.splice(to, 0, moved);
      return { ...current, sectionOrder: order };
    });
  }

  function handleSectionDrop(targetIndex) {
    if (dragIndex.current === null) return;
    moveSection(dragIndex.current, targetIndex);
    dragIndex.current = null;
  }

  async function saveDraft() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request("/api/cms/admin/pages", {
        method: "POST",
        body: JSON.stringify({ pageKey: "team", title: "Team", route: "/team", content, changeNote: "Team Manager draft" })
      });
      setDraftId(result.draftId);
      setDraftVersion(result.version);
      setNotice(`Team draft V${result.version} saved. The public page has not changed.`);
    } catch (err) { setError(err.message || "Unable to save Team draft."); }
    finally { setBusy(false); }
  }

  async function publishDraft() {
    if (!draftId) return;
    if (!window.confirm("Publish this Team revision to the isolated Preview website? Production will not change.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request("/api/cms/admin/publish", {
        method: "POST",
        body: JSON.stringify({ entityType: "page", entityKey: "team", versionId: draftId })
      });
      setDraftId("");
      setDraftVersion(null);
      setPublishedVersion(result.version);
      setNotice(`Team revision V${result.version} published to Preview. Production has not changed.`);
    } catch (err) {
      setError(err.message || "Unable to publish the Team page to Preview.");
    } finally {
      setBusy(false);
    }
  }

  function openPreview() {
    if (!draftId) return;
    window.open("/admin/cms/preview?key=team", "_blank", "noopener,noreferrer");
  }

  function resetToTemplate() {
    if (!window.confirm("Discard the current unsaved edits and reload the original Team page content? This does not delete any saved draft.")) return;
    setContent(cloneTemplate());
    setError("");
    setNotice("Original Team baseline restored in this editor only. Save if you want this as a new draft.");
  }

  return (
    <section className="cms-services-manager cms-team-manager">
      <div className="cms-manager-heading">
        <div><h2>Team page manager</h2><p>Edit the existing Team page while preserving its editorial layout, section order and visual identity.</p></div>
        <div className="cms-services-version">{draftVersion ? `Draft V${draftVersion}` : publishedVersion ? `Published V${publishedVersion}` : "Not saved"}{publishedVersion ? ` · Published V${publishedVersion}` : ""}</div>
      </div>
      {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
      {notice && <p className="admin-alert admin-alert-success" role="status">{notice}</p>}

      <div className="cms-services-toolbar">
        <button type="button" className="admin-secondary-button" onClick={resetToTemplate} disabled={busy}>Restore original content in editor</button>
        <button type="button" className="admin-secondary-button" onClick={openPreview} disabled={busy || !draftId}>Preview saved draft</button>
        <button type="button" className="admin-secondary-button" onClick={publishDraft} disabled={busy || !draftId}>Publish to Preview</button>
        <button type="button" className="admin-primary-button" onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save Team draft"}</button>
      </div>

      <details className="cms-services-group cms-team-design-panel" open>
        <summary>Visual design studio · typography, colours and layout</summary>
        <p className="cms-team-guidance">These settings are saved with the Team draft only. Leave the colour controls unchanged to retain the original page styling. You can reset any section's styling independently.</p>
        <div className="cms-team-design-subpanel">
          <h3>Typography</h3>
          <div className="cms-services-fields">
            <label className="cms-services-field"><span>Heading font</span><select value={design.global?.headingFont || "Montserrat"} onChange={(e) => updateGlobalDesign("headingFont", e.target.value)}><option>Montserrat</option><option>Inter</option><option>Arial</option></select></label>
            <label className="cms-services-field"><span>Body font</span><select value={design.global?.bodyFont || "Inter"} onChange={(e) => updateGlobalDesign("bodyFont", e.target.value)}><option>Inter</option><option>Montserrat</option><option>Arial</option></select></label>
            <label className="cms-services-field"><span>Heading size scale · {Math.round(Number(design.global?.headingScale || 1) * 100)}%</span><input type="range" min="0.8" max="1.25" step="0.05" value={design.global?.headingScale || 1} onChange={(e) => updateGlobalDesign("headingScale", Number(e.target.value))} /></label>
            <label className="cms-services-field"><span>Body text size · {design.global?.bodySize || 16}px</span><input type="range" min="13" max="20" step="1" value={design.global?.bodySize || 16} onChange={(e) => updateGlobalDesign("bodySize", Number(e.target.value))} /></label>
          </div>
        </div>
        <div className="cms-team-design-subpanel">
          <h3>Section arrangement</h3>
          <p className="cms-team-guidance">Drag a section to reorder it, or use the arrows. This changes the section order in the preview.</p>
          <ol className="cms-team-order-list">
            {sectionOrder.map((key, index) => <li key={key} draggable onDragStart={() => { dragIndex.current = index; }} onDragOver={(e) => e.preventDefault()} onDrop={() => handleSectionDrop(index)} onDragEnd={() => { dragIndex.current = null; }}>
              <span className="cms-team-drag-handle" aria-hidden="true">⠿</span><strong>{index + 1}. {SECTION_LABELS[key] || key}</strong>
              <span className="cms-team-order-actions"><button type="button" aria-label={`Move ${SECTION_LABELS[key]} up`} disabled={index === 0} onClick={() => moveSection(index, index - 1)}>↑</button><button type="button" aria-label={`Move ${SECTION_LABELS[key]} down`} disabled={index === sectionOrder.length - 1} onClick={() => moveSection(index, index + 1)}>↓</button></span>
            </li>)}
          </ol>
        </div>
        <div className="cms-team-design-subpanel">
          <h3>Section colours and alignment</h3>
          <div className="cms-team-style-grid">
            {sectionOrder.map((key) => {
              const style = design.sections?.[key] || {};
              return <div className="cms-team-style-card" key={key}>
                <strong>{SECTION_LABELS[key] || key}</strong>
                <label><span>Background</span><input aria-label={`${SECTION_LABELS[key]} background colour`} type="color" value={style.backgroundColor || "#ffffff"} onChange={(e) => updateSectionDesign(key, "backgroundColor", e.target.value)} /></label>
                <label><span>Text</span><input aria-label={`${SECTION_LABELS[key]} text colour`} type="color" value={style.textColor || "#1f2937"} onChange={(e) => updateSectionDesign(key, "textColor", e.target.value)} /></label>
                <label><span>Accent</span><input aria-label={`${SECTION_LABELS[key]} accent colour`} type="color" value={style.accentColor || "#1e7ed8"} onChange={(e) => updateSectionDesign(key, "accentColor", e.target.value)} /></label>
                <label><span>Text alignment</span><select value={style.textAlign || "left"} onChange={(e) => updateSectionDesign(key, "textAlign", e.target.value)}><option value="left">Left</option><option value="center">Centre</option><option value="right">Right</option></select></label>
                <button type="button" className="admin-secondary-button" onClick={() => setContent((current) => ({ ...current, sections: current.sections.map((section) => section.type !== "team-page" ? section : ({ ...section, design: { ...(section.design || {}), sections: { ...(section.design?.sections || {}), [key]: {} } } })) }))}>Reset section styling</button>
              </div>;
            })}
          </div>
        </div>
      </details>

      <details className="cms-services-group" open>
        <summary>1. Hero banner</summary>
        <div className="cms-services-fields">
          <Field label="Eyebrow" value={data.hero.eyebrow} onChange={(v) => update("hero", "eyebrow", v)} />
          <Field label="Heading" value={data.hero.title} onChange={(v) => update("hero", "title", v)} multiline rows={2} />
          <Field label="Highlighted heading text" value={data.hero.highlight} onChange={(v) => update("hero", "highlight", v)} />
          <Field label="Lead text" value={data.hero.lead} onChange={(v) => update("hero", "lead", v)} multiline rows={3} />
          <Field label="Image alt text" value={data.hero.imageAlt} onChange={(v) => update("hero", "imageAlt", v)} />
          <label className="cms-services-field"><span>Banner layout</span><select value={data.hero.layout || "split-right"} onChange={(e) => update("hero", "layout", e.target.value)}><option value="split-right">Text left · image right</option><option value="split-left">Image left · text right</option><option value="balanced">Equal columns</option><option value="stacked">Text above · image below</option></select></label>
          <label className="cms-services-field"><span>Banner image position · {data.hero.imagePosition || "center"}</span><select value={data.hero.imagePosition || "center"} onChange={(e) => update("hero", "imagePosition", e.target.value)}><option value="center">Centre</option><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option><option value="50% 35%">50% · 35%</option></select></label>
          <label className="cms-services-field"><span>Banner image height · {data.hero.imageHeight || 430}px</span><input type="range" min="300" max="600" step="10" value={data.hero.imageHeight || 430} onChange={(e) => update("hero", "imageHeight", Number(e.target.value))} /></label>
          <Field label="Image overlay label" value={data.hero.imageLabel} onChange={(v) => update("hero", "imageLabel", v)} />
          <Field label="Image overlay sub-label" value={data.hero.imageSubLabel} onChange={(v) => update("hero", "imageSubLabel", v)} />
          <MediaPicker media={media} label="Hero image" value={data.hero.imageUrl} onSelect={(v) => update("hero", "imageUrl", v)} />
        </div>
        {(data.hero.meta || []).map((item, index) => (
          <div className="cms-services-step" key={index}>
            <strong>Hero highlight {index + 1}</strong>
            <div className="cms-services-fields">
              <Field label="Number" value={item.number} onChange={(v) => updateItem("hero", index, "number", v, "meta")} />
              <Field label="Label" value={item.label} onChange={(v) => updateItem("hero", index, "label", v, "meta")} />
            </div>
          </div>
        ))}
      </details>

      <details className="cms-services-group" open>
        <summary>2. Our approach</summary>
        <div className="cms-services-fields">
          <Field label="Section number" value={data.story.number} onChange={(v) => update("story", "number", v)} />
          <Field label="Eyebrow" value={data.story.eyebrow} onChange={(v) => update("story", "eyebrow", v)} />
          <Field label="Heading" value={data.story.title} onChange={(v) => update("story", "title", v)} />
          <Field label="Main text" value={data.story.lead} onChange={(v) => update("story", "lead", v)} multiline rows={5} />
          <Field label="Note label" value={data.story.noteLabel} onChange={(v) => update("story", "noteLabel", v)} />
          <Field label="Note heading" value={data.story.noteTitle} onChange={(v) => update("story", "noteTitle", v)} />
          <Field label="Note supporting text" value={data.story.noteText} onChange={(v) => update("story", "noteText", v)} multiline rows={2} />
        </div>
      </details>

      <details className="cms-services-group">
        <summary>3. How we work · {data.process.steps.length} steps</summary>
        <div className="cms-services-fields">
          <Field label="Eyebrow" value={data.process.eyebrow} onChange={(v) => update("process", "eyebrow", v)} />
          <Field label="Heading" value={data.process.title} onChange={(v) => update("process", "title", v)} />
          <Field label="Supporting text" value={data.process.description} onChange={(v) => update("process", "description", v)} multiline rows={3} />
        </div>
        {data.process.steps.map((step, index) => (
          <div className="cms-services-step" key={index}>
            <strong>Step {index + 1}</strong>
            <div className="cms-services-fields">
              <Field label="Number" value={step.number} onChange={(v) => updateItem("process", index, "number", v)} />
              <Field label="Heading" value={step.title} onChange={(v) => updateItem("process", index, "title", v)} />
              <Field label="Description" value={step.text} onChange={(v) => updateItem("process", index, "text", v)} multiline rows={3} />
            </div>
          </div>
        ))}
      </details>

      <details className="cms-services-group">
        <summary>4. What we do · {data.capabilities.items.length} capabilities</summary>
        <div className="cms-services-fields">
          <Field label="Eyebrow" value={data.capabilities.eyebrow} onChange={(v) => update("capabilities", "eyebrow", v)} />
          <Field label="Heading" value={data.capabilities.title} onChange={(v) => update("capabilities", "title", v)} />
          <Field label="Supporting text" value={data.capabilities.description} onChange={(v) => update("capabilities", "description", v)} multiline rows={3} />
        </div>
        {data.capabilities.items.map((item, index) => (
          <div className="cms-services-step" key={index}>
            <strong>Capability {index + 1}</strong>
            <div className="cms-services-fields">
              <Field label="Title" value={item.title} onChange={(v) => updateItem("capabilities", index, "title", v)} />
              <Field label="Description" value={item.text} onChange={(v) => updateItem("capabilities", index, "text", v)} multiline rows={3} />
            </div>
          </div>
        ))}
      </details>

      <details className="cms-services-group">
        <summary>5. People behind the service · {data.people.items.length} team functions</summary>
        <p className="cms-team-guidance">These are the existing role/function cards, not named employee profiles. No staff names or identities have been added. Keep the current approved imagery unless you deliberately select another image.</p>
        <div className="cms-services-fields">
          <Field label="Eyebrow" value={data.people.eyebrow} onChange={(v) => update("people", "eyebrow", v)} />
          <Field label="Heading" value={data.people.title} onChange={(v) => update("people", "title", v)} />
          <Field label="Supporting text" value={data.people.description} onChange={(v) => update("people", "description", v)} multiline rows={3} />
        </div>
        {data.people.items.map((item, index) => (
          <details className="cms-services-entry" key={index} open={index === 0}>
            <summary><span>0{index + 1} · {item.title}</span><small>Role / team function</small></summary>
            <div className="cms-services-fields">
              <Field label="Role title" value={item.title} onChange={(v) => updateItem("people", index, "title", v)} />
              <Field label="Description" value={item.text} onChange={(v) => updateItem("people", index, "text", v)} multiline rows={3} />
              <Field label="Image alt text" value={item.imageAlt} onChange={(v) => updateItem("people", index, "imageAlt", v)} />
              <MediaPicker media={media} label="Role card image" value={item.image} onSelect={(v) => updateItem("people", index, "image", v)} />
            </div>
          </details>
        ))}
      </details>

      <details className="cms-services-group">
        <summary>6. Final call to action</summary>
        <div className="cms-services-fields">
          <Field label="Eyebrow" value={data.cta.eyebrow} onChange={(v) => update("cta", "eyebrow", v)} />
          <Field label="Heading" value={data.cta.title} onChange={(v) => update("cta", "title", v)} />
          <Field label="Body text" value={data.cta.body} onChange={(v) => update("cta", "body", v)} multiline rows={3} />
          <Field label="Quote button label" value={data.cta.quoteButton} onChange={(v) => update("cta", "quoteButton", v)} />
          <Field label="Quote button URL" value={data.cta.quoteUrl} onChange={(v) => update("cta", "quoteUrl", v)} />
          <Field label="Services button label" value={data.cta.servicesButton} onChange={(v) => update("cta", "servicesButton", v)} />
          <Field label="Services button URL" value={data.cta.servicesUrl} onChange={(v) => update("cta", "servicesUrl", v)} />
        </div>
      </details>

      <div className="cms-services-toolbar bottom">
        <button type="button" className="admin-secondary-button" onClick={openPreview} disabled={busy || !draftId}>Preview saved draft</button>
        <button type="button" className="admin-secondary-button" onClick={publishDraft} disabled={busy || !draftId}>Publish to Preview</button>
        <button type="button" className="admin-primary-button" onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save Team draft"}</button>
      </div>
      <p className="cms-services-note">Saving creates a draft in the Preview CMS database. It does not publish this page or change the Production website.</p>
    </section>
  );
}
