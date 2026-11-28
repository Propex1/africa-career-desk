import { createHmac, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";
import {
  ACD_V2_CONTRACT_VERSION, ACD_V2_TAXONOMY_VERSION,
  type ClassificationProposal, type ClassificationProposalStore, type OpportunityQuery,
  type OpportunityReader, type OpportunityReadModel,
} from "../../../src/contracts/acd-v2.ts";
import { CAREER_AREAS, normalizeCareerFilterIds } from "../../../src/data/career-taxonomy.ts";
import { JOB_FUNCTIONS } from "../../../src/data/job-functions.ts";
import { getApprovedCareerClassification, isClassificationMetadata } from "../../../src/lib/career-classification.ts";
import { filterJobsForBoard } from "../../../src/lib/job-filters.ts";
import { newestJobs, publicationDay, visibleOnBoard } from "../../../src/lib/job-freshness.ts";
import type { Opportunity } from "../../../src/types/index.ts";
import { transaction } from "./database.ts";
import { canonicalJson, jsonHash } from "./revisions.ts";

type PublicRow = { payload: Opportunity; classification_input_revision: string };
type SnapshotRow = PublicRow | { payload: null; classification_input_revision: null };

function publicReadModel(row: PublicRow): OpportunityReadModel {
  const { careerClassification, ...opportunity } = row.payload;
  const approved = getApprovedCareerClassification(careerClassification);
  return {
    contractVersion: ACD_V2_CONTRACT_VERSION,
    sourceRevision: row.classification_input_revision,
    opportunity: approved ? { ...opportunity, careerClassification: approved } : opportunity,
    classification: approved ? { kind: "mapped", classification: approved } : null,
  };
}

function cursorOffset(cursor: string, sign: (offset: string) => string): number {
  const [offset, signature, extra] = cursor.split(".");
  if (extra !== undefined || !/^\d+$/.test(offset) || !/^[0-9a-f]{64}$/.test(signature ?? "")
    || !Number.isSafeInteger(Number(offset))
    || !timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(sign(offset), "hex"))) {
    throw new Error("Invalid or stale cursor");
  }
  return Number(offset);
}

function validateQuery(query: OpportunityQuery) {
  const { filters, limit, asOfDate, sort, search } = query;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || publicationDay(asOfDate) === null
    || !["curated", "recent", "deadline"].includes(sort) || typeof search !== "string"
    || !filters || ![filters.region, filters.country, filters.roleType, filters.experience, filters.language, filters.career ?? []]
      .every(values => Array.isArray(values) && values.every(value => typeof value === "string"))
    || filters.career?.some(id => normalizeCareerFilterIds([id]).length !== 1)) {
    throw new Error("Invalid Jobs query");
  }
}

/** The caller supplies a trusted server context and an explicitly selected immutable snapshot. */
export function postgresOpportunityReader(pool: Pool, snapshotId: string, cursorSecret: Buffer): OpportunityReader {
  if (cursorSecret.length < 32) throw new Error("Expected a cursor signing key of at least 32 bytes");
  return {
    async getById(id, context) {
      if (context.audience !== "public") throw new Error("Public reader requires public audience");
      const { rows: [record] } = await pool.query<SnapshotRow>(`
        SELECT j.payload, j.classification_input_revision
        FROM acd.board_snapshots s
        LEFT JOIN acd.public_jobs j ON j.snapshot_id = s.id AND j.opportunity_id = $2
        WHERE s.id = $1
      `, [snapshotId, id]);
      if (!record) throw new Error("Unknown snapshot");
      // Current detail routes use exported Jobs membership without the board's display-date filter.
      return record.payload !== null ? publicReadModel(record) : null;
    },
    async list(query, context) {
      if (context.audience !== "public") throw new Error("Public reader requires public audience");
      validateQuery(query);
      const { filters, search, sort, asOfDate, limit, cursor } = query;
      const queryHash = jsonHash({ snapshotId, audience: context.audience, filters, search, sort, asOfDate, limit });
      const sign = (offset: string) => createHmac("sha256", cursorSecret).update(`${queryHash}:${offset}`).digest("hex");
      const offset = cursor === undefined ? 0 : cursorOffset(cursor, sign);
      const { rows } = await pool.query<SnapshotRow>(`
        SELECT j.payload, j.classification_input_revision
        FROM (SELECT id FROM acd.board_snapshots WHERE id = $1) s
        LEFT JOIN acd.public_jobs j ON j.snapshot_id = s.id
        ORDER BY j.ordinal
      `, [snapshotId]);
      if (!rows.length) throw new Error("Unknown snapshot");
      const models = new Map(rows.filter(row => row.payload !== null).map(row => [row.payload.id, publicReadModel(row)]));
      const visible = [...models.values()].map(model => model.opportunity).filter(job => visibleOnBoard(job, asOfDate));
      const filtered = filterJobsForBoard(visible, filters, search);
      const sorted = sort === "recent" ? newestJobs(filtered) : filtered;
      if (sort === "deadline") {
        sorted.sort((left, right) =>
          (publicationDay(left.deadlineDate) ?? Infinity) - (publicationDay(right.deadlineDate) ?? Infinity));
      }
      const next = offset + limit;
      return {
        contractVersion: ACD_V2_CONTRACT_VERSION,
        items: sorted.slice(offset, next).map(job => models.get(job.id)!),
        total: sorted.length,
        nextCursor: next < sorted.length ? `${next}.${sign(String(next))}` : null,
        snapshotRevision: snapshotId,
      };
    },
  };
}

/** This is a trusted proposal writer. Its database role has no review or publication write access. */
export function postgresProposalStore(pool: Pool, snapshotId: string, actorId: string): ClassificationProposalStore {
  return {
    async saveProposal(proposal, idempotencyKey) {
      validateProposal(proposal, actorId, idempotencyKey);
      const hash = jsonHash(proposal);
      return transaction(pool, async client => {
        const { rows: [record] } = await client.query<{
          classification_input_revision: string;
          evidence: unknown;
          source_url: string | null;
        }>(`
          SELECT classification_input_revision, classification_input->'evidence' AS evidence,
                 classification_input->>'sourceUrl' AS source_url
          FROM acd.opportunity_revisions WHERE snapshot_id = $1 AND opportunity_id = $2
        `, [snapshotId, proposal.opportunityId]);
        if (!record) throw new Error("Unknown proposal subject in snapshot");
        if (record.classification_input_revision !== proposal.sourceRevision
          || canonicalJson(record.evidence) !== canonicalJson(proposal.evidence)
          || (proposal.result.kind === "mapped" && proposal.result.classification.sourceUrl !== record.source_url)) {
          throw new Error("Classification source revision or evidence conflict");
        }

        const { rows: [created] } = await client.query<{ id: string }>(`
          INSERT INTO acd.classification_proposals
            (snapshot_id, opportunity_id, actor_id, idempotency_key, classification_input_revision, request_hash, proposal)
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
          ON CONFLICT (actor_id, idempotency_key) DO NOTHING RETURNING id
        `, [snapshotId, proposal.opportunityId, actorId, idempotencyKey, proposal.sourceRevision, hash, JSON.stringify(proposal)]);
        if (created) return { proposalId: created.id, disposition: "created" };
        const { rows: [existing] } = await client.query<{ id: string; request_hash: string }>(
          "SELECT id, request_hash FROM acd.classification_proposals WHERE actor_id = $1 AND idempotency_key = $2",
          [actorId, idempotencyKey],
        );
        if (existing.request_hash !== hash) throw new Error("Proposal idempotency conflict");
        return { proposalId: existing.id, disposition: "already-exists" };
      });
    },
  };
}

function validateProposal(proposal: ClassificationProposal, actorId: string, key: string) {
  const { result } = proposal;
  if (proposal.contractVersion !== ACD_V2_CONTRACT_VERSION || proposal.taxonomyVersion !== ACD_V2_TAXONOMY_VERSION
    || !actorId.trim() || proposal.producer.actorId !== actorId || !key.trim()
    || !["in-scope", "needs-review", "outside-future-scope"].includes(proposal.scopeRecommendation)
    || !proposal.scopeReason.trim() || !/(?:Z|[+-]\d\d:\d\d)$/.test(proposal.createdAt)
    || !Number.isFinite(Date.parse(proposal.createdAt))) throw new Error("Invalid classification proposal");

  if (result.kind === "mapped" && result.classification.status === "proposed"
    && isClassificationMetadata(result.classification)) return;
  if (result.kind === "unresolved" && result.reason.trim() && !("subcategoryId" in result)
    && (result.suggestedAreaId === undefined || CAREER_AREAS.some(area => area.id === result.suggestedAreaId))
    && (result.suggestedJobFunction === undefined || JOB_FUNCTIONS.includes(result.suggestedJobFunction))) return;
  throw new Error("Invalid classification result");
}
