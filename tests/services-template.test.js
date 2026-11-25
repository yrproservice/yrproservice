import test from "node:test";
import assert from "node:assert/strict";
import { servicesCmsTemplate, getServicesCmsContent, getServiceBySlug } from "../src/data/servicesCmsTemplate.js";
import { services } from "../src/data/services.js";

const originalServiceDestinations = [
  ["dental-chair-installation", "Dental Chair Installation"],
  ["equipment-installation", "Equipment Installation"],
  ["compressor-installation", "Compressor Installation"],
  ["dental-suction-installation", "Dental Suction Installation"],
  ["underfloor-piping", "Underfloor Piping"],
  ["preventive-maintenance", "Preventive Maintenance"],
  ["equipment-relocation", "Equipment Relocation"],
  ["repair-technical-support", "Repair and Technical Support"],
];

test("Services template preserves all eight established service destinations and their original content", () => {
  const items = servicesCmsTemplate.sections[0].content.listing.items;
  assert.equal(services.length, 8);
  assert.deepEqual(
    services.map(({ slug, title }) => [slug, title]),
    originalServiceDestinations,
  );
  assert.deepEqual(items, services);
  for (const service of items) {
    assert.ok(service.text);
    assert.ok(service.detail);
    assert.ok(Array.isArray(service.points) && service.points.length > 0);
  }
});

test("Services page design and non-catalogue sections remain present", () => {
  const content = servicesCmsTemplate.sections[0].content;
  assert.equal(content.hero.title, "Dental Equipment Services");
  assert.ok(content.intro);
  assert.ok(content.process);
  assert.ok(content.cta);
  assert.equal(servicesCmsTemplate.sections[0].layout.variant, "original-services-layout");
});

test("Services contact CTA does not route customers to the HR-only Contact page", () => {
  const cta = servicesCmsTemplate.sections[0].content.cta;
  assert.equal(cta.quoteButton, "Contact Us");
  assert.equal(cta.quoteUrl, "/quote");
});

test("legacy published Services CTA targeting the HR-only Contact page is safely normalized", () => {
  const content = getServicesCmsContent({
    sections: [{
      type: "services-page",
      content: { cta: { quoteButton: "Contact Us", quoteUrl: "/contact" } },
    }],
  });
  assert.equal(content.cta.quoteButton, "Contact Us");
  assert.equal(content.cta.quoteUrl, "/quote");
});

test("CMS-managed service detail items resolve by saved slug even when absent from the static fallback list", () => {
  const cmsContent = {
    ...servicesCmsTemplate,
    sections: servicesCmsTemplate.sections.map((section) => ({
      ...section,
      content: {
        ...section.content,
        listing: {
          ...section.content.listing,
          items: [{
            slug: "legacy-cms-service",
            number: "09",
            title: "Legacy CMS Service",
            text: "Saved CMS service detail",
            icon: "✓",
            points: ["Verified service detail"],
            detail: "Saved service detail content",
          }],
        },
      },
    })),
  };

  assert.equal(getServiceBySlug(cmsContent, "legacy-cms-service")?.title, "Legacy CMS Service");
  assert.equal(getServiceBySlug(cmsContent, "unknown-service"), null);
});
