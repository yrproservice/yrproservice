import test from "node:test";
import assert from "node:assert/strict";
import { validateSiteSetting } from "../functions/_utils/cms-settings-validation.js";

test("valid site navigation settings allow the existing Services dropdown marker", () => {
  assert.equal(validateSiteSetting("site.navigation", {
    items: [
      { label: "Products", url: "/products" },
      { label: "Services", url: "/services", type: "services" },
      { label: "Team", url: "/team" },
      { label: "HR Contact", url: "/contact" },
    ],
  }), null);
});

test("navigation rejects empty, malformed and entirely hidden menus", () => {
  assert.match(validateSiteSetting("site.navigation", { items: [] }), /1–12 items/);
  assert.match(validateSiteSetting("site.navigation", { items: [{ label: "Products", url: "https://example.com" }] }), /safe internal URL/);
  assert.match(validateSiteSetting("site.navigation", { items: [{ label: "Products", url: "/products", visible: false }] }), /at least one/i);
  assert.match(validateSiteSetting("site.navigation", { items: [{ label: "Products", url: "//evil.example" }] }), /safe internal URL/);
  assert.match(validateSiteSetting("site.navigation", { items: [{ label: "Products", url: "/products?redirect=x" }] }), /safe internal URL/);
});

test("navigation limits item count, label length and Services type values", () => {
  assert.match(validateSiteSetting("site.navigation", { items: Array.from({ length: 13 }, (_, i) => ({ label: String(i), url: "/p" + i })) }), /1–12 items/);
  assert.match(validateSiteSetting("site.navigation", { items: [{ label: "x".repeat(61), url: "/products" }] }), /1–12 items/);
  assert.match(validateSiteSetting("site.navigation", { items: [{ label: "Services", url: "/services", type: "external" }] }), /1–12 items/);
});

test("valid footer settings accept internal links, telephone href and contact email", () => {
  assert.equal(validateSiteSetting("site.footer", {
    companyName: "YR Proservice",
    description: "Dental equipment and support.",
    links: [{ label: "Products", url: "/products" }],
    contactPhone: "011-1608 0623",
    contactPhoneHref: "tel:+601116080623",
    contactEmail: "yr.proservice@gmail.com",
    copyright: "All rights reserved.",
  }), null);
});

test("footer rejects external links, unsafe phone hrefs and malformed emails", () => {
  assert.match(validateSiteSetting("site.footer", { links: [{ label: "External", url: "https://example.com" }] }), /safe internal URL/);
  assert.match(validateSiteSetting("site.footer", { contactPhoneHref: "javascript:alert(1)" }), /tel:/);
  assert.match(validateSiteSetting("site.footer", { contactEmail: "not-an-email" }), /valid footer contact email/);
});

test("footer text fields must be strings within the length limit", () => {
  assert.match(validateSiteSetting("site.footer", { companyName: 42 }), /must be text/);
  assert.match(validateSiteSetting("site.footer", { description: "x".repeat(501) }), /must be text/);
});

test("page-design settings remain extensible while unknown setting keys are rejected", () => {
  assert.equal(validateSiteSetting("page-design.home", { sections: [{ id: "hero", title: "Welcome" }] }), null);
  assert.match(validateSiteSetting("custom.integration", { enabled: true }), /not supported/);
});
