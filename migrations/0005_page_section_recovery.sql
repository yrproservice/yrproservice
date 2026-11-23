-- Persistent, page-scoped recovery for removed Visual CMS sections.
-- Apply to Preview D1 only. Entries are retained for 30 days.

CREATE TABLE IF NOT EXISTS cms_page_section_recovery (
  id TEXT PRIMARY KEY,
  page_key TEXT NOT NULL,
  draft_id TEXT,
  draft_created_at TEXT,
  original_index INTEGER NOT NULL CHECK (original_index >= 0),
  section_json TEXT NOT NULL CHECK (json_valid(section_json)),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'restored', 'discarded')),
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_cms_page_section_recovery_page_status
  ON cms_page_section_recovery(page_key, status, created_at DESC);
