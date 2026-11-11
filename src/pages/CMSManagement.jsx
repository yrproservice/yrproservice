import React, { useCallback, useEffect, useState } from "react";
import { products as catalogue } from "../data/products";
import ServicesManager from "./ServicesManager";
import TeamManager from "./TeamManager";
import PageVisualDesignManager from "./PageVisualDesignManager";

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: "application/json", ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) }, cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
const blankProduct = () => ({ slug:"", name:"", brand:"", brandLine:"", category:"Equipment", purchaseType:"cart", img:"", summary:"", description:"", highlights:[], specifications:[], docs:[], price:null, stockStatus:"pending", reviewStatus:"No customer reviews published yet." });

export default function CMSManagement() {
  const [tab,setTab]=useState("products"), [items,setItems]=useState([]), [selected,setSelected]=useState(null), [json,setJson]=useState("{}"), [history,setHistory]=useState([]), [media,setMedia]=useState([]), [storageReady,setStorageReady]=useState(false), [settings,setSettings]=useState([]), [settingKey,setSettingKey]=useState("site.navigation"), [settingJson,setSettingJson]=useState('{"items":[]}'), [busy,setBusy]=useState(false), [notice,setNotice]=useState(""), [error,setError]=useState("");
  const refreshProducts=useCallback(async()=>{const d=await api("/api/cms/admin/products");setItems(d.products||[]);},[]);
  const refreshMedia=useCallback(async()=>{const d=await api("/api/cms/admin/media");setMedia(d.media||[]);setStorageReady(Boolean(d.storageReady));},[]);
  const refreshSettings=useCallback(async()=>{const d=await api("/api/cms/admin/settings");setSettings(d.settings||[]);},[]);
  useEffect(()=>{refreshProducts().catch(e=>setError(e.message));refreshMedia().catch(e=>setError(e.message));refreshSettings().catch(e=>setError(e.message));},[refreshProducts,refreshMedia,refreshSettings]);
  function chooseProduct(row) {
    const data=row ? JSON.parse(row.draft_product||row.published_product||"{}") : blankProduct();
    setSelected({slug:data.slug||"", draftId:row?.draft_id||"", version:row?.draft_version||null});setJson(JSON.stringify(data,null,2));setHistory([]);setError("");setNotice("");
  }
  async function saveProduct() {
    let product;try{product=JSON.parse(json);}catch{setError("Product data must be valid JSON.");return;}
    if(!product.slug||!product.name){setError("Product slug and name are required.");return;}
    setBusy(true);setError("");try{const d=await api("/api/cms/admin/products",{method:"POST",body:JSON.stringify(product)});setSelected({slug:product.slug,draftId:d.draftId,version:d.version});setNotice(`Product draft V${d.version} saved.`);await refreshProducts();}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function archiveProduct() {
    if(!selected?.slug)return;
    let product;try{product=JSON.parse(json);}catch{setError("Product data must be valid JSON.");return;}
    if(!window.confirm("Archive this product? It will disappear from the public catalogue after its archive draft is published."))return;
    product.isArchived=true;const next=JSON.stringify(product,null,2);setJson(next);setBusy(true);setError("");
    try{const d=await api("/api/cms/admin/products",{method:"POST",body:JSON.stringify(product)});setSelected({slug:product.slug,draftId:d.draftId,version:d.version});setNotice("Archive draft saved. The public catalogue is unchanged until you publish to Preview.");await refreshProducts();}
    catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function publishProduct() {
    if(!selected?.draftId)return;setBusy(true);setError("");try{const d=await api("/api/cms/admin/publish",{method:"POST",body:JSON.stringify({entityType:"product",entityKey:selected.slug,versionId:selected.draftId})});setNotice(`Product revision V${d.version} published to this Preview environment.`);setSelected(null);await refreshProducts();}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function importCatalogue() {
    const existing=new Set(items.map(x=>x.product_slug));const missing=catalogue.filter(p=>!existing.has(p.slug));
    if(!missing.length){setNotice("All existing catalogue products are already represented in CMS.");return;}
    setBusy(true);setError("");let count=0;
    try{for(const p of missing){await api("/api/cms/admin/products",{method:"POST",body:JSON.stringify(p)});count++;}setNotice(`Imported ${count} catalogue products as unpublished drafts. Existing public catalogue remains unchanged.`);await refreshProducts();}
    catch(e){setError(`Imported ${count} products before stopping: ${e.message}`);await refreshProducts();}
    finally{setBusy(false);}
  }
  async function loadHistory(type,key) {
    try{const d=await api(`/api/cms/admin/history?entityType=${type}&entityKey=${encodeURIComponent(key)}`);setHistory(d.history||[]);}catch(e){setError(e.message);}
  }
  async function restoreRevision(type,key,id) {
    if(!window.confirm("Restore this revision as a new draft? The current published version will remain live."))return;
    setBusy(true);try{const d=await api("/api/cms/admin/history",{method:"POST",body:JSON.stringify({entityType:type,entityKey:key,versionId:id})});setNotice(`Restored as draft V${d.version}. It has not been published.`);await loadHistory(type,key);if(type==="product")await refreshProducts();}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function uploadMedia(event) {
    const file=event.target.files?.[0];if(!file)return;const form=new FormData();form.append("file",file);
    setBusy(true);setError("");try{await api("/api/cms/admin/media",{method:"POST",body:form});setNotice("Media uploaded to Preview storage.");await refreshMedia();}catch(e){setError(e.message);}finally{setBusy(false);event.target.value="";}
  }
  function applyMediaImage(url) {
    let product;
    try { product = JSON.parse(json); } catch {
      setError("Fix the product JSON before selecting an image.");
      return;
    }
    product.img = url;
    setJson(JSON.stringify(product, null, 2));
    setError("");
    setNotice("Image selected. Save the product draft to keep this change.");
  }
  function clearProductImage() {
    let product;
    try { product = JSON.parse(json); } catch {
      setError("Fix the product JSON before clearing its image.");
      return;
    }
    product.img = "";
    setJson(JSON.stringify(product, null, 2));
    setError("");
    setNotice("Product image cleared. Save the product draft to keep this change.");
  }
  const currentProductImage = (() => {
    try { return JSON.parse(json).img || ""; } catch { return ""; }
  })();
  async function removeMedia(id) {
    if(!window.confirm("Remove this media file? Any pages using its URL may show a broken image."))return;
    try{await api(`/api/cms/admin/media?id=${encodeURIComponent(id)}`,{method:"DELETE"});await refreshMedia();setNotice("Media removed.");}catch(e){setError(e.message);}
  }
  async function saveSetting() {
    let value;try{value=JSON.parse(settingJson);}catch{setError("Setting value must be valid JSON.");return;}
    setBusy(true);try{const d=await api("/api/cms/admin/settings",{method:"POST",body:JSON.stringify({key:settingKey,value})});setNotice(`Settings draft V${d.version} saved.`);await refreshSettings();}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  async function publishSetting(row) {
    try{await api("/api/cms/admin/publish",{method:"POST",body:JSON.stringify({entityType:"setting",entityKey:row.setting_key,versionId:row.draft_id})});setNotice(`Setting "${row.setting_key}" published to Preview.`);await refreshSettings();}catch(e){setError(e.message);}
  }
  return <section className="cms-admin-page"><div className="cms-admin-shell">
    <header className="cms-admin-header"><div><p className="eyebrow">YR Proservice · Content Management</p><h1>CMS Management Centre</h1><p>Manage products, media, site settings and revisions. All publishing actions here target the isolated Preview database.</p></div><div className="cms-manager-header-actions"><a className="admin-secondary-button" href="/admin/cms/design-review">Review all pages together</a><a className="admin-public-link" href="/admin/cms">← Visual Editor</a></div></header>
    {error&&<p className="admin-alert admin-alert-error" role="alert">{error}</p>}{notice&&<p className="admin-alert admin-alert-success" role="status">{notice}</p>}
    <nav className="cms-manager-tabs">{[["products","Products"],["services","Services"],["team","Team"],["products-design","Products design"],["product-detail-design","Product details design"],["service-detail-design","Service details design"],["chrome-design","Header & footer design"],["cart-design","Product cart design"],["chair-request-design","Dental chair request design"],["quote-design","Quotation request design"],["service-request-design","Service request design"],["track-request-design","Track request design"],["media","Media library"],["settings","Site settings"],["history","Revision history"],["pages","Page managers"]].map(([id,label])=><button key={id} className={tab===id?"active":""} onClick={()=>{setTab(id);setError("");}}>{label}</button>)}</nav>
    {tab==="products"&&<div className="cms-manager-grid"><section className="cms-manager-panel"><div className="cms-manager-heading"><div><h2>Product catalogue</h2><p>{items.length} CMS products · {catalogue.length} products in existing code catalogue</p></div><button className="admin-secondary-button" disabled={busy} onClick={importCatalogue}>Import missing catalogue products</button></div><div className="cms-product-list">{items.map(row=>{const p=JSON.parse(row.draft_product||row.published_product||"{}");return <button key={row.id} className={selected?.slug===row.product_slug?"active":""} onClick={()=>chooseProduct(row)}><strong>{p.name||row.product_slug}</strong><small>{p.brand||"Unbranded"} · {p.category||"Uncategorised"}</small><span>{row.draft_id?`Draft V${row.draft_version}`:row.published_version?`Published V${row.published_version}`:"Not published"}</span></button>;})}</div><button className="admin-secondary-button" onClick={()=>chooseProduct(null)}>＋ Add product</button></section>
    <section className="cms-manager-panel"><h2>{selected?.slug?"Edit product":"Product editor"}</h2><p>Structured product JSON preserves all current catalogue fields, including cart-versus-chair purchase type, specifications, docs, image path, price and stock status.</p>
      <div className="cms-product-image-picker">
        <div className="cms-product-image-picker-heading"><div><h3>Product image</h3><p>Select an image already uploaded to the Preview Media Library. Your selection updates the product <code>img</code> field; save the draft below to keep it.</p></div><button type="button" className="admin-secondary-button" disabled={!selected?.slug} onClick={()=>setTab("media")}>Open Media Library</button></div>
        {currentProductImage&&<div className="cms-current-product-image"><img src={currentProductImage} alt="Current product image preview"/><div><strong>Current image</strong><small>{currentProductImage}</small></div><button type="button" className="admin-secondary-button" disabled={!selected?.slug} onClick={clearProductImage}>Clear image</button></div>}
        {media.length>0?<div className="cms-product-media-picker-grid">{media.map(m=><article key={m.id} className={currentProductImage===m.public_url?"selected":""}><img src={m.public_url} alt={m.alt_text||m.original_file_name}/><strong>{m.original_file_name}</strong><small>{Math.round(m.byte_size/1024)} KB · {m.mime_type}</small><button type="button" className="admin-secondary-button" disabled={!selected?.slug} onClick={()=>applyMediaImage(m.public_url)}>{currentProductImage===m.public_url?"Selected":"Use this image"}</button></article>)}</div>:<p className="admin-empty">No uploaded images are available yet. Upload an image in the Media library tab first.</p>}
      </div>
      <textarea className="cms-json-editor" spellCheck="false" value={json} onChange={e=>setJson(e.target.value)} rows={28}/><div className="cms-manager-actions"><button className="admin-primary-button" disabled={busy||!selected} onClick={saveProduct}>Save product draft</button><button className="admin-secondary-button" disabled={busy||!selected?.draftId} onClick={publishProduct}>Publish to Preview</button><button className="admin-secondary-button" disabled={busy||!selected?.slug} onClick={archiveProduct}>Archive product</button>{selected?.slug&&<button className="admin-secondary-button" onClick={()=>loadHistory("product",selected.slug)}>View revisions</button>}</div>{history.length>0&&<RevisionList history={history} onRestore={id=>restoreRevision("product",selected.slug,id)}/>}</section></div>}
    {tab==="services"&&<section className="cms-manager-panel"><ServicesManager/></section>}
    {tab==="team"&&<section className="cms-manager-panel"><TeamManager/></section>}
    {tab==="products-design"&&<section className="cms-manager-panel"><PageVisualDesignManager key="products" pageKey="products"/></section>}
    {tab==="product-detail-design"&&<section className="cms-manager-panel"><PageVisualDesignManager key="product-detail" pageKey="product-detail"/></section>}
    {tab==="service-detail-design"&&<section className="cms-manager-panel"><PageVisualDesignManager key="service-detail" pageKey="service-detail"/></section>}
    {tab==="chrome-design"&&<section className="cms-manager-panel"><PageVisualDesignManager key="site-chrome" pageKey="site-chrome"/></section>}
    {tab==="cart-design"&&<section className="cms-manager-panel"><PageVisualDesignManager key="cart" pageKey="cart"/></section>}
    {tab==="chair-request-design"&&<section className="cms-manager-panel"><PageVisualDesignManager key="dental-chair-request" pageKey="dental-chair-request"/></section>}
    {tab==="quote-design"&&<section className="cms-manager-panel"><PageVisualDesignManager key="quote" pageKey="quote"/></section>}
    {tab==="service-request-design"&&<section className="cms-manager-panel"><PageVisualDesignManager key="service-request" pageKey="service-request"/></section>}
    {tab==="track-request-design"&&<section className="cms-manager-panel"><PageVisualDesignManager key="track-request" pageKey="track-request"/></section>}
    {tab==="media"&&<section className="cms-manager-panel"><div className="cms-manager-heading"><div><h2>Media library</h2><p>Preview-only uploads are stored in the CMS R2 bucket.</p></div><label className="admin-primary-button cms-upload-label">Upload image<input type="file" accept="image/*" disabled={busy||!storageReady} onChange={uploadMedia}/></label></div>{!storageReady&&<p className="admin-alert admin-alert-error">Preview R2 storage is not configured yet. The upload endpoint is ready, but requires a Preview-only R2 bucket binding named CMS_MEDIA and CMS_MEDIA_PUBLIC_BASE before uploads can work.</p>}<div className="cms-media-grid">{media.map(m=><article key={m.id}><img src={m.public_url} alt={m.alt_text||m.original_file_name}/><strong>{m.original_file_name}</strong><small>{Math.round(m.byte_size/1024)} KB · {m.mime_type}</small><button className="admin-secondary-button" onClick={()=>navigator.clipboard?.writeText(m.public_url)}>Copy URL</button><button className="admin-secondary-button" onClick={()=>removeMedia(m.id)}>Remove</button></article>)}</div>{!media.length&&<p className="admin-empty">No uploaded CMS media yet. Existing website assets remain available by their current paths.</p>}</section>}
    {tab==="settings"&&<div className="cms-manager-grid"><section className="cms-manager-panel"><h2>Saved settings</h2>{settings.map(row=><article className="cms-setting-row" key={row.setting_key}><strong>{row.setting_key}</strong><small>{row.draft_id?`Draft V${row.draft_version}`:row.published_version?`Published V${row.published_version}`:"No published version"}</small>{row.draft_id&&<button className="admin-secondary-button" onClick={()=>publishSetting(row)}>Publish to Preview</button>}<button className="admin-secondary-button" onClick={()=>{setSettingKey(row.setting_key);setSettingJson(row.draft_value||row.published_value||"{}");}}>Edit</button></article>)}</section><section className="cms-manager-panel"><h2>Settings editor</h2><label>Setting key<input value={settingKey} onChange={e=>setSettingKey(e.target.value)}/></label><textarea className="cms-json-editor" rows={18} value={settingJson} onChange={e=>setSettingJson(e.target.value)}/><button className="admin-primary-button" disabled={busy} onClick={saveSetting}>Save settings draft</button></section></div>}
    {tab==="history"&&<section className="cms-manager-panel"><h2>Revision history</h2><p>Choose an existing page or product key to inspect its latest 100 revisions.</p><div className="cms-history-picker"><select id="cms-history-type"><option value="page">Page</option><option value="product">Product</option></select><input id="cms-history-key" placeholder="Page key or product slug"/><button className="admin-secondary-button" onClick={()=>{const type=document.getElementById("cms-history-type").value;const key=document.getElementById("cms-history-key").value.trim();if(key)loadHistory(type,key);}}>Load history</button></div><RevisionList history={history} onRestore={id=>{const type=document.getElementById("cms-history-type").value;const key=document.getElementById("cms-history-key").value.trim();restoreRevision(type,key,id);}}/></section>}
    {tab==="pages"&&<section className="cms-manager-panel"><h2>Page content managers</h2><p>Home, Services and Team retain their own dedicated editors. Each remaining page has its own separate Visual Design Studio tab, with independent settings and drafts.</p><div className="cms-page-manager-links"><a href="/admin/cms">Homepage visual editor</a><span>Services manager — use the Services tab above</span><span>Team manager — use the Team tab above</span><span>Separate page design tabs are available in this menu for Products, Product Details, Service Details, Cart, requests and shared header/footer.</span><span>Contact / navigation / footer settings — settings drafts only, not yet connected to public layout</span></div></section>}
  </div></section>;
}
function RevisionList({history,onRestore}){return <div className="cms-revision-list">{history.map(v=><article key={v.id}><div><strong>V{v.version_number} · {v.state}</strong><small>{v.change_note||"No change note"} · {v.created_at}</small></div>{v.state!=="draft"&&<button className="admin-secondary-button" onClick={()=>onRestore(v.id)}>Restore as draft</button>}</article>)}</div>;}
