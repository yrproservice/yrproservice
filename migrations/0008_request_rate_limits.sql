-- Public request and request-tracking rate-limit storage.
-- Keep runtime request handlers free of schema mutations.
-- Hashes are stored instead of raw client IP addresses or email addresses.

CREATE TABLE IF NOT EXISTS request_submission_attempts (
  id TEXT PRIMARY KEY,
  ip_hash TEXT,
  email_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_request_submission_ip_time
  ON request_submission_attempts(ip_hash, created_at);

CREATE INDEX IF NOT EXISTS idx_request_submission_email_time
  ON request_submission_attempts(email_hash, created_at);

CREATE TABLE IF NOT EXISTS request_tracking_attempts (
  id TEXT PRIMARY KEY,
  ip_hash TEXT,
  email_hash TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_request_tracking_ip_time
  ON request_tracking_attempts(ip_hash, created_at);

CREATE INDEX IF NOT EXISTS idx_request_tracking_email_time
  ON request_tracking_attempts(email_hash, created_at);
