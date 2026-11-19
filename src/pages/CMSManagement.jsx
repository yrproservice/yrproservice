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
  const [mediaReady, setMediaReady] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
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
    if (isActive()) {
      setMediaReady(false);
      setMediaLoading(true);
    }
    try {
      const data = await api("/api/cms/admin/media" + (mediaIncludeArchived ? "?includeDeleted=1" : ""));
      if (!isActive() || requestId !== mediaListRequestId.current) return;

      setMedia(data.media || []);
      setStorageReady(Boolean(data.storageReady));
      setMediaReady(true);
    } catch (loadError) {
      if (isActive() && requestId === mediaListRequestId.current) setMediaReady(false);
      throw loadError;
    } finally {
      if (isActive() && requestId === mediaListRequestId.current) setMediaLoading(false);
    }
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
    if (busy && !confirmedDiscard) return;
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
    let rawProduct;
    try {
      rawProduct = row
        ? JSON.parse(row.draft_product || row.published_product || "{}")
        : blankProduct();
    } catch {
      setError("This product's saved draft or published data is malformed. The current editor selection was kept unchanged; recover a valid revision before editing this product.");
      return;
    }
    if (!rawProduct || typeof rawProduct !== "object" || Array.isArray(rawProduct)) {
      setError("This product's saved data is not a valid product object. The current editor selection was kept unchanged; recover a valid revision before editing this product.");
      return;
    }
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
    if (busy) return;
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

    if (!product || typeof product !== "object" || Array.isArray(product)) {
      setError("Product data must be a JSON object.");
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