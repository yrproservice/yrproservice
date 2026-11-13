import React, { useEffect, useState } from "react";
import { useCart } from "./CartContext";
import { useChairRequests } from "./ChairRequestContext";
import { services as fallbackServices } from "../data/services";
import { getServicesCmsContent } from "../data/servicesCmsTemplate";

export function Link({ to, children, className = "", navigate, onClick }) {
  const value = typeof to === "string" ? to.trim() : "";
  const internal = safeInternalRoute(value);
  const external = /^(https:\/\/|mailto:|tel:)/i.test(value);
  const href = internal || (external ? value : "#");
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (navigate && internal) {
          event.preventDefault();
          navigate(internal);
        }
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}

function AdminMenu({ navigate, onLogout }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className={`nav-dropdown ${open ? "open" : ""}`} onMouseLeave={close}>
      <button
        type="button"
        className="nav-dropdown-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Admin <span aria-hidden="true">⌄</span>
      </button>
      <div className="nav-dropdown-menu">
        <div className="nav-dropdown-list">
          <Link to="/admin" onClick={close}>Request Dashboard</Link>
          <Link to="/admin/cms" onClick={close}>Visual CMS</Link>
          <Link to="/admin/cms/manage" onClick={close}>Management Centre</Link>
          <button type="button" className="admin-menu-logout" onClick={() => { close(); onLogout?.(); }}>Log out</button>
        </div>
      </div>
    </div>
  );
}

function ServicesMenu({ navigate, path, services }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`nav-dropdown ${open ? "open" : ""}`}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={`nav-dropdown-trigger ${path.startsWith("/services") ? "active" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        Services <span aria-hidden="true">⌄</span>
      </button>
      <div className="nav-dropdown-menu">
        <Link
          to="/services"
          navigate={navigate}
          className="nav-dropdown-feature"
          onClick={() => setOpen(false)}
        >
          <strong>Our Services</strong>
          <span>
            Installation, maintenance, relocation and technical support.
          </span>
        </Link>
        <div className="nav-dropdown-list">
          {services.map((service) => (
            <Link
              key={service.slug}
              to={`/services/${service.slug}`}
              navigate={navigate}
              onClick={() => setOpen(false)}
            >
              <span>{service.number}</span>
              {service.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function safeInternalRoute(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "";
}

export function SiteHeader({ path, navigate, isAdmin = false, onAdminLogout }) {
  const { cartCount } = useCart();
  const { count: chairCount } = useChairRequests();
  const requestCount = cartCount + chairCount;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [serviceItems, setServiceItems] = useState(fallbackServices);
  const [navigationSettings, setNavigationSettings] = useState(null);
  useEffect(() => {
    let active = true;
    fetch("/api/cms/public/settings?key=site.navigation", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active && result?.ok && result.setting?.value && typeof result.setting.value === "object") {
          setNavigationSettings(result.setting.value);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    fetch("/api/cms/public/pages?key=services", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!active || !result?.ok) return;
        const page = getServicesCmsContent(result.page?.content);
        if (page?.listing?.items?.length) setServiceItems(page.listing.items);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const closeMobile = () => setMobileOpen(false);
  const defaultNavigation = [
    { label: "Products", url: "/products" },
    { label: "Services", url: "/services", type: "services" },
    { label: "Team", url: "/team" },
    { label: "HR Contact", url: "/contact" },
  ];
  const navigationItems = Array.isArray(navigationSettings?.items) && navigationSettings.items.length
    ? navigationSettings.items
    : defaultNavigation;
  const renderDesktopNavigationItem = (item, index) => {
    const url = safeInternalRoute(item?.url || item?.href);
    const label = typeof item?.label === "string" ? item.label.trim() : "";
    if (!url || !label || item?.visible === false) return null;
    if (item.type === "services" || url === "/services") {
      return <ServicesMenu key={item.id || url || index} navigate={navigate} path={path} services={serviceItems} />;
    }
    return <Link key={item.id || url || index} to={url} navigate={navigate} className={path === url || (url !== "/" && path.startsWith(url + "/")) ? "active" : ""}>{label}</Link>;
  };
  const renderMobileNavigationItem = (item, index) => {
    const url = safeInternalRoute(item?.url || item?.href);
    const label = typeof item?.label === "string" ? item.label.trim() : "";
    if (!url || !label || item?.visible === false) return null;
    if (item.type === "services" || url === "/services") {
      return <div className="mobile-nav-group" key={item.id || url || index}>
        <Link to="/services" navigate={navigate} onClick={closeMobile}>{label}</Link>
        {serviceItems.map((service) => <Link key={service.slug} to={`/services/${service.slug}`} navigate={navigate} onClick={closeMobile}>{service.title}</Link>)}
      </div>;
    }
    return <Link key={item.id || url || index} to={url} navigate={navigate} onClick={closeMobile}>{label}</Link>;
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link
          to="/"
          navigate={navigate}
          className="brand"
          aria-label="YR Proservice home"
        >
          <img
            className="brand-logo"
            src="/YR%20LOGO.jpg"
            alt="YR Proservice Sdn Bhd"
          />
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {navigationItems.map(renderDesktopNavigationItem)}
          {isAdmin && <AdminMenu navigate={navigate} onLogout={onAdminLogout} />}
        </nav>
        <div className="header-actions">
          <Link
            to="/cart"
            navigate={navigate}
            className="cart-link"
            aria-label="Open quotation cart"
          >
            Cart {requestCount > 0 && <span>{requestCount}</span>}
          </Link>
          <button
            type="button"
            className="mobile-menu-button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="mobile-nav">
          <div className="container">
            {navigationItems.map(renderMobileNavigationItem)}
            {isAdmin && (
              <div className="mobile-nav-group">
                <span>Admin</span>
                <Link to="/admin" onClick={closeMobile}>Request Dashboard</Link>
                <Link to="/admin/cms" onClick={closeMobile}>Visual CMS</Link>
                <Link to="/admin/cms/manage" onClick={closeMobile}>Management Centre</Link>
                <button type="button" className="admin-menu-logout" onClick={() => { closeMobile(); onAdminLogout?.(); }}>Log out</button>
              </div>
            )}
            <Link to="/cart" navigate={navigate} onClick={closeMobile}>
              Quotation Cart {requestCount > 0 && <b>{requestCount}</b>}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter({ navigate }) {
  const [footerSettings, setFooterSettings] = useState(null);
  useEffect(() => {
    let active = true;
    fetch("/api/cms/public/settings?key=site.footer", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active && result?.ok && result.setting?.value && typeof result.setting.value === "object") {
          setFooterSettings(result.setting.value);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  const footer = footerSettings || {};
  const defaultLinks = [
    { label: "Products", url: "/products" },
    { label: "Services", url: "/services" },
    { label: "Team", url: "/team" },
    { label: "Track My Request", url: "/track-request" },
    { label: "HR Enquiries", url: "/contact" },
  ];
  const links = Array.isArray(footer.links) ? footer.links : defaultLinks;
  const companyName = typeof footer.companyName === "string" ? footer.companyName : "YR Proservice";
  const description = typeof footer.description === "string" ? footer.description : "Dental equipment, installation, repair and technical support.";
  const phone = typeof footer.contactPhone === "string" ? footer.contactPhone : "011-1608 0623";
  const phoneHref = typeof footer.contactPhoneHref === "string" && footer.contactPhoneHref.startsWith("tel:") ? footer.contactPhoneHref : "tel:+601116080623";
  const email = typeof footer.contactEmail === "string" ? footer.contactEmail : "yr.proservice@gmail.com";
  const copyright = typeof footer.copyright === "string" ? footer.copyright : "All rights reserved.";
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h3>{companyName}</h3>
          <p>{description}</p>
        </div>
        <div>
          <h4>Quick Links</h4>
          {links.filter((item) => item && typeof item.label === "string" && typeof item.url === "string").map((item, index) => {
            const internal = safeInternalRoute(item.url);
            const external = /^(https:\/\/|mailto:|tel:)/i.test(item.url);
            if (internal) return <Link key={item.id || item.url || index} to={internal} navigate={navigate}>{item.label}</Link>;
            if (external) return <a key={item.id || item.url || index} href={item.url} rel={item.url.startsWith("https://") ? "noopener noreferrer" : undefined}>{item.label}</a>;
            return null;
          })}
        </div>
        <div>
          <h4>Contact Us</h4>
          <a className="footer-contact-phone" href={phoneHref}>{phone}</a>
          <a href={`mailto:${email}`}>{email}</a>
        </div>
      </div>
      <div className="container footer-bottom">
        © {new Date().getFullYear()} {companyName} {copyright}
      </div>
    </footer>
  );
}
