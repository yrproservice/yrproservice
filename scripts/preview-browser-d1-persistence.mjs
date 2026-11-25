import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomUUID, createHash } from "node:crypto";
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
  submissionMode: "Real browser POSTs reach the Preview API and Preview D1; synthetic records are tracked, verified, and cleaned up.",
  tests: [],
};


const databaseName = "yr-proservice-test-db";
const databaseId = "7fca4ad0-3baa-4148-ad28-bfd2ef416c16";
const marker = "YR-PREVIEW-BROWSER-" + randomUUID().toUpperCase();
const created = [];
let previewIdentityVerified = false;
function sqlString(value) { return "'" + String(value).replaceAll("'", "''") + "'"; }
function hashEmail(email) { return createHash("sha256").update(email.toLowerCase()).digest("hex"); }
function runD1(sql) {
  const output = execFileSync("npx", ["wrangler@4.157.0", "d1", "execute", databaseName, "--remote", "--command", sql, "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const parsed = JSON.parse(output);
  const sets = Array.isArray(parsed) ? parsed : [parsed];
  return sets.flatMap((set) => Array.isArray(set?.results) ? set.results : []);
}
function makeIdentity(type, suffix) {
  return { type, name: `${marker}-${suffix}`, email: `yr-preview-browser-${randomUUID()}@example.invalid` };
}
const quoteIdentity = makeIdentity("quotation", "QUOTE");
const chairIdentity = makeIdentity("dental_chair", "CHAIR");
const serviceIdentity = makeIdentity("service", "SERVICE");
const identities = [quoteIdentity, chairIdentity, serviceIdentity];
const infoText = execFileSync("npx", ["wrangler@4.157.0", "d1", "info", databaseName, "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const info = JSON.parse(infoText);
const identityValues = [];
const visit = (value) => {
  if (typeof value === "string") identityValues.push(value);
  else if (Array.isArray(value)) value.forEach(visit);
  else if (value && typeof value === "object") Object.values(value).forEach(visit);
};
visit(info);
assert.ok(identityValues.includes(databaseName), "Preview D1 name mismatch; refusing to run browser submissions.");
assert.ok(identityValues.includes(databaseId), "Preview D1 UUID mismatch; refusing to run browser submissions.");
previewIdentityVerified = true;
const schema = runD1("SELECT (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='requests') AS requests_table, (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='request_status_history') AS history_table, (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('request_submission_attempts','request_tracking_attempts')) AS rate_limit_tables;");
assert.equal(schema.length, 1);
assert.equal(Number(schema[0].requests_table), 1);
assert.equal(Number(schema[0].history_table), 1);
assert.equal(Number(schema[0].rate_limit_tables), 2);

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

function captureRealRequestSubmission(page, identity) {
  const submissionPromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/requests") && response.request().method() === "POST"
  ).then(async (response) => {
    const responseBody = await response.json();
    const payload = response.request().postDataJSON();
    assert.equal(response.status(), 201, `${identity.type} real Preview submission failed: ${JSON.stringify(responseBody)}`);
    assert.equal(responseBody.ok, true);
    assert.match(responseBody.reference, /^(YRS|YRQ|YRC)-\d{8}-[A-F0-9]{16}$/);
    created.push({ ...identity, reference: responseBody.reference });
    const trackingUrl = new URL("/api/track", origin);
    trackingUrl.searchParams.set("reference", responseBody.reference);
    trackingUrl.searchParams.set("email", identity.email);
    const trackingResponse = await fetch(trackingUrl, { signal: AbortSignal.timeout(20000) });
    const tracking = await trackingResponse.json();
    assert.equal(trackingResponse.status, 200, `${identity.type} tracking failed: ${JSON.stringify(tracking)}`);
    assert.equal(tracking.request.reference, responseBody.reference);
    assert.equal(tracking.request.requestType, identity.type);
    assert.equal(tracking.request.status, "received");
    return { ...payload, reference: responseBody.reference };
  });
  return () => submissionPromise;
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

try {
await runCase("product cart → quotation", async () => {
  const { context, page } = await newPage();
  try {
    await page.goto(`${origin}/cart`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Your product cart is empty" }).waitFor();
    assert.ok(await page.getByRole("link", { name: /Browse More Products/ }).isVisible());

    const cards = await openProducts(page, "");
    const { card, action, name } = await findCardWithAction(cards, "", "Add to Cart");
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
    await page.locator('input[name="name"]').fill(quoteIdentity.name);
    await page.locator('input[name="email"]').fill(quoteIdentity.email);
    const selectedProducts = await page.locator('textarea[name="product"]').inputValue();
    assert.ok(selectedProducts.includes(name), "Selected product was not carried into the quotation form.");

    const getPayload = captureRealRequestSubmission(page, quoteIdentity);
    await page.getByRole("button", { name: /Submit Quotation Request/ }).click();
    await page.getByRole("heading", { name: "Your quotation request has been received." }).waitFor();
    const payload = await getPayload();
    assert.ok(payload, "Quotation form did not call the request endpoint.");
    assert.equal(payload.requestType, "quotation");
    assert.ok(payload.product.includes(name));
    assert.match(payload.product, /Qty: 1/);
    return { product: name, quantityAfterControls: 1, requestType: payload.requestType, reference: payload.reference };
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

    const cards = await openProducts(page, "");
    const { card, action, name } = await findCardWithAction(cards, "", "Request Chair");
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
    await page.locator('input[name="name"]').fill(chairIdentity.name);
    await page.locator('input[name="email"]').fill(chairIdentity.email);
    await page.locator('input[name="clinic"]').fill("Automated Preview Test - Not a Customer");
    await page.locator('input[name="phone"]').fill("0100000000");
    await page.locator('input[name="location"]').fill("Kuala Lumpur");
    await page.locator('textarea[name="message"]').fill(marker + " automated Preview-only chair request test.");

    const getPayload = captureRealRequestSubmission(page, chairIdentity);
    await page.getByRole("button", { name: /Prepare Chair Request/ }).click();
    await page.getByRole("heading", { name: "Your chair request has been received." }).waitFor();
    const payload = await getPayload();
    assert.ok(payload, "Dental chair form did not call the request endpoint.");
    assert.equal(payload.requestType, "dental_chair");
    assert.ok(payload.product.includes(name));
    assert.match(payload.product, /x2/);

    await page.getByRole("button", { name: "Back to Product Cart" }).click();
    await page.waitForURL((url) => url.pathname === "/cart", { timeout: 10000 });
    await page.getByRole("heading", { name: "Your product cart is empty" }).waitFor();
    return { chair: name, chairQuantity: 2, productCartCount: 0, requestType: payload.requestType, reference: payload.reference };
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

    await page.locator('input[name="name"]').fill(serviceIdentity.name);
    await page.locator('input[name="clinic"]').fill("Preview Dental Clinic");
    await page.locator('input[name="phone"]').fill("0100000000");
    await page.locator('input[name="email"]').fill(serviceIdentity.email);
    const serviceSelect = form.locator("select");
    await page.waitForFunction(() => {
      const select = document.querySelector("form.service-request-form select");
      return Boolean(select && select.options.length > 1);
    });
    await serviceSelect.selectOption({ index: 1 });
    await page.locator('textarea[name="message"]').fill(marker + " automated Preview-only service request test.");

    const getPayload = captureRealRequestSubmission(page, serviceIdentity);
    await page.getByRole("button", { name: "Send Service Request" }).click();
    await page.getByRole("heading", { name: "Thank you for your service enquiry." }).waitFor();
    const payload = await getPayload();
    assert.ok(payload, "Service request form did not call the request endpoint.");
    assert.equal(payload.requestType, "service");
    assert.ok(payload.service, "Selected service was not included in the request.");
    assert.equal(payload.name, serviceIdentity.name);
    return { service: payload.service, requestType: payload.requestType, reference: payload.reference };
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

} catch (error) {
  failure = error;
  report.error = { message: error.message, stack: error.stack };
} finally {
  await browser.close();
}


if (previewIdentityVerified) {
  try {
    assert.equal(created.length, 3, "All three real browser request submissions must complete before persistence verification.");
    const refs = created.map((item) => sqlString(item.reference)).join(", ");
    const rows = runD1(`SELECT reference, request_type, status, customer_name, email, details_json FROM requests WHERE reference IN (${refs}) ORDER BY request_type;`);
    assert.equal(rows.length, 3, "Not all browser-submitted requests persisted in Preview D1.");
    for (const item of created) {
      const row = rows.find((entry) => entry.reference === item.reference);
      assert.ok(row, `Missing persisted ${item.type} request.`);
      assert.equal(row.request_type, item.type);
      assert.equal(row.status, "received");
      assert.equal(row.customer_name, item.name);
      assert.equal(row.email, item.email);
      const expectedSource = item.type === "service" ? "website-service-request" : item.type === "quotation" ? "website-quotation-request" : "website-dental-chair-request";
      assert.ok(row.details_json.includes(expectedSource));
    }
    report.persistence = { status: "passed", database: databaseName, databaseId, recordsVerified: created.map(({type, reference}) => ({type, reference})) };
  } catch (error) {
    report.persistence = { status: "failed", error: error.message };
    failure = failure || error;
  } finally {
    try {
      const conditions = created.map((item) => {
        const source = item.type === "service" ? "website-service-request" : item.type === "quotation" ? "website-quotation-request" : "website-dental-chair-request";
        return `(reference = ${sqlString(item.reference)} AND email = ${sqlString(item.email)} AND customer_name = ${sqlString(item.name)} AND request_type = ${sqlString(item.type)} AND details_json LIKE ${sqlString("%" + source + "%")})`;
      });
      if (conditions.length) {
        runD1(`DELETE FROM requests WHERE (${conditions.join(" OR ")}) AND NOT EXISTS (SELECT 1 FROM request_status_history h WHERE h.request_id = requests.id);`);
      }
      const hashes = identities.map((item) => sqlString(hashEmail(item.email))).join(", ");
      runD1(`DELETE FROM request_submission_attempts WHERE email_hash IN (${hashes});`);
      runD1(`DELETE FROM request_tracking_attempts WHERE email_hash IN (${hashes});`);
      if (conditions.length) {
        const remaining = runD1(`SELECT COUNT(*) AS total FROM requests WHERE ${conditions.join(" OR ")};`);
        assert.equal(Number(remaining[0]?.total), 0, "Synthetic browser request records remain after cleanup.");
      }
      report.cleanup = { status: "passed", syntheticRequestRecordsRemaining: 0 };
    } catch (error) {
      report.cleanup = { status: "failed", error: error.message, marker };
      failure = failure || new Error("Preview browser test cleanup could not be confirmed. Inspect only synthetic records marked " + marker + ". " + error.message);
    }
  }
}

report.summary = {
  passed: report.tests.filter((test) => test.status === "passed").length,
  failed: report.tests.filter((test) => test.status === "failed").length,
};
await writeFile("preview-customer-flow-audit.json", JSON.stringify(report, null, 2) + "\n");
if (failure) throw failure;
console.log(JSON.stringify(report, null, 2));
