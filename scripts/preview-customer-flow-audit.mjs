import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const origin = (process.env.PREVIEW_BASE_URL || "https://cms-development.yrproservice.pages.dev").replace(/\/$/, "");
assert.equal(
  new URL(origin).hostname,
  "cms-development.yrproservice.pages.dev",
  "Customer-flow audit must run only against the Cloudflare Preview hostname.",
);

const report = {
  target: origin,
  generatedAt: new Date().toISOString(),
  submissionMode: "POST /api/requests is intercepted; no request is written to Preview D1.",
  tests: [],
};

const browser = await chromium.launch({ headless: true });
let failure = null;

async function newPage() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  return { context, page };
}

async function openProducts(page, searchTerm) {
  const response = await page.goto(`${origin}/products`, { waitUntil: "domcontentloaded" });
  assert.ok(response && response.status() === 200, "Preview Products page did not return HTTP 200.");
  const search = page.locator('input[aria-label="Search products"]');
  await search.waitFor({ state: "visible", timeout: 30000 });
  await search.fill(searchTerm);
  const cards = page.locator(".bp-catalog-grid .bp-catalog-card");
  await cards.first().waitFor({ state: "visible", timeout: 30000 });
  return cards;
}

async function findCardWithAction(cards, expectedName, expectedAction) {
  const count = await cards.count();
  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    const name = (await card.locator("h3").innerText()).trim();
    if (!name.toLowerCase().includes(expectedName.toLowerCase())) continue;
    const action = card.locator("button.bp-card-action-primary");
    if ((await action.innerText()).trim() === expectedAction) {
      return { card, action, name };
    }
  }
  throw new Error(`No ${expectedAction} product card found for "${expectedName}".`);
}

async function mockRequestSubmission(page, reference) {
  let payload = null;
  await page.route("**/api/requests", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    payload = JSON.parse(route.request().postData() || "{}");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, reference }),
    });
  });
  return () => payload;
}

async function runCase(name, execute) {
  try {
    const details = await execute();
    report.tests.push({ name, status: "passed", details });
  } catch (error) {
    report.tests.push({ name, status: "failed", error: error.message });
    throw error;
  }
}

await runCase("product cart → quotation", async () => {
  const { context, page } = await newPage();
  try {
    await page.goto(`${origin}/cart`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Your product cart is empty" }).waitFor();
    assert.ok(await page.getByRole("link", { name: /Browse More Products/ }).isVisible());

    const cards = await openProducts(page, "M-1530");
    const { card, action, name } = await findCardWithAction(cards, "M-1530", "Add to Cart");
    await action.click();
    await card.getByRole("button", { name: /Added/ }).waitFor({ timeout: 10000 });

    await page.goto(`${origin}/cart`, { waitUntil: "domcontentloaded" });
    const row = page.locator(".bp-cart-row").first();
    await row.waitFor({ state: "visible", timeout: 15000 });
    const cartName = (await row.locator(".bp-cart-product h3").innerText()).trim();
    assert.equal(cartName, name);

    const quantity = page.locator(".bp-qty b").first();
    assert.equal((await quantity.innerText()).trim(), "1");
    await page.locator(".bp-qty button").nth(1).click();
    assert.equal((await quantity.innerText()).trim(), "2");
    await page.locator(".bp-qty button").nth(0).click();
    assert.equal((await quantity.innerText()).trim(), "1");

    await page.getByRole("button", { name: /Proceed to Quote/ }).click();
    await page.waitForURL((url) => url.pathname === "/quote", { timeout: 10000 });
    const form = page.locator("form.bp-form");
    assert.equal(await form.evaluate((element) => element.checkValidity()), false);
    await page.locator('input[name="name"]').fill("Preview Flow Test");
    await page.locator('input[name="email"]').fill("preview-flow@example.invalid");
    const selectedProducts = await page.locator('textarea[name="product"]').inputValue();
    assert.ok(selectedProducts.includes(name), "Selected product was not carried into the quotation form.");

    const getPayload = await mockRequestSubmission(page, "PREVIEW-FLOW-QUOTE");
    await page.getByRole("button", { name: /Submit Quotation Request/ }).click();
    await page.getByRole("heading", { name: "Your quotation request has been received." }).waitFor();
    const payload = getPayload();
    assert.ok(payload, "Quotation form did not call the request endpoint.");
    assert.equal(payload.requestType, "quotation");
    assert.ok(payload.product.includes(name));
    assert.match(payload.product, /Qty: 1/);
    return { product: name, quantityAfterControls: 1, requestType: payload.requestType, reference: "PREVIEW-FLOW-QUOTE" };
  } finally {
    await context.close();
  }
});

await runCase("dental chair request stays separate from product cart", async () => {
  const { context, page } = await newPage();
  try {
    await page.goto(`${origin}/dental-chair-request`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "No dental chairs selected" }).waitFor();
    assert.ok(await page.getByRole("link", { name: /Browse Dental Chairs/ }).isVisible());

    const cards = await openProducts(page, "Signo T100");
    const { card, action, name } = await findCardWithAction(cards, "Signo T100", "Request Chair");
    await action.click();
    await page.waitForURL((url) => url.pathname === "/dental-chair-request", { timeout: 10000 });
    await page.locator(".request-item").waitFor({ state: "visible", timeout: 10000 });
    assert.ok((await page.locator(".request-item-info h3").innerText()).includes(name));

    await page.locator(".quantity-control button").nth(1).click();
    assert.equal((await page.locator(".quantity-control span").innerText()).trim(), "2");
    const tabs = page.locator(".request-tabs .request-tab");
    assert.equal((await tabs.nth(0).locator("span").innerText()).trim(), "0");
    assert.equal((await tabs.nth(1).locator("span").innerText()).trim(), "2");
    assert.ok(await page.getByRole("link", { name: /Browse More Dental Chairs/ }).isVisible());

    await tabs.nth(0).click();
    await page.waitForURL((url) => url.pathname === "/cart", { timeout: 10000 });
    await page.getByRole("heading", { name: "Your product cart is empty" }).waitFor();
    await page.locator(".request-tabs .request-tab").nth(1).click();
    await page.waitForURL((url) => url.pathname === "/dental-chair-request", { timeout: 10000 });

    const form = page.locator(".request-form-card form");
    assert.equal(await form.evaluate((element) => element.checkValidity()), false);
    await page.locator('input[name="name"]').fill("Preview Chair Test");
    await page.locator('input[name="email"]').fill("preview-chair@example.invalid");
    await page.locator('input[name="clinic"]').fill("Preview Dental Clinic");
    await page.locator('input[name="phone"]').fill("0100000000");
    await page.locator('input[name="location"]').fill("Kuala Lumpur");
    await page.locator('textarea[name="message"]').fill("Automated Preview-only chair request test.");

    const getPayload = await mockRequestSubmission(page, "PREVIEW-FLOW-CHAIR");
    await page.getByRole("button", { name: /Prepare Chair Request/ }).click();
    await page.getByRole("heading", { name: "Your chair request has been received." }).waitFor();
    const payload = getPayload();
    assert.ok(payload, "Dental chair form did not call the request endpoint.");
    assert.equal(payload.requestType, "dental_chair");
    assert.ok(payload.product.includes(name));
    assert.match(payload.product, /x2/);

    await page.getByRole("button", { name: "Back to Product Cart" }).click();
    await page.waitForURL((url) => url.pathname === "/cart", { timeout: 10000 });
    await page.getByRole("heading", { name: "Your product cart is empty" }).waitFor();
    return { chair: name, chairQuantity: 2, productCartCount: 0, requestType: payload.requestType, reference: "PREVIEW-FLOW-CHAIR" };
  } finally {
    await context.close();
  }
});

await runCase("service request validation and submission", async () => {
  const { context, page } = await newPage();
  try {
    const response = await page.goto(`${origin}/service-request`, { waitUntil: "domcontentloaded" });
    assert.ok(response && response.status() === 200, "Preview Service Request page did not return HTTP 200.");
    const form = page.locator("form.service-request-form");
    await form.waitFor({ state: "visible", timeout: 15000 });
    assert.equal(await form.evaluate((element) => element.checkValidity()), false);

    await page.locator('input[name="name"]').fill("Preview Service Test");
    await page.locator('input[name="clinic"]').fill("Preview Dental Clinic");
    await page.locator('input[name="phone"]').fill("0100000000");
    await page.locator('input[name="email"]').fill("preview-service@example.invalid");
    const serviceSelect = form.locator("select");
    await page.waitForFunction(() => {
      const select = document.querySelector("form.service-request-form select");
      return Boolean(select && select.options.length > 1);
    });
    await serviceSelect.selectOption({ index: 1 });
    await page.locator('textarea[name="message"]').fill("Automated Preview-only service request test.");

    const getPayload = await mockRequestSubmission(page, "PREVIEW-FLOW-SERVICE");
    await page.getByRole("button", { name: "Send Service Request" }).click();
    await page.getByRole("heading", { name: "Thank you for your service enquiry." }).waitFor();
    const payload = getPayload();
    assert.ok(payload, "Service request form did not call the request endpoint.");
    assert.equal(payload.requestType, "service");
    assert.ok(payload.service, "Selected service was not included in the request.");
    assert.equal(payload.name, "Preview Service Test");
    return { service: payload.service, requestType: payload.requestType, reference: "PREVIEW-FLOW-SERVICE" };
  } finally {
    await context.close();
  }
});

await runCase("HR contact remains HR-only", async () => {
  const { context, page } = await newPage();
  try {
    const response = await page.goto(`${origin}/contact`, { waitUntil: "domcontentloaded" });
    assert.ok(response && response.status() === 200, "Preview HR Contact page did not return HTTP 200.");
    await page.getByRole("heading", { name: "Careers & HR Enquiries" }).waitFor();
    assert.equal(await page.locator("form").count(), 0, "HR Contact must not expose a generic enquiry form.");
    const emailLink = page.getByRole("link", { name: /Email HR/ });
    assert.ok((await emailLink.getAttribute("href")).startsWith("mailto:"));
    return { heading: "Careers & HR Enquiries", genericFormCount: 0, emailAction: "mailto" };
  } finally {
    await context.close();
  }
});

try {
  report.summary = {
    passed: report.tests.filter((test) => test.status === "passed").length,
    failed: report.tests.filter((test) => test.status === "failed").length,
  };
} catch (error) {
  failure = error;
}

await browser.close();
await writeFile("preview-customer-flow-audit.json", JSON.stringify(report, null, 2) + "\n");
if (failure) throw failure;
console.log(JSON.stringify(report, null, 2));
