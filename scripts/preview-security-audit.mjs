const origin = process.env.PREVIEW_ORIGIN || "https://cms-development.yrproservice.pages.dev";

function fail(message) {
  console.error("Preview security audit failed:", message);
  process.exitCode = 1;
}

const documentResponse = await fetch(origin + "/", { redirect: "manual", cache: "no-store" });
if (!documentResponse.ok) {
  fail("The Preview homepage did not return a successful document response (" + documentResponse.status + ").");
} else {
  const requiredHeaders = [
    ["x-frame-options", "sameorigin"],
    ["x-content-type-options", "nosniff"],
    ["referrer-policy", "strict-origin-when-cross-origin"],
  ];
  for (const [name, expected] of requiredHeaders) {
    const actual = (documentResponse.headers.get(name) || "").trim().toLowerCase();
    if (actual !== expected) fail("Expected " + name + ": " + expected + "; received " + (actual || "(missing)") + ".");
    else console.log("Verified document header:", name, actual);
  }
  const permissions = (documentResponse.headers.get("permissions-policy") || "").toLowerCase().replace(/\\s+/g, "");
  for (const feature of ["camera=()", "microphone=()", "geolocation=()"]) {
    if (!permissions.split(",").includes(feature)) fail("Permissions-Policy is missing " + feature + ".");
    else console.log("Verified Permissions-Policy:", feature);
  }
}

const protectedRoutes = [
  ["/admin?entry=1", "Admin workspace"],
  ["/api/admin/requests", "Request Dashboard API"],
  ["/api/cms/admin/products", "CMS products API"],
  ["/api/cms/admin/pages", "CMS pages API"],
  ["/api/cms/admin/media", "CMS media API"],
];

for (const [path, label] of protectedRoutes) {
  const response = await fetch(origin + path, {
    method: "GET",
    redirect: "manual",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const location = response.headers.get("location") || "";
  const accessLoginRedirect =
    [301, 302, 303, 307, 308].includes(response.status) &&
    (/cloudflareaccess\\.com/i.test(location) || /\\/cdn-cgi\\/access\\/login/i.test(location));
  if (!accessLoginRedirect) {
    fail(label + " is not demonstrably behind Cloudflare Access: HTTP " + response.status + (location ? ", Location " + location : ", no login redirect") + ".");
  } else {
    console.log("Verified Cloudflare Access challenge:", label, response.status);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log("Preview document headers and unauthenticated Admin/API access boundaries passed.");
