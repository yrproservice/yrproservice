-- Non-destructive request lifecycle history for the Admin dashboard.
-- Adds an append-only event table; existing request records and statuses are untouched.

CREATE TABLE IF NOT EXISTS request_status_history (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE RESTRICT,
  reference TEXT NOT NULL,
  previous_status TEXT NOT NULL CHECK (previous_status IN ('received', 'in_review', 'contacted', 'completed', 'cancelled')),
  new_status TEXT NOT NULL CHECK (new_status IN ('received', 'in_review', 'contacted', 'completed', 'cancelled')),
  actor_email TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (previous_status <> new_status)
);

CREATE INDEX IF NOT EXISTS idx_request_status_history_reference
  ON request_status_history(reference, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_request_status_history_request
  ON request_status_history(request_id, created_at DESC, id DESC);
