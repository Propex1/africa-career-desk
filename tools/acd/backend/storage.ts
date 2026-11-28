import { createHmac, timingSafeEqual } from "node:crypto";
import type { Pool } from "pg";
import {
  ACD_V2_CONTRACT_VERSION,
  type ClassificationProposalStore, type OpportunityQuery,
  type OpportunityReader, type OpportunityReadModel,
} from "../../../src/contracts/acd-v2.ts";
import { normalizeCareerFilterIds } from "../../../src/data/career-taxonomy.ts";
import { getApprovedCareerClassification } from "../../../src/lib/career-classification.ts";
import { filterJobsForBoard } from "../../../src/lib/job-filters.ts";
import { newestJobs, publicationDay, visibleOnBoard } from "../../../src/lib/job-freshness.ts";
import type { Opportunity } from "../../../src/types/index.ts";
import { jsonHash } from "./revisions.ts";

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

/** Read the operator-selected snapshot using the restricted database reader. */
export function postgresOpportunityReader(pool: Pool, cursorSecret: Buffer): OpportunityReader {
  if (cursorSecret.length < 32) throw new Error("Expected a cursor signing key of at least 32 bytes");
  return {
    async getById(id, context) {
      if (context.audience !== "public") throw new Error("Public reader requires public audience");
      const { rows: [record] } = await pool.query<SnapshotRow>(`
        SELECT j.payload, j.classification_input_revision
        FROM acd.public_snapshot s
        LEFT JOIN acd.public_jobs j ON j.snapshot_id = s.snapshot_id AND j.opportunity_id = $1
      `, [id]);
      if (!record) throw new Error("No active snapshot");
      // Current detail routes use exported Jobs membership without the board's display-date filter.
      return record.payload !== null ? publicReadModel(record) : null;
    },
    async list(query, context) {
      if (context.audience !== "public") throw new Error("Public reader requires public audience");
      validateQuery(query);
      const { filters, search, sort, asOfDate, limit, cursor } = query;
      // Read the selected ID and its rows in one statement, including empty boards.
      const { rows } = await pool.query<SnapshotRow & { snapshot_id: string }>(`
        SELECT s.snapshot_id, j.payload, j.classification_input_revision
        FROM acd.public_snapshot s
        LEFT JOIN acd.public_jobs j USING (snapshot_id)
        ORDER BY j.ordinal
      `);
      const snapshotId = rows[0]?.snapshot_id;
      if (!snapshotId) throw new Error("No active snapshot");
      const queryHash = jsonHash({ snapshotId, audience: context.audience, filters, search, sort, asOfDate, limit });
      const sign = (offset: string) => createHmac("sha256", cursorSecret).update(`${queryHash}:${offset}`).digest("hex");
      const offset = cursor === undefined ? 0 : cursorOffset(cursor, sign);
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

/** PostgreSQL authenticates the actor and validates every new proposal. */
export function postgresProposalStore(pool: Pool): ClassificationProposalStore {
  return {
    async saveProposal(proposal, idempotencyKey) {
      const { rows: [result] } = await pool.query<{
        proposal_id: string;
        disposition: "created" | "already-exists";
      }>("SELECT proposal_id, disposition FROM acd.save_proposal($1::jsonb, $2::text)",
        [JSON.stringify(proposal), idempotencyKey]);
      return { proposalId: result.proposal_id, disposition: result.disposition };
    },
  };
}
