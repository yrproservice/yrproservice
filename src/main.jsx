import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { CartProvider, useCart } from "./components/CartContext";
import { ChairRequestProvider } from "./components/ChairRequestContext";
import { SiteHeader, SiteFooter, Link } from "./components/Layout";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Services from "./pages/Services";
import Team from "./pages/Team";
import Cart from "./pages/Cart";
import ProductDetails from "./pages/ProductDetails";
import Quote from "./pages/Quote";
import DentalChairRequest from "./pages/DentalChairRequest";
import ServiceDetails from "./pages/ServiceDetails";
import ServiceRequest from "./pages/ServiceRequest";
import TrackRequest from "./pages/TrackRequest";
import AdminDashboard from "./pages/AdminDashboard";
import CMSDashboard from "./pages/CMSDashboard";
import CMSPagePreview from "./pages/CMSPagePreview";\nimport CMSProductPreview from "./pages/CMSProductPreview";
import CMSManagement from "./pages/CMSManagement";
import CMSDesignPreview from "./pages/CMSDesignPreview";
import CMSDesignReview from "./pages/CMSDesignReview";
import PageDesignScope from "./components/PageDesignScope";
import AccessChoice from "./pages/AccessChoice";
import AdminEntry from "./pages/AdminEntry";
import { services } from "./data/services";
import { products } from "./data/products";
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
  "/admin": "Request Dashboard | YR Proservice",
  "/admin/cms": "Visual CMS | YR Proservice",
  "/admin/cms/preview": "CMS Draft Preview | YR Proservice",
  "/admin/cms/product-preview": "CMS Product Preview | YR Proservice",\n  "/admin/cms/product-preview": "CMS Product Preview | YR Proservice",
  "/admin/cms/manage": "CMS Management Centre | YR Proservice",
  "/admin/cms/design-preview": "CMS Visual Design Preview | YR Proservice",
  "/admin/cms/design-review": "All Page Design Review | YR Proservice",
};

function Router() {
  const [path, setPath] = useState(window.location.pathname);
  const [accessMode, setAccessMode] = useState(() => {
    const savedMode = sessionStorage.getItem("yrproservice-access-mode");
    const isAdminEntryRoute = window.location.pathname === "/admin"
      && new URLSearchParams(window.location.search).get("entry") === "1";
    // Admin workspaces and preview tabs may open in a new tab where
    // sessionStorage is not shared. Re-verify the HttpOnly server session
    // instead of assuming that a missing tab flag means the user is signed out.
    if (window.location.pathname.startsWith("/admin") && !isAdminEntryRoute) return "verifying";
    return savedMode === "client" ? "client" : savedMode === "admin" ? "verifying" : "choose";
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
    if (accessMode !== "admin") return undefined;
    const heartbeat = async () => {
      try {
        const response = await fetch("/api/admin/session", {
          method: "PATCH",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (response.status === 401 || response.status === 409) {
          sessionStorage.removeItem("yrproservice-access-mode");
          setAccessMessage("Your Admin session ended or was taken over. Choose Admin to sign in again.");
          setAccessMode("choose");
        }
      } catch {
        // A transient network failure does not immediately discard the UI.
        // The server-side lock expires automatically if heartbeats stop.
      }
    };
    const interval = window.setInterval(heartbeat, 30000);
    return () => window.clearInterval(interval);
  }, [accessMode]);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const serviceSlug = path.match(/^\/services\/([^/]+)$/)?.[1];
    const service = services.find((item) => item.slug === serviceSlug);
    const productSlug = path.match(/^\/products\/([^/]+)$/)?.[1];
    const product = products.find((item) => item.slug === productSlug);
    document.title = service
      ? `${service.title} | YR Proservice`
      : product
        ? `${product.name} | YR Proservice`
        : (pageTitles[path] ?? "Page Not Found | YR Proservice");
  }, [path]);

  const navigate = useCallback((to) => {
    window.history.pushState({}, "", to);
    // Keep route matching separate from query parameters (e.g. /service-request?service=...).
    setPath(window.location.pathname);
    window.scrollTo(0, 0);
  }, []);

  function chooseClient() {
    sessionStorage.setItem("yrproservice-access-mode", "client");
    setAccessMessage("");
    setAccessMode("client");
  }

  const adminEntry = path === "/admin" && new URLSearchParams(window.location.search).get("entry") === "1";
  const handleAdminAuthenticated = useCallback(() => {
    sessionStorage.setItem("yrproservice-access-mode", "admin");
    setAccessMessage("");
    setAccessMode("admin");
    navigate("/");
  }, [navigate]);

  const handleAdminLogout = useCallback(async () => {
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
      logoutError = "The server could not be reached. The Admin lock will expire automatically within 90 seconds.";
    }
    sessionStorage.removeItem("yrproservice-access-mode");
    setAccessMessage(logoutError || "You have logged out of Admin.");
    setAccessMode("choose");
    if (window.location.pathname !== "/") navigate("/");
  }, [navigate]);

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
    "/admin": adminEntry
      ? <AdminEntry onAuthenticated={handleAdminAuthenticated} onCancel={() => { window.history.replaceState({}, "", "/"); setPath("/"); }} />
      : <AdminDashboard />,
    "/admin/cms": <CMSDashboard />,
    "/admin/cms/preview": <CMSPagePreview />,
    "/admin/cms/product-preview": <CMSProductPreview />,\n    "/admin/cms/product-preview": <CMSProductPreview />,
    "/admin/cms/manage": <CMSManagement />,
    "/admin/cms/design-preview": <CMSDesignPreview />,
    "/admin/cms/design-review": <CMSDesignReview />,
  };

  const serviceMatch = path.match(/^\/services\/([^/]+)$/);
  const servicePage = serviceMatch
    ? services.find((service) => service.slug === serviceMatch[1])
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
    : path === "/track-request" ? "track-request" : "";
  const routeContent = routes[path] ||
    (servicePage ? (
      <ServiceDetails service={servicePage} navigate={navigate} />
    ) : productPage ? (
      <ProductRoute product={productPage} navigate={navigate} />
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
      {!isAdminRoute && (accessMode === "client" || accessMode === "admin") && <PageDesignScope pageKey="site-chrome"><SiteHeader path={path} navigate={navigate} isAdmin={accessMode === "admin"} onAdminLogout={handleAdminLogout} /></PageDesignScope>}
      {isAdminRoute && accessMode === "admin" && (
        <div className="admin-session-utility">
          <span>Admin session active</span>
          <button type="button" onClick={handleAdminLogout}>Log out</button>
        </div>
      )}
      <main>
        <div key={path} className={isAdminRoute ? "" : "page-transition"}>
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
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!active) return;
        if (data?.ok && data.product) setProduct(data.product);
        else if (!fallbackProduct.name) setMissing(true);
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
