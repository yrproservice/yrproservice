-- YR Proservice CMS foundation.
-- This migration adds isolated CMS tables. It does not alter the existing
-- customer requests table or any request-related indexes.
--
-- Apply to the Preview D1 database first. Production application requires
-- a separate, explicitly approved release step.

CREATE TABLE IF NOT EXISTS cms_pages (
  id TEXT PRIMARY KEY,
  page_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  route TEXT NOT NULL UNIQUE,
  published_version_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS cms_page_versions (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  state TEXT NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft', 'published', 'archived')),
  content_json TEXT NOT NULL CHECK (json_valid(content_json)),
  created_by TEXT,
  change_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT,
  UNIQUE (page_id, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_page_one_draft
  ON cms_page_versions(page_id) WHERE state = 'draft';
CREATE INDEX IF NOT EXISTS idx_cms_page_versions_history
  ON cms_page_versions(page_id, version_number DESC);

CREATE TABLE IF NOT EXISTS cms_products (
  id TEXT PRIMARY KEY,
  product_slug TEXT NOT NULL UNIQUE,
  published_version_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS cms_product_versions (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES cms_products(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  state TEXT NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft', 'published', 'archived')),
  product_json TEXT NOT NULL CHECK (json_valid(product_json)),
  created_by TEXT,
  change_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT,
  UNIQUE (product_id, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_product_one_draft
  ON cms_product_versions(product_id) WHERE state = 'draft';
CREATE INDEX IF NOT EXISTS idx_cms_product_versions_history
  ON cms_product_versions(product_id, version_number DESC);

CREATE TABLE IF NOT EXISTS cms_media (
  id TEXT PRIMARY KEY,
  storage_provider TEXT NOT NULL DEFAULT 'static'
    CHECK (storage_provider IN ('static', 'r2')),
  object_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  width INTEGER,
  height INTEGER,
  alt_text TEXT NOT NULL DEFAULT '',
  uploaded_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_cms_media_created
  ON cms_media(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cms_media_active
  ON cms_media(deleted_at, created_at DESC);

CREATE TABLE IF NOT EXISTS cms_site_settings (
  setting_key TEXT PRIMARY KEY,
  published_version_id TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS cms_site_setting_versions (
  id TEXT PRIMARY KEY,
  setting_key TEXT NOT NULL REFERENCES cms_site_settings(setting_key) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  state TEXT NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft', 'published', 'archived')),
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  created_by TEXT,
  change_note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT,
  UNIQUE (setting_key, version_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_setting_one_draft
  ON cms_site_setting_versions(setting_key) WHERE state = 'draft';
CREATE INDEX IF NOT EXISTS idx_cms_setting_versions_history
  ON cms_site_setting_versions(setting_key, version_number DESC);

CREATE TABLE IF NOT EXISTS cms_audit_log (
  id TEXT PRIMARY KEY,
  actor_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}'
    CHECK (json_valid(metadata_json)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_cms_audit_entity
  ON cms_audit_log(entity_type, entity_id, created_at DESC);
