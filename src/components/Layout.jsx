import React, { useState } from "react";
import { useCart } from "./CartContext";
import { useChairRequests } from "./ChairRequestContext";
import { services } from "../data/services";

export function Link({ to, children, className = "", navigate, onClick }) {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        if (navigate) {
          event.preventDefault();
          navigate(to);
        }
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}

function ServicesMenu({ navigate, path }) {
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

export function SiteHeader({ path, navigate }) {
  const { cartCount } = useCart();
  const { count: chairCount } = useChairRequests();
  const requestCount = cartCount + chairCount;
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

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
          <Link
            to="/products"
            navigate={navigate}
            className={path.startsWith("/products") ? "active" : ""}
          >
            Products
          </Link>
          <ServicesMenu navigate={navigate} path={path} />
          <Link
            to="/team"
            navigate={navigate}
            className={path === "/team" ? "active" : ""}
          >
            Team
          </Link>
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
            <Link to="/products" navigate={navigate} onClick={closeMobile}>
              Products
            </Link>
            <div className="mobile-nav-group">
              <span>Services</span>
              {services.map((service) => (
                <Link
                  key={service.slug}
                  to={`/services/${service.slug}`}
                  navigate={navigate}
                  onClick={closeMobile}
                >
                  {service.title}
                </Link>
              ))}
            </div>
            <Link to="/team" navigate={navigate} onClick={closeMobile}>
              Team
            </Link>
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
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h3>YR Proservice</h3>
          <p>Dental equipment, installation, repair and technical support.</p>
        </div>
        <div>
          <h4>Quick Links</h4>
          <Link to="/products" navigate={navigate}>
            Products
          </Link>
          <Link to="/services" navigate={navigate}>
            Services
          </Link>
          <Link to="/team" navigate={navigate}>
            Team
          </Link>
          <Link to="/track-request" navigate={navigate}>
            Track My Request
          </Link>
        </div>
        <div>
          <h4>Contact Us</h4>
          <a className="footer-contact-phone" href="tel:+601116080623">
            011-1608 0623
          </a>
          <a href="mailto:yr.proservice@gmail.com">yr.proservice@gmail.com</a>
        </div>
      </div>
      <div className="container footer-bottom">
        © {new Date().getFullYear()} YR Proservice Sdn Bhd. All rights reserved.
      </div>
    </footer>
  );
}
