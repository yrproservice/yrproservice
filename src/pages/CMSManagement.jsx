import React, { useCallback, useEffect, useRef, useState } from "react";
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
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
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

const VISUAL_DESIGN_KEYS_BY_TAB = {
  products: ["products", "product-detail"],
  services: ["service-detail"],
  settings: ["site-chrome"],
  cart: ["cart"],
  "dental-chair-request": ["dental-chair-request"],
  quote: ["quote"],
  "service-request": ["service-request"],
  "track-request": ["track-request"],
};

function areJsonValuesEqual(left, right) {
  try {
    return JSON.stringify(JSON.parse(left)) === JSON.stringify(JSON.parse(right));
  } catch {
    return false;
  }
}

export default function CMSManagement() {
  const [tab, setTab] = useState("products");
  const [servicesHaveUnsavedChanges, setServicesHaveUnsavedChanges] = useState(false);
  const [teamHaveUnsavedChanges, setTeamHaveUnsavedChanges] = useState(false);
  const [visualDesignUnsaved, setVisualDesignUnsaved] = useState({});
  const reportVisualDesignUnsaved = useCallback((key, dirty) => {
    setVisualDesignUnsaved((current) => current[key] === dirty ? current : { ...current, [key]: dirty });
  }, []);
  const [items, setItems] = useState([]);
  const [productsReady, setProductsReady] = useState(false);
  const productsListRequestId = useRef(0);
  const [selected, setSelected] = useState(null);
  const [json, setJson] = useState("{}");
  const [history, setHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const historyRequestId = useRef(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFailed, setHistoryFailed] = useState(false);
  const [media, setMedia] = useState([]);
  const [mediaIncludeArchived, setMediaIncludeArchived] = useState(false);
  const mediaListRequestId = useRef(0);
  const [mediaIntegrityFilter, setMediaIntegrityFilter] = useState("all");
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaHistoryId, setMediaHistoryId] = useState("");
  const [mediaHistory, setMediaHistory] = useState([]);
  const [mediaHistoryLoading, setMediaHistoryLoading] = useState(false);
  const mediaHistoryRequestId = useRef(0);
  const [mediaHistoryFilter, setMediaHistoryFilter] = useState("all");
  const [mediaAltDrafts, setMediaAltDrafts] = useState({});
  const [mediaFilenameDrafts, setMediaFilenameDrafts] = useState({});
  const [mediaUsage, setMediaUsage] = useState(null);
  const [mediaUsageId, setMediaUsageId] = useState("");
  const [mediaUsageLoading, setMediaUsageLoading] = useState(false);
  const mediaUsageRequestId = useRef(0);
  const [mediaStorageChecks, setMediaStorageChecks] = useState({});
  const [mediaStorageCheckingId, setMediaStorageCheckingId] = useState("");
  const [mediaOrphanReport, setMediaOrphanReport] = useState(null);
  const [mediaOrphanCursor, setMediaOrphanCursor] = useState("");
  const [mediaOrphanScanning, setMediaOrphanScanning] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [settings, setSettings] = useState([]);
  const [settingsReady, setSettingsReady] = useState(false);
  const settingsListRequestId = useRef(0);
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
  const settingBaseline = useRef({ key: "site.navigation", json: settingJson });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editorSelection, setEditorSelection] = useState(0);
  const [pages, setPages] = useState([]);
  const [historyType, setHistoryType] = useState("page");
  const [historyKey, setHistoryKey] = useState("");

  async function refreshProducts(isActive = () => true) {
    const requestId = ++productsListRequestId.current;
    if (isActive()) setProductsReady(false);
    try {
      const data = await api("/api/cms/admin/products");
      if (!isActive() || requestId !== productsListRequestId.current) return null;
      const products = data.products || [];
      setItems(products);
      setProductsReady(true);
      return products;
    } catch (loadError) {
      if (isActive() && requestId === productsListRequestId.current) {
        setProductsReady(false);
      }
      throw loadError;
    }
  }

  async function refreshMedia(isActive = () => true) {
    const requestId = ++mediaListRequestId.current;
    const data = await api("/api/cms/admin/media" + (mediaIncludeArchived ? "?includeDeleted=1" : ""));
    if (!isActive() || requestId !== mediaListRequestId.current) return;

    setMedia(data.media || []);
    setStorageReady(Boolean(data.storageReady));
  }

  async function refreshSettings(isActive = () => true) {
    const requestId = ++settingsListRequestId.current;
    if (isActive()) setSettingsReady(false);
    try {
      const data = await api("/api/cms/admin/settings");
      if (!isActive() || requestId !== settingsListRequestId.current) return null;
      const rows = data.settings || [];
      setSettings(rows);
      setSettingsReady(true);
      return rows;
    } catch (loadError) {
      if (isActive() && requestId === settingsListRequestId.current) {
        setSettingsReady(false);
      }
      throw loadError;
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
  function chooseProduct(row, confirmedDiscard = false) {
    if (!productsReady && !confirmedDiscard) {
      setError("Load the current product list successfully before opening or creating a product.");
      return;
    }
    const nextSlug = row?.product_slug || "";
    const sameSelection = selected && (
      selected.isNew ? !row : selected.slug === nextSlug
    );
    if (sameSelection && !confirmedDiscard) return;
    if (
      !confirmedDiscard &&
      selected &&
      selected.savedJson !== json &&
      !window.confirm("Discard the unsaved edits to the current product and open another product?")
    ) return;
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
      savedJson: JSON.stringify(product, null, 2),
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
    if (!productsReady) {
      setError("Load the current product list successfully before saving. Reload the CMS and try again.");
      return;
    }
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
        savedJson: JSON.stringify(product, null, 2),
      });
      setNotice(`Product draft V${data.version} saved.`);
      try {
        await refreshProducts();
      } catch (refreshError) {
        setError(`Product draft V${data.version} was saved successfully, but the product list could not be refreshed (${refreshError.message}). Reload the CMS before continuing.`);
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }
  async function archiveProduct() {
    if (!productsReady) {
      setError("Load the current product list successfully before archiving a product.");
      return;
    }
    if (!selected?.slug) return;

    let product;
    try {
      product = JSON.parse(json);
    } catch {
      setError("Product data must be valid JSON.");
      return;
    }

    const hasUnsavedProductEdits = selected.savedJson !== json;
    const confirmed = window.confirm(
      hasUnsavedProductEdits
        ? "Archive this product and include the current unsaved product edits in its new archive draft? It will disappear from the public catalogue only after that draft is published to Preview."
        : "Archive this product? It will disappear from the public catalogue only after its archive draft is published to Preview."
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
        savedJson: JSON.stringify(product, null, 2),
      });
      setNotice(
        "Archive draft saved. The public catalogue is unchanged until you publish to Preview."
      );
      try {
        await refreshProducts();
      } catch (refreshError) {
        setError(`Archive draft V${data.version} was saved successfully, but the product list could not be refreshed (${refreshError.message}). Reload the CMS before continuing.`);
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }
  async function publishProduct() {
    if (!productsReady) {
      setError("Load the current product list successfully before publishing a product.");
      return;
    }
    if (!selected?.draftId) return;
    if (selected.savedJson !== json) {
      setError("Save the current product edits before publishing. The previously saved draft has not been published.");
      return;
    }

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
      try {
        await refreshProducts();
      } catch (refreshError) {
        setError(`Product revision V${data.version} was published to Preview successfully, but the product list could not be refreshed (${refreshError.message}). Reload the CMS before continuing.`);
      }
    } catch (publishError) {
      setError(publishError.message);
    } finally {
      setBusy(false);
    }
  }
  async function importCatalogue() {
    if (!productsReady) {
      setError("Load the current product list successfully before importing catalogue products.");
      return;
    }
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
    } catch (importError) {
      setNotice(
        `Imported ${importedCount} catalogue product(s) as unpublished drafts before the import stopped. Existing public catalogue remains unchanged.`
      );
      setError(`Catalogue import stopped after ${importedCount} product(s): ${importError.message}`);
      try {
        await refreshProducts();
      } catch (refreshError) {
        setError(`Catalogue import stopped after ${importedCount} product(s), and the product list could not be refreshed (${refreshError.message}). Reload the CMS before continuing.`);
      }
      setBusy(false);
      return;
    }

    setNotice(
      `Imported ${importedCount} catalogue products as unpublished drafts. Existing public catalogue remains unchanged.`
    );
    try {
      await refreshProducts();
    } catch (refreshError) {
      setError(`All ${importedCount} catalogue products were imported successfully, but the product list could not be refreshed (${refreshError.message}). Reload the CMS before continuing.`);
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
    if (type === "product" && !productsReady) {
      setError("Load the current product list successfully before restoring a product revision.");
      return;
    }
    if (type === "setting" && !settingsReady) {
      setError("Load the current settings successfully before restoring a settings revision.");
      return;
    }

    const discardsSettingEdits = type === "setting" && key === settingKey && hasUnsavedSettingChanges;
    const discardsProductEdits = type === "product" && selected?.slug === key && selected.savedJson !== json;
    const confirmationMessage = [
      "Restore this revision as a new draft?",
      discardsProductEdits ? "The current unsaved product editor changes will also be discarded." : "",
      discardsSettingEdits ? "The current unsaved settings editor changes will also be discarded." : "",
      "The current published version will remain live.",
    ].filter(Boolean).join(" ");
    const confirmed = window.confirm(confirmationMessage);
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

      try {
        if (type === "product") {
          const products = await refreshProducts();
          if (!products) throw new Error("The product list refresh was superseded. Reload the CMS before continuing.");
          const productRow = products.find(
            (item) => item.product_slug === key
          );
          if (!productRow) {
            throw new Error("The restored product draft was created, but its row was not returned.");
          }
          chooseProduct(productRow, true);
        }

        if (type === "setting") {
          const savedSettings = await refreshSettings();
          if (!savedSettings) throw new Error("The settings refresh was superseded. Reload the CMS before continuing.");
          if (settingKey === key) {
            const row = savedSettings.find((item) => item.setting_key === key);
            const nextJson = row?.draft_value || row?.published_value || "{}";
            settingBaseline.current = { key, json: nextJson };
            setSettingJson(nextJson);
          }
        }
        await loadHistory(type, key);
      } catch (refreshError) {
        if (type === "product" && selected?.slug === key) {
          setSelected(null);
          setJson(JSON.stringify(blankProduct(), null, 2));
        }
        if (type === "setting") setSettingsReady(false);
        setError(`Revision V${id} was restored as draft V${data.version}, but the editor could not be refreshed (${refreshError.message}). Reload the CMS before continuing.`);
      }
    } catch (restoreError) {
      setError(restoreError.message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteDraft(type, key, id) {
    if (!id || busy) return;
    if (type === "product" && !productsReady) {
      setError("Load the current product list successfully before deleting a product draft.");
      return;
    }
    if (type === "setting" && !settingsReady) {
      setError("Load the current settings successfully before deleting a settings draft.");
      return;
    }

    const discardsSettingEdits = type === "setting" && key === settingKey && hasUnsavedSettingChanges;
    const discardsProductEdits = type === "product" && selected?.slug === key && selected.savedJson !== json;
    const confirmationMessage = [
      "Delete this unpublished draft?",
      discardsProductEdits ? "The current unsaved product editor changes will also be discarded." : "",
      discardsSettingEdits ? "The current unsaved settings editor changes will also be discarded." : "",
      "Published content and archived revision history will remain unchanged. The draft cannot be recovered.",
    ].filter(Boolean).join(" ");
    const confirmed = window.confirm(confirmationMessage);
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

      if (type === "product" && selected?.slug === key) {
        setSelected(null);
        setJson(JSON.stringify(blankProduct(), null, 2));
        historyRequestId.current += 1;
        setHistory([]);
        setHistoryLoaded(false);
        setHistoryLoading(false);
        setHistoryFailed(false);
        setEditorSelection((value) => value + 1);
      }
      if (type === "setting" && settingKey === key) {
        settingBaseline.current = { key, json: "" };
        setSettingJson("");
        setSettingsReady(false);
      }

      try {
        if (type === "product") {
          const products = await refreshProducts();
          if (!products) throw new Error("The product list refresh was superseded. Reload the CMS before continuing.");
          const productRow = products.find((item) => item.product_slug === key);
          if (productRow?.draft_product || productRow?.published_product) {
            chooseProduct(productRow, true);
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
          const savedSettings = await refreshSettings();
          if (!savedSettings) throw new Error("The settings refresh was superseded. Reload the CMS before continuing.");
          const settingRow = savedSettings.find((item) => item.setting_key === key);
          if (settingKey === key) {
            const nextJson = settingRow?.draft_value || settingRow?.published_value || "{}";
            settingBaseline.current = { key, json: nextJson };
            setSettingJson(nextJson);
          }
        }
        await loadHistory(type, key);
      } catch (refreshError) {
        if (type === "setting") setSettingsReady(false);
        setError(`Draft V${data.deletedVersion} was deleted successfully, but the editor/list could not be refreshed (${refreshError.message}). Reload the CMS before continuing.`);
      }
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusy(false);
    }
  }
  function getFilteredMediaHistory() {
    return mediaHistory.filter((entry) => {
      const changes = entry.metadata?.changes || {};
      if (mediaHistoryFilter === "lifecycle") return ["archive_media", "restore_media"].includes(entry.action);
      if (mediaHistoryFilter === "filename") return Boolean(changes.original_file_name);
      if (mediaHistoryFilter === "alt") return Boolean(changes.alt_text);
      return true;
    });
  }

  function exportMediaHistoryReport() {
    const entries = getFilteredMediaHistory();
    if (!entries.length) {
      setError("There are no history entries in the selected filter to export.");
      return;
    }
    const rows = [["media_id", "changed_at", "administrator", "event_or_field", "previous_value", "new_value_or_details"]];
    for (const entry of entries) {
      const changes = Object.entries(entry.metadata?.changes || {});
      if (!changes.length) {
        rows.push([mediaHistoryId, entry.createdAt || "", entry.actorEmail || "", entry.action || "media_event", "", JSON.stringify(entry.metadata || {})]);
        continue;
      }
      for (const [field, change] of changes) {
        if (mediaHistoryFilter === "filename" && field !== "original_file_name") continue;
        if (mediaHistoryFilter === "alt" && field !== "alt_text") continue;
        rows.push([mediaHistoryId, entry.createdAt || "", entry.actorEmail || "", field, change.before ?? "", change.after ?? ""]);
      }
    }
    const cell = (value) => {
      let text = value == null ? "" : String(value);
      if (/^\\s*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const csv = rows.map((row) => row.map(cell).join(",")).join("\\r\\n");
    const blob = new Blob(["\\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `yr-proservice-media-history-${mediaHistoryId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${rows.length - 1} metadata change row(s) for this media item.`);
  }

  async function inspectMediaHistory(item) {
    if (!item?.id) return;
    if (mediaHistoryId === item.id) {
      mediaHistoryRequestId.current += 1;
      setMediaHistoryId("");
      setMediaHistory([]);
      setMediaHistoryLoading(false);
      return;
    }
    const requestId = ++mediaHistoryRequestId.current;
    setMediaHistoryId(item.id);
    setMediaHistory([]);
    setMediaHistoryLoading(true);
    try {
      const includeArchived = item.deleted_at ? "&includeDeleted=1" : "";
      const data = await api(`/api/cms/admin/media?id=${encodeURIComponent(item.id)}${includeArchived}&history=1`);
      if (requestId === mediaHistoryRequestId.current) setMediaHistory(data.history || []);
    } catch (historyError) {
      if (requestId === mediaHistoryRequestId.current) {
        setError(historyError.message);
        setMediaHistoryId("");
      }
    } finally {
      if (requestId === mediaHistoryRequestId.current) setMediaHistoryLoading(false);
    }
  }

  async function inspectMediaUsage(item, forceRefresh = false) {
    if (!item?.id) return;
    if (!forceRefresh && mediaUsageId === item.id && mediaUsage) {
      mediaUsageRequestId.current += 1;
      setMediaUsage(null);
      setMediaUsageId("");
      setMediaUsageLoading(false);
      return;
    }
    const requestId = ++mediaUsageRequestId.current;
    setMediaUsageId(item.id);
    setMediaUsage(null);
    setMediaUsageLoading(true);
    try {
      const includeArchived = item.deleted_at ? "&includeDeleted=1" : "";
      const data = await api("/api/cms/admin/media?id=" + encodeURIComponent(item.id) + includeArchived);
      if (requestId === mediaUsageRequestId.current) {
        setMediaUsage(data.usage || { groups: { pages: [], products: [], settings: [] }, total: 0 });
      }
    } catch (usageError) {
      if (requestId === mediaUsageRequestId.current) {
        setError(usageError.message);
        setMediaUsageId("");
      }
    } finally {
      if (requestId === mediaUsageRequestId.current) setMediaUsageLoading(false);
    }
  }

  function openMediaReferenceEditor(group, reference) {
    if (!reference?.key) return;

    if (group === "products") {
      const row = items.find((item) => item.product_slug === reference.key);
      if (!row) {
        setError(`Product "${reference.key}" is not in the currently loaded product list. Refresh the CMS before editing it.`);
        return;
      }
      if (!changeManagerTab("products")) return;
      chooseProduct(row);
      setNotice(`Opened the current editor for ${reference.title || reference.key}. This does not rewrite historical revisions.`);
      return;
    }

    if (group === "settings") {
      const row = settings.find((item) => item.setting_key === reference.key);
      if (!row) {
        setError(`Setting "${reference.key}" is not in the currently loaded settings list. Refresh the CMS before editing it.`);
        return;
      }
      if (hasUnsavedSettingChanges && !window.confirm("Discard the unsaved settings edits and open this referenced setting?")) return;
      if (tab !== "settings" && !changeManagerTab("settings")) return;
      const nextJson = row.draft_value || row.published_value || "{}";
      settingBaseline.current = { key: row.setting_key, json: nextJson };
      setSettingKey(row.setting_key);
      setSettingJson(nextJson);
      setNotice(`Opened the current editor for ${reference.key}. This does not rewrite historical revisions.`);
      return;
    }

    if (group === "pages") {
      window.open("/admin/cms", "_blank", "noopener,noreferrer");
      setNotice(`Opened the Visual Editor. Select page "${reference.title || reference.key}" to review its current content. Historical revisions are not changed.`);
    }
  }
  function exportMediaIntegrityReport() {
    if (!media.length) {
      setError("There are no loaded media records to export.");
      return;
    }
    const columns = [
      "media_id", "archive_status", "storage_provider", "object_key", "public_url",
      "original_file_name", "mime_type", "byte_size", "width", "height", "alt_text",
      "created_at", "deleted_at", "metadata_warning_count", "metadata_warnings",
      "r2_check_status", "r2_checked_at", "r2_check_detail",
    ];
    const csvCell = (value) => {
      let text = value == null ? "" : String(value);
      if (/^[\\s]*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const rows = media.map((item) => {
      const warnings = getMediaIntegrityIssues(item);
      const storage = mediaStorageChecks[item.id] || {};
      return [
        item.id,
        item.deleted_at ? "archived" : "active",
        item.storage_provider,
        item.object_key,
        item.public_url,
        item.original_file_name,
        item.mime_type,
        item.byte_size,
        item.width,
        item.height,
        item.alt_text,
        item.created_at,
        item.deleted_at,
        warnings.length,
        warnings.join("; "),
        storage.status || "not-checked",
        storage.checkedAt || "",
        storage.detail || "",
      ];
    });
    const csv = [columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `yr-proservice-media-integrity-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setNotice(`Exported ${media.length} loaded media record(s). The report does not modify CMS data.`);
  }

  function getMediaIntegrityPriority(item) {
    const issues = getMediaIntegrityIssues(item);
    if (!issues.length) return "clean";
    const critical = ["Unknown storage provider", "Missing object key", "R2 key is outside the CMS upload prefix", "Public URL is invalid", "Public URL is not HTTPS", "Public URL contains credentials"];
    if (issues.some((issue) => critical.includes(issue))) return "critical";
    const descriptive = ["Missing original filename", "Missing alt text"];
    if (issues.every((issue) => descriptive.includes(issue))) return "descriptive";
    return "metadata";
  }

  function getMediaIntegrityIssues(item) {
    const issues = [];
    const provider = String(item.storage_provider || "").toLowerCase();
    const objectKey = String(item.object_key || "");
    const publicUrl = String(item.public_url || "");
    if (!["r2", "static"].includes(provider)) issues.push("Unknown storage provider");
    if (!objectKey.trim()) issues.push("Missing object key");
    if (provider === "r2" && objectKey && !objectKey.startsWith("cms/")) issues.push("R2 key is outside the CMS upload prefix");
    try {
      const parsed = new URL(publicUrl);
      if (parsed.protocol !== "https:") issues.push("Public URL is not HTTPS");
      if (parsed.username || parsed.password) issues.push("Public URL contains credentials");
      if (parsed.hash) issues.push("Public URL contains a fragment");
    } catch {
      issues.push("Public URL is invalid");
    }
    if (!String(item.original_file_name || "").trim()) issues.push("Missing original filename");
    if (!String(item.alt_text || "").trim()) issues.push("Missing alt text");
    if (!String(item.mime_type || "").startsWith("image/")) issues.push("MIME type is not an image");
    if (!Number.isFinite(Number(item.byte_size)) || Number(item.byte_size) <= 0) issues.push("Invalid file size");
    const width = item.width == null ? null : Number(item.width);
    const height = item.height == null ? null : Number(item.height);
    if ((width == null) !== (height == null) || (width != null && (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0))) {
      issues.push("Image dimensions are incomplete or invalid");
    }
    return issues;
  }

  async function checkMediaStorage(item) {
    if (!item?.id || mediaStorageCheckingId) return;
    setMediaStorageCheckingId(item.id);
    setError("");
    try {
      const includeArchived = item.deleted_at ? "&includeDeleted=1" : "";
      const data = await api(`/api/cms/admin/media?id=${encodeURIComponent(item.id)}${includeArchived}&checkStorage=1`);
      setMediaStorageChecks((current) => ({ ...current, [item.id]: data.storageCheck || { status: "unavailable", detail: "No storage result was returned." } }));
    } catch (checkError) {
      setMediaStorageChecks((current) => ({ ...current, [item.id]: { status: "unavailable", detail: checkError.message, checkedAt: new Date().toISOString() } }));
      setError(checkError.message);
    } finally {
      setMediaStorageCheckingId("");
    }
  }

  async function scanMediaOrphans(continueScan = false) {
    if (mediaOrphanScanning || !storageReady) return;
    setMediaOrphanScanning(true);
    setError("");
    try {
      const cursor = continueScan ? mediaOrphanCursor : "";
      const suffix = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
      const data = await api(`/api/cms/admin/media?reconcileOrphans=1${suffix}`);
      setMediaOrphanReport((current) => ({
        scanned: (continueScan ? current?.scanned || 0 : 0) + Number(data.scanned || 0),
        batches: (continueScan ? current?.batches || 0 : 0) + 1,
        orphanObjects: [...(continueScan ? current?.orphanObjects || [] : []), ...(data.orphanObjects || [])],
        truncated: Boolean(data.truncated),
      }));
      setMediaOrphanCursor(data.nextCursor || "");
    } catch (scanError) {
      setError(scanError.message);
    } finally {
      setMediaOrphanScanning(false);
    }
  }

  async function saveMediaDescriptiveMetadata(item) {
    if (!item?.id || busy || item.deleted_at) return;
    const altText = mediaAltDrafts[item.id] ?? item.alt_text ?? "";
    const originalFileName = mediaFilenameDrafts[item.id] ?? item.original_file_name ?? "";
    if (!originalFileName.trim()) {
      setError("Enter an original filename before saving.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api(`/api/cms/admin/media?id=${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ altText, originalFileName }),
      });
      setMedia((current) => current.map((row) => row.id === item.id ? data.media : row));
      setMediaAltDrafts((current) => { const next = { ...current }; delete next[item.id]; return next; });
      setMediaFilenameDrafts((current) => { const next = { ...current }; delete next[item.id]; return next; });
      setNotice(data.changed === false
        ? "No metadata changes detected; nothing was added to the history."
        : "Filename and alt text saved and recorded in the media audit history. Storage identifiers and content references were not changed.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }

  async function inspectCurrentProductImageUsage() {
    const item = media.find((row) => row.public_url === currentProductImage);
    if (!item) return;
    if (!changeManagerTab("media")) return;
    await inspectMediaUsage(item, true);
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
      try {
        await refreshMedia();
      } catch (refreshError) {
        setError(`Media uploaded successfully, but the library could not be refreshed (${refreshError.message}). Reload the Media Library before continuing.`);
      }
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
    const item = media.find((row) => row.id === id);
    if (!item) {
      setError("This media record is no longer in the loaded library. Refresh the Media Library before archiving it.");
      return;
    }
    const hasUnsavedMetadata =
      (mediaAltDrafts[id] ?? item.alt_text ?? "") !== (item.alt_text ?? "") ||
      (mediaFilenameDrafts[id] ?? item.original_file_name ?? "") !== (item.original_file_name ?? "");
    if (hasUnsavedMetadata) {
      setError("Save or revert this image's unsaved filename and alt-text edits before archiving it. The archive action has not been started.");
      return;
    }
    const confirmed = window.confirm(
      "Move this image to Archived media? Its Preview storage object will be retained so it can be restored. Referenced content and revision history will still block this action."
    );
    if (!confirmed) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api(
        `/api/cms/admin/media?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      mediaUsageRequestId.current += 1;
      setMediaUsageId("");
      setMediaUsage(null);
      setNotice(data.auditRecorded === false
        ? "Media archived and retained for recovery, but its archive event could not be added to the audit history."
        : "Media archived. Its stored image is retained and the archive event was recorded.");
      try {
        await refreshMedia();
      } catch (refreshError) {
        setError(`Media was archived successfully, but the library could not be refreshed (${refreshError.message}). Reload the Media Library before continuing.`);
      }
    } catch (removeError) {
      if (removeError.status === 409 && removeError.data?.usage) {
        setMediaUsageId(id);
        setMediaUsage(removeError.data.usage);
        setNotice("Removal blocked. The saved-reference report is open below the media item.");
      }
      setError(removeError.message);
    } finally {
      setBusy(false);
    }
  }
  async function restoreMedia(id) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = await api(`/api/cms/admin/media?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "restore" }),
      });
      setNotice(data.auditRecorded === false
        ? "Media restored to the active library, but its recovery event could not be added to the audit history."
        : "Media restored to the active library and the recovery event was recorded.");
      try {
        await refreshMedia();
      } catch (refreshError) {
        setError(`Media was restored successfully, but the library could not be refreshed (${refreshError.message}). Reload the Media Library before continuing.`);
      }
    } catch (restoreError) {
      setError(restoreError.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveSetting() {
    if (busy) return;
    if (!settingsReady) {
      setError("Load the current settings successfully before saving. Reload the CMS and try again; no settings draft has been changed.");
      return;
    }

    let value;

    try {
      value = JSON.parse(settingJson);
    } catch {
      setError("Setting value must be valid JSON.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const data = await api("/api/cms/admin/settings", {
        method: "POST",
        body: JSON.stringify({
          key: settingKey,
          value,
        }),
      });

      settingBaseline.current = { key: settingKey, json: settingJson };
      setNotice(`Settings draft V${data.version} saved.`);
      try {
        await refreshSettings();
      } catch (refreshError) {
        setSettingsReady(false);
        setError(`Settings draft V${data.version} was saved successfully, but the settings list could not be refreshed (${refreshError.message}). Reload the CMS before continuing.`);
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setBusy(false);
    }
  }
  async function publishSetting(row) {
    if (!row?.setting_key || !row?.draft_id || busy) return;
    if (!settingsReady) {
      setError("Load the current settings successfully before publishing a settings draft.");
      return;
    }
    if (row.setting_key === settingKey && !areJsonValuesEqual(settingJson, row.draft_value || "{}")) {
      setError("Save the current settings edits before publishing. The previously saved draft has not been published.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

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
      try {
        await refreshSettings();
      } catch (refreshError) {
        setSettingsReady(false);
        setError(`Setting "${row.setting_key}" was published to Preview successfully, but the settings list could not be refreshed (${refreshError.message}). Reload the CMS before continuing.`);
      }
    } catch (publishError) {
      setError(publishError.message);
    } finally {
      setBusy(false);
    }
  }
  const mediaSearchTerm = mediaSearch.trim().toLocaleLowerCase();
  const visibleMedia = media.filter((item) => {
    const matchesIntegrity = mediaIntegrityFilter === "all" || getMediaIntegrityPriority(item) === mediaIntegrityFilter;
    const searchable = [item.original_file_name, item.alt_text, item.object_key, item.public_url, item.mime_type, item.id]
      .filter(Boolean).join(" ").toLocaleLowerCase();
    return matchesIntegrity && (!mediaSearchTerm || searchable.includes(mediaSearchTerm));
  });
  const settingImageReferences = media.filter((item) => settingJson.includes(item.public_url));
  const hasUnsavedSettingChanges =
    settingKey !== settingBaseline.current.key ||
    !areJsonValuesEqual(settingJson, settingBaseline.current.json) ||
    settings.some((row) =>
      row.setting_key === settingKey && row.draft_id
        && !areJsonValuesEqual(settingJson, row.draft_value || "{}")
    );
  const mediaMetadataDraftIds = new Set([
    ...Object.keys(mediaAltDrafts),
    ...Object.keys(mediaFilenameDrafts),
  ]);
  const hasUnsavedMediaMetadataChanges = [...mediaMetadataDraftIds].some((id) => {
    const item = media.find((row) => row.id === id);
    // Keep a conservative warning if a locally edited record is no longer in
    // the currently loaded (capped or filtered) media result.
    if (!item) return true;
    return (
      (mediaAltDrafts[id] ?? item.alt_text ?? "") !== (item.alt_text ?? "") ||
      (mediaFilenameDrafts[id] ?? item.original_file_name ?? "") !== (item.original_file_name ?? "")
    );
  });

  const allowUnloadAfterConfirm = useRef(false);
  function confirmCurrentTabLeave() {
    if (
      tab === "settings" &&
      hasUnsavedSettingChanges &&
      !window.confirm("Discard the unsaved settings edits and leave the Settings editor?")
    ) return false;
    if (
      tab === "media" &&
      hasUnsavedMediaMetadataChanges &&
      !window.confirm("Discard the unsaved media filename or alt-text edits and leave the Media Library?")
    ) return false;
    if (
      tab === "products" &&
      selected &&
      selected.savedJson !== json &&
      !window.confirm("Discard the unsaved product edits and leave the Product editor?")
    ) return false;
    const activeDesignKeys = VISUAL_DESIGN_KEYS_BY_TAB[tab] || [];
    if (
      activeDesignKeys.some((key) => visualDesignUnsaved[key]) &&
      !window.confirm("Discard the unsaved page design edits and leave this page workspace?")
    ) return false;
    if (
      tab === "services" &&
      servicesHaveUnsavedChanges &&
      !window.confirm("Discard the unsaved Services edits and leave the Services editor?")
    ) return false;
    if (
      tab === "team" &&
      teamHaveUnsavedChanges &&
      !window.confirm("Discard the unsaved Team edits and leave the Team editor?")
    ) return false;
    return true;
  }

  useEffect(() => {
    const hasUnsavedCurrentTabChanges =
      (tab === "settings" && hasUnsavedSettingChanges) ||
      (tab === "media" && hasUnsavedMediaMetadataChanges) ||
      (tab === "products" && Boolean(selected) && selected.savedJson !== json) ||
      (visualDesignKeysByTab[tab] || []).some((key) => visualDesignUnsaved[key]) ||
      (tab === "services" && servicesHaveUnsavedChanges) ||
      (tab === "team" && teamHaveUnsavedChanges);
    if (!hasUnsavedCurrentTabChanges) return undefined;
    const warnBeforeUnload = (event) => {
      if (allowUnloadAfterConfirm.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [
    tab,
    hasUnsavedSettingChanges,
    hasUnsavedMediaMetadataChanges,
    selected?.savedJson,
    json,
    visualDesignUnsaved,
    servicesHaveUnsavedChanges,
    teamHaveUnsavedChanges,
  ]);

  function handleManagerExit(event) {
    if (!confirmCurrentTabLeave()) {
      event.preventDefault();
      return;
    }
    allowUnloadAfterConfirm.current = true;
  }

  function changeManagerTab(nextTab) {
    if (nextTab === tab) return true;
    if (!confirmCurrentTabLeave()) return false;
    setTab(nextTab);
    return true;
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
        <a className="admin-secondary-button" href="/admin/cms/design-review" onClick={handleManagerExit}>
          Review all pages together
        </a>
        <a className="admin-public-link" href="/admin/cms" onClick={handleManagerExit}>← Visual Editor</a>
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
            if (!changeManagerTab(id)) return;
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
            disabled={busy || !productsReady}
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
                disabled={!productsReady || busy}
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
        <button className="admin-secondary-button" onClick={()=>chooseProduct(null)} disabled={!productsReady || busy}>＋ Add product</button>
      </section>
      <section className="cms-manager-panel">
        <h2>{selected?.slug?"Edit product":"Product editor"}</h2>
        <p>Structured fields edit only the chosen values. Specifications, documents, image paths, and unexposed product metadata are preserved when saving. {selected?.draftId ? `You are editing draft V${selected.version}; published content remains unchanged until you publish to Preview.` : selected?.slug ? "No saved draft is loaded. The editor starts from the published product; save your changes as a new draft before publishing to Preview." : "New product content remains a draft until you explicitly publish it to Preview."}</p>
        <ProductFormEditor key={editorSelection} json={json} onJsonChange={setJson} slugLocked={Boolean(selected&&!selected.isNew)} media={media} onInspectMedia={(item) => { if (changeManagerTab("media")) inspectMediaUsage(item, true); }}/>
        <div className="cms-manager-actions">
          <button className="admin-primary-button" disabled={busy||!productsReady||!selected} onClick={saveProduct}>Save product draft</button>
          <button className="admin-secondary-button" disabled={busy||!productsReady||!selected?.draftId} onClick={publishProduct}>Publish to Preview</button>
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
        <PageVisualDesignManager key="products" pageKey="products" onUnsavedChange={reportVisualDesignUnsaved} />
      </details>
      <details className="cms-page-design-accordion">
        <summary>Product details · Visual Design Studio</summary>
        <PageVisualDesignManager key="product-detail" pageKey="product-detail" onUnsavedChange={reportVisualDesignUnsaved} />
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
            if (!changeManagerTab(id)) return;
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
                  onClick={() => changeManagerTab("media")}
                >
                  Open Media Library
                </button>
              </div>
              {currentProductImage && media.some((item) => item.public_url === currentProductImage) && (
                <button type="button" className="admin-secondary-button" onClick={inspectCurrentProductImageUsage}>
                  View where this product image is used
                </button>
              )}
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
                disabled={busy || !selected?.draftId || selected.savedJson !== json}
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
            <PageVisualDesignManager key="products" pageKey="products" onUnsavedChange={reportVisualDesignUnsaved} />
          </details>
          <details className="cms-page-design-accordion">
            <summary>Product details · Visual Design Studio</summary>
            <PageVisualDesignManager key="product-detail" pageKey="product-detail" onUnsavedChange={reportVisualDesignUnsaved} />
          </details>
        </section>
      </>
    )}
    {tab === "services" && (
      <section className="cms-manager-panel">
        <ServicesManager onUnsavedChange={setServicesHaveUnsavedChanges} />
        <details className="cms-page-design-accordion">
          <summary>Service details page · Visual Design Studio</summary>
          <PageVisualDesignManager key="service-detail" pageKey="service-detail" onUnsavedChange={reportVisualDesignUnsaved} />
        </details>
      </section>
    )}
    {tab==="team"&&<section className="cms-manager-panel"><TeamManager onUnsavedChange={setTeamHaveUnsavedChanges} /></section>}
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
        <div className="cms-media-archive-toggle">
          <label>
            <input
              type="checkbox"
              checked={mediaIncludeArchived}
              disabled={busy}
              onChange={async (event) => {
                const includeArchived = event.target.checked;
                setMediaIncludeArchived(includeArchived);
                const requestId = ++mediaListRequestId.current;
                mediaUsageRequestId.current += 1;
                setMediaUsageLoading(false);
                setMediaUsageId("");
                setMediaUsage(null);
                setError("");
                try {
                  const data = await api("/api/cms/admin/media" + (includeArchived ? "?includeDeleted=1" : ""));
                  if (requestId !== mediaListRequestId.current) return;
                  setMedia(data.media || []);
                  setStorageReady(Boolean(data.storageReady));
                } catch (loadError) {
                  if (requestId !== mediaListRequestId.current) return;
                  setMediaIncludeArchived(!includeArchived);
                  setError(loadError.message || "Unable to change the archived-media view. The previous media list remains loaded.");
                }
              }}
            />
            Show archived media
          </label>
        </div>
        <section className="cms-media-overview" aria-label="Media administration overview">
          <div className="cms-media-overview-heading">
            <div>
              <h3>Media operations overview</h3>
              <p>A consolidated snapshot of the currently loaded library and checks performed in this session.</p>
            </div>
            <span>{media.length} loaded · maximum 300 records</span>
          </div>
          <div className="cms-media-overview-grid" aria-live="polite">
            <article>
              <strong>Storage health</strong>
              <div className="cms-media-overview-values">
                <span><b>{media.filter((item) => mediaStorageChecks[item.id]?.status === "available").length}</b> present</span>
                <span><b>{media.filter((item) => mediaStorageChecks[item.id]?.status === "missing").length}</b> missing</span>
                <span><b>{media.filter((item) => !["available", "missing"].includes(mediaStorageChecks[item.id]?.status)).length}</b> unchecked / unavailable</span>
              </div>
              <small>Only records checked with the on-demand R2 action are verified. Unchecked does not mean missing.</small>
            </article>
            <article>
              <strong>Metadata integrity</strong>
              <div className="cms-media-overview-values">
                <span><b>{media.filter((item) => getMediaIntegrityPriority(item) === "critical").length}</b> critical</span>
                <span><b>{media.filter((item) => getMediaIntegrityPriority(item) === "metadata").length}</b> metadata</span>
                <span><b>{media.filter((item) => getMediaIntegrityPriority(item) === "descriptive").length}</b> descriptive</span>
                <span><b>{media.filter((item) => getMediaIntegrityPriority(item) === "clean").length}</b> clean</span>
              </div>
              <small>Checks cover stored metadata and URL syntax, not public URL reachability.</small>
            </article>
            <article>
              <strong>Archive and recovery</strong>
              <div className="cms-media-overview-values">
                <span><b>{media.filter((item) => !item.deleted_at).length}</b> active</span>
                <span><b>{media.filter((item) => Boolean(item.deleted_at)).length}</b> archived in this view</span>
              </div>
              <small>Archived records remain recoverable through Restore on each archived media card, subject to the stored object being available.</small>
            </article>
            <article>
              <strong>Orphan scan</strong>
              <div className="cms-media-overview-values">
                <span><b>{mediaOrphanReport ? mediaOrphanReport.scanned : "—"}</b> objects inspected</span>
                <span><b>{mediaOrphanReport ? mediaOrphanReport.orphanObjects.length : "—"}</b> possible orphans</span>
              </div>
              <small>{mediaOrphanScanning ? "A Preview R2 scan is currently running." : !mediaOrphanReport ? "No scan has been run in this session." : mediaOrphanReport.truncated ? "Partial scan; more batches remain." : "The cms/ prefix scan reached its end."}</small>
            </article>
            <article>
              <strong>Media activity history</strong>
              <div className="cms-media-overview-values">
                <span><b>{mediaHistoryId ? mediaHistory.length : "—"}</b> events loaded</span>
                <span><b>{mediaHistoryId ? "1" : "0"}</b> selected item</span>
              </div>
              <small>{mediaHistoryId ? "History shown for the selected media item only; maximum 50 events." : "Choose View change history on a media card to load that item's latest events."}</small>
            </article>
          </div>
          <p className="cms-media-overview-scope">Scope note: library and integrity totals reflect only the records loaded in the current active / archived view (up to 300). Archive totals are not a complete archive inventory unless all relevant records are in this view. Orphan results are session-only and cover inspected batches under <code>cms/</code> only. No objects are deleted or modified by these reports.</p>
          <div className="cms-media-report-actions">
            <span>Export includes the records currently loaded here (maximum 300), including archived records only when “Show archived media” is enabled.</span>
            <button type="button" className="admin-secondary-button" disabled={!media.length} onClick={exportMediaIntegrityReport}>Export metadata report (CSV)</button>
          </div>
          <section className="cms-media-orphan-report">
            <div>
              <strong>Orphaned R2 object review</strong>
              <p>Inspect the Preview bucket's <code>cms/</code> upload prefix in batches of up to 100 objects. An orphan is an object key with no matching R2 media record in D1.</p>
            </div>
            <button className="admin-secondary-button" disabled={!storageReady || mediaOrphanScanning} onClick={() => scanMediaOrphans(false)}>
              {mediaOrphanScanning ? "Scanning Preview R2…" : "Start read-only scan"}
            </button>
            {mediaOrphanReport && (
              <div className="cms-media-orphan-results">
                <p>{mediaOrphanReport.scanned} objects inspected across {mediaOrphanReport.batches} batch(es) · {mediaOrphanReport.orphanObjects.length} possible orphan(s)</p>
                {mediaOrphanReport.orphanObjects.length === 0
                  ? <small>No unreferenced objects were found in the batches inspected so far.</small>
                  : mediaOrphanReport.orphanObjects.map((object) => (
                    <div key={object.key}><strong>{object.key}</strong><small>{Math.round((object.size || 0) / 1024)} KB · {object.uploaded ? new Date(object.uploaded).toLocaleString() : "Upload time unavailable"}</small></div>
                  ))}
                {mediaOrphanReport.truncated
                  ? <button className="admin-secondary-button" disabled={mediaOrphanScanning} onClick={() => scanMediaOrphans(true)}>{mediaOrphanScanning ? "Scanning…" : "Scan next batch"}</button>
                  : <small>End of bucket prefix reached for this scan.</small>}
              </div>
            )}
            <small>This is a read-only, partial report until every batch is scanned. No objects are deleted or modified. Objects outside <code>cms/</code> are not included.</small>
          </section>
        </section>
        <div className="cms-media-search">
          <label htmlFor="cms-media-search-input">Find media</label>
          <div>
            <input
              id="cms-media-search-input"
              type="search"
              value={mediaSearch}
              onChange={(event) => setMediaSearch(event.target.value)}
              placeholder="Search filename, alt text, file type or storage key"
              autoComplete="off"
            />
            {mediaSearch && <button type="button" className="admin-secondary-button" onClick={() => setMediaSearch("")}>Clear search</button>}
          </div>
          <small>Showing {visibleMedia.length} of {media.length} loaded record(s). Search is local to the currently loaded library (maximum 300 records).</small>
        </div>
        <div className="cms-media-integrity-filter">
          <label htmlFor="cms-media-integrity-filter">Prioritise media records</label>
          <select id="cms-media-integrity-filter" value={mediaIntegrityFilter} onChange={(event) => setMediaIntegrityFilter(event.target.value)}>
            <option value="all">All loaded records ({media.length})</option>
            <option value="critical">Critical storage / URL issues ({media.filter((item) => getMediaIntegrityPriority(item) === "critical").length})</option>
            <option value="metadata">Other metadata issues ({media.filter((item) => getMediaIntegrityPriority(item) === "metadata").length})</option>
            <option value="descriptive">Descriptive follow-up ({media.filter((item) => getMediaIntegrityPriority(item) === "descriptive").length})</option>
            <option value="clean">No metadata warnings ({media.filter((item) => getMediaIntegrityPriority(item) === "clean").length})</option>
          </select>
        </div>
        <h3>{mediaIncludeArchived ? "Preview media · Active and archived" : "Uploaded Preview media"}</h3>
        <div className="cms-media-grid">
          {visibleMedia.map((item) => (
            <article key={item.id}>
              <img src={item.public_url} alt={item.alt_text || item.original_file_name} />
              {item.deleted_at && <strong className="cms-media-archived-label">Archived · {item.deleted_at}</strong>}
              <strong>{item.original_file_name}</strong>
              <small>{Math.round(item.byte_size / 1024)} KB · {item.mime_type}</small>
              {getMediaIntegrityIssues(item).length > 0 && (
                <div className="cms-media-integrity-warnings">
                  <strong>Metadata warnings ({getMediaIntegrityIssues(item).length})</strong>
                  <ul>{getMediaIntegrityIssues(item).map((issue) => <li key={issue}>{issue}</li>)}</ul>
                </div>
              )}
              <button className="admin-secondary-button" type="button" onClick={() => inspectMediaHistory(item)} disabled={mediaHistoryLoading && mediaHistoryId === item.id}>
                {mediaHistoryLoading && mediaHistoryId === item.id ? "Loading history…" : mediaHistoryId === item.id ? "Hide change history" : "View change history"}
              </button>
              {mediaHistoryId === item.id && (
                <div className="cms-media-history">
                  <strong>Media activity history · {mediaHistory.length} recorded event(s), maximum 50</strong>
                  <div className="cms-media-history-tools">
                    <label>Show changes
                      <select value={mediaHistoryFilter} onChange={(event) => setMediaHistoryFilter(event.target.value)}>
                        <option value="all">All media activity</option>
                        <option value="filename">Filename changes</option>
                        <option value="alt">Alt-text changes</option>
                        <option value="lifecycle">Archive / restore events</option>
                      </select>
                    </label>
                    <button className="admin-secondary-button" type="button" onClick={exportMediaHistoryReport} disabled={!getFilteredMediaHistory().length}>Export filtered history (CSV)</button>
                  </div>
                  <small>{getFilteredMediaHistory().length} event(s) match this filter. Events are listed newest first.</small>
                  {getFilteredMediaHistory().length ? getFilteredMediaHistory().map((entry) => (
                    <article key={entry.id}>
                      <small>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "Time unavailable"} · {entry.actorEmail || "Administrator identity unavailable"} · {(entry.action || "media change").replace(/_/g, " ")}</small>
                      {Object.entries(entry.metadata?.changes || {}).map(([field, change]) => (
                        <p key={field}><b>{field === "original_file_name" ? "Original filename" : field === "alt_text" ? "Alt text" : field}</b><span>Before: {change.before || "—"}</span><span>After: {change.after || "—"}</span></p>
                      ))}
                    </article>
                  )) : <small>No recorded metadata changes match this filter for this media item.</small>}
                  <small>History is read-only. It does not include changes made before audit logging was introduced.</small>
                </div>
              )}
              <button className="admin-secondary-button" disabled={Boolean(mediaStorageCheckingId)} onClick={() => checkMediaStorage(item)}>
                {mediaStorageCheckingId === item.id ? "Checking R2…" : "Check storage"}
              </button>
              {mediaStorageChecks[item.id] && (
                <small className={`cms-media-storage-status is-${mediaStorageChecks[item.id].status}`}>
                  Storage: {mediaStorageChecks[item.id].status === "available" ? "Object present in Preview R2" : mediaStorageChecks[item.id].status === "missing" ? "Object missing from Preview R2" : mediaStorageChecks[item.id].status === "not-managed" ? "Not managed by Preview R2" : "Unable to verify"}
                  {mediaStorageChecks[item.id].checkedAt ? ` · ${new Date(mediaStorageChecks[item.id].checkedAt).toLocaleString()}` : ""}
                  {mediaStorageChecks[item.id].detail ? ` · ${mediaStorageChecks[item.id].detail}` : ""}
                </small>
              )}
              {!item.deleted_at && <div className="cms-media-descriptive-editor">
                <label>Original filename
                  <input
                    maxLength={255}
                    value={mediaFilenameDrafts[item.id] ?? item.original_file_name ?? ""}
                    onChange={(event) => setMediaFilenameDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                    placeholder="Enter the correct filename"
                  />
                </label>
                <label className="cms-media-alt-editor">Alt text
                  <input
                    maxLength={300}
                    value={mediaAltDrafts[item.id] ?? item.alt_text ?? ""}
                    onChange={(event) => setMediaAltDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                    placeholder="Describe the image for accessibility"
                  />
                </label>
                <button
                  className="admin-secondary-button"
                  disabled={busy || ((mediaAltDrafts[item.id] ?? item.alt_text ?? "") === (item.alt_text ?? "") && (mediaFilenameDrafts[item.id] ?? item.original_file_name ?? "") === (item.original_file_name ?? ""))}
                  onClick={() => saveMediaDescriptiveMetadata(item)}
                >Save descriptive metadata</button>
              </div>}
              <button className="admin-secondary-button" disabled={mediaUsageLoading && mediaUsageId === item.id} onClick={() => inspectMediaUsage(item)}>
                {mediaUsageLoading && mediaUsageId === item.id ? "Checking usage…" : mediaUsageId === item.id && mediaUsage ? "Hide usage" : "View usage"}
              </button>
              {mediaUsageId === item.id && mediaUsage && (
                <div className="cms-media-usage">
                  <strong>{mediaUsage.total ? "URL text appears in " + mediaUsage.total + " saved revision(s)" : "No saved CMS URL-text matches found"}</strong>
                  {mediaUsage.truncated && <small>Some results may be omitted; each group is limited to 50 revisions.</small>}
                  {["pages", "products", "settings"].map((group) => (
                    <div key={group}>
                      <b>{(group === "pages" ? "Pages" : group === "products" ? "Products" : "Settings") + " (" + (mediaUsage.counts?.[group] ?? mediaUsage.groups?.[group]?.length ?? 0) + ")"}</b>
                      {mediaUsage.groups?.[group]?.length ? (
                        <ul>{mediaUsage.groups[group].map((reference) => (
                          <li key={reference.key + "-" + reference.version + "-" + reference.state}>
                            <div className="cms-media-reference-heading">
                              <span>{reference.title || reference.key}</span>
                              <small>{reference.key} · V{reference.version} · Saved revision: {reference.state}</small>
                            </div>
                            {reference.references?.length > 0 && (
                              <small className="cms-media-reference-paths">{group === "pages" ? "Content field" : group === "products" ? "Content field" : "Setting field"}{reference.references.length === 1 ? "" : "s"}: {reference.references.join(", ")}</small>
                            )}
                            <button
                              type="button"
                              className="admin-secondary-button cms-media-reference-open"
                              onClick={() => openMediaReferenceEditor(group, reference)}
                            >
                              {group === "pages" ? "Open Visual Editor" : group === "products" ? "Open current product editor" : "Open current setting editor"}
                            </button>
                          </li>
                        ))}</ul>
                      ) : <small>None found</small>}
                    </div>
                  ))}
                  {mediaUsage.total > 0 && (
                    <div className="cms-media-reference-safety">
                      <strong>Replacement guidance</strong>
                      <small>Use the editor link beside a reference to review the current draft or published content. Select a replacement image there, then save a new draft and publish to Preview only when ready.</small>
                      <small>Each result is a saved revision, not necessarily the current live record. Opening an editor does not edit that exact historical revision. Historical references remain protected and will continue to block archiving while they exist.</small>
                      <small>Counts use a conservative URL-text search across saved revisions. Exact field paths are listed for displayed records only when a stored string exactly matches this media URL. {mediaUsage.truncated ? "The report is a partial sample: up to 50 revisions per content group are displayed, while the counts include all URL-text matches." : "All URL-text matches are represented in this report."}</small>
                    </div>
                  )}
                </div>
              )}
              <button
                className="admin-secondary-button"
                onClick={() => navigator.clipboard?.writeText(item.public_url)}
              >
                Copy URL
              </button>
              {item.deleted_at ? (
                <button className="admin-primary-button" disabled={busy || !storageReady} onClick={() => restoreMedia(item.id)}>
                  Restore media
                </button>
              ) : (
                <button className="admin-secondary-button" disabled={busy} onClick={() => removeMedia(item.id)}>
                  Archive media
                </button>
              )}
            </article>
          ))}
        </div>
        {visibleMedia.length === 0 && (
          <p className="admin-empty">{media.length ? "No media records match the current search and integrity filter." : "No Preview media records are loaded yet."}</p>
        )}
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
                      disabled={busy || (row.setting_key === settingKey && hasUnsavedSettingChanges)}
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
                    if (hasUnsavedSettingChanges && !window.confirm("Discard the unsaved settings edits and open this saved setting?")) return;
                    const nextJson = row.draft_value || row.published_value || "{}";
                    settingBaseline.current = { key: row.setting_key, json: nextJson };
                    setSettingKey(row.setting_key);
                    setSettingJson(nextJson);
                    setError("");
                    setNotice("");
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
              <small>Changing the key is an unsaved editor change. Save creates a draft under the new key.</small>
            </label>
            <textarea
              className="cms-json-editor"
              rows={18}
              value={settingJson}
              onChange={(event) => setSettingJson(event.target.value)}
            />
            {hasUnsavedSettingChanges && (
              <p className="admin-alert admin-alert-warning" role="status">
                Unsaved settings edits · save a new draft before publishing this setting.
              </p>
            )}
            {settingImageReferences.length > 0 && (
              <section className="cms-setting-image-references">
                <strong>Uploaded images referenced by this setting ({settingImageReferences.length})</strong>
                <p>These image URLs appear in the setting JSON currently open in this editor. Selecting an item opens its saved-reference report; changing this JSON does not update other settings or historical revisions.</p>
                {settingImageReferences.map((item) => (
                  <div key={item.id}>
                    <img src={item.public_url} alt={item.alt_text || item.original_file_name} />
                    <span>{item.original_file_name}</span>
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={() => { if (changeManagerTab("media")) inspectMediaUsage(item, true); }}
                    >
                      Inspect references
                    </button>
                  </div>
                ))}
              </section>
            )}
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
            <PageVisualDesignManager key="site-chrome" pageKey="site-chrome" onUnsavedChange={reportVisualDesignUnsaved} />
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
        <PageVisualDesignManager key="cart" pageKey="cart" onUnsavedChange={reportVisualDesignUnsaved} />
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
        <PageVisualDesignManager key="dental-chair-request" pageKey="dental-chair-request" onUnsavedChange={reportVisualDesignUnsaved} />
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
        <PageVisualDesignManager key="quote" pageKey="quote" onUnsavedChange={reportVisualDesignUnsaved} />
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
        <PageVisualDesignManager key="service-request" pageKey="service-request" onUnsavedChange={reportVisualDesignUnsaved} />
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
        <PageVisualDesignManager key="track-request" pageKey="track-request" onUnsavedChange={reportVisualDesignUnsaved} />
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
