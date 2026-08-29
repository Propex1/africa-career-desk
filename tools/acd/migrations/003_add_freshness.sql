CREATE TABLE IF NOT EXISTS vacancy_freshness (
  source_id TEXT NOT NULL,
  source_key TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  last_successfully_seen_at TEXT,
  last_checked_at TEXT,
  official_posted_at TEXT,
  official_deadline TEXT,
  content_fingerprint TEXT NOT NULL,
  application_route_status TEXT NOT NULL CHECK(application_route_status IN ('available','broken','unknown')),
  freshness_status TEXT NOT NULL CHECK(freshness_status IN ('verified_active','check_freshness','closed_expired')),
  freshness_reason TEXT NOT NULL,
  manual_confirmed_at TEXT,
  manual_confirmation_note TEXT,
  PRIMARY KEY (source_id, source_key)
);
