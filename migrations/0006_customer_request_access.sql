-- Customer email-verification state for the public Track My Requests feature.
-- This migration does not modify or copy existing customer request records.
-- Code/session values are stored only as keyed hashes by the API; no plaintext
-- verification codes or bearer session tokens are persisted.

CREATE TABLE IF NOT EXISTS customer_request_access_codes (
  id TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  ip_hash TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_customer_request_codes_email_created
  ON customer_request_access_codes(email_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_request_codes_ip_created
  ON customer_request_access_codes(ip_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS customer_request_access_sessions (
  token_hash TEXT PRIMARY KEY,
  email_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_customer_request_sessions_email_expiry
  ON customer_request_access_sessions(email_hash, expires_at);
