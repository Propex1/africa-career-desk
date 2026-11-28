/** Preparation contract only. No storage, network, scheduler or publication implementation. */
import type { Opportunity } from "../types/index.ts";
import type { CareerClassification } from "../lib/career-classification.ts";
import type { CareerAreaId } from "../data/career-taxonomy.ts";
import type { JobFunction } from "../data/job-functions.ts";
import type { JobBoardFilters } from "../lib/job-filters.ts";
import type { JobBoardSort } from "../lib/job-board-state.ts";

export const ACD_V2_CONTRACT_VERSION = "acd-v2/1" as const;
export const ACD_V2_TAXONOMY_VERSION = "2026-11-28" as const;

/** Existing classification evidence shape; changing these duties invalidates a proposal. */
export interface ClassificationEvidence {
  readonly summary: string;
  readonly aboutRole: string;
  readonly responsibilities: readonly string[];
  readonly requirements: readonly string[];
}

/** Classification fit and editorial scope are separate from publication decisions. */
export type ScopeRecommendation = "in-scope" | "needs-review" | "outside-future-scope";
export type ProposedCareerClassification = Extract<CareerClassification, { status: "proposed" }>;

export interface UnresolvedClassification {
  readonly kind: "unresolved";
  readonly reason: string;
  readonly suggestedAreaId?: CareerAreaId;
  readonly suggestedJobFunction?: JobFunction;
}

export type ProposedClassificationResult =
  | { readonly kind: "mapped"; readonly classification: ProposedCareerClassification }
  | UnresolvedClassification;

export interface ClassificationProposal {
  readonly contractVersion: typeof ACD_V2_CONTRACT_VERSION;
  readonly taxonomyVersion: typeof ACD_V2_TAXONOMY_VERSION;
  readonly opportunityId: Opportunity["id"];
  /** Opaque revision supplied by the source adapter, not invented by the model. */
  readonly sourceRevision: string;
  readonly evidence: ClassificationEvidence;
  readonly result: ProposedClassificationResult;
  readonly scopeRecommendation: ScopeRecommendation;
  readonly scopeReason: string;
  readonly createdAt: string; // ISO 8601 timestamp, with timezone.
  readonly producer: {
    readonly actorId: string;
    readonly model?: string;
    readonly promptVersion?: string;
  };
}

export interface ClassificationReview {
  readonly proposalId: string;
  readonly sourceRevision: string;
  readonly decision: "approve-mapping" | "reject-mapping" | "request-evidence";
  readonly reviewerId: string;
  readonly reviewedAt: string;
  readonly reason: string;
}

export type ReviewedClassificationResult =
  | { readonly kind: "mapped"; readonly classification: CareerClassification }
  | UnresolvedClassification;

/** Lossless domain record, not a second catalogue of job identity/publication fields. */
export interface OpportunityReadModel {
  readonly contractVersion: typeof ACD_V2_CONTRACT_VERSION;
  readonly sourceRevision: string;
  readonly opportunity: Opportunity;
  readonly classification: ReviewedClassificationResult | null;
}

export interface OpportunityQuery {
  readonly filters: Readonly<JobBoardFilters>;
  readonly search: string;
  readonly sort: JobBoardSort;
  readonly asOfDate: string; // YYYY-MM-DD, resolved by the server.
  readonly limit: number; // Future adapter validates 1..100.
  readonly cursor?: string; // Opaque, stable for the query and snapshot.
}

/** Trusted server context; never accept editorial-preview from a browser query parameter. */
export interface OpportunityReadContext {
  readonly audience: "public" | "editorial-preview";
  readonly principalId?: string;
}

export interface OpportunityPage {
  readonly contractVersion: typeof ACD_V2_CONTRACT_VERSION;
  readonly items: readonly OpportunityReadModel[];
  readonly total: number;
  readonly nextCursor: string | null;
  readonly snapshotRevision: string;
}

export interface OpportunityReader {
  getById(id: string, context: OpportunityReadContext): Promise<OpportunityReadModel | null>;
  list(query: OpportunityQuery, context: OpportunityReadContext): Promise<OpportunityPage>;
}

/** Future editor-only persistence boundary: saving a proposal cannot publish a job. */
export interface ClassificationProposalStore {
  saveProposal(proposal: ClassificationProposal, idempotencyKey: string): Promise<{
    readonly proposalId: string;
    readonly disposition: "created" | "already-exists";
  }>;
}

/** No implementation or daily schedule is created by these monitoring DTOs. */
export interface MonitoringSourceResult {
  readonly runId: string;
  readonly employerId: string;
  readonly sourceUrl: string;
  readonly checkedAt: string;
  readonly outcome: "success" | "partial" | "failed" | "manual-review-required";
  readonly observations: readonly {
    readonly sourceVacancyKey: string;
    readonly sourceUrl: string;
    readonly fetchedAt: string;
    readonly contentHash: string;
    readonly sourceText: string;
    readonly existingOpportunityId?: string;
  }[];
  readonly issues: readonly string[];
}
