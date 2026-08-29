import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AcdDatabase } from "./db.ts";
import { previewResearchImport } from "./import-preview.ts";
import { readResearchTask } from "./research.ts";
import { EMPLOYER_RESEARCH_RESULT_STRUCTURED_SCHEMA_VERSION, type EmployerResearchResultV1_1 } from "./types.ts";

const RESEARCH_DIRECTORY = "data/acd-runtime/research";

export interface ResearchImportResult {
  applied: boolean;
  idempotent: boolean;
  batchRunId: string;
  runId?: number;
  candidatesToImport: number;
  expiredFindings: number;
}

export interface ResearchImportOptions { apply?: boolean; failAfterVacancy?: boolean; }

function resultPath(root: string, batchRunId: string, employerId: string) { return resolve(root, RESEARCH_DIRECTORY, batchRunId, "results", `${employerId}.result.json`); }
function previewPath(root: string, batchRunId: string) { return resolve(root, RESEARCH_DIRECTORY, batchRunId, "import-preview.json"); }
function readResult(path: string) { return JSON.parse(readFileSync(path, "utf8")) as EmployerResearchResultV1_1; }
function displayBatchNumber(batchId: string) { return String(Number(batchId.replace("batch-", ""))); }

function importClassification(outcome: string, section: string, reason: string) {
  const existing = outcome === "confirmed_published_duplicate";
  const possible = outcome === "possible_published_duplicate" || outcome === "possible_local_duplicate";
  return {
    outcome: existing ? "existing_duplicate" : possible ? "possible_duplicate" : "borderline",
    section,
    confidence: existing ? 1 : possible ? 0.7 : 0.5,
    reasons: [reason],
    missingFields: [] as string[],
    blocking: possible,
  };
}

/** Imports every reviewable preview candidate. All writes are committed or rolled back together. */
export function importResearchRun(root: string, batchRunId: string, options: ResearchImportOptions = {}): ResearchImportResult {
  if (options.apply) {
    const existingDatabase = new AcdDatabase(root);
    try {
      const existing = existingDatabase.db.prepare("SELECT run_id AS runId FROM research_imports WHERE batch_run_id=?").get(batchRunId) as { runId: number } | undefined;
      if (existing) {
        const candidatesToImport = Number((existingDatabase.db.prepare("SELECT COUNT(*) AS count FROM vacancies WHERE run_id=?").get(existing.runId) as { count: number }).count);
        const expiredFindings = Number((existingDatabase.db.prepare("SELECT COUNT(*) AS count FROM research_import_expired_findings WHERE batch_run_id=?").get(batchRunId) as { count: number }).count);
        return { applied: true, idempotent: true, batchRunId, runId: existing.runId, candidatesToImport, expiredFindings };
      }
    } finally { existingDatabase.close(); }
  }
  const { preview } = previewResearchImport(root, batchRunId);
  const candidates = preview.candidates.filter((candidate) => candidate.allowedIntoReview);
  if (!preview.summary.importReady) throw new Error("Research preview contains blocked or excluded candidates.");
  if (!options.apply) return { applied: false, idempotent: false, batchRunId, candidatesToImport: candidates.length, expiredFindings: preview.expiredFindings.length };
  const task = readResearchTask(root, batchRunId);
  const database = new AcdDatabase(root);
  try {
    const existing = database.db.prepare("SELECT run_id AS runId FROM research_imports WHERE batch_run_id=?").get(batchRunId) as { runId: number } | undefined;
    if (existing) return { applied: true, idempotent: true, batchRunId, runId: existing.runId, candidatesToImport: candidates.length, expiredFindings: preview.expiredFindings.length };
    const previewReport = previewPath(root, batchRunId);
    if (!existsSync(previewReport)) throw new Error("Research import requires the validated runtime preview report.");
    const now = new Date().toISOString();
    database.db.exec("BEGIN IMMEDIATE");
    try {
      const label = task.scope === "pilot" ? `Batch ${displayBatchNumber(task.batchId)} Pilot - ${task.employers.map((employer) => employer.displayName.match(/\(([^)]+)\)/)?.[1] ?? employer.displayName).join(" and ")}` : `Batch ${displayBatchNumber(task.batchId)} - Full research`;
      const runId = Number(database.db.prepare("INSERT INTO runs (status,started_at,completed_at,label,import_batch_run_id) VALUES ('completed',?,?,?,?)").run(now, now, label, batchRunId).lastInsertRowid);
      database.db.prepare("INSERT INTO research_imports (batch_run_id,run_id,imported_at,preview_path) VALUES (?,?,?,?)").run(batchRunId, runId, now, previewReport);
      const insertSource = database.db.prepare("INSERT INTO sources (id,employer_id,source_type,url,priority,required,active,access_method,last_verified,expected_coverage,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
      const insertCheck = database.db.prepare("INSERT INTO source_checks (run_id,source_id,result,attempted_at,completed_at,vacancies_collected,failure_reason,manual_review_required) VALUES (?,?,?,?,?,?,?,?)");
      const insertVacancy = database.db.prepare("INSERT INTO vacancies (run_id,source_id,source_key,employer_id,title,location,description,employment_type,requisition_id,published_at,deadline,apply_url,normalized_apply_url,source_url,source_type,evidence,discovered_at,classification_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
      const insertFreshness = database.db.prepare("INSERT INTO vacancy_freshness (source_id,source_key,first_seen_at,last_successfully_seen_at,last_checked_at,official_posted_at,official_deadline,content_fingerprint,application_route_status,freshness_status,freshness_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
      const insertLineage = database.db.prepare("INSERT INTO research_import_lineage (vacancy_id,batch_run_id,employer_id,result_path,source_key,publication_missing_fields_json) VALUES (?,?,?,?,?,?)");
      for (const employer of task.employers) {
        const resultFile = resultPath(root, batchRunId, employer.id);
        const result = readResult(resultFile);
        if (result.schemaVersion !== EMPLOYER_RESEARCH_RESULT_STRUCTURED_SCHEMA_VERSION) throw new Error(`Research import requires v1.1 result: ${employer.id}.`);
        const sourceId = `research-import:${batchRunId}:${employer.id}`;
        const collected = preview.candidates.filter((candidate) => candidate.employerId === employer.id).length;
        const limitation = result.coverage.overallStatus === "limited" ? result.coverage.overallReason : null;
        insertSource.run(sourceId, employer.id, "other_verified", result.activeCandidates[0]?.evidenceUrl ?? employer.sources[0]?.url ?? "https://example.invalid", 1, 1, 0, "manual_review", result.completedAt, "Imported research-result coverage only; registry is unchanged.", limitation ?? "Research result coverage completed.");
        insertCheck.run(runId, sourceId, result.coverage.overallStatus === "limited" ? "partially_successful" : "successful", result.completedAt, result.completedAt, collected, limitation, Number(result.coverage.overallStatus === "limited"));
        result.activeCandidates.forEach((candidate, index) => {
          const previewCandidate = candidates.find((item) => item.employerId === employer.id && item.candidateIndex === index);
          if (!previewCandidate) return;
          const sourceKey = `research:${batchRunId}:${employer.id}:${index}`;
          const classification = importClassification(previewCandidate.outcome, candidate.opportunityType, candidate.classificationReason);
          classification.missingFields = candidate.missingFields;
          const vacancyId = Number(insertVacancy.run(runId, sourceId, sourceKey, employer.id, candidate.title, candidate.location, candidate.evidenceSummary, null, candidate.requisitionId, candidate.officialPostingDate, candidate.officialDeadline, candidate.applicationUrl, candidate.applicationUrl, candidate.evidenceUrl, "Research handoff", candidate.evidenceSummary, result.completedAt, JSON.stringify(classification)).lastInsertRowid);
          insertFreshness.run(sourceId, sourceKey, result.completedAt, result.completedAt, result.completedAt, candidate.officialPostingDate, candidate.officialDeadline, `research:${batchRunId}:${employer.id}:${index}`, candidate.applicationRouteStatus, candidate.freshnessStatus, candidate.freshnessReason);
          insertLineage.run(vacancyId, batchRunId, employer.id, resultFile, sourceKey, JSON.stringify(previewCandidate.publicationMissingFields));
          database.addDuplicates(vacancyId, [...previewCandidate.publishedMatches, ...previewCandidate.localMatches, ...previewCandidate.runMatches]);
          if (options.failAfterVacancy) throw new Error("Forced import failure for transaction test.");
        });
        for (const finding of result.expiredFindings) database.db.prepare("INSERT INTO research_import_expired_findings (batch_run_id,employer_id,title,closure_evidence,exclusion_reason) VALUES (?,?,?,?,?)").run(batchRunId, employer.id, finding.title, finding.closureEvidence, finding.exclusionReason);
      }
      database.db.exec("COMMIT");
      return { applied: true, idempotent: false, batchRunId, runId, candidatesToImport: candidates.length, expiredFindings: preview.expiredFindings.length };
    } catch (error) { database.db.exec("ROLLBACK"); throw error; }
  } finally { database.close(); }
}
