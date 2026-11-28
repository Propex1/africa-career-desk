CREATE ROLE acd_phase1_reader NOLOGIN;
CREATE ROLE acd_phase1_proposer NOLOGIN;

CREATE TABLE acd.board_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_version bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  source_commit text NOT NULL CHECK (source_commit ~ '^[0-9a-f]{40}$'),
  payload_hash text NOT NULL,
  projection_date date NOT NULL,
  UNIQUE (source_commit, payload_hash),
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE acd.opportunities (
  id text PRIMARY KEY CHECK (id <> '')
);

CREATE TABLE acd.opportunity_revisions (
  snapshot_id uuid REFERENCES acd.board_snapshots(id),
  opportunity_id text REFERENCES acd.opportunities(id),
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  payload jsonb NOT NULL,
  classification_input jsonb NOT NULL,
  classification_input_revision text NOT NULL,
  PRIMARY KEY (snapshot_id, opportunity_id),
  UNIQUE (snapshot_id, ordinal),
  UNIQUE (snapshot_id, opportunity_id, classification_input_revision),
  CHECK ((payload->>'id' = opportunity_id) IS TRUE),
  CHECK (coalesce(payload->>'slug', '') <> '')
);

CREATE UNIQUE INDEX opportunity_snapshot_slugs
  ON acd.opportunity_revisions (snapshot_id, (payload->>'slug'));

CREATE TABLE acd.board_memberships (
  snapshot_id uuid,
  section text CHECK (section IN ('Jobs', 'Programmes', 'Open Applications')),
  opportunity_id text,
  ordinal integer NOT NULL CHECK (ordinal >= 0),
  PRIMARY KEY (snapshot_id, section, opportunity_id),
  UNIQUE (snapshot_id, section, ordinal),
  FOREIGN KEY (snapshot_id, opportunity_id)
    REFERENCES acd.opportunity_revisions(snapshot_id, opportunity_id)
);

CREATE TABLE acd.url_aliases (
  snapshot_id uuid REFERENCES acd.board_snapshots(id),
  original_slug text,
  destination_slug text NOT NULL,
  PRIMARY KEY (snapshot_id, original_slug)
);

CREATE TABLE acd.source_vacancies (
  source_id text CHECK (source_id <> ''),
  source_vacancy_key text CHECK (source_vacancy_key <> ''),
  payload jsonb NOT NULL,
  PRIMARY KEY (source_id, source_vacancy_key)
);

CREATE VIEW acd.public_jobs AS
SELECT m.snapshot_id, m.opportunity_id, m.ordinal, r.classification_input_revision,
       CASE WHEN r.payload->'careerClassification'->>'status' = 'approved'
            THEN r.payload ELSE r.payload - 'careerClassification' END AS payload
FROM acd.board_memberships m
JOIN acd.opportunity_revisions r USING (snapshot_id, opportunity_id)
WHERE m.section = 'Jobs'
  AND r.payload->>'boardSection' = 'Jobs'
  AND coalesce(r.payload->>'publicationStatus', 'live') = 'live'
  AND coalesce(r.payload->>'lifecycleStatus', 'active') <> 'closed';

GRANT USAGE ON SCHEMA acd TO acd_phase1_reader, acd_phase1_proposer;
GRANT SELECT ON acd.public_jobs TO acd_phase1_reader;
GRANT SELECT (id) ON acd.board_snapshots TO acd_phase1_reader;
