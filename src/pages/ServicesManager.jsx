import React, { useEffect, useState } from "react";
import { servicesCmsTemplate } from "../data/servicesCmsTemplate";

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
  return JSON.parse(JSON.stringify(servicesCmsTemplate));
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

export default function ServicesManager() {
  const [content, setContent] = useState(() => cloneTemplate());
  const [media, setMedia] = useState([]);
  const [draftId, setDraftId] = useState("");
  const [draftVersion, setDraftVersion] = useState(null);
  const [publishedVersion, setPublishedVersion] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const data = content.sections[0].content;

  useEffect(() => {
    let active = true;
    Promise.all([
      request("/api/cms/admin/preview?key=services").catch((err) => err.message === "Page not found." ? null : Promise.reject(err)),
      request("/api/cms/admin/media")
    ]).then(([page, mediaResult]) => {
      if (!active) return;
      setMedia(mediaResult.media || []);
      if (page?.page?.content) {
        setContent(page.page.content);
        setDraftId(page.page.draftId || "");
        setDraftVersion(page.page.draftVersion || null);
        setPublishedVersion(page.page.publishedVersion || null);
        setNotice(page.page.draftId ? `Loaded saved Services draft V${page.page.draftVersion}.` : "Loaded the published Services content. Save changes to create a draft.");
      } else {
        setNotice("Existing Services content is loaded as the starting point. Save to create the first Services draft.");
      }
    }).catch((err) => { if (active) setError(err.message || "Unable to load Services content."); });
    return () => { active = false; };
  }, []);

  function update(group, field, value) {
    setContent((current) => ({
      ...current,
      sections: current.sections.map((section) => section.type !== "services-page" ? section : {
        ...section, content: { ...section.content, [group]: { ...section.content[group], [field]: value } }
      })
    }));
  }

  function updateService(index, field, value) {
    setContent((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.type !== "services-page") return section;
        const items = [...section.content.listing.items];
        items[index] = { ...items[index], [field]: value };
        return { ...section, content: { ...section.content, listing: { ...section.content.listing, items } } };
      })
    }));
  }

  function updateServicePoints(index, value) {
    updateService(index, "points", value.split("\n").map((line) => line.trim()).filter(Boolean));
  }

  function updateStep(index, field, value) {
    setContent((current) => ({
      ...current,
      sections: current.sections.map((section) => {
        if (section.type !== "services-page") return section;
        const steps = [...section.content.process.steps];
        steps[index] = { ...steps[index], [field]: value };
        return { ...section, content: { ...section.content, process: { ...section.content.process, steps } } };
      })
    }));
  }

  async function saveDraft() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await request("/api/cms/admin/pages", {
        method: "POST",
        body: JSON.stringify({ pageKey: "services", title: "Services", route: "/services", content, changeNote: "Services Manager draft" })
      });
      setDraftId(result.draftId);
      setDraftVersion(result.version);
      setNotice(`Services draft V${result.version} saved. The public page has not changed.`);
    } catch (err) { setError(err.message || "Unable to save Services draft."); }
    finally { setBusy(false); }
  }

  function openPreview() {
    if (!draftId) return;
    window.open("/admin/cms/preview?key=services", "_blank", "noopener,noreferrer");
  }

  function resetToTemplate() {
    if (!window.confirm("Discard the current unsaved edits and reload the original Services content? This does not delete any saved draft.")) return;
    setContent(cloneTemplate());
    setError("");
    setNotice("Original Services baseline restored in this editor only. Save if you want this as a new draft.");
  }

  return (
    <section className="cms-services-manager">
      <div className="cms-manager-heading">
        <div><h2>Services page manager</h2><p>Edit the existing Services page content while keeping its current five-section layout and styling.</p></div>
        <div className="cms-services-version">{draftVersion ? `Draft V${draftVersion}` : publishedVersion ? `Published V${publishedVersion}` : "Not saved"}{publishedVersion ? ` · Published V${publishedVersion}` : ""}</div>
      </div>
      {error && <p className="admin-alert admin-alert-error" role="alert">{error}</p>}
      {notice && <p className="admin-alert admin-alert-success" role="status">{notice}</p>}

      <div className="cms-services-toolbar">
        <button type="button" className="admin-secondary-button" onClick={resetToTemplate} disabled={busy}>Restore original content in editor</button>
        <button type="button" className="admin-secondary-button" onClick={openPreview} disabled={busy || !draftId}>Preview saved draft</button>
        <button type="button" className="admin-primary-button" onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save Services draft"}</button>
      </div>

      <details className="cms-services-group" open>
        <summary>1. Hero section</summary>
        <div className="cms-services-fields">
          <Field label="Eyebrow" value={data.hero.eyebrow} onChange={(v) => update("hero", "eyebrow", v)} />
          <Field label="Main heading" value={data.hero.title} onChange={(v) => update("hero", "title", v)} />
          <Field label="Lead text" value={data.hero.lead} onChange={(v) => update("hero", "lead", v)} multiline rows={4} />
          <Field label="Image URL" value={data.hero.imageUrl} onChange={(v) => update("hero", "imageUrl", v)} hint="Uses an existing website asset or a URL from the Preview Media Library." />
          <Field label="Image alt text" value={data.hero.imageAlt} onChange={(v) => update("hero", "imageAlt", v)} />
          <Field label="Badge heading" value={data.hero.badgeTitle} onChange={(v) => update("hero", "badgeTitle", v)} />
          <Field label="Badge supporting text" value={data.hero.badgeText} onChange={(v) => update("hero", "badgeText", v)} />
          <div className="cms-services-media">
            <strong>Choose an image from Media Library</strong>
            {media.length ? <div>{media.map((item) => <button type="button" key={item.id} className={data.hero.imageUrl === item.public_url ? "selected" : ""} onClick={() => update("hero", "imageUrl", item.public_url)}><img src={item.public_url} alt={item.alt_text || item.original_file_name} /><span>{item.original_file_name}</span></button>)}</div> : <p className="admin-empty">No Preview media uploaded yet.</p>}
          </div>
        </div>
      </details>

      <details className="cms-services-group" open>
        <summary>2. Intro section</summary>
        <div className="cms-services-fields">
          <Field label="Eyebrow" value={data.intro.eyebrow} onChange={(v) => update("intro", "eyebrow", v)} />
          <Field label="Heading" value={data.intro.title} onChange={(v) => update("intro", "title", v)} />
          <Field label="Body text" value={data.intro.body} onChange={(v) => update("intro", "body", v)} multiline rows={4} />
        </div>
      </details>

      <details className="cms-services-group" open>
        <summary>3. Services list · {data.listing.items.length} existing services</summary>
        <div className="cms-services-fields">
          <Field label="Eyebrow" value={data.listing.eyebrow} onChange={(v) => update("listing", "eyebrow", v)} />
          <Field label="Heading" value={data.listing.title} onChange={(v) => update("listing", "title", v)} />
          <Field label="Description" value={data.listing.description} onChange={(v) => update("listing", "description", v)} multiline rows={3} />
        </div>
        {data.listing.items.map((service, index) => (
          <details className="cms-services-entry" key={service.slug} open={index === 0}>
            <summary><span>{service.number} · {service.title}</span><small>/{service.slug}</small></summary>
            <div className="cms-services-fields">
              <Field label="Service title" value={service.title} onChange={(v) => updateService(index, "title", v)} />
              <Field label="Short description" value={service.text} onChange={(v) => updateService(index, "text", v)} multiline rows={3} />
              <Field label="Icon character" value={service.icon} onChange={(v) => updateService(index, "icon", v)} />
              <Field label="Key points (one per line)" value={(service.points || []).join("\n")} onChange={(v) => updateServicePoints(index, v)} multiline rows={4} />
              <Field label="Full service detail" value={service.detail} onChange={(v) => updateService(index, "detail", v)} multiline rows={5} />
              <p className="cms-services-locked">Route slug is fixed to preserve existing service detail URLs: <code>{service.slug}</code></p>
            </div>
          </details>
        ))}
      </details>

      <details className="cms-services-group">
        <summary>4. Process section · {data.process.steps.length} existing steps</summary>
        <div className="cms-services-fields">
          <Field label="Eyebrow" value={data.process.eyebrow} onChange={(v) => update("process", "eyebrow", v)} />
          <Field label="Heading" value={data.process.title} onChange={(v) => update("process", "title", v)} />
        </div>
        {data.process.steps.map((step, index) => (
          <div className="cms-services-step" key={step.number}>
            <strong>Step {step.number}</strong>
            <div className="cms-services-fields">
              <Field label="Step heading" value={step.title} onChange={(v) => updateStep(index, "title", v)} />
              <Field label="Step description" value={step.text} onChange={(v) => updateStep(index, "text", v)} multiline rows={3} />
            </div>
          </div>
        ))}
      </details>

      <details className="cms-services-group">
        <summary>5. Call to action</summary>
        <div className="cms-services-fields">
          <Field label="Eyebrow" value={data.cta.eyebrow} onChange={(v) => update("cta", "eyebrow", v)} />
          <Field label="Heading" value={data.cta.title} onChange={(v) => update("cta", "title", v)} />
          <Field label="Body text" value={data.cta.body} onChange={(v) => update("cta", "body", v)} multiline rows={4} />
          <Field label="Service button label" value={data.cta.serviceButton} onChange={(v) => update("cta", "serviceButton", v)} />
          <Field label="Service button URL" value={data.cta.serviceUrl} onChange={(v) => update("cta", "serviceUrl", v)} />
          <Field label="Quotation button label" value={data.cta.quoteButton} onChange={(v) => update("cta", "quoteButton", v)} />
          <Field label="Quotation button URL" value={data.cta.quoteUrl} onChange={(v) => update("cta", "quoteUrl", v)} />
        </div>
      </details>

      <div className="cms-services-toolbar bottom">
        <button type="button" className="admin-secondary-button" onClick={openPreview} disabled={busy || !draftId}>Preview saved draft</button>
        <button type="button" className="admin-primary-button" onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save Services draft"}</button>
      </div>
      <p className="cms-services-note">Saving creates a draft in the Preview CMS database. It does not publish this page or change the Production website.</p>
    </section>
  );
}
