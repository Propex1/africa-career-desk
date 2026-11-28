CREATE TABLE acd.classification_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL,
  opportunity_id text NOT NULL,
  actor_id text NOT NULL CHECK (actor_id <> ''),
  idempotency_key text NOT NULL CHECK (idempotency_key <> ''),
  classification_input_revision text NOT NULL,
  request_hash text NOT NULL,
  proposal jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, idempotency_key),
  FOREIGN KEY (snapshot_id, opportunity_id, classification_input_revision)
    REFERENCES acd.opportunity_revisions(snapshot_id, opportunity_id, classification_input_revision),
  CHECK ((proposal->>'sourceRevision' = classification_input_revision) IS TRUE),
  CHECK ((proposal->>'opportunityId' = opportunity_id) IS TRUE),
  CHECK ((proposal->'producer'->>'actorId' = actor_id) IS TRUE),
  CHECK (coalesce(proposal->'result'->>'kind', '') = 'unresolved'
      OR (proposal->'result'->>'kind' = 'mapped'
          AND proposal->'result'->'classification'->>'status' = 'proposed') IS TRUE)
);

GRANT SELECT (snapshot_id, opportunity_id, classification_input, classification_input_revision)
  ON acd.opportunity_revisions TO acd_phase1_proposer;
GRANT SELECT (id, actor_id, idempotency_key, request_hash), INSERT
  ON acd.classification_proposals TO acd_phase1_proposer;
