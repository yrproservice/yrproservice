-- YR Proservice request storage. Apply this migration to the Cloudflare D1 database.
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  request_type TEXT NOT NULL CHECK (request_type IN ('service', 'quotation', 'dental_chair')),
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'in_review', 'contacted', 'completed', 'cancelled')),
  customer_name TEXT NOT NULL,
  company TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  service_slug TEXT,
  preferred_timing TEXT,
  message TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_requests_reference ON requests(reference);
CREATE INDEX IF NOT EXISTS idx_requests_type_created ON requests(request_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status_created ON requests(status, created_at DESC);
