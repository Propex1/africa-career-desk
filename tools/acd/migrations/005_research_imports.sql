ALTER TABLE runs ADD COLUMN label TEXT;
ALTER TABLE runs ADD COLUMN import_batch_run_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS runs_import_batch_run_id_unique ON runs(import_batch_run_id) WHERE import_batch_run_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS research_imports (
  batch_run_id TEXT PRIMARY KEY,
  run_id INTEGER NOT NULL UNIQUE REFERENCES runs(id),
  imported_at TEXT NOT NULL,
  preview_path TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_import_lineage (
  vacancy_id INTEGER PRIMARY KEY REFERENCES vacancies(id),
  batch_run_id TEXT NOT NULL REFERENCES research_imports(batch_run_id),
  employer_id TEXT NOT NULL REFERENCES employers(id),
  result_path TEXT NOT NULL,
  source_key TEXT NOT NULL,
  publication_missing_fields_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_import_expired_findings (
  id INTEGER PRIMARY KEY,
  batch_run_id TEXT NOT NULL REFERENCES research_imports(batch_run_id),
  employer_id TEXT NOT NULL REFERENCES employers(id),
  title TEXT NOT NULL,
  closure_evidence TEXT NOT NULL,
  exclusion_reason TEXT NOT NULL,
  UNIQUE(batch_run_id, employer_id, title)
);
