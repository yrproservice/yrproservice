const BUILT_IN_ROUTES = new Set([
  "/", "/products", "/services", "/team", "/cart", "/quote",
  "/dental-chair-request", "/service-request", "/track-request", "/contact",
]);

function collectPageDestinations(content) {
  const routes = new Set();
  const sections = Array.isArray(content?.sections) ? content.sections : [];
  for (const section of sections) {
    if (!section || typeof section !== "object" || Array.isArray(section)) continue;
    const sectionContent = section.content && typeof section.content === "object" && !Array.isArray(section.content)
      ? section.content
      : {};
    for (const field of ["buttonUrl", "secondaryButtonUrl"]) {
      if (typeof sectionContent[field] === "string" && sectionContent[field]) routes.add(sectionContent[field]);
    }
    if (Array.isArray(sectionContent.items)) {
      for (const item of sectionContent.items) {
        if (item && typeof item === "object" && !Array.isArray(item) &&
            typeof item.url === "string" && item.url) routes.add(item.url);
      }
    }
  }
  return routes;
}

function collectSettingDestinations(value) {
  const routes = new Set();
  const links = Array.isArray(value?.items) ? value.items : Array.isArray(value?.links) ? value.links : [];
  for (const item of links) {
    if (item && typeof item === "object" && !Array.isArray(item) &&
        typeof item.url === "string" && item.url) routes.add(item.url);
  }
  return routes;
}

function isBuiltInRoute(route) {
  return BUILT_IN_ROUTES.has(route) ||
    /^\/products\/[a-z0-9][a-z0-9-]{1,99}$/.test(route) ||
    /^\/services\/[a-z0-9][a-z0-9-]{1,99}$/.test(route);
}

async function validateDestinations(db, routes, allowedRoutes = new Set()) {
  if (routes.size > 100) return "This content contains too many distinct internal destinations.";
  for (const route of routes) {
    if (isBuiltInRoute(route) || allowedRoutes.has(route)) continue;
    const page = await db.prepare(`
      SELECT p.id
      FROM cms_pages p
      JOIN cms_page_versions v ON v.id = p.published_version_id
      WHERE v.route = ? AND v.state = 'published'
      LIMIT 1
    `).bind(route).first();
    if (!page) return 'The internal destination "' + route + '" is not a built-in route or a published CMS page.';
  }
  return null;
}

export async function validatePageDestinations(db, content, ownRoute = "") {
  const allowedRoutes = new Set(ownRoute ? [ownRoute] : []);
  return validateDestinations(db, collectPageDestinations(content), allowedRoutes);
}

export async function validateSettingDestinations(db, key, value) {
  if (key !== "site.navigation" && key !== "site.footer") return null;
  return validateDestinations(db, collectSettingDestinations(value));
}
