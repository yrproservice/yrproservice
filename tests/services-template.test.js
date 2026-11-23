import test from "node:test";
import assert from "node:assert/strict";
import { servicesCmsTemplate, getServicesCmsContent } from "../src/data/servicesCmsTemplate.js";
import { services } from "../src/data/services.js";

test("Services template preserves the original service catalogue", () => {
  const items = servicesCmsTemplate.sections[0].content.listing.items;
  assert.equal(items.length, services.length);
  assert.deepEqual(items.map((item) => item.slug), services.map((item) => item.slug));
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
