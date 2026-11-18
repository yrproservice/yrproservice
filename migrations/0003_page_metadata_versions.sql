-- Preserve page metadata in each immutable content revision.
-- Existing revisions inherit the page's current metadata because older
-- title/route values were not stored historically.
ALTER TABLE cms_page_versions ADD COLUMN title TEXT;
ALTER TABLE cms_page_versions ADD COLUMN route TEXT;

UPDATE cms_page_versions
SET title = (SELECT title FROM cms_pages WHERE cms_pages.id = cms_page_versions.page_id),
    route = (SELECT route FROM cms_pages WHERE cms_pages.id = cms_page_versions.page_id)
WHERE title IS NULL OR route IS NULL;

CREATE INDEX IF NOT EXISTS idx_cms_page_versions_route_state
  ON cms_page_versions(route, state);
