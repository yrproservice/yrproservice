-- Store the verified email alongside the hashed customer session token.
-- Existing request records are untouched; existing sessions (if any) remain invalid
-- for customer history until a fresh email verification is completed.
ALTER TABLE customer_request_access_sessions
  ADD COLUMN email TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_customer_request_sessions_expiry
  ON customer_request_access_sessions(expires_at);
