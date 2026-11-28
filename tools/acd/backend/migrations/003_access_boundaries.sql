-- New grants and entry points take effect together. The active pointer starts empty
-- even on upgrade, so an operator must explicitly select a verified snapshot.
REVOKE CREATE ON SCHEMA acd FROM PUBLIC;
REVOKE SELECT (id) ON acd.board_snapshots FROM acd_phase1_reader;
REVOKE SELECT (snapshot_id, opportunity_id, classification_input, classification_input_revision)
  ON acd.opportunity_revisions FROM acd_phase1_proposer;
REVOKE SELECT (id, actor_id, idempotency_key, request_hash), INSERT
  ON acd.classification_proposals FROM acd_phase1_proposer;

CREATE ROLE acd_phase1_history_reader NOLOGIN;
CREATE ROLE acd_phase1_proposal_executor NOLOGIN;
GRANT USAGE ON SCHEMA acd TO acd_phase1_history_reader, acd_phase1_proposal_executor;
GRANT SELECT ON acd.board_snapshots, acd.board_memberships, acd.opportunity_revisions,
  acd.opportunities, acd.url_aliases, acd.source_vacancies TO acd_phase1_history_reader;

CREATE TABLE acd.active_snapshot (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  snapshot_id uuid NOT NULL REFERENCES acd.board_snapshots(id)
);
-- A public session cannot pin a previously authorised snapshot by using
-- REPEATABLE READ or SERIALIZABLE. In-flight statements use ordinary MVCC.
CREATE VIEW acd.public_snapshot WITH (security_barrier = true) AS
  SELECT snapshot_id FROM acd.active_snapshot
  WHERE current_setting('transaction_isolation') = 'read committed';
GRANT SELECT ON acd.public_snapshot TO acd_phase1_reader;

-- Bind attribution to the authenticated database login. Drop the binding when
-- retiring a login. The role OID prevents a recreated name inheriting a binding.
CREATE TABLE acd.proposal_principals (
  login_oid oid PRIMARY KEY,
  actor_id text UNIQUE NOT NULL CHECK (btrim(actor_id) <> '')
);
ALTER TABLE acd.classification_proposals ADD COLUMN validated_login oid;

CREATE TABLE acd.taxonomy_registry (
  version text PRIMARY KEY,
  area_children jsonb NOT NULL,
  job_functions jsonb NOT NULL,
  employer_types jsonb NOT NULL
);
-- Frozen copy of the versioned TypeScript registry. The integration test checks
-- exact parity; a new taxonomy requires a reviewed migration.
INSERT INTO acd.taxonomy_registry VALUES (
  '2026-11-28',
  '{
    "private-markets": ["private-equity-growth", "venture-capital", "private-credit", "infrastructure-real-assets", "fund-investments-secondaries"],
    "development-finance": ["investment-lending", "advisory-capital-mobilisation"],
    "investment-banking-advisory": ["ma-corporate-finance", "transaction-restructuring-advisory", "capital-markets"],
    "asset-management-research": ["portfolio-management", "investment-research", "investment-advisory-wealth-management"],
    "global-markets-structuring": ["institutional-sales-trading", "structuring-financial-engineering"],
    "banking-structured-finance": ["corporate-banking", "project-structured-finance", "trade-syndicated-finance", "treasury-funding-alm"],
    "corporate-finance-strategy": ["corporate-ma", "strategic-finance-investments", "fpa-finance-leadership", "corporate-investor-relations"]
  }',
  '["Investment", "Research & Analysis", "Trading", "Institutional Sales", "Structuring & Financial Engineering",
    "Financing & Origination", "Portfolio & Asset Management", "Strategic Finance", "FP&A & Business Partnering",
    "Finance Leadership", "Impact & ESG", "Investment Advisory", "Fundraising & Investor Relations",
    "Corporate Investor Relations", "Risk & Underwriting", "Investment Legal", "Fund Finance & Operations"]',
  '["Investment Manager", "DFI / Multilateral", "Bank", "Advisory Firm", "Corporate", "Investment Platform", "Securities Firm"]'
);
GRANT SELECT ON acd.taxonomy_registry TO acd_phase1_reader, acd_phase1_proposal_executor;

CREATE FUNCTION acd.nonblank_string(value jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, pg_temp
RETURN coalesce(jsonb_typeof(value) = 'string' AND (value #>> '{}') ~ '[^[:space:]]', false);

CREATE FUNCTION acd.offset_timestamp(value jsonb) RETURNS boolean
LANGUAGE sql STABLE
SET search_path = pg_catalog, pg_temp
RETURN coalesce(jsonb_typeof(value) = 'string'
  AND (value #>> '{}') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
  AND pg_input_is_valid(value #>> '{}', 'timestamp with time zone'), false);

CREATE FUNCTION acd.valid_mapped_classification(metadata jsonb, registry_version text, expected_status text)
RETURNS boolean
LANGUAGE plpgsql STABLE
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  IF jsonb_typeof(metadata) IS DISTINCT FROM 'object'
    OR metadata->>'status' IS DISTINCT FROM expected_status
    OR jsonb_typeof(metadata->'interestTags') IS DISTINCT FROM 'array' THEN
    RETURN false;
  END IF;

  IF (metadata - ARRAY['status', 'areaId', 'subcategoryId', 'jobFunction', 'employerType',
      'interestTags', 'rationale', 'sourceUrl', 'proposedBy', 'proposedAt', 'method']
      - CASE WHEN expected_status = 'approved' THEN ARRAY['approvedBy', 'approvedAt']
             ELSE ARRAY[]::text[] END) <> '{}'::jsonb THEN
    RETURN false;
  END IF;

  RETURN acd.nonblank_string(metadata->'areaId')
    AND acd.nonblank_string(metadata->'subcategoryId')
    AND acd.nonblank_string(metadata->'jobFunction')
    AND acd.nonblank_string(metadata->'rationale')
    AND acd.nonblank_string(metadata->'sourceUrl')
    AND acd.nonblank_string(metadata->'proposedBy')
    AND acd.nonblank_string(metadata->'proposedAt')
    AND coalesce(metadata->>'method' IN ('human', 'ai-assisted'), false)
    AND (expected_status <> 'approved' OR
      (acd.nonblank_string(metadata->'approvedBy') AND acd.nonblank_string(metadata->'approvedAt')))
    AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(metadata->'interestTags') AS tag(value)
      WHERE NOT acd.nonblank_string(tag.value)
    )
    AND EXISTS (
      SELECT 1 FROM acd.taxonomy_registry AS registry
      WHERE registry.version = registry_version
        AND registry.area_children->(metadata->>'areaId') ? (metadata->>'subcategoryId')
        AND registry.job_functions ? (metadata->>'jobFunction')
        AND (NOT metadata ? 'employerType' OR
          (acd.nonblank_string(metadata->'employerType')
            AND registry.employer_types ? (metadata->>'employerType')))
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION acd.nonblank_string(jsonb), acd.offset_timestamp(jsonb),
  acd.valid_mapped_classification(jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION acd.nonblank_string(jsonb), acd.offset_timestamp(jsonb),
  acd.valid_mapped_classification(jsonb, text, text) TO acd_phase1_reader, acd_phase1_proposal_executor;

CREATE OR REPLACE VIEW acd.public_jobs WITH (security_barrier = true) AS
SELECT m.snapshot_id, m.opportunity_id, m.ordinal, r.classification_input_revision,
       CASE WHEN acd.valid_mapped_classification(r.payload->'careerClassification', '2026-11-28', 'approved')
            THEN r.payload ELSE r.payload - 'careerClassification' END AS payload
FROM acd.public_snapshot active
JOIN acd.board_memberships m USING (snapshot_id)
JOIN acd.opportunity_revisions r USING (snapshot_id, opportunity_id)
WHERE m.section = 'Jobs'
  AND r.payload->>'boardSection' = 'Jobs'
  AND coalesce(r.payload->>'publicationStatus', 'live') = 'live'
  AND coalesce(r.payload->>'lifecycleStatus', 'active') <> 'closed';

GRANT SELECT ON acd.active_snapshot, acd.proposal_principals TO acd_phase1_proposal_executor;
-- SELECT FOR SHARE needs UPDATE on at least one column. The executor has no
-- login and cannot change the snapshot ID; the singleton key can only be true.
GRANT UPDATE (singleton) ON acd.active_snapshot TO acd_phase1_proposal_executor;
GRANT SELECT (snapshot_id, opportunity_id, classification_input, classification_input_revision)
  ON acd.opportunity_revisions TO acd_phase1_proposal_executor;
GRANT SELECT (id, actor_id, idempotency_key, proposal),
  INSERT (snapshot_id, opportunity_id, actor_id, idempotency_key, classification_input_revision,
    request_hash, proposal, validated_login)
  ON acd.classification_proposals TO acd_phase1_proposal_executor;

CREATE FUNCTION acd.save_proposal(input jsonb, request_key text)
RETURNS TABLE (proposal_id uuid, disposition text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  principal_oid oid;
  actor text;
  current_snapshot uuid;
  source_input jsonb;
  source_revision text;
  registry_version text;
  producer jsonb;
  result jsonb;
  metadata jsonb;
  saved_id uuid;
  saved_proposal jsonb;
BEGIN
  SELECT principals.login_oid, principals.actor_id INTO principal_oid, actor
  FROM acd.proposal_principals AS principals
  JOIN pg_catalog.pg_roles AS roles ON roles.oid = principals.login_oid
  WHERE roles.rolname = session_user;

  IF actor IS NULL THEN
    RAISE EXCEPTION 'Proposal login is not bound to an actor' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(input) IS DISTINCT FROM 'object'
    OR (input - ARRAY['contractVersion', 'taxonomyVersion', 'opportunityId', 'sourceRevision',
      'evidence', 'result', 'scopeRecommendation', 'scopeReason', 'createdAt', 'producer']) <> '{}'::jsonb
    OR input->>'contractVersion' IS DISTINCT FROM 'acd-v2/1'
    OR NOT acd.nonblank_string(input->'opportunityId')
    OR NOT acd.nonblank_string(input->'sourceRevision')
    OR jsonb_typeof(input->'evidence') IS DISTINCT FROM 'object'
    OR NOT coalesce(input->>'scopeRecommendation' IN ('in-scope', 'needs-review', 'outside-future-scope'), false)
    OR NOT acd.nonblank_string(input->'scopeReason')
    OR NOT acd.offset_timestamp(input->'createdAt')
    OR request_key IS NULL OR request_key !~ '[^[:space:]]' THEN
    RAISE EXCEPTION 'Invalid classification proposal' USING ERRCODE = '22023';
  END IF;

  producer := input->'producer';
  IF jsonb_typeof(producer) IS DISTINCT FROM 'object'
    OR (producer - ARRAY['actorId', 'model', 'promptVersion']) <> '{}'::jsonb
    OR (producer ? 'model' AND NOT acd.nonblank_string(producer->'model'))
    OR (producer ? 'promptVersion' AND NOT acd.nonblank_string(producer->'promptVersion')) THEN
    RAISE EXCEPTION 'Invalid classification producer' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(producer->'actorId') IS DISTINCT FROM 'string'
    OR producer->>'actorId' IS DISTINCT FROM actor THEN
    RAISE EXCEPTION 'Proposal actor does not match the authenticated login' USING ERRCODE = '42501';
  END IF;

  -- Exact replays return the existing ID, including after a snapshot switch.
  -- This path neither persists stale evidence nor attests to legacy rows.
  SELECT p.id, p.proposal INTO saved_id, saved_proposal
  FROM acd.classification_proposals AS p
  WHERE p.actor_id = actor AND p.idempotency_key = request_key;
  IF FOUND THEN
    IF saved_proposal IS DISTINCT FROM input THEN
      RAISE EXCEPTION 'Proposal idempotency conflict' USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT saved_id, 'already-exists'::text;
    RETURN;
  END IF;

  registry_version := input->>'taxonomyVersion';
  IF NOT EXISTS (SELECT 1 FROM acd.taxonomy_registry WHERE version = registry_version) THEN
    RAISE EXCEPTION 'Unsupported taxonomy version' USING ERRCODE = '22023';
  END IF;

  result := input->'result';
  IF jsonb_typeof(result) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid classification result' USING ERRCODE = '22023';
  END IF;
  CASE result->>'kind'
    WHEN 'mapped' THEN
      metadata := result->'classification';
      IF (result - ARRAY['kind', 'classification']) <> '{}'::jsonb
        OR NOT acd.valid_mapped_classification(metadata, registry_version, 'proposed') THEN
        RAISE EXCEPTION 'Invalid mapped classification' USING ERRCODE = '22023';
      END IF;
    WHEN 'unresolved' THEN
      IF (result - ARRAY['kind', 'reason', 'suggestedAreaId', 'suggestedJobFunction']) <> '{}'::jsonb
        OR NOT acd.nonblank_string(result->'reason')
        OR NOT EXISTS (
          SELECT 1 FROM acd.taxonomy_registry AS registry WHERE registry.version = registry_version
            AND (NOT result ? 'suggestedAreaId'
              OR (acd.nonblank_string(result->'suggestedAreaId') AND registry.area_children ? (result->>'suggestedAreaId')))
            AND (NOT result ? 'suggestedJobFunction'
              OR (acd.nonblank_string(result->'suggestedJobFunction') AND registry.job_functions ? (result->>'suggestedJobFunction')))
        ) THEN
        RAISE EXCEPTION 'Invalid unresolved classification' USING ERRCODE = '22023';
      END IF;
    ELSE
      RAISE EXCEPTION 'Invalid classification result' USING ERRCODE = '22023';
  END CASE;

  -- Hold the pointer stable until the proposal commits while allowing other
  -- proposal submissions to proceed under the same snapshot.
  SELECT snapshot_id INTO current_snapshot FROM acd.active_snapshot WHERE singleton FOR SHARE;
  SELECT r.classification_input, r.classification_input_revision INTO source_input, source_revision
  FROM acd.opportunity_revisions AS r
  WHERE r.snapshot_id = current_snapshot AND r.opportunity_id = input->>'opportunityId';
  IF NOT FOUND OR source_revision IS DISTINCT FROM input->>'sourceRevision'
    OR source_input->'evidence' IS DISTINCT FROM input->'evidence'
    OR (metadata IS NOT NULL AND metadata->>'sourceUrl' IS DISTINCT FROM source_input->>'sourceUrl') THEN
    RAISE EXCEPTION 'Classification source revision or evidence conflict' USING ERRCODE = '22023';
  END IF;

  INSERT INTO acd.classification_proposals
    (snapshot_id, opportunity_id, actor_id, idempotency_key, classification_input_revision,
     request_hash, proposal, validated_login)
  VALUES (current_snapshot, input->>'opportunityId', actor, request_key, source_revision,
    encode(sha256(convert_to(input::text, 'UTF8')), 'hex'), input, principal_oid)
  ON CONFLICT (actor_id, idempotency_key) DO NOTHING
  RETURNING id INTO saved_id;
  IF FOUND THEN
    RETURN QUERY SELECT saved_id, 'created'::text;
    RETURN;
  END IF;

  SELECT p.id, p.proposal INTO saved_id, saved_proposal
  FROM acd.classification_proposals AS p
  WHERE p.actor_id = actor AND p.idempotency_key = request_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retry proposal transaction' USING ERRCODE = '40001';
  END IF;
  IF saved_proposal IS DISTINCT FROM input THEN
    RAISE EXCEPTION 'Proposal idempotency conflict' USING ERRCODE = '23505';
  END IF;
  RETURN QUERY SELECT saved_id, 'already-exists'::text;
END;
$$;

ALTER FUNCTION acd.save_proposal(jsonb, text) OWNER TO acd_phase1_proposal_executor;
REVOKE EXECUTE ON FUNCTION acd.save_proposal(jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION acd.save_proposal(jsonb, text) TO acd_phase1_proposer;
