import { DatabaseSync } from "node:sqlite";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { findDuplicates, type ComparableVacancy } from "./dedupe.ts";
import { loadExistingOpportunities } from "./existing.ts";
import { normalizeUrl } from "./normalize.ts";
import { readResearchTask, validateEmployerResearchResult, validateResearchBatch } from "./research.ts";
import { EMPLOYER_RESEARCH_RESULT_STRUCTURED_SCHEMA_VERSION, type EmployerResearchResultV1_1, type StructuredResearchOpportunity } from "./types.ts";

const RESEARCH_DIRECTORY = "data/acd-runtime/research";

export type PreviewOutcome = "ready_for_review_import" | "possible_published_duplicate" | "confirmed_published_duplicate" | "possible_local_duplicate" | "already_in_local_review" | "blocked_missing_fields" | "blocked_freshness" | "excluded_out_of_scope" | "excluded_closed_expired";

export interface ResearchImportPreview {
  batchRunId: string;
  employerResultCount: number;
  candidates: Array<{
    employerId: string;
    employer: string;
    title: string;
    opportunityType: string;
    outcome: PreviewOutcome;
    allowedIntoReview: boolean;
    eligibleForPublication: boolean;
    reviewMissingFields: string[];
    publicationMissingFields: string[];
    freshnessWarning: string | null;
    blockingReasons: string[];
    publishedMatches: ReturnType<typeof findDuplicates>;
    localMatches: ReturnType<typeof findDuplicates>;
    runMatches: ReturnType<typeof findDuplicates>;
  }>;
  expiredFindings: Array<{ employerId: string; title: string; closureEvidence: string; exclusionReason: string }>;
  discoveredSourceProposals: Array<{ employerId: string; employer: string; sourceType: string; url: string; provider: string | null; confidence: string; proposedAction: string }>;
  summary: {
    activeCandidates: number;
    readyForReview: number;
    duplicateCategories: Record<string, number>;
    freshnessWarnings: number;
    blockedCandidates: number;
    excludedCandidates: number;
    expiredFindings: number;
    discoveredSourceProposals: number;
    importReady: boolean;
    blockingReasons: string[];
  };
}

export interface PreviewOptions {
  publishedComparables?: ComparableVacancy[];
  localComparables?: ComparableVacancy[];
  writeReport?: boolean;
}

function runPath(root: string, batchRunId: string) { return resolve(root, RESEARCH_DIRECTORY, batchRunId); }
function resultPath(root: string, batchRunId: string, employerId: string) { return join(runPath(root, batchRunId), "results", `${employerId}.result.json`); }
function readResult(path: string) { return JSON.parse(readFileSync(path, "utf8")) as EmployerResearchResultV1_1; }

function localComparables(root: string): ComparableVacancy[] {
  const path = resolve(root, "data/acd-runtime/acd.sqlite");
  if (!existsSync(path)) return [];
  const database = new DatabaseSync(path);
  try {
    // DatabaseSync has no read-only constructor option in this runtime. Query-only blocks all writes.
    database.exec("PRAGMA query_only = ON");
    return database.prepare("SELECT id, employer_id AS employerId, title, location, requisition_id AS requisitionId, apply_url AS applyUrl, evidence FROM vacancies ORDER BY id").all() as ComparableVacancy[];
  } finally { database.close(); }
}

function publishedComparables(root: string): ComparableVacancy[] {
  return existsSync(resolve(root, "src/data/opportunities.ts")) ? loadExistingOpportunities(root) : [];
}

function candidateComparable(employerId: string, candidate: StructuredResearchOpportunity, reference?: string): ComparableVacancy & { description: string } {
  return { employerId, title: candidate.title, location: candidate.location ?? undefined, requisitionId: candidate.requisitionId ?? undefined, applyUrl: candidate.applicationUrl ?? undefined, evidence: candidate.evidenceSummary, reference, description: candidate.evidenceSummary };
}

function genericOpenApplication(candidate: StructuredResearchOpportunity): boolean {
  if (candidate.opportunityType !== "Open Application") return false;
  if (candidate.requisitionId) return false;
  const url = normalizeUrl(candidate.applicationUrl ?? undefined);
  if (!url) return true;
  const path = new URL(url).pathname.replace(/\/$/, "");
  return /\/(?:careers?|jobs?|annonces?|apply)$/i.test(path);
}

function duplicateMatches(employerId: string, candidate: StructuredResearchOpportunity, comparables: ComparableVacancy[]) {
  const matches = findDuplicates({ sourceKey: "research-preview", employerId, sourceId: "research-preview", title: candidate.title, location: candidate.location ?? undefined, description: candidate.evidenceSummary, requisitionId: candidate.requisitionId ?? undefined, applyUrl: candidate.applicationUrl ?? undefined, sourceUrl: candidate.evidenceUrl, sourceType: "Research result", evidence: candidate.evidenceSummary, discoveredAt: "" }, comparables);
  return genericOpenApplication(candidate) ? [] : matches;
}

function reviewMissingFields(candidate: StructuredResearchOpportunity) {
  const missing: string[] = [];
  if (!candidate.title.trim()) missing.push("title");
  if (!candidate.evidenceUrl) missing.push("evidence_url");
  if (!candidate.applicationUrl || candidate.applicationRouteStatus !== "available") missing.push("application_url");
  return missing;
}

function publicationMissingFields(candidate: StructuredResearchOpportunity, reviewMissing: string[]) {
  const missing = new Set([...reviewMissing, ...candidate.missingFields]);
  if (!candidate.location) missing.add("location");
  if (candidate.freshnessStatus !== "verified_active") missing.add("verified_freshness");
  return [...missing].sort();
}

/** Builds and optionally writes an ignored report. It never imports or mutates SQLite. */
export function previewResearchImport(root: string, batchRunId: string, options: PreviewOptions = {}): { preview: ResearchImportPreview; path?: string } {
  const validation = validateResearchBatch(root, batchRunId);
  if (!validation.valid) throw new Error("Research run must validate before it can be previewed.");
  const task = readResearchTask(root, batchRunId);
  const results = task.employers.map((employer) => {
    const result = readResult(resultPath(root, batchRunId, employer.id));
    if (result.schemaVersion !== EMPLOYER_RESEARCH_RESULT_STRUCTURED_SCHEMA_VERSION) throw new Error(`Research import preview requires result schema v1.1 or newer: ${employer.id}.`);
    validateEmployerResearchResult(task, result);
    return { employer, result };
  });
  const published = options.publishedComparables ?? publishedComparables(root);
  const local = options.localComparables ?? localComparables(root);
  const runComparables = results.flatMap(({ result }) => result.activeCandidates.map((candidate, index) => candidateComparable(result.employerId, candidate, `research:${result.employerId}:${index}`)));
  const candidates = results.flatMap(({ employer, result }) => result.activeCandidates.map((candidate, index) => {
    const reviewMissing = reviewMissingFields(candidate);
    const publicationMissing = publicationMissingFields(candidate, reviewMissing);
    const publishedMatches = duplicateMatches(result.employerId, candidate, published);
    const localMatches = duplicateMatches(result.employerId, candidate, local);
    const runMatches = duplicateMatches(result.employerId, candidate, runComparables.filter((item) => item.reference !== `research:${result.employerId}:${index}`));
    const blockingReasons: string[] = [];
    let outcome: PreviewOutcome = "ready_for_review_import";
    if (candidate.editorialClassification === "out_of_scope") { outcome = "excluded_out_of_scope"; blockingReasons.push("Research classification is out of scope."); }
    else if (candidate.freshnessStatus === "closed_expired") { outcome = "excluded_closed_expired"; blockingReasons.push("Research result marks the candidate closed or expired."); }
    else if (reviewMissing.length) { outcome = "blocked_missing_fields"; blockingReasons.push(`Missing review-import fields: ${reviewMissing.join(", ")}.`); }
    else if (publishedMatches.some((match) => match.kind === "exact")) { outcome = "confirmed_published_duplicate"; blockingReasons.push("Exact published duplicate evidence was found."); }
    else if (publishedMatches.length) { outcome = "possible_published_duplicate"; blockingReasons.push("Possible published duplicate evidence requires reviewer resolution."); }
    else if (localMatches.some((match) => match.kind === "exact")) { outcome = "already_in_local_review"; blockingReasons.push("An exact local-review vacancy already exists."); }
    else if (localMatches.length || runMatches.length) { outcome = "possible_local_duplicate"; blockingReasons.push("Possible local or same-run duplicate evidence requires reviewer resolution."); }
    else if (candidate.freshnessStatus !== "verified_active" && candidate.freshnessStatus !== "check_freshness") { outcome = "blocked_freshness"; blockingReasons.push("Freshness is not suitable for review import."); }
    const freshnessWarning = candidate.freshnessStatus === "check_freshness" ? candidate.freshnessReason : null;
    return { employerId: result.employerId, employer: employer.displayName, title: candidate.title, opportunityType: candidate.opportunityType, outcome, allowedIntoReview: outcome === "ready_for_review_import", eligibleForPublication: outcome === "ready_for_review_import" && !publicationMissing.length, reviewMissingFields: reviewMissing, publicationMissingFields: publicationMissing, freshnessWarning, blockingReasons, publishedMatches, localMatches, runMatches };
  }));
  const expiredFindings = results.flatMap(({ result }) => result.expiredFindings.map((finding) => ({ employerId: result.employerId, title: finding.title, closureEvidence: finding.closureEvidence, exclusionReason: finding.exclusionReason })));
  const discoveredSourceProposals = results.flatMap(({ employer, result }) => result.discoveredSources.map((source) => ({ employerId: result.employerId, employer: employer.displayName, sourceType: source.sourceType, url: source.url, provider: source.provider, confidence: source.confidence, proposedAction: source.recommendedRegistryAction })));
  const duplicateCategories = Object.fromEntries(["confirmed_published_duplicate", "possible_published_duplicate", "already_in_local_review", "possible_local_duplicate"].map((outcome) => [outcome, candidates.filter((candidate) => candidate.outcome === outcome).length]));
  const blockers = [...new Set(candidates.flatMap((candidate) => candidate.blockingReasons))];
  const preview: ResearchImportPreview = { batchRunId, employerResultCount: results.length, candidates, expiredFindings, discoveredSourceProposals, summary: { activeCandidates: candidates.length, readyForReview: candidates.filter((candidate) => candidate.outcome === "ready_for_review_import").length, duplicateCategories, freshnessWarnings: candidates.filter((candidate) => candidate.freshnessWarning).length, blockedCandidates: candidates.filter((candidate) => candidate.outcome === "blocked_missing_fields" || candidate.outcome === "blocked_freshness").length, excludedCandidates: candidates.filter((candidate) => candidate.outcome.startsWith("excluded_")).length, expiredFindings: expiredFindings.length, discoveredSourceProposals: discoveredSourceProposals.length, importReady: candidates.every((candidate) => candidate.outcome === "ready_for_review_import"), blockingReasons: blockers } };
  if (!options.writeReport) return { preview };
  const path = join(runPath(root, batchRunId), "import-preview.json");
  const content = `${JSON.stringify(preview, null, 2)}\n`;
  if (!existsSync(path) || readFileSync(path, "utf8") !== content) writeFileSync(path, content);
  return { preview, path };
}
