import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { join, relative, resolve } from "node:path";
import { batches, employerRegistry, type RegistryEmployer } from "./batches.ts";
import {
  EMPLOYER_RESEARCH_RESULT_SCHEMA_VERSION,
  EMPLOYER_RESEARCH_RESULT_STRUCTURED_SCHEMA_VERSION,
  RESEARCH_TASK_SCHEMA_VERSION,
  type EmployerResearchResult,
  type EmployerResearchResultV1_1,
  type ResearchCoverageDimension,
  type ResearchTask,
  type ResearchTaskEmployer,
  type ResearchTaskSource,
  type VersionedEmployerResearchResult,
} from "./types.ts";

const RESEARCH_DIRECTORY = "data/acd-runtime/research";
const TASK_FILE = "research-task.json";
const RESULTS_DIRECTORY = "results";

export interface PrepareResearchOptions {
  batchId: string;
  batchRunId?: string;
  pilot?: boolean;
  employerIds?: string[];
  dryRun?: boolean;
  now?: Date;
}

export interface PreparedResearchBatch {
  task: ResearchTask;
  taskPath: string;
  created: boolean;
}

export interface ResearchValidation {
  batchRunId: string;
  taskPath: string;
  expected: number;
  completed: number;
  pendingEmployerIds: string[];
  invalid: Array<{ employerId: string; error: string }>;
  summary: {
    schemaVersions: Record<string, number>;
    activeCandidatesByClassification: Record<string, number>;
    activeCandidatesByFreshness: Record<string, number>;
    expiredFindings: number;
    discoveredSources: number;
    coverageLimitations: Array<{ employerId: string; reason: string }>;
    missingFields: Record<string, number>;
    structurallyReadyForFutureImport: boolean;
    importReadinessIssues: string[];
  };
  valid: boolean;
}

function runtimePath(root: string, batchRunId: string) {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(batchRunId)) throw new Error("batchRunId must contain only letters, numbers, and hyphens.");
  return resolve(root, RESEARCH_DIRECTORY, batchRunId);
}

function sourceSnapshot(employer: RegistryEmployer): ResearchTaskSource[] {
  const sources: ResearchTaskSource[] = employer.otherVerifiedSources.map((source) => ({
    id: source.id,
    type: source.type,
    url: source.url,
    required: source.required,
    accessMethod: source.accessMethod,
    expectedCoverage: employer.sourceStatus,
  }));
  if (employer.careersUrl && !sources.some((source) => source.url === employer.careersUrl)) sources.push({ id: `${employer.id}-careers`, type: "official_careers", url: employer.careersUrl, required: true, accessMethod: "web_page", expectedCoverage: employer.sourceStatus });
  if (employer.linkedInCompanyUrl) sources.push({ id: `${employer.id}-linkedin-company`, type: "linkedin_company", url: employer.linkedInCompanyUrl, required: false, accessMethod: "manual_review", expectedCoverage: "Optional manual LinkedIn coverage only." });
  if (employer.linkedInJobsUrl) sources.push({ id: `${employer.id}-linkedin-jobs`, type: "linkedin_jobs", url: employer.linkedInJobsUrl, required: false, accessMethod: "manual_review", expectedCoverage: "Optional manual LinkedIn coverage only." });
  employer.googleQueries.forEach((query, index) => sources.push({ id: `${employer.id}-google-${index + 1}`, type: "google_query", query, required: false, accessMethod: "search", expectedCoverage: "Discovery aid only; never an official listing source." }));
  return sources;
}

function employerSnapshot(employer: RegistryEmployer): ResearchTaskEmployer {
  return { id: employer.id, displayName: employer.displayName, aliases: employer.aliases, inclusionRule: employer.inclusionRule, manualReviewNotes: employer.manualReviewNotes, sources: sourceSnapshot(employer) };
}

function taskPath(root: string, batchRunId: string) { return join(runtimePath(root, batchRunId), TASK_FILE); }
function resultPath(root: string, batchRunId: string, employerId: string) { return join(runtimePath(root, batchRunId), RESULTS_DIRECTORY, `${employerId}.result.json`); }
function readJson<T>(path: string): T { return JSON.parse(readFileSync(path, "utf8")) as T; }
function validDate(value: unknown) { return typeof value === "string" && !Number.isNaN(Date.parse(value)); }
function validUrl(value: unknown) { try { return typeof value === "string" && Boolean(new URL(value)); } catch { return false; } }
function pilotToken(employer: RegistryEmployer) {
  const abbreviation = employer.displayName.match(/\(([A-Za-z0-9]+)\)/)?.[1];
  return (abbreviation ?? employer.displayName.split(/\s+/)[0]).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function prepareResearchBatch(root: string, options: PrepareResearchOptions): PreparedResearchBatch {
  const batch = batches.find((item) => item.id === options.batchId);
  if (!batch) throw new Error(`Unknown batch: ${options.batchId}`);
  const requestedEmployerIds = options.employerIds ?? [];
  if (options.pilot && !requestedEmployerIds.length) throw new Error("Pilot preparation requires at least one --employer.");
  if (!options.pilot && requestedEmployerIds.length) throw new Error("Employer filtering requires explicit pilot mode.");
  if (new Set(requestedEmployerIds).size !== requestedEmployerIds.length) throw new Error("Pilot employer selection contains duplicate employer IDs.");
  const selectedEmployerIds = options.pilot ? requestedEmployerIds : batch.employerIds;
  const employers = selectedEmployerIds.map((id) => {
    const employer = employerRegistry.employers.find((item) => item.id === id);
    if (!employer) throw new Error(`Unknown employer: ${id}`);
    if (!batch.employerIds.includes(id)) throw new Error(`Employer ${id} does not belong to ${batch.id}.`);
    return employer;
  });
  const scope = options.pilot ? "pilot" : "full_batch";
  const readablePilotId = `pilot-${batch.id}-${employers.map(pilotToken).join("-")}-${(options.now ?? new Date()).toISOString().replace(/[:.]/g, "-")}-${randomUUID().slice(0, 8)}`.toLowerCase();
  const batchRunId = options.batchRunId ?? (options.pilot ? readablePilotId : `${batch.id}-${(options.now ?? new Date()).toISOString().replace(/[:.]/g, "-")}`.toLowerCase());
  if (options.pilot && !batchRunId.startsWith(`pilot-${batch.id}-`)) throw new Error(`Pilot batchRunId must begin with pilot-${batch.id}-.`);
  const path = taskPath(root, batchRunId);
  if (existsSync(path)) {
    const task = readResearchTask(root, batchRunId);
    if (task.batchId !== batch.id) throw new Error(`Existing research task ${batchRunId} belongs to ${task.batchId}.`);
    if (task.scope !== scope || task.selectedEmployerIds.join("|") !== selectedEmployerIds.join("|")) throw new Error(`Existing research task ${batchRunId} has a different immutable employer selection.`);
    return { task, taskPath: path, created: false };
  }
  const task: ResearchTask = {
    schemaVersion: RESEARCH_TASK_SCHEMA_VERSION,
    taskId: `research-task:${batchRunId}`,
    batchId: batch.id,
    batchRunId,
    scope,
    selectedEmployerIds,
    createdAt: (options.now ?? new Date()).toISOString(),
    instructionsPath: "tools/acd/research-instructions.md",
    employers: employers.map(employerSnapshot),
  };
  if (!options.dryRun) {
    mkdirSync(join(runtimePath(root, batchRunId), RESULTS_DIRECTORY), { recursive: true });
    writeFileSync(path, `${JSON.stringify(task, null, 2)}\n`, { flag: "wx" });
  }
  return { task, taskPath: path, created: !options.dryRun };
}

export function readResearchTask(root: string, batchRunId: string): ResearchTask {
  const path = taskPath(root, batchRunId);
  if (!existsSync(path)) throw new Error(`Research task not found: ${relative(root, path)}`);
  const task = readJson<ResearchTask>(path);
  validateResearchTask(task);
  return task;
}

export function validateResearchTask(task: ResearchTask) {
  if (task.schemaVersion !== RESEARCH_TASK_SCHEMA_VERSION || !task.taskId || !task.batchId || !task.batchRunId || !["pilot", "full_batch"].includes(task.scope) || !Array.isArray(task.selectedEmployerIds) || !task.selectedEmployerIds.length || !validDate(task.createdAt) || !task.instructionsPath || !Array.isArray(task.employers) || !task.employers.length) throw new Error("Invalid ResearchTask v1.");
  if (new Set(task.employers.map((employer) => employer.id)).size !== task.employers.length) throw new Error("ResearchTask has duplicate employers.");
  if (new Set(task.selectedEmployerIds).size !== task.selectedEmployerIds.length || task.selectedEmployerIds.length !== task.employers.length || task.selectedEmployerIds.some((id, index) => id !== task.employers[index]?.id)) throw new Error("ResearchTask selected employers do not match its immutable snapshot.");
  if (task.scope === "pilot" && !task.batchRunId.startsWith(`pilot-${task.batchId}-`)) throw new Error("Pilot ResearchTask batchRunId is not identifiable.");
  for (const employer of task.employers) {
    if (!employer.id || !employer.displayName || !Array.isArray(employer.sources) || new Set(employer.sources.map((source) => source.id)).size !== employer.sources.length) throw new Error(`Invalid ResearchTask employer: ${employer.id || "unknown"}.`);
  }
}

function validateLegacyEmployerResearchResult(task: ResearchTask, result: EmployerResearchResult) {
  const employer = task.employers.find((item) => item.id === result.employerId);
  if (!employer) throw new Error(`Result employer is not in task: ${result.employerId}`);
  if (result.schemaVersion !== EMPLOYER_RESEARCH_RESULT_SCHEMA_VERSION || result.taskId !== task.taskId || result.batchRunId !== task.batchRunId || !validDate(result.completedAt) || !["completed", "completed_with_limitations"].includes(result.status) || !["complete", "limited"].includes(result.coverageStatus) || !Array.isArray(result.sourceObservations) || !Array.isArray(result.opportunities)) throw new Error(`Invalid EmployerResearchResult for ${result.employerId}.`);
  const expected = employer.sources.map((source) => source.id);
  const observed = result.sourceObservations.map((source) => source.sourceId);
  if (new Set(observed).size !== observed.length || observed.length !== expected.length || observed.some((id) => !expected.includes(id))) throw new Error(`Source observations must cover each task source exactly once for ${result.employerId}.`);
  for (const observation of result.sourceObservations) {
    if (!["checked_no_openings", "checked_openings_found", "inaccessible", "not_checked", "not_applicable"].includes(observation.outcome) || typeof observation.note !== "string" || !observation.note.trim()) throw new Error(`Invalid source observation for ${result.employerId}.`);
    if (observation.outcome.startsWith("checked_") && (!validDate(observation.checkedAt) || !observation.evidenceUrl)) throw new Error(`Checked source observations need a timestamp and evidence URL for ${result.employerId}.`);
  }
  for (const opportunity of result.opportunities) if (!opportunity.title || !opportunity.evidenceUrl) throw new Error(`Research opportunities need a title and evidence URL for ${result.employerId}.`);
  const requiredComplete = employer.sources.filter((source) => source.required).every((source) => ["checked_no_openings", "checked_openings_found"].includes(result.sourceObservations.find((item) => item.sourceId === source.id)?.outcome ?? ""));
  if (result.coverageStatus === "complete" && (!requiredComplete || result.status !== "completed")) throw new Error(`Complete coverage requires every required source to be checked for ${result.employerId}.`);
  if (result.coverageStatus === "limited" && (result.status !== "completed_with_limitations" || !result.limitationSummary?.trim())) throw new Error(`Limited coverage requires completed_with_limitations and a limitation summary for ${result.employerId}.`);
}

const coverageDimensions: ResearchCoverageDimension[] = ["critical_official_sources", "ats_application_platform", "google_public_web", "linkedin_discovery", "other_configured_sources"];
const observationOutcomes = ["checked_no_openings", "checked_openings_found", "inaccessible", "not_checked", "not_applicable", "partially_checked"];

function validateStructuredEmployerResearchResult(task: ResearchTask, result: EmployerResearchResultV1_1) {
  const employer = task.employers.find((item) => item.id === result.employerId);
  if (!employer) throw new Error(`Result employer is not in task: ${result.employerId}`);
  if (result.taskId !== task.taskId || result.batchRunId !== task.batchRunId || !validDate(result.completedAt) || !["completed", "completed_with_limitations"].includes(result.status) || !result.coverage || !Array.isArray(result.sourceObservations) || !Array.isArray(result.activeCandidates) || !Array.isArray(result.expiredFindings) || !Array.isArray(result.discoveredSources)) throw new Error(`Invalid EmployerResearchResult v1.1 for ${result.employerId}.`);
  const expected = employer.sources.map((source) => source.id);
  const taskObservations = result.sourceObservations.filter((observation) => observation.scope === "task");
  const additionalObservations = result.sourceObservations.filter((observation) => observation.scope === "additional");
  const observed = result.sourceObservations.map((source) => source.sourceId);
  if (new Set(observed).size !== observed.length || taskObservations.length !== expected.length || taskObservations.some((observation) => !expected.includes(observation.sourceId)) || additionalObservations.some((observation) => expected.includes(observation.sourceId))) throw new Error(`Structured source observations must cover each task source once and use distinct additional IDs for ${result.employerId}.`);
  for (const observation of result.sourceObservations) {
    if (!observation.sourceId || !["task", "additional"].includes(observation.scope) || !observation.sourceType || !observationOutcomes.includes(observation.outcome) || !observation.note?.trim()) throw new Error(`Invalid structured source observation for ${result.employerId}.`);
    if (observation.sourceUrl && !validUrl(observation.sourceUrl)) throw new Error(`Invalid structured source URL for ${result.employerId}.`);
    if (["checked_no_openings", "checked_openings_found", "partially_checked"].includes(observation.outcome) && (!validDate(observation.checkedAt) || !validUrl(observation.evidenceUrl))) throw new Error(`Checked structured source observations need a timestamp and evidence URL for ${result.employerId}.`);
  }
  const coverage = result.coverage;
  if (!["complete", "limited"].includes(coverage.overallStatus) || !coverage.overallReason?.trim() || typeof coverage.paginationCompleted !== "boolean" || !Array.isArray(coverage.dimensions) || coverage.dimensions.length !== coverageDimensions.length || new Set(coverage.dimensions.map((item) => item.dimension)).size !== coverageDimensions.length || coverage.dimensions.some((item) => !coverageDimensions.includes(item.dimension) || !["complete", "partial", "inaccessible", "not_applicable"].includes(item.status) || !item.reason?.trim() || !Array.isArray(item.sourceIds))) throw new Error(`Invalid structured coverage for ${result.employerId}.`);
  const requiredComplete = employer.sources.filter((source) => source.required).every((source) => ["checked_no_openings", "checked_openings_found"].includes(taskObservations.find((item) => item.sourceId === source.id)?.outcome ?? ""));
  const materialLimitation = !coverage.paginationCompleted || coverage.dimensions.some((item) => item.status === "partial" || item.status === "inaccessible");
  if (coverage.overallStatus === "complete" && (!requiredComplete || materialLimitation || result.status !== "completed")) throw new Error(`Complete structured coverage requires required sources, pagination, and no material limitation for ${result.employerId}.`);
  if (coverage.overallStatus === "limited" && result.status !== "completed_with_limitations") throw new Error(`Limited structured coverage requires completed_with_limitations for ${result.employerId}.`);
  for (const candidate of result.activeCandidates) {
    if (!candidate.title?.trim() || !["Job", "Programme", "Open Application"].includes(candidate.opportunityType) || !["available", "broken", "unknown"].includes(candidate.applicationRouteStatus) || !validUrl(candidate.evidenceUrl) || !["official", "authorized", "secondary", "insufficient"].includes(candidate.evidenceQuality) || !["strong_candidate", "borderline_review", "out_of_scope", "insufficient_evidence", "existing_on_acd", "possible_duplicate"].includes(candidate.editorialClassification) || !candidate.classificationReason?.trim() || !["verified_active", "check_freshness", "closed_expired"].includes(candidate.freshnessStatus) || !candidate.freshnessReason?.trim() || !Array.isArray(candidate.missingFields) || !Array.isArray(candidate.duplicateEvidence)) throw new Error(`Invalid structured active candidate for ${result.employerId}.`);
    if (candidate.location !== null && typeof candidate.location !== "string" || candidate.requisitionId !== null && typeof candidate.requisitionId !== "string" || candidate.officialPostingDate !== null && typeof candidate.officialPostingDate !== "string" || candidate.officialDeadline !== null && typeof candidate.officialDeadline !== "string" || candidate.applicationUrl !== null && !validUrl(candidate.applicationUrl)) throw new Error(`Structured candidate factual fields must be strings or null for ${result.employerId}.`);
    if (candidate.applicationRouteStatus === "available" && !candidate.applicationUrl) throw new Error(`Available application routes need an application URL for ${result.employerId}.`);
    if (candidate.freshnessStatus === "closed_expired") throw new Error(`Closed or expired findings must not be active candidates for ${result.employerId}.`);
  }
  for (const finding of result.expiredFindings) {
    if (!finding.title?.trim() || !finding.employer?.trim() || !validUrl(finding.sourceUrl) || finding.applicationUrl !== null && !validUrl(finding.applicationUrl) || finding.officialPostingDate !== null && typeof finding.officialPostingDate !== "string" || finding.officialDeadline !== null && typeof finding.officialDeadline !== "string" || !finding.closureEvidence?.trim() || !validDate(finding.checkedAt) || !finding.exclusionReason?.trim()) throw new Error(`Invalid expired finding for ${result.employerId}.`);
  }
  for (const source of result.discoveredSources) {
    if (!source.sourceType || !validUrl(source.url) || source.provider !== null && typeof source.provider !== "string" || !validUrl(source.officialEvidenceUrl) || !["add_official_source", "review_registry_source", "no_action"].includes(source.recommendedRegistryAction) || !["high", "medium", "low"].includes(source.confidence) || !validDate(source.discoveredAt)) throw new Error(`Invalid discovered source for ${result.employerId}.`);
  }
}

export function validateEmployerResearchResult(task: ResearchTask, result: VersionedEmployerResearchResult) {
  if (result.schemaVersion === EMPLOYER_RESEARCH_RESULT_SCHEMA_VERSION) return validateLegacyEmployerResearchResult(task, result);
  if (result.schemaVersion === EMPLOYER_RESEARCH_RESULT_STRUCTURED_SCHEMA_VERSION) return validateStructuredEmployerResearchResult(task, result);
  throw new Error("Unsupported EmployerResearchResult schema version.");
}

export function saveEmployerResearchResult(root: string, result: VersionedEmployerResearchResult) {
  const task = readResearchTask(root, result.batchRunId);
  validateEmployerResearchResult(task, result);
  const path = resultPath(root, result.batchRunId, result.employerId);
  const content = `${JSON.stringify(result, null, 2)}\n`;
  if (existsSync(path)) {
    if (readFileSync(path, "utf8") !== content) throw new Error(`Research result already exists and is immutable: ${relative(root, path)}`);
    return path;
  }
  writeFileSync(path, content, { flag: "wx" });
  return path;
}

/** Validation is read-only: it never imports vacancies or changes database state. */
export function validateResearchBatch(root: string, batchRunId: string): ResearchValidation {
  const task = readResearchTask(root, batchRunId);
  const pendingEmployerIds: string[] = [];
  const invalid: ResearchValidation["invalid"] = [];
  const summary: ResearchValidation["summary"] = { schemaVersions: {}, activeCandidatesByClassification: {}, activeCandidatesByFreshness: {}, expiredFindings: 0, discoveredSources: 0, coverageLimitations: [], missingFields: {}, structurallyReadyForFutureImport: true, importReadinessIssues: [] };
  let completed = 0;
  for (const employer of task.employers) {
    const path = resultPath(root, batchRunId, employer.id);
    if (!existsSync(path)) { pendingEmployerIds.push(employer.id); continue; }
    try {
      const result = readJson<VersionedEmployerResearchResult>(path);
      validateEmployerResearchResult(task, result); completed++;
      summary.schemaVersions[result.schemaVersion] = (summary.schemaVersions[result.schemaVersion] ?? 0) + 1;
      if (result.schemaVersion === EMPLOYER_RESEARCH_RESULT_STRUCTURED_SCHEMA_VERSION) {
        if (result.coverage.overallStatus === "limited") summary.coverageLimitations.push({ employerId: result.employerId, reason: result.coverage.overallReason });
        summary.expiredFindings += result.expiredFindings.length;
        summary.discoveredSources += result.discoveredSources.length;
        for (const candidate of result.activeCandidates) {
          summary.activeCandidatesByClassification[candidate.editorialClassification] = (summary.activeCandidatesByClassification[candidate.editorialClassification] ?? 0) + 1;
          summary.activeCandidatesByFreshness[candidate.freshnessStatus] = (summary.activeCandidatesByFreshness[candidate.freshnessStatus] ?? 0) + 1;
          for (const field of candidate.missingFields) summary.missingFields[field] = (summary.missingFields[field] ?? 0) + 1;
        }
      } else {
        summary.structurallyReadyForFutureImport = false;
        summary.importReadinessIssues.push(`${result.employerId} uses legacy schema 1.0.0 without structured editorial and freshness fields.`);
      }
    }
    catch (error) { invalid.push({ employerId: employer.id, error: error instanceof Error ? error.message : String(error) }); }
  }
  if (pendingEmployerIds.length) { summary.structurallyReadyForFutureImport = false; summary.importReadinessIssues.push("One or more employer results are still pending."); }
  if (invalid.length) { summary.structurallyReadyForFutureImport = false; summary.importReadinessIssues.push("One or more employer results are invalid."); }
  return { batchRunId, taskPath: taskPath(root, batchRunId), expected: task.employers.length, completed, pendingEmployerIds, invalid, summary, valid: !pendingEmployerIds.length && !invalid.length };
}
