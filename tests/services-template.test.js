import test from "node:test";
import assert from "node:assert/strict";
import { servicesCmsTemplate, getServicesCmsContent, getServiceBySlug } from "../src/data/servicesCmsTemplate.js";
import { services } from "../src/data/services.js";

const originalServices = [
  {
    title: "Installation & Site Planning",
    points: ["Floor-plan consultation", "Chair & unit setup", "System calibration"],
  },
  {
    title: "Emergency Repair",
    points: ["On-site diagnostics", "Repair support", "Loaner equipment"],
  },
  {
    title: "Preventative Maintenance",
    points: ["Quarterly check-ups", "Wear-part replacement", "Performance logging"],
  },
  {
    title: "Compliance & Safety Audits",
    points: ["X-ray calibration", "Water-line testing", "Sterilization audits"],
  },
];

test("Services template preserves the original four service categories and details", () => {
  const items = servicesCmsTemplate.sections[0].content.listing.items;
  assert.equal(services.length, 4);
  assert.equal(items.length, originalServices.length);
  assert.deepEqual(
    items.map(({ title, points }) => ({ title, points })),
    originalServices,
  );
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
