export type SourceResult = "attempted" | "successful" | "partially_successful" | "inaccessible" | "login_required" | "rate_limited" | "blocked" | "unsupported" | "parser_error" | "no_vacancies_found";
export type ReviewOutcome = "strong_candidate" | "borderline" | "out_of_scope" | "existing_duplicate" | "possible_duplicate" | "insufficient_evidence" | "source_inaccessible";
export type DecisionAction = "approved" | "rejected" | "deferred" | "confirmed_duplicate" | "treat_as_new";
export type ApplicationRouteStatus = "available" | "broken" | "unknown";
export type FreshnessStatus = "verified_active" | "check_freshness" | "closed_expired";
export type ACDSection = "Job" | "Programme" | "Open Application";

export interface Employer { id: string; name: string; aliases: string[]; logoUrl?: string; }
export interface Source { id: string; employerId: string; type: "official_careers" | "official_ats" | "linkedin_company" | "linkedin_jobs" | "other_verified"; url: string; priority: number; required: boolean; active: boolean; accessMethod: "http_json" | "http_markdown" | "web_page" | "manual_review"; lastVerified: string; expectedCoverage: string; notes: string; }
export interface CollectedVacancy { sourceKey: string; employerId: string; sourceId: string; title: string; department?: string; location?: string; description?: string; employmentType?: string; requisitionId?: string; publishedAt?: string; deadline?: string; applyUrl?: string; applicationRouteStatus?: ApplicationRouteStatus; sourceUrl: string; sourceType: string; evidence: string; discoveredAt: string; }
export interface Classification { outcome: ReviewOutcome; section: ACDSection; category?: string; confidence: number; reasons: string[]; missingFields: string[]; blocking: boolean; archived?: boolean; archivedAt?: string; archivalReason?: string; }
export interface DuplicateMatch { kind: "exact" | "cautious"; basis: "requisition_id" | "application_url" | "title_location" | "existing_listing" | "previous_decision"; vacancyId?: number; externalReference?: string; detail: string; }

export const RESEARCH_TASK_SCHEMA_VERSION = "1.0.0" as const;
export const EMPLOYER_RESEARCH_RESULT_SCHEMA_VERSION = "1.0.0" as const;
export const EMPLOYER_RESEARCH_RESULT_STRUCTURED_SCHEMA_VERSION = "1.1.0" as const;

export type ResearchSourceOutcome = "checked_no_openings" | "checked_openings_found" | "inaccessible" | "not_checked" | "not_applicable";
export type ResearchCoverageStatus = "complete" | "limited";
export type EmployerResearchStatus = "completed" | "completed_with_limitations";

export interface ResearchTaskSource {
  id: string;
  type: Source["type"] | "google_query";
  url?: string;
  query?: string;
  required: boolean;
  accessMethod: Source["accessMethod"] | "search";
  expectedCoverage: string;
}

export interface ResearchTaskEmployer {
  id: string;
  displayName: string;
  aliases: string[];
  inclusionRule: string;
  manualReviewNotes: string;
  sources: ResearchTaskSource[];
}

/** Immutable, batch-scoped input for one research handoff. */
export interface ResearchTask {
  schemaVersion: typeof RESEARCH_TASK_SCHEMA_VERSION;
  taskId: string;
  batchId: string;
  batchRunId: string;
  scope: "pilot" | "full_batch";
  selectedEmployerIds: string[];
  createdAt: string;
  instructionsPath: string;
  employers: ResearchTaskEmployer[];
}

export interface SourceObservation {
  sourceId: string;
  outcome: ResearchSourceOutcome;
  checkedAt?: string;
  evidenceUrl?: string;
  note: string;
}

export interface ResearchOpportunity {
  title: string;
  location?: string;
  requisitionId?: string;
  applicationUrl?: string;
  evidenceUrl: string;
  summary?: string;
}

/** Independently saved output for one employer in a ResearchTask snapshot. */
export interface EmployerResearchResult {
  schemaVersion: typeof EMPLOYER_RESEARCH_RESULT_SCHEMA_VERSION;
  taskId: string;
  batchRunId: string;
  employerId: string;
  completedAt: string;
  status: EmployerResearchStatus;
  coverageStatus: ResearchCoverageStatus;
  limitationSummary?: string;
  sourceObservations: SourceObservation[];
  opportunities: ResearchOpportunity[];
}

export type StructuredResearchSourceOutcome = ResearchSourceOutcome | "partially_checked";
export type ResearchCoverageDimension = "critical_official_sources" | "ats_application_platform" | "google_public_web" | "linkedin_discovery" | "other_configured_sources";
export type ResearchCoverageDimensionStatus = "complete" | "partial" | "inaccessible" | "not_applicable";
export type ResearchEditorialClassification = "strong_candidate" | "borderline_review" | "out_of_scope" | "insufficient_evidence" | "existing_on_acd" | "possible_duplicate";
export type ResearchEvidenceQuality = "official" | "authorized" | "secondary" | "insufficient";
export type RegistryRecommendation = "add_official_source" | "review_registry_source" | "no_action";

export interface StructuredSourceObservation {
  sourceId: string;
  scope: "task" | "additional";
  sourceType: ResearchTaskSource["type"];
  sourceUrl?: string;
  outcome: StructuredResearchSourceOutcome;
  checkedAt?: string;
  evidenceUrl?: string;
  note: string;
}

export interface ResearchCoverageAssessment {
  dimension: ResearchCoverageDimension;
  status: ResearchCoverageDimensionStatus;
  reason: string;
  sourceIds: string[];
}

export interface StructuredResearchCoverage {
  overallStatus: ResearchCoverageStatus;
  overallReason: string;
  paginationCompleted: boolean;
  dimensions: ResearchCoverageAssessment[];
}

export interface StructuredResearchOpportunity {
  title: string;
  opportunityType: ACDSection;
  location: string | null;
  requisitionId: string | null;
  officialPostingDate: string | null;
  officialDeadline: string | null;
  applicationUrl: string | null;
  applicationRouteStatus: ApplicationRouteStatus;
  evidenceUrl: string;
  evidenceQuality: ResearchEvidenceQuality;
  evidenceSummary: string;
  editorialClassification: ResearchEditorialClassification;
  classificationReason: string;
  freshnessStatus: FreshnessStatus;
  freshnessReason: string;
  missingFields: string[];
  duplicateEvidence: string[];
}

export interface ExpiredResearchFinding {
  title: string;
  employer: string;
  sourceUrl: string;
  applicationUrl: string | null;
  officialPostingDate: string | null;
  officialDeadline: string | null;
  closureEvidence: string;
  checkedAt: string;
  exclusionReason: string;
}

export interface DiscoveredResearchSource {
  sourceType: ResearchTaskSource["type"];
  url: string;
  provider: string | null;
  officialEvidenceUrl: string;
  recommendedRegistryAction: RegistryRecommendation;
  confidence: "high" | "medium" | "low";
  discoveredAt: string;
}

/** Structured v1.1 output. It remains immutable after it is first saved. */
export interface EmployerResearchResultV1_1 {
  schemaVersion: typeof EMPLOYER_RESEARCH_RESULT_STRUCTURED_SCHEMA_VERSION;
  taskId: string;
  batchRunId: string;
  employerId: string;
  completedAt: string;
  status: EmployerResearchStatus;
  coverage: StructuredResearchCoverage;
  sourceObservations: StructuredSourceObservation[];
  activeCandidates: StructuredResearchOpportunity[];
  expiredFindings: ExpiredResearchFinding[];
  discoveredSources: DiscoveredResearchSource[];
}

export type VersionedEmployerResearchResult = EmployerResearchResult | EmployerResearchResultV1_1;
