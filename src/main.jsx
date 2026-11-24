import React, { lazy, Suspense, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CartProvider, useCart } from "./components/CartContext";
import { ChairRequestProvider, useChairRequests } from "./components/ChairRequestContext";
import { SiteHeader, SiteFooter, Link } from "./components/Layout";
// Load route modules on demand so the public entry bundle does not include
// every customer page and the private Admin/CMS workspace.
const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const Services = lazy(() => import("./pages/Services"));
const Team = lazy(() => import("./pages/Team"));
const Cart = lazy(() => import("./pages/Cart"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Quote = lazy(() => import("./pages/Quote"));
const DentalChairRequest = lazy(() => import("./pages/DentalChairRequest"));
const ServiceDetails = lazy(() => import("./pages/ServiceDetails"));
const ServiceRequest = lazy(() => import("./pages/ServiceRequest"));
const TrackRequest = lazy(() => import("./pages/TrackRequest"));
const Contact = lazy(() => import("./pages/Contact"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const CMSDashboard = lazy(() => import("./pages/CMSDashboard"));
const CMSPagePreview = lazy(() => import("./pages/CMSPagePreview"));
const CMSProductPreview = lazy(() => import("./pages/CMSProductPreview"));
const CMSManagement = lazy(() => import("./pages/CMSManagement"));
const CMSDesignPreview = lazy(() => import("./pages/CMSDesignPreview"));
const CMSDesignReview = lazy(() => import("./pages/CMSDesignReview"));
import PageDesignScope from "./components/PageDesignScope";
import AccessChoice from "./pages/AccessChoice";
const AdminEntry = lazy(() => import("./pages/AdminEntry"));
import { services } from "./data/services";
import { products } from "./data/products";
import { mergePublishedProduct } from "./data/productImages";
import GenericCmsRenderer from "./components/GenericCmsRenderer";
import "./style.css";

const pageTitles = {
  "/": "YR Proservice | Dental Equipment and Service",
  "/products": "Products | YR Proservice",
  "/services": "Services | YR Proservice",
  "/team": "Our Team | YR Proservice",
  "/cart": "Product Cart | YR Proservice",
  "/quote": "Request a Quotation | YR Proservice",
  "/dental-chair-request": "Dental Chair Request | YR Proservice",
  "/service-request": "Request a Service | YR Proservice",
  "/track-request": "Track a Request | YR Proservice",
  "/contact": "HR Enquiries | YR Proservice",
  "/admin": "Request Dashboard | YR Proservice",
  "/admin/cms": "Visual CMS | YR Proservice",
  "/admin/cms/preview": "CMS Draft Preview | YR Proservice",
  "/admin/cms/product-preview": "CMS Product Preview | YR Proservice",
  "/admin/cms/manage": "CMS Management Centre | YR Proservice",
  "/admin/cms/design-preview": "CMS Visual Design Preview | YR Proservice",
  "/admin/cms/design-review": "All Page Design Review | YR Proservice",
};

function Router() {
  const {
    migrationReady,
    migrationError,
    retryLegacyChairMigration,
    cartStorageError,
    retryCartPersistence,
  } = useCart();
  const {
    storageError: chairStorageError,
    retryChairPersistence,
  } = useChairRequests();
  const [path, setPath] = useState(window.location.pathname);
  const [cmsPage, setCmsPage] = useState(null);
  const [cmsPageLoading, setCmsPageLoading] = useState(false);
  const [accessMode, setAccessMode] = useState(() => {
    const savedMode = sessionStorage.getItem("yrproservice-access-mode");
    const isAdminEntryRoute = window.location.pathname === "/admin"
      && new URLSearchParams(window.location.search).get("entry") === "1";
    // Admin workspaces and preview tabs may open in a new tab where
    // sessionStorage is not shared. Re-verify the Cloudflare Access identity
    // instead of assuming that a missing tab flag means the user is signed out.
    if (window.location.pathname.startsWith("/admin") && !isAdminEntryRoute) return "verifying";
    if (!window.location.pathname.startsWith("/admin")) return "client";
    return savedMode === "admin" ? "verifying" : "choose";
  });
  const [accessMessage, setAccessMessage] = useState("");

  useEffect(() => {
    if (accessMode !== "verifying") return undefined;
    let active = true;
    fetch("/api/admin/session", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.ok) {
          throw new Error(result.error || "Your administrator session could not be verified.");
        }
        if (active) setAccessMode("admin");
      })
      .catch(() => {
        if (!active) return;
        sessionStorage.removeItem("yrproservice-access-mode");
        setAccessMessage("Your admin session could not be verified. Choose Admin to sign in again.");
        setAccessMode("choose");
      });
    return () => { active = false; };
  }, [accessMode]);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    const builtInRoute = [
      "/", "/products", "/services", "/team", "/cart", "/quote",
      "/dental-chair-request", "/service-request", "/track-request", "/contact",
    ].includes(path) || path.startsWith("/admin") ||
      path.startsWith("/products/") || path.startsWith("/services/");
    setCmsPage(null);
    if (builtInRoute) {
      setCmsPageLoading(false);
      return () => { active = false; };
    }
    setCmsPageLoading(true);
    fetch("/api/cms/public/pages?route=" + encodeURIComponent(path), { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (response.status === 404) return null;
        if (!response.ok || !result.ok) throw new Error(result.error || "Unable to load this page.");
        return result.page || null;
      })
      .then((page) => { if (active) setCmsPage(page); })
      .catch(() => { if (active) setCmsPage(null); })
      .finally(() => { if (active) setCmsPageLoading(false); });
    return () => { active = false; };
  }, [path]);

  useEffect(() => {
    const serviceSlug = path.match(/^\/services\/([^/]+)$/)?.[1];
    const service = services.find((item) => item.slug === serviceSlug);
    const productSlug = path.match(/^\/products\/([^/]+)$/)?.[1];
    const product = products.find((item) => item.slug === productSlug);
    document.title = service
      ? `${service.title} | YR Proservice`
      : product
        ? `${product.name} | YR Proservice`
        : cmsPage?.route === path
          ? `${cmsPage.title} | YR Proservice`
          : (pageTitles[path] ?? "Page Not Found | YR Proservice");
  }, [path, cmsPage]);

  function navigate(to) {
    window.history.pushState({}, "", to);
    // Keep route matching separate from query parameters (e.g. /service-request?service=...).
    setPath(window.location.pathname);
    window.scrollTo(0, 0);
  }

  function chooseClient() {
    sessionStorage.setItem("yrproservice-access-mode", "client");
    setAccessMessage("");
    setAccessMode("client");
  }

  const adminEntry = path === "/admin" && new URLSearchParams(window.location.search).get("entry") === "1";
  function handleAdminAuthenticated() {
    sessionStorage.setItem("yrproservice-access-mode", "admin");
    setAccessMessage("");
    setAccessMode("admin");
    navigate("/");
  }

  async function handleAdminLogout() {
    let logoutError = "";
    try {
      const response = await fetch("/api/admin/session", {
        method: "DELETE",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) logoutError = result.error || "The server could not confirm logout.";
    } catch {
      logoutError = "The server could not be reached to confirm logout. Please try again.";
    }
    sessionStorage.removeItem("yrproservice-access-mode");
    setAccessMessage(logoutError || "Admin workspace closed. Your Cloudflare Access session remains active in this browser.");
    setAccessMode("choose");
    if (window.location.pathname !== "/") navigate("/");
  }

  const routes = {
    "/": <Home navigate={navigate} />,
    "/products": <Products navigate={navigate} />,
    "/services": <Services navigate={navigate} />,
    "/team": <Team navigate={navigate} />,
    "/cart": <Cart navigate={navigate} />,
    "/quote": <Quote navigate={navigate} />,
    "/dental-chair-request": <DentalChairRequest navigate={navigate} />,
    "/service-request": <ServiceRequest navigate={navigate} />,
    "/track-request": <TrackRequest navigate={navigate} />,
    "/contact": <Contact navigate={navigate} />,
    "/admin": adminEntry
      ? (
          <AdminEntry
            onAuthenticated={handleAdminAuthenticated}
            onCancel={() => {
              sessionStorage.setItem("yrproservice-access-mode", "client");
              setAccessMode("client");
              window.history.replaceState({}, "", "/");
              setPath("/");
            }}
          />
        )
      : <AdminDashboard />,
    "/admin/cms": <CMSDashboard onAdminLogout={handleAdminLogout} />,
    "/admin/cms/preview": <CMSPagePreview />,
    "/admin/cms/product-preview": <CMSProductPreview />,
    "/admin/cms/manage": <CMSManagement />,
    "/admin/cms/design-preview": <CMSDesignPreview />,
    "/admin/cms/design-review": <CMSDesignReview />,
  };

  const serviceMatch = path.match(/^\/services\/([^/]+)$/);
  const servicePage = serviceMatch
    ? services.find((service) => service.slug === serviceMatch[1]) || { slug: serviceMatch[1] }
    : null;

  const productMatch = path.match(/^\/products\/([^/]+)$/);
  const productPage = productMatch
    ? products.find((product) => product.slug === productMatch[1]) || { slug: productMatch[1] }
    : null;
  const isAdminRoute = path.startsWith("/admin");
  const pageDesignKey = path === "/" ? "home"
    : path === "/products" ? "products"
    : path.match(/^\/products\/[^/]+$/) ? "product-detail"
    : path === "/services" ? "services"
    : path.match(/^\/services\/[^/]+$/) ? "service-detail"
    : path === "/team" ? "team"
    : path === "/cart" ? "cart"
    : path === "/dental-chair-request" ? "dental-chair-request"
    : path === "/quote" ? "quote"
    : path === "/service-request" ? "service-request"
    : path === "/track-request" ? "track-request"
    : path === "/contact" ? "contact" : "";
  const routeContent = routes[path] ||
    (servicePage ? (
      <ServiceDetails service={servicePage} navigate={navigate} />
    ) : productPage ? (
      <ProductRoute product={productPage} navigate={navigate} />
    ) : cmsPage?.route === path ? (
      <GenericCmsRenderer content={cmsPage.content} navigate={navigate} />
    ) : cmsPageLoading ? (
      <section className="page-section container center" role="status"><p>Loading page…</p></section>
    ) : (
      <NotFound navigate={navigate} />
    ));
  const publicContent = accessMode === "client" || accessMode === "admin"
    ? routeContent
    : <AccessChoice
        onClient={chooseClient}
        onAdmin={() => window.location.assign("/admin?entry=1")}
        checking={accessMode === "verifying"}
        message={accessMessage}
      />;

  return (
    <>
      {!isAdminRoute && (accessMode === "client" || accessMode === "admin") && (
        <PageDesignScope pageKey="site-chrome">
          <SiteHeader
            path={path}
            navigate={navigate}
            isAdmin={accessMode === "admin"}
            onAdminLogout={handleAdminLogout}
          />
        </PageDesignScope>
      )}
      {isAdminRoute && accessMode === "admin" && path !== "/admin/cms" && (
        <div className="admin-session-utility">
          <span>Admin access active</span>
          <button type="button" onClick={handleAdminLogout}>Exit Admin workspace</button>
        </div>
      )}
      {path !== "/cart" && path !== "/dental-chair-request" && (!migrationReady || migrationError) && (
        <div className="container bp-chair-note" role="alert">
          <p>{migrationError || "Saved chair requests are being moved to their separate list. Cart changes are paused until this finishes."}</p>
          <button type="button" onClick={retryLegacyChairMigration}>Retry safe storage migration</button>
        </div>
      )}
      {path !== "/cart" && path !== "/dental-chair-request" && cartStorageError && (
        <div className="container bp-chair-note" role="alert">
          <p>{cartStorageError}</p>
          <button type="button" onClick={retryCartPersistence}>Retry saving product cart</button>
        </div>
      )}
      {path !== "/cart" && path !== "/dental-chair-request" && chairStorageError && (
        <div className="container bp-chair-note" role="alert">
          <p>{chairStorageError}</p>
          <button type="button" onClick={retryChairPersistence}>Retry saving chair requests</button>
        </div>
      )}
      <main>
        <div key={path} className={isAdminRoute ? "" : "page-transition"}>
          <Suspense fallback={<section className="page-section container center" role="status" aria-live="polite"><p>Loading page…</p></section>}>
            {isAdminRoute
              ? adminEntry
                ? routeContent
                : accessMode === "admin"
                  ? routeContent
                  : <AccessChoice
                      onClient={chooseClient}
                      onAdmin={() => window.location.assign("/admin?entry=1")}
                      checking={accessMode === "verifying"}
                      message={accessMessage}
                    />
              : accessMode === "client" || accessMode === "admin"
                ? (!pageDesignKey ? routeContent : <PageDesignScope pageKey={pageDesignKey}>{routeContent}</PageDesignScope>)
                : publicContent}
          </Suspense>
        </div>
      </main>
      {!isAdminRoute && (accessMode === "client" || accessMode === "admin") && <PageDesignScope pageKey="site-chrome"><SiteFooter navigate={navigate} /></PageDesignScope>}
    </>
  );
}

function ProductRoute({ product: fallbackProduct, navigate }) {
  const [product, setProduct] = useState(fallbackProduct);
  const [loading, setLoading] = useState(!fallbackProduct.name);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/cms/public/products?slug=" + encodeURIComponent(fallbackProduct.slug), { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (response.status === 410 || data?.archived) return { ...data, archived: true };
        return response.ok ? data : null;
      })
      .then((data) => {
        if (!active) return;
        if (data?.ok && data.product) setProduct(mergePublishedProduct(fallbackProduct, data.product));
        else if (data?.archived || !fallbackProduct.name) setMissing(true);
      })
      .catch(() => { if (active && !fallbackProduct.name) setMissing(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [fallbackProduct.slug]);
  if (loading) return <section className="page-section container center"><p>Loading product…</p></section>;
  if (missing) return <NotFound navigate={navigate} />;
  return <ProductDetails product={product} navigate={navigate} />;
}

function NotFound({ navigate }) {
  return (
    <section className="page-section container center">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <button className="button" onClick={() => navigate("/")}>
        Back to Home
      </button>
    </section>
  );
}

function App() {
  return (
    <CartProvider>
      <ChairRequestProvider>
        <Router />
      </ChairRequestProvider>
    </CartProvider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
