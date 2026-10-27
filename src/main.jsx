import React, { useEffect, useState } from "react";
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
};

function Router() {
  const [path, setPath] = useState(window.location.pathname);

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

  function navigate(to) {
    window.history.pushState({}, "", to);
    // Keep route matching separate from query parameters (e.g. /service-request?service=...).
    setPath(window.location.pathname);
    window.scrollTo(0, 0);
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
    "/admin": <AdminDashboard />,
  };

  const serviceMatch = path.match(/^\/services\/([^/]+)$/);
  const servicePage = serviceMatch
    ? services.find((service) => service.slug === serviceMatch[1])
    : null;

  const productMatch = path.match(/^\/products\/([^/]+)$/);
  const productPage = productMatch
    ? products.find((product) => product.slug === productMatch[1])
    : null;
  const isAdminRoute = path === "/admin";

  return (
    <>
      {!isAdminRoute && <SiteHeader path={path} navigate={navigate} />}
      <main>
        <div key={path} className={isAdminRoute ? "" : "page-transition"}>
          {routes[path] ||
            (servicePage ? (
              <ServiceDetails service={servicePage} navigate={navigate} />
            ) : productPage ? (
              <ProductDetails product={productPage} navigate={navigate} />
            ) : (
              <NotFound navigate={navigate} />
            ))}
        </div>
      </main>
      {!isAdminRoute && <SiteFooter navigate={navigate} />}
    </>
  );
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
