import React, { useEffect, useRef, useState } from "react";
import { products as catalogue } from "../data/products";
import ServicesManager from "./ServicesManager";
import TeamManager from "./TeamManager";
import PageVisualDesignManager from "./PageVisualDesignManager";
import ProductFormEditor from "../components/ProductFormEditor";
import { catalogMedia } from "../data/catalogMedia";
import { mergePublishedProduct } from "../data/productImages";

async function api(url, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

const blankProduct = () => ({
  slug: "",
  name: "",
  brand: "",
  brandLine: "",
  category: "Equipment",
  purchaseType: "cart",
  img: "",
  summary: "",
  description: "",
  highlights: [],
  specifications: [],
  docs: [],
  price: null,
  stockStatus: "pending",
  reviewStatus: "No customer reviews published yet.",
});

export default function CMSManagement() {
  const [tab, setTab] = useState("products");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [json, setJson] = useState("{}");
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const historyRequestId = useRef(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [media, setMedia] = useState([]);
  const [storageReady, setStorageReady] = useState(false);
  const [settings, setSettings] = useState([]);
  const [settingKey, setSettingKey] = useState("site.navigation");
  const [settingJson, setSettingJson] = useState(
    JSON.stringify({
      items: [
        { label: "Products", url: "/products" },
        { label: "Services", url: "/services", type: "services" },
        { label: "Team", url: "/team" },
        { label: "HR Contact", url: "/contact" },
      ],
    })
  );
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editorSelection, setEditorSelection] = useState(0);
  const [pages, setPages] = useState([]);
  const [historyType, setHistoryType] = useState("page");
  const [historyKey, setHistoryKey] = useState("");

  async function refreshProducts(isActive = () => true) {
    const data = await api("/api/cms/admin/products");
    if (isActive()) {
      setItems(data.products || []);
    }
  }

  async function refreshMedia(isActive = () => true) {
    const data = await api("/api/cms/admin/media");
    if (!isActive()) return;

    setMedia(data.media || []);
    setStorageReady(Boolean(data.storageReady));
  }

  async function refreshSettings(isActive = () => true) {
    const data = await api("/api/cms/admin/settings");
    if (isActive()) {
      setSettings(data.settings || []);
    }
  }

  useEffect(() => {
    let active = true;

    refreshProducts(() => active).catch((loadError) => {
      if (active) setError(loadError.message);
    });
    refreshMedia(() => active).catch((loadError) => {
      if (active) setError(loadError.message);
    });
    refreshSettings(() => active).catch((loadError) => {
      if (active) setError(loadError.message);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== "history") return;

    let active = true;
    api("/api/cms/admin/pages")
      .then((data) => {
        if (active) setPages(data.pages || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      });

    return () => {
      active = false;
    };
  }, [tab]);
  function chooseProduct(row) {
    const rawProduct = row
      ? JSON.parse(row.draft_product || row.published_product || "{}")
      : blankProduct();
    const catalogueProduct = catalogue.find(
      (product) => product.slug === rawProduct.slug
    );
    const product =
      row && catalogueProduct
        ? mergePublishedProduct(catalogueProduct, rawProduct)
        : rawProduct;

    setSelected({
      slug: product.slug || "",
      draftId: row?.draft_id || "",
      version: row?.draft_version || null,
      isNew: !row,
    });
    setJson(JSON.stringify(product, null, 2));
    historyRequestId.current += 1;
    setHistory([]);
    setHistoryLoaded(false);
    setHistoryLoading(false);
    setHistoryFailed(false);
    setError("");
    setNotice("");
    setEditorSelection((value) => value + 1);
  }
  async function saveProduct() {
    let product;

    try {
      product = JSON.parse(json);
    } catch {
      setError("Product data must be valid JSON.");
      return;
    }

    if (!product.slug || !product.name) {
      setError("Product slug and name are required.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const data = await api("/api/cms/admin/products", {
        method: "POST",
        body: JSON.stringify(product),
      });

      if (selected?.isNew) {
        setEditorSelection((value) => value + 1);
      }

      historyRequestId.current += 1;
      setHistory([]);
      setHistoryLoaded(false);
      setHistoryLoading(false);
      setHistoryFailed(false);
      setSelected({
        slug: product.slug,
        draftId: data.draftId,
        version: data.version,
        isNew: false,
      });
      setNotice(`Product draft V${data.version} saved.`);
      await refreshProducts();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }
  async function archiveProduct() {
    if (!selected?.slug) return;

    let product;
    try {
      product = JSON.parse(json);
    } catch {
      setError("Product data must be valid JSON.");
      return;
    }

    const confirmed = window.confirm(
      "Archive this product? It will disappear from the public catalogue after its archive draft is published."
    );
    if (!confirmed) return;

    product.isArchived = true;
    setJson(JSON.stringify(product, null, 2));
    setBusy(true);
    setError("");

    try {
      const data = await api("/api/cms/admin/products", {
        method: "POST",
        body: JSON.stringify(product),
      });

      historyRequestId.current += 1;
      setHistory([]);
      setHistoryLoaded(false);
      setHistoryLoading(false);
      setHistoryFailed(false);
      setSelected({
        slug: product.slug,
        draftId: data.draftId,
        version: data.version,
        isNew: false,
      });
      setNotice(
        "Archive draft saved. The public catalogue is unchanged until you publish to Preview."
      );
      await refreshProducts();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }
  async function publishProduct() {
    if (!selected?.draftId) return;

    setBusy(true);
    setError("");

    try {
      const data = await api("/api/cms/admin/publish", {
        method: "POST",
        body: JSON.stringify({
          entityType: "product",
          entityKey: selected.slug,
          versionId: selected.draftId,
        }),
      });

      historyRequestId.current += 1;
      setHistory([]);
      setHistoryLoaded(false);
      setHistoryLoading(false);
      setHistoryFailed(false);
      setNotice(
        `Product revision V${data.version} published to this Preview environment.`
      );
      setSelected(null);
      await refreshProducts();
    } catch (publishError) {
      setError(publishError.message);
    } finally {
      setBusy(false);
    }
  }
  async function importCatalogue() {
    const existingSlugs = new Set(items.map((item) => item.product_slug));
    const missingProducts = catalogue.filter(
      (product) => !existingSlugs.has(product.slug)
    );

    if (missingProducts.length === 0) {
      setNotice("All existing catalogue products are already represented in CMS.");
      return;
    }

    setBusy(true);
    setError("");
    let importedCount = 0;

    try {
      for (const product of missingProducts) {
        await api("/api/cms/admin/products", {
          method: "POST",
          body: JSON.stringify(product),
        });
        importedCount += 1;
      }

      setNotice(
        `Imported ${importedCount} catalogue products as unpublished drafts. Existing public catalogue remains unchanged.`
      );
      await refreshProducts();
    } catch (importError) {
      setError(
        `Imported ${importedCount} products before stopping: ${importError.message}`
      );
      await refreshProducts();
    } finally {
      setBusy(false);
    }
  }
  async function loadHistory(type, key) {
    const requestId = ++historyRequestId.current;
    setHistory([]);
    setHistoryLoaded(false);
    setHistoryFailed(false);
    setHistoryLoading(true);
    setError("");
    try {
      const data = await api(
        `/api/cms/admin/history?entityType=${type}&entityKey=${encodeURIComponent(key)}`
      );
      if (requestId !== historyRequestId.current) return;
      setHistory(data.history || []);
      setHistoryLoaded(true);
    } catch (loadError) {
      if (requestId !== historyRequestId.current) return;
      setHistoryFailed(true);
      setError(loadError.message);
    } finally {
      if (requestId === historyRequestId.current) {
        setHistoryLoading(false);
      }
    }
  }
  async function restoreRevision(type, key, id) {
    if (busy) return;

    const confirmed = window.confirm(
      "Restore this revision as a new draft? The current published version will remain live."
    );
    if (!confirmed) return;

    setBusy(true);

    try {
      const data = await api("/api/cms/admin/history", {
        method: "POST",
        body: JSON.stringify({
          entityType: type,
          entityKey: key,
          versionId: id,
        }),
      });

      setNotice(
        `Restored as draft V${data.version}. It has not been published.`
      );

      if (type === "product") {
        const refreshed = await api("/api/cms/admin/products");
        const products = refreshed.products || [];
        setItems(products);
        const productRow = products.find(
          (item) => item.product_slug === key
        );
        if (!productRow) {
          throw new Error("The restored product draft could not be reloaded. Refresh the product list before editing.");
        }
        chooseProduct(productRow);
      }

      if (type === "setting") {
        await refreshSettings();
      }

      await loadHistory(type, key);
    } catch (restoreError) {
      setError(restoreError.message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteDraft(type, key, id) {
    if (!id || busy) return;

    const confirmed = window.confirm(
      "Delete this unpublished draft? Published content and archived revision history will remain unchanged. This draft cannot be recovered."
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const data = await api("/api/cms/admin/draft", {
        method: "DELETE",
        body: JSON.stringify({
          entityType: type,
          entityKey: key,
          versionId: id,
        }),
      });

      setNotice(
        `Draft V${data.deletedVersion} deleted. Published content and archived history were preserved.`
      );

      if (type === "product") {
        const refreshed = await api("/api/cms/admin/products");
        const products = refreshed.products || [];
        setItems(products);

        const productRow = products.find(
          (item) => item.product_slug === key
        );

        if (productRow?.draft_product || productRow?.published_product) {
          chooseProduct(productRow);
        } else {
          setSelected(null);
          setJson(JSON.stringify(blankProduct(), null, 2));
          historyRequestId.current += 1;
          setHistory([]);
          setHistoryLoaded(false);
          setHistoryLoading(false);
          setHistoryFailed(false);
          setEditorSelection((value) => value + 1);
        }
      }

      if (type === "setting") {
        const refreshed = await api("/api/cms/admin/settings");
        const savedSettings = refreshed.settings || [];
        setSettings(savedSettings);

        const settingRow = savedSettings.find(
          (item) => item.setting_key === key
        );

        if (settingRow) {
          setSettingKey(key);
          setSettingJson(
            settingRow.draft_value || settingRow.published_value || "{}"
          );
        }
      }

      await loadHistory(type, key);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusy(false);
    }
  }
  async function uploadMedia(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    setBusy(true);
    setError("");

    try {
      await api("/api/cms/admin/media", {
        method: "POST",
        body: form,
      });
      setNotice("Media uploaded to Preview storage.");
      await refreshMedia();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setBusy(false);
      event.target.value = "";
    }
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
    const confirmed = window.confirm(
      "Remove this media file? Any pages using its URL may show a broken image."
    );
    if (!confirmed) return;

    try {
      await api(
        `/api/cms/admin/media?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      await refreshMedia();
      setNotice("Media removed.");
    } catch (removeError) {
      setError(removeError.message);
    }
  }
  async function saveSetting() {
    let value;

    try {
      value = JSON.parse(settingJson);
    } catch {
      setError("Setting value must be valid JSON.");
      return;
    }

    setBusy(true);

    try {
      const data = await api("/api/cms/admin/settings", {
        method: "POST",
        body: JSON.stringify({
          key: settingKey,
          value,
        }),
      });

      setNotice(`Settings draft V${data.version} saved.`);
      await refreshSettings();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }
  async function publishSetting(row) {
    try {
      await api("/api/cms/admin/publish", {
        method: "POST",
        body: JSON.stringify({
          entityType: "setting",
          entityKey: row.setting_key,
          versionId: row.draft_id,
        }),
      });

      setNotice(`Setting "${row.setting_key}" published to Preview.`);
      await refreshSettings();
    } catch (publishError) {
      setError(publishError.message);
    }
  }
  const historyOptions = historyType==="page"
    ? pages.map(row=>({key:row.page_key,label:`${row.title} · ${row.route}`}))
    : historyType==="product"
      ? items.map(row=>({key:row.product_slug,label:row.product_slug}))
      : settings.map(row=>({key:row.setting_key,label:row.setting_key}));
  if(tab==="products")return <section className="cms-admin-page"><div className="cms-admin-shell">
    <header className="cms-admin-header">
      <div>
        <p className="eyebrow">YR Proservice · Content Management</p>
        <h1>CMS Management Centre</h1>
        <p>
          Product changes are saved as drafts in the isolated Preview environment.
          Image paths stay unchanged unless you select a replacement in the image picker.
        </p>
      </div>
      <div className="cms-manager-header-actions">
        <a className="admin-secondary-button" href="/admin/cms/design-review">
          Review all pages together
        </a>
        <a className="admin-public-link" href="/admin/cms">← Visual Editor</a>
      </div>
    </header>
    {error&&<p className="admin-alert admin-alert-error" role="alert">{error}</p>}{notice&&<p className="admin-alert admin-alert-success" role="status">{notice}</p>}
    <nav className="cms-manager-tabs" aria-label="Page workspaces">
      {[
        ["products", "Products"],
        ["services", "Services"],
        ["team", "Team"],
        ["cart", "Product Cart"],
        ["dental-chair-request", "Dental Chair Request"],
        ["quote", "Quotation Request"],
        ["service-request", "Service Request"],
        ["track-request", "Track My Request"],
        ["media", "Media library"],
        ["settings", "Site settings"],
        ["history", "Revision history"],
      ].map(([id, label]) => (
        <button
          key={id}
          className={tab === id ? "active" : ""}
          onClick={() => {
            setTab(id);
            setError("");
            setNotice("");
          }}
        >
          {label}
        </button>
      ))}
    </nav>
    <div className="cms-manager-grid">
      <section className="cms-manager-panel">
        <div className="cms-manager-heading">
          <div>
            <h2>Product catalogue</h2>
            <p>
              {items.length} CMS products · {catalogue.length} products in existing code catalogue
            </p>
          </div>
          <button
            className="admin-secondary-button"
            disabled={busy}
            onClick={importCatalogue}
          >
            Import missing catalogue products
          </button>
        </div>
        <div className="cms-product-list">
          {items.map((row) => {
            const product = JSON.parse(
              row.draft_product || row.published_product || "{}"
            );

            return (
              <button
                key={row.id}
                className={selected?.slug === row.product_slug ? "active" : ""}
                onClick={() => chooseProduct(row)}
              >
                <strong>{product.name || row.product_slug}</strong>
                <small>
                  {product.brand || "Unbranded"} · {product.category || "Uncategorised"}
                </small>
                <span>
                  {row.draft_id
                    ? `Draft V${row.draft_version}`
                    : row.published_version
                      ? `Published V${row.published_version}`
                      : "Not published"}
                </span>
              </button>
            );
          })}
        </div>
        <button className="admin-secondary-button" onClick={()=>chooseProduct(null)}>＋ Add product</button>
      </section>
      <section className="cms-manager-panel">
        <h2>{selected?.slug?"Edit product":"Product editor"}</h2>
        <p>Structured fields edit only the chosen values. Specifications, documents, image paths, and unexposed product metadata are preserved when saving.</p>
        <ProductFormEditor key={editorSelection} json={json} onJsonChange={setJson} slugLocked={Boolean(selected&&!selected.isNew)} media={media}/>
        <div className="cms-manager-actions">
          <button className="admin-primary-button" disabled={busy||!selected} onClick={saveProduct}>Save product draft</button>
          <button className="admin-secondary-button" disabled={busy||!selected?.draftId} onClick={publishProduct}>Publish to Preview</button>
          <button
            className="admin-secondary-button"
            disabled={!selected?.slug}
            onClick={() =>
              window.open(
                "/admin/cms/product-preview?slug=" + encodeURIComponent(selected.slug),
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            Preview Product
          </button>
          <button className="admin-secondary-button" disabled={busy||!selected?.slug} onClick={archiveProduct}>Archive product</button>
          {selected?.slug&&<button className="admin-secondary-button" disabled={historyLoading} onClick={()=>loadHistory("product",selected.slug)}>{historyLoading ? "Loading…" : "View revisions"}</button>}
          {selected?.draftId&&<button className="admin-secondary-button" disabled={busy} onClick={()=>deleteDraft("product",selected.slug,selected.draftId)}>Delete Draft</button>}
        </div>
        {(history.length > 0 || historyLoading || historyLoaded || historyFailed) && (
          <>
            {history.length > 0 && <RevisionList history={history} busy={busy} onRestore={id=>restoreRevision("product",selected.slug,id)} onDeleteDraft={id=>deleteDraft("product",selected.slug,id)}/>}
            {historyLoading && (
          <p className="cms-history-empty" role="status" aria-live="polite">Loading revision history…</p>
        )}
        {!historyLoading && historyLoaded && history.length === 0 && (
          <p className="cms-history-empty" role="status">No revisions found for this product.</p>
        )}
        {!historyLoading && historyFailed && (
          <p className="cms-history-empty" role="status">Product revision history could not be loaded. Check the error message above and try again.</p>
        )}
          </>
        )}
      </section>
    </div>
    <section className="cms-manager-panel cms-page-editor-design">
      <h2>Products page appearance</h2>
      <p>Product listing and product detail templates keep separate visual settings.</p>
      <details className="cms-page-design-accordion" open>
        <summary>Products listing · Visual Design Studio</summary>
        <PageVisualDesignManager key="products" pageKey="products" />
      </details>
      <details className="cms-page-design-accordion">
        <summary>Product details · Visual Design Studio</summary>
        <PageVisualDesignManager key="product-detail" pageKey="product-detail" />
      </details>
    </section>
  </div></section>;
  return <section className="cms-admin-page"><div className="cms-admin-shell">
    <header className="cms-admin-header">
      <div>
        <p className="eyebrow">YR Proservice · Content Management</p>
        <h1>CMS Management Centre</h1>
        <p>
          Each customer-facing page has its own workspace. Open a page to manage
          its content or visual appearance. All publishing actions here target
          the isolated Preview database.
        </p>
      </div>
      <div className="cms-manager-header-actions">
        <a className="admin-secondary-button" href="/admin/cms/design-review">
          Review all pages together
        </a>
        <a className="admin-public-link" href="/admin/cms">← Visual Editor</a>
      </div>
    </header>
    {error&&<p className="admin-alert admin-alert-error" role="alert">{error}</p>}{notice&&<p className="admin-alert admin-alert-success" role="status">{notice}</p>}
    <nav className="cms-manager-tabs" aria-label="Page workspaces">
      {[
        ["products", "Products"],
        ["services", "Services"],
        ["team", "Team"],
        ["cart", "Product Cart"],
        ["dental-chair-request", "Dental Chair Request"],
        ["quote", "Quotation Request"],
        ["service-request", "Service Request"],
        ["track-request", "Track My Request"],
        ["media", "Media library"],
        ["settings", "Site settings"],
        ["history", "Revision history"],
      ].map(([id, label]) => (
        <button
          key={id}
          className={tab === id ? "active" : ""}
          onClick={() => {
            setTab(id);
            setError("");
            setNotice("");
          }}
        >
          {label}
        </button>
      ))}
    </nav>
    {tab === "products" && (
      <>
        <div className="cms-manager-grid">
          <section className="cms-manager-panel">
            <div className="cms-manager-heading">
              <div>
                <h2>Product catalogue</h2>
                <p>
                  {items.length} CMS products · {catalogue.length} products in existing code catalogue
                </p>
              </div>
              <button
                className="admin-secondary-button"
                disabled={busy}
                onClick={importCatalogue}
              >
                Import missing catalogue products
              </button>
            </div>
            <div className="cms-product-list">
              {items.map((row) => {
                const product = JSON.parse(
                  row.draft_product || row.published_product || "{}"
                );

                return (
                  <button
                    key={row.id}
                    className={selected?.slug === row.product_slug ? "active" : ""}
                    onClick={() => chooseProduct(row)}
                  >
                    <strong>{product.name || row.product_slug}</strong>
                    <small>
                      {product.brand || "Unbranded"} · {product.category || "Uncategorised"}
                    </small>
                    <span>
                      {row.draft_id
                        ? `Draft V${row.draft_version}`
                        : row.published_version
                          ? `Published V${row.published_version}`
                          : "Not published"}
                    </span>
                  </button>
                );
              })}
            </div>
            <button className="admin-secondary-button" onClick={() => chooseProduct(null)}>
              ＋ Add product
            </button>
          </section>

          <section className="cms-manager-panel">
            <h2>{selected?.slug ? "Edit product" : "Product editor"}</h2>
            <p>
              Structured product JSON preserves all current catalogue fields,
              including cart-versus-chair purchase type, specifications, docs,
              image path, price and stock status.
            </p>
            <div className="cms-product-image-picker">
              <div className="cms-product-image-picker-heading">
                <div>
                  <h3>Product image</h3>
                  <p>
                    Select an image already uploaded to the Preview Media Library.
                    Your selection updates the product <code>img</code> field; save
                    the draft below to keep it.
                  </p>
                </div>
                <button
                  type="button"
                  className="admin-secondary-button"
                  disabled={!selected?.slug}
                  onClick={() => setTab("media")}
                >
                  Open Media Library
                </button>
              </div>
              {currentProductImage && (
                <div className="cms-current-product-image">
                  <img src={currentProductImage} alt="Current product image preview" />
                  <div>
                    <strong>Current image</strong>
                    <small>{currentProductImage}</small>
                  </div>
                  <button
                    type="button"
                    className="admin-secondary-button"
                    disabled={!selected?.slug}
                    onClick={clearProductImage}
                  >
                    Clear image
                  </button>
                </div>
              )}
              {media.length > 0 ? (
                <div className="cms-product-media-picker-grid">
                  {media.map((item) => (
                    <article
                      key={item.id}
                      className={currentProductImage === item.public_url ? "selected" : ""}
                    >
                      <img
                        src={item.public_url}
                        alt={item.alt_text || item.original_file_name}
                      />
                      <strong>{item.original_file_name}</strong>
                      <small>
                        {Math.round(item.byte_size / 1024)} KB · {item.mime_type}
                      </small>
                      <button
                        type="button"
                        className="admin-secondary-button"
                        disabled={!selected?.slug}
                        onClick={() => applyMediaImage(item.public_url)}
                      >
                        {currentProductImage === item.public_url
                          ? "Selected"
                          : "Use this image"}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="admin-empty">
                  No uploaded images are available yet. Upload an image in the Media
                  library tab first.
                </p>
              )}
            </div>
            <textarea
              className="cms-json-editor"
              spellCheck="false"
              value={json}
              onChange={(event) => setJson(event.target.value)}
              rows={28}
            />
            <div className="cms-manager-actions">
              <button
                className="admin-primary-button"
                disabled={busy || !selected}
                onClick={saveProduct}
              >
                Save product draft
              </button>
              <button
                className="admin-secondary-button"
                disabled={busy || !selected?.draftId}
                onClick={publishProduct}
              >
                Publish to Preview
              </button>
              <button
                className="admin-secondary-button"
                disabled={busy || !selected?.slug}
                onClick={archiveProduct}
              >
                Archive product
              </button>
              {selected?.slug && (
                <button
                  className="admin-secondary-button"
                  disabled={historyLoading}
                  onClick={() => loadHistory("product", selected.slug)}
                >
                  {historyLoading ? "Loading…" : "View revisions"}
                </button>
              )}
            </div>
            {(history.length > 0 || historyLoading || historyLoaded || historyFailed) && (
              <>
                {history.length > 0 && (
                  <RevisionList
                    history={history} busy={busy}
                    onRestore={(id) => restoreRevision("product", selected.slug, id)}
                  />
                )}
                {historyLoading && (
          <p className="cms-history-empty" role="status" aria-live="polite">Loading revision history…</p>
        )}
        {!historyLoading && historyLoaded && history.length === 0 && (
          <p className="cms-history-empty" role="status">No revisions found for this product.</p>
        )}
        {!historyLoading && historyFailed && (
          <p className="cms-history-empty" role="status">Product revision history could not be loaded. Check the error message above and try again.</p>
        )}
              </>
            )}
          </section>
        </div>
        <section className="cms-manager-panel cms-page-editor-design">
          <h2>Products page appearance</h2>
          <p>
            These design controls are part of the Products management area.
            Product listing and product detail templates keep separate visual settings.
          </p>
          <details className="cms-page-design-accordion" open>
            <summary>Products listing · Visual Design Studio</summary>
            <PageVisualDesignManager key="products" pageKey="products" />
          </details>
          <details className="cms-page-design-accordion">
            <summary>Product details · Visual Design Studio</summary>
            <PageVisualDesignManager key="product-detail" pageKey="product-detail" />
          </details>
        </section>
      </>
    )}
    {tab === "services" && (
      <section className="cms-manager-panel">
        <ServicesManager />
        <details className="cms-page-design-accordion">
          <summary>Service details page · Visual Design Studio</summary>
          <PageVisualDesignManager key="service-detail" pageKey="service-detail" />
        </details>
      </section>
    )}
    {tab==="team"&&<section className="cms-manager-panel"><TeamManager/></section>}
    {tab === "media" && (
      <section className="cms-manager-panel">
        <div className="cms-manager-heading">
          <div>
            <h2>Media library</h2>
            <p>Preview-only uploads are stored in the CMS R2 bucket.</p>
          </div>
          <label className="admin-primary-button cms-upload-label">
            Upload image
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
              disabled={busy || !storageReady}
              onChange={uploadMedia}
            />
          </label>
        </div>
        {!storageReady && (
          <p className="admin-alert admin-alert-error">
            Preview R2 storage is not configured yet. The upload endpoint is ready,
            but requires a Preview-only R2 bucket binding named CMS_MEDIA and
            CMS_MEDIA_PUBLIC_BASE before uploads can work.
          </p>
        )}
        <h3>Uploaded Preview media</h3>
        <div className="cms-media-grid">
          {media.map((item) => (
            <article key={item.id}>
              <img src={item.public_url} alt={item.alt_text || item.original_file_name} />
              <strong>{item.original_file_name}</strong>
              <small>{Math.round(item.byte_size / 1024)} KB · {item.mime_type}</small>
              <button
                className="admin-secondary-button"
                onClick={() => navigator.clipboard?.writeText(item.public_url)}
              >
                Copy URL
              </button>
              <button
                className="admin-secondary-button"
                onClick={() => removeMedia(item.id)}
              >
                Remove
              </button>
            </article>
          ))}
        </div>
        {!media.length && <p className="admin-empty">No uploaded CMS media yet.</p>}
        <h3>Original catalogue images</h3>
        <p>These static assets are part of the website catalogue and are not removable from this library.</p>
        {Object.entries(
          catalogMedia.reduce((groups, item) => {
            (groups[item.folder] ??= []).push(item);
            return groups;
          }, {})
        ).map(([folder, folderItems]) => (
          <details className="cms-page-design-accordion" key={folder}>
            <summary>{folder} · {folderItems.length} images</summary>
            <div className="cms-media-grid">
              {folderItems.map((item) => (
                <article key={item.src}>
                  <img src={item.src} alt={item.file} loading="lazy" />
                  <strong>{item.file}</strong>
                  <small>{item.brand} · {item.category}</small>
                  <button
                    className="admin-secondary-button"
                    onClick={() => navigator.clipboard?.writeText(item.src)}
                  >
                    Copy path
                  </button>
                </article>
              ))}
            </div>
          </details>
        ))}
      </section>
    )}
    {tab === "settings" && (
      <>
        <div className="cms-manager-grid">
          <section className="cms-manager-panel">
            <h2>Saved settings</h2>
            {settings.map((row) => (
              <article className="cms-setting-row" key={row.setting_key}>
                <strong>{row.setting_key}</strong>
                <small>
                  {row.draft_id
                    ? `Draft V${row.draft_version}`
                    : row.published_version
                      ? `Published V${row.published_version}`
                      : "No published version"}
                </small>
                {row.draft_id && (
                  <>
                    <button
                      className="admin-secondary-button"
                      disabled={busy}
                      onClick={() => publishSetting(row)}
                    >
                      Publish to Preview
                    </button>
                    <button
                      className="admin-secondary-button"
                      disabled={busy}
                      onClick={() => deleteDraft("setting", row.setting_key, row.draft_id)}
                    >
                      Delete Draft
                    </button>
                  </>
                )}
                <button
                  className="admin-secondary-button"
                  onClick={() => {
                    setSettingKey(row.setting_key);
                    setSettingJson(row.draft_value || row.published_value || "{}");
                  }}
                >
                  Edit
                </button>
              </article>
            ))}
          </section>
          <section className="cms-manager-panel">
            <h2>Settings editor</h2>
            <p>
              Published <code>site.navigation</code> controls the header links using
              an items array of label and internal url values; mark the Services item
              with type "services" to retain its service dropdown. Published
              <code> site.footer</code> supports companyName, description, links
              (label and url), contactPhone, contactPhoneHref (tel: only),
              contactEmail and copyright. Other page-design settings remain separate.
            </p>
            <label>
              Setting key
              <input value={settingKey} onChange={(event) => setSettingKey(event.target.value)} />
            </label>
            <textarea
              className="cms-json-editor"
              rows={18}
              value={settingJson}
              onChange={(event) => setSettingJson(event.target.value)}
            />
            <button
              className="admin-primary-button"
              disabled={busy}
              onClick={saveSetting}
            >
              Save settings draft
            </button>
          </section>
        </div>
        <section className="cms-manager-panel cms-page-editor-design">
          <h2>Shared website header & footer</h2>
          <p>This is the shared site-wide design area, separate from individual page appearance.</p>
          <details className="cms-page-design-accordion">
            <summary>Header & footer · Visual Design Studio</summary>
            <PageVisualDesignManager key="site-chrome" pageKey="site-chrome" />
          </details>
        </section>
      </>
    )}
    {tab === "history" && (
      <section className="cms-manager-panel">
        <h2>Revision history</h2>
        <p>Select an existing page, product or site setting to inspect its latest 100 revisions.</p>
        <div className="cms-history-picker">
          <label>
            Content type
            <select
              value={historyType}
              onChange={(event) => {
                historyRequestId.current += 1;
                setHistoryLoading(false);
                setHistoryType(event.target.value);
                setHistoryKey("");
                setHistory([]);
                setHistoryLoaded(false);
                setHistoryFailed(false);
              }}
            >
              <option value="page">Page</option>
              <option value="product">Product</option>
              <option value="setting">Site setting</option>
            </select>
          </label>
          <label>
            CMS item
            <select
              value={historyKey}
              onChange={(event) => {
                historyRequestId.current += 1;
                setHistoryLoading(false);
                setHistoryKey(event.target.value);
                setHistory([]);
                setHistoryLoaded(false);
                setHistoryFailed(false);
              }}
            >
              <option value="">Select an item</option>
              {historyOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>
          <button
            className="admin-secondary-button"
            disabled={!historyKey || historyLoading}
            onClick={() => loadHistory(historyType, historyKey)}
          >
            {historyLoading ? "Loading…" : "Load history"}
          </button>
        </div>
        <RevisionList
          history={history} busy={busy}
          onRestore={(id) => restoreRevision(historyType, historyKey, id)}
          onDeleteDraft={(id) => deleteDraft(historyType, historyKey, id)}
        />
        {historyLoading && (
          <p className="cms-history-empty" role="status" aria-live="polite">Loading revision history…</p>
        )}
        {!historyLoading && historyLoaded && history.length === 0 && (
          <p className="cms-history-empty" role="status">No revisions found for this item.</p>
        )}
        {!historyLoading && historyFailed && (
          <p className="cms-history-empty" role="status">History could not be loaded. Check the error message above and try again.</p>
        )}
        {!historyLoading && !historyLoaded && !historyFailed && (
          <p className="cms-history-empty" role="status">Select a CMS item and load its history to see saved revisions.</p>
        )}
      </section>
    )}
    {tab === "cart" && (
      <section className="cms-manager-panel">
        <header className="cms-manager-heading">
          <div>
            <h2>Product Cart page workspace</h2>
            <p>Manage the Cart page appearance here. Cart items, quantities, totals and navigation behaviour remain unchanged.</p>
          </div>
        </header>
        <PageVisualDesignManager key="cart" pageKey="cart" />
      </section>
    )}
    {tab === "dental-chair-request" && (
      <section className="cms-manager-panel">
        <header className="cms-manager-heading">
          <div>
            <h2>Dental Chair Request page workspace</h2>
            <p>Manage the Dental Chair Request page appearance here. Chair selection, request data, validation and submission behaviour remain unchanged.</p>
          </div>
        </header>
        <PageVisualDesignManager key="dental-chair-request" pageKey="dental-chair-request" />
      </section>
    )}
    {tab === "quote" && (
      <section className="cms-manager-panel">
        <header className="cms-manager-heading">
          <div>
            <h2>Quotation Request page workspace</h2>
            <p>Manage the Quotation Request page appearance here. Cart contents, request validation and submission behaviour remain unchanged.</p>
          </div>
        </header>
        <PageVisualDesignManager key="quote" pageKey="quote" />
      </section>
    )}
    {tab === "service-request" && (
      <section className="cms-manager-panel">
        <header className="cms-manager-heading">
          <div>
            <h2>Service Request page workspace</h2>
            <p>Manage the Service Request page appearance here. Service selection, required fields, validation and submission behaviour remain unchanged.</p>
          </div>
        </header>
        <PageVisualDesignManager key="service-request" pageKey="service-request" />
      </section>
    )}
    {tab === "track-request" && (
      <section className="cms-manager-panel">
        <header className="cms-manager-heading">
          <div>
            <h2>Track My Request page workspace</h2>
            <p>Manage the Track My Request page appearance here. Request lookup and status retrieval behaviour remain unchanged.</p>
          </div>
        </header>
        <PageVisualDesignManager key="track-request" pageKey="track-request" />
      </section>
    )}
  </div></section>;
}
function RevisionList({ history, onRestore, onDeleteDraft, busy = false }) {
  return (
    <div className="cms-revision-list">
      {history.map((revision) => (
        <article key={revision.id}>
          <div>
            <strong>
              V{revision.version_number} · {revision.state}
            </strong>
            <small>
              {revision.change_note || "No change note"} · {revision.created_at}
            </small>
          </div>

          {revision.state !== "draft" && (
            <button
              className="admin-secondary-button"
              disabled={busy}
              onClick={() => onRestore(revision.id)}
            >
              Restore as draft
            </button>
          )}

          {revision.state === "draft" && onDeleteDraft && (
            <button
              className="admin-secondary-button"
              disabled={busy}
              onClick={() => onDeleteDraft(revision.id)}
            >
              Delete Draft
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
