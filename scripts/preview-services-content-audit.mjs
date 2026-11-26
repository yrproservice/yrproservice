import { appendFile, writeFile } from "node:fs/promises";

const origin = "https://cms-development.yrproservice.pages.dev";
const expectedOriginalSlugs = [
  "dental-chair-installation",
  "equipment-installation",
  "compressor-installation",
  "dental-suction-installation",
  "underfloor-piping",
  "preventive-maintenance",
  "equipment-relocation",
  "repair-technical-support",
];
const supersededFourCategorySlugs = [
  "installation-site-planning",
  "emergency-repair",
  "preventative-maintenance",
  "compliance-safety-audits",
];
const sameSet = (actual, expected) =>
  actual.length === expected.length &&
  new Set(actual).size === expected.length &&
  expected.every((slug) => actual.includes(slug));

const report = {
  target: origin,
  generatedAt: new Date().toISOString(),
  readOnly: true,
  expectedOriginalSlugs,
  status: "not-started",
};

try {
  const response = await fetch(origin + "/api/cms/public/pages?key=services", {
    cache: "no-store",
  });
  if (response.status === 404) {
    report.status = "no-published-services-page";
    report.fallbackExpected = true;
  } else {
    if (!response.ok) {
      throw new Error("Preview Services API returned HTTP " + response.status);
    }
    const data = await response.json();
    if (!data?.ok || !data.page) {
      throw new Error("Preview Services API returned an invalid page response.");
    }
    report.version = data.page.version_number ?? null;
    report.route = data.page.route ?? null;
    const section = data.page.content?.sections?.find(
      (item) => item?.type === "services-page",
    );
    if (!section) {
      report.status = "published-page-without-services-section";
      report.fallbackExpected = true;
    } else {
      const items = Array.isArray(section.content?.listing?.items)
        ? section.content.listing.items
        : [];
      const slugs = items.map((item) => item?.slug).filter((slug) => typeof slug === "string");
      report.status = "published-services-content";
      report.itemCount = items.length;
      report.services = items.map((item) => ({
        slug: typeof item?.slug === "string" ? item.slug : null,
        title: typeof item?.title === "string" ? item.title : null,
      }));
      report.matchesOriginalEightServiceSet = sameSet(slugs, expectedOriginalSlugs);
      report.matchesSupersededFourCategorySet = sameSet(slugs, supersededFourCategorySlugs);
      report.missingOriginalSlugs = expectedOriginalSlugs.filter((slug) => !slugs.includes(slug));
      report.additionalSlugs = slugs.filter((slug) => !expectedOriginalSlugs.includes(slug));
    }
  }
} catch (error) {
  report.status = "audit-error";
  report.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
}

await writeFile("preview-services-content-audit.json", JSON.stringify(report, null, 2) + "\n");
const summary = [
  "### Read-only Preview Services content audit",
  "",
  "- Status: " + report.status,
  "- Published version: " + (report.version ?? "not available"),
  "- Service item count: " + (report.itemCount ?? 0),
  "- Matches the original eight service destinations: " + (report.matchesOriginalEightServiceSet ?? "not applicable"),
  "- Matches the superseded four-category draft: " + (report.matchesSupersededFourCategorySet ?? "not applicable"),
  "",
  "The audit reads only public Preview CMS content; it does not write to D1 or publish content.",
  "",
].join("\n");
await appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(JSON.stringify(report, null, 2));
