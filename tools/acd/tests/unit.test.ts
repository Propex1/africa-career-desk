import assert from "node:assert/strict";
import test from "node:test";
import { classify } from "../classifier.ts";
import { findDuplicates } from "../dedupe.ts";
import { duplicateKey, normalizeUrl } from "../normalize.ts";
import { AcdDatabase } from "../db.ts";
import { collectSource, workableHumanUrl } from "../collectors.ts";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Script } from "node:vm";
import { pulaDetail, pulaList, workableFeed } from "./fixtures.ts";
import { reviewHtml } from "../server.ts";
import { normalizeLocation } from "../location.ts";
import { assessFreshness, confirmationIsValid, isGenuineRepost } from "../freshness.ts";
import { BATCH_SIZE, batches, employerRegistry } from "../batches.ts";
import { prepareResearchBatch, readResearchTask, saveEmployerResearchResult, validateEmployerResearchResult, validateResearchBatch } from "../research.ts";
import { previewResearchImport } from "../import-preview.ts";
import { importResearchRun } from "../research-import.ts";
import { EMPLOYER_RESEARCH_RESULT_SCHEMA_VERSION, EMPLOYER_RESEARCH_RESULT_STRUCTURED_SCHEMA_VERSION, type EmployerResearchResult, type EmployerResearchResultV1_1, type ResearchTaskEmployer } from "../types.ts";

function removeTemp(root: string) {
  try { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
  catch (error) { if (process.platform !== "win32") throw error; }
}

test("normalizes URLs and cautious duplicate keys", () => {
  assert.equal(normalizeUrl("https://x.example/jobs/1/?utm_source=test#top"), "https://x.example/jobs/1");
  assert.equal(duplicateKey("pula", "Investment Manager", "Nairobi"), duplicateKey("pula", " investment-manager ", " Nairobi "));
});

test("included employers have stable 20-employer batches without reshuffling", () => {
  assert.equal(employerRegistry.employers.length, 142);
  assert.deepEqual(batches.map((batch) => batch.employerIds.length), [20, 20, 20, 20, 20, 20, 20, 2]);
  assert.equal(new Set(batches.flatMap((batch) => batch.employerIds)).size, employerRegistry.employers.length);
  assert.equal(BATCH_SIZE, 20);
});

function limitedResearchResult(batchRunId: string, taskId: string, employer: ResearchTaskEmployer): EmployerResearchResult {
  return {
    schemaVersion: EMPLOYER_RESEARCH_RESULT_SCHEMA_VERSION,
    taskId,
    batchRunId,
    employerId: employer.id,
    completedAt: "2026-08-29T12:00:00.000Z",
    status: "completed_with_limitations",
    coverageStatus: "limited",
    limitationSummary: "Fixture only: no employer research was performed.",
    sourceObservations: employer.sources.map((source) => ({ sourceId: source.id, outcome: "not_checked", note: "Fixture dry-run observation." })),
    opportunities: [],
  };
}

function structuredResearchResult(batchRunId: string, taskId: string, employer: ResearchTaskEmployer): EmployerResearchResultV1_1 {
  const checkedAt = "2026-08-29T12:00:00.000Z";
  return {
    schemaVersion: EMPLOYER_RESEARCH_RESULT_STRUCTURED_SCHEMA_VERSION,
    taskId,
    batchRunId,
    employerId: employer.id,
    completedAt: checkedAt,
    status: "completed_with_limitations",
    coverage: {
      overallStatus: "limited",
      overallReason: "LinkedIn coverage was inaccessible and is not evidence of zero vacancies.",
      paginationCompleted: true,
      dimensions: [
        { dimension: "critical_official_sources", status: "complete", reason: "Required official sources were checked.", sourceIds: employer.sources.filter((source) => source.required).map((source) => source.id) },
        { dimension: "ats_application_platform", status: "not_applicable", reason: "No separate ATS was available in this fixture.", sourceIds: [] },
        { dimension: "google_public_web", status: "complete", reason: "Configured Google discovery checks were completed.", sourceIds: employer.sources.filter((source) => source.type === "google_query").map((source) => source.id) },
        { dimension: "linkedin_discovery", status: "inaccessible", reason: "The public LinkedIn check was inaccessible; no zero-vacancy conclusion was made.", sourceIds: ["linkedin-discovery"] },
        { dimension: "other_configured_sources", status: "complete", reason: "Other configured sources were checked.", sourceIds: employer.sources.filter((source) => !source.required && source.type !== "google_query").map((source) => source.id) },
      ],
    },
    sourceObservations: [
      ...employer.sources.map((source) => ({ sourceId: source.id, scope: "task" as const, sourceType: source.type, outcome: "checked_no_openings" as const, checkedAt, evidenceUrl: source.url ?? "https://example.test/search", note: "Fixture source check." })),
      { sourceId: "linkedin-discovery", scope: "additional", sourceType: "linkedin_jobs", sourceUrl: "https://www.linkedin.com/jobs/", outcome: "inaccessible", note: "Fixture limitation; it does not mean zero jobs." },
    ],
    activeCandidates: [{ title: "Open application", opportunityType: "Open Application", location: null, requisitionId: null, officialPostingDate: null, officialDeadline: null, applicationUrl: "https://example.test/apply", applicationRouteStatus: "available", evidenceUrl: "https://example.test/apply", evidenceQuality: "official", evidenceSummary: "Official fixture channel.", editorialClassification: "borderline_review", classificationReason: "No role details were supplied.", freshnessStatus: "check_freshness", freshnessReason: "No date was available.", missingFields: ["official_deadline", "role_description"], duplicateEvidence: [] }],
    expiredFindings: [{ title: "Expired programme", employer: employer.displayName, sourceUrl: "https://example.test/expired", applicationUrl: null, officialPostingDate: null, officialDeadline: "2026-07-10", closureEvidence: "The deadline passed before the fixture check.", checkedAt, exclusionReason: "Expired and excluded from active candidates." }],
    discoveredSources: [{ sourceType: "official_ats", url: "https://example.test/ats", provider: null, officialEvidenceUrl: "https://example.test/careers", recommendedRegistryAction: "review_registry_source", confidence: "medium", discoveredAt: checkedAt }],
  };
}

test("research handoff snapshots are immutable, results resume independently, and validation never imports vacancies", () => {
  const root = mkdtempSync(join(tmpdir(), "acd-research-"));
  try {
    const preview = prepareResearchBatch(root, { batchId: "batch-08", batchRunId: "fixture-preview", dryRun: true, now: new Date("2026-08-29T12:00:00Z") });
    assert.equal(preview.task.employers.length, 2);
    assert.equal(existsSync(preview.taskPath), false);
    const prepared = prepareResearchBatch(root, { batchId: "batch-08", batchRunId: "fixture-batch-run", now: new Date("2026-08-29T12:00:00Z") });
    assert.equal(prepared.created, true);
    assert.equal(prepareResearchBatch(root, { batchId: "batch-08", batchRunId: "fixture-batch-run" }).created, false);
    const first = limitedResearchResult(prepared.task.batchRunId, prepared.task.taskId, prepared.task.employers[0]);
    saveEmployerResearchResult(root, first);
    let validation = validateResearchBatch(root, prepared.task.batchRunId);
    assert.equal(validation.completed, 1);
    assert.deepEqual(validation.pendingEmployerIds, [prepared.task.employers[1].id]);
    assert.throws(() => saveEmployerResearchResult(root, { ...first, limitationSummary: "Changed result." }), /immutable/);
    for (const employer of prepared.task.employers.slice(1)) saveEmployerResearchResult(root, limitedResearchResult(prepared.task.batchRunId, prepared.task.taskId, employer));
    validation = validateResearchBatch(root, prepared.task.batchRunId);
    assert.equal(validation.valid, true);
    assert.equal(validation.completed, 2);
    assert.equal(validation.summary.schemaVersions["1.0.0"], 2);
    assert.equal(validation.summary.structurallyReadyForFutureImport, false);
  } finally { removeTemp(root); }
});

test("research results cannot claim complete coverage with unchecked required sources", () => {
  const root = mkdtempSync(join(tmpdir(), "acd-research-coverage-"));
  try {
    const prepared = prepareResearchBatch(root, { batchId: "batch-01", batchRunId: "fixture-coverage" });
    const employer = prepared.task.employers.find((item) => item.sources.some((source) => source.required));
    assert.ok(employer);
    const result = limitedResearchResult(prepared.task.batchRunId, prepared.task.taskId, employer);
    assert.throws(() => saveEmployerResearchResult(root, { ...result, status: "completed", coverageStatus: "complete", limitationSummary: undefined }), /Complete coverage/);
  } finally { removeTemp(root); }
});

test("research result v1.1 keeps structured editorial, freshness, source, and closure evidence import-ready", () => {
  const root = mkdtempSync(join(tmpdir(), "acd-research-v11-"));
  try {
    const prepared = prepareResearchBatch(root, { batchId: "batch-08", batchRunId: "fixture-v11" });
    const first = structuredResearchResult(prepared.task.batchRunId, prepared.task.taskId, prepared.task.employers[0]);
    assert.equal(first.schemaVersion, "1.1.0");
    assert.equal(first.activeCandidates[0].location, null);
    assert.deepEqual(first.activeCandidates[0].missingFields, ["official_deadline", "role_description"]);
    assert.equal(first.expiredFindings.length, 1);
    assert.equal(first.discoveredSources.length, 1);
    assert.equal(first.sourceObservations.at(-1)?.scope, "additional");
    assert.doesNotThrow(() => validateEmployerResearchResult(prepared.task, first));
    assert.throws(() => validateEmployerResearchResult(prepared.task, { ...first, status: "completed", coverage: { ...first.coverage, overallStatus: "complete" } }), /Complete structured coverage/);
    saveEmployerResearchResult(root, first);
    saveEmployerResearchResult(root, structuredResearchResult(prepared.task.batchRunId, prepared.task.taskId, prepared.task.employers[1]));
    const validation = validateResearchBatch(root, prepared.task.batchRunId);
    assert.equal(validation.valid, true);
    assert.equal(validation.summary.structurallyReadyForFutureImport, true);
    assert.deepEqual(validation.summary.activeCandidatesByClassification, { borderline_review: 2 });
    assert.deepEqual(validation.summary.activeCandidatesByFreshness, { check_freshness: 2 });
    assert.equal(validation.summary.expiredFindings, 2);
    assert.equal(validation.summary.discoveredSources, 2);
    assert.equal(validation.summary.coverageLimitations.length, 2);
    assert.equal(validation.summary.missingFields.official_deadline, 2);
  } finally { removeTemp(root); }
});

test("research import preview rejects legacy results and never creates a SQLite database", () => {
  const root = mkdtempSync(join(tmpdir(), "acd-preview-legacy-"));
  try {
    const prepared = prepareResearchBatch(root, { batchId: "batch-08", batchRunId: "preview-legacy" });
    for (const employer of prepared.task.employers) saveEmployerResearchResult(root, limitedResearchResult(prepared.task.batchRunId, prepared.task.taskId, employer));
    assert.throws(() => previewResearchImport(root, prepared.task.batchRunId), /v1.1 or newer/);
    assert.equal(existsSync(join(root, "data/acd-runtime/acd.sqlite")), false);
  } finally { removeTemp(root); }
});

test("research import preview is deterministic, read-only, and distinguishes duplicate and readiness outcomes", () => {
  const root = mkdtempSync(join(tmpdir(), "acd-preview-"));
  const createRun = (id: string, mutate?: (result: EmployerResearchResultV1_1) => void) => {
    const prepared = prepareResearchBatch(root, { batchId: "batch-08", batchRunId: id });
    const first = structuredResearchResult(prepared.task.batchRunId, prepared.task.taskId, prepared.task.employers[0]);
    mutate?.(first);
    const second = structuredResearchResult(prepared.task.batchRunId, prepared.task.taskId, prepared.task.employers[1]);
    second.activeCandidates = []; second.expiredFindings = []; second.discoveredSources = [];
    saveEmployerResearchResult(root, first); saveEmployerResearchResult(root, second);
    return prepared;
  };
  try {
    mkdirSync(join(root, "tools/acd"), { recursive: true });
    const registryPath = join(root, "tools/acd/employer-registry.json");
    writeFileSync(registryPath, "registry sentinel\n");
    const generic = createRun("preview-generic");
    const publishedGeneric = [{ employerId: generic.task.employers[0].id, title: "Open application", applyUrl: "https://example.test/apply", evidence: "Official fixture channel." }];
    const first = previewResearchImport(root, generic.task.batchRunId, { publishedComparables: publishedGeneric, localComparables: [], writeReport: true });
    const second = previewResearchImport(root, generic.task.batchRunId, { publishedComparables: publishedGeneric, localComparables: [], writeReport: true });
    assert.deepEqual(first.preview, second.preview);
    assert.equal(first.preview.candidates[0].outcome, "ready_for_review_import");
    assert.equal(first.preview.candidates[0].freshnessWarning, "No date was available.");
    assert.equal(first.preview.candidates[0].eligibleForPublication, false);
    assert.equal(first.preview.expiredFindings.length, 1);
    assert.equal(first.preview.discoveredSourceProposals.length, 1);
    assert.ok(first.path && existsSync(first.path));
    assert.equal(existsSync(join(root, "data/acd-runtime/acd.sqlite")), false);
    assert.equal(readFileSync(registryPath, "utf8"), "registry sentinel\n");

    const exact = createRun("preview-exact", (result) => { result.activeCandidates[0] = { ...result.activeCandidates[0], title: "Investment Manager", opportunityType: "Job", requisitionId: "REQ-1", applicationUrl: "https://example.test/jobs/req-1" }; });
    assert.equal(previewResearchImport(root, exact.task.batchRunId, { publishedComparables: [{ employerId: exact.task.employers[0].id, title: "Other", requisitionId: "REQ-1", applyUrl: "https://example.test/jobs/req-1" }], localComparables: [] }).preview.candidates[0].outcome, "confirmed_published_duplicate");

    const possible = createRun("preview-possible", (result) => { result.activeCandidates[0] = { ...result.activeCandidates[0], title: "Investment Manager", opportunityType: "Job", location: "Nairobi", requisitionId: null, applicationUrl: "https://example.test/jobs/new", evidenceSummary: "Direct investment portfolio management" }; });
    assert.equal(previewResearchImport(root, possible.task.batchRunId, { publishedComparables: [{ employerId: possible.task.employers[0].id, title: "Investment Manager", location: "Nairobi", evidence: "Direct investment portfolio management" }], localComparables: [] }).preview.candidates[0].outcome, "possible_published_duplicate");
    assert.equal(previewResearchImport(root, possible.task.batchRunId, { publishedComparables: [], localComparables: [{ id: 7, employerId: possible.task.employers[0].id, title: "Other", applyUrl: "https://example.test/jobs/new" }] }).preview.candidates[0].outcome, "already_in_local_review");

    const missing = createRun("preview-missing", (result) => { result.activeCandidates[0] = { ...result.activeCandidates[0], opportunityType: "Job", applicationUrl: null, applicationRouteStatus: "unknown" }; });
    assert.equal(previewResearchImport(root, missing.task.batchRunId, { publishedComparables: [], localComparables: [] }).preview.candidates[0].outcome, "blocked_missing_fields");
  } finally { removeTemp(root); }
});

test("research import is explicit, transactional, idempotent, and preserves existing review decisions", () => {
  const root = mkdtempSync(join(tmpdir(), "acd-import-"));
  try {
    mkdirSync(join(root, "tools/acd/migrations"), { recursive: true });
    for (const id of ["001_initial", "002_add_department", "003_add_freshness", "004_batches", "005_research_imports"]) writeFileSync(join(root, `tools/acd/migrations/${id}.sql`), readFileSync(join(import.meta.dirname, `../migrations/${id}.sql`)));
    const db = new AcdDatabase(root); const existingRun = db.createRun();
    const existingVacancy = db.addVacancy(existingRun, { sourceKey: "preserved", employerId: "pula", sourceId: "pula-bamboohr", title: "Preserved review", applicationRouteStatus: "available", sourceUrl: "https://example.test", sourceType: "fixture", evidence: "fixture", discoveredAt: "2026-08-29T12:00:00.000Z" }, { outcome: "borderline", section: "Job", confidence: 0.5, reasons: ["fixture"], missingFields: [], blocking: false });
    db.completeRun(existingRun); db.decide(existingVacancy, "deferred", {}); db.close();
    const prepared = prepareResearchBatch(root, { batchId: "batch-08", batchRunId: "import-fixture" });
    const first = structuredResearchResult(prepared.task.batchRunId, prepared.task.taskId, prepared.task.employers[0]);
    const second = structuredResearchResult(prepared.task.batchRunId, prepared.task.taskId, prepared.task.employers[1]); second.activeCandidates = []; second.expiredFindings = []; second.discoveredSources = [];
    saveEmployerResearchResult(root, first); saveEmployerResearchResult(root, second); previewResearchImport(root, prepared.task.batchRunId, { writeReport: true });
    assert.equal(importResearchRun(root, prepared.task.batchRunId).applied, false);
    assert.throws(() => importResearchRun(root, prepared.task.batchRunId, { apply: true, failAfterVacancy: true }), /Forced import failure/);
    const afterRollback = new AcdDatabase(root); assert.equal(Number((afterRollback.db.prepare("SELECT COUNT(*) AS count FROM research_imports").get() as { count: number }).count), 0); assert.equal((afterRollback.dashboard(undefined, existingRun).vacancies[0] as unknown as { action: string }).action, "deferred"); afterRollback.close();
    const applied = importResearchRun(root, prepared.task.batchRunId, { apply: true });
    const repeated = importResearchRun(root, prepared.task.batchRunId, { apply: true });
    assert.equal(applied.applied, true); assert.equal(applied.idempotent, false); assert.equal(repeated.idempotent, true); assert.equal(repeated.runId, applied.runId);
    const imported = new AcdDatabase(root); const dashboard = imported.dashboard(undefined, applied.runId);
    assert.equal(dashboard.vacancies.length, 1); assert.equal((dashboard.vacancies[0] as unknown as { title: string }).title, "Open application");
    assert.equal(dashboard.checks.length, 2); assert.equal(Number((imported.db.prepare("SELECT COUNT(*) AS count FROM research_import_expired_findings").get() as { count: number }).count), 1);
    assert.equal(Number((imported.db.prepare("SELECT COUNT(*) AS count FROM research_import_lineage").get() as { count: number }).count), 1);
    const importedVacancyId = (dashboard.vacancies[0] as unknown as { id: number }).id;
    assert.throws(() => imported.decide(importedVacancyId, "approved", {}), /Freshness must be confirmed/);
    imported.confirmFreshness(importedVacancyId);
    assert.equal((imported.dashboard(undefined, applied.runId).vacancies[0] as unknown as { freshness_status: string }).freshness_status, "verified_active");
    imported.decide(importedVacancyId, "approved", {});
    assert.equal((imported.dashboard(undefined, applied.runId).vacancies[0] as unknown as { action: string }).action, "approved");
    assert.throws(() => imported.createManifest(), /required publication fields/);
    imported.close();
    const reloaded = new AcdDatabase(root);
    assert.equal((reloaded.dashboard(undefined, applied.runId).vacancies[0] as unknown as { action: string }).action, "approved");
    assert.equal((reloaded.dashboard(undefined, existingRun).vacancies[0] as unknown as { action: string }).action, "deferred"); reloaded.close();
  } finally { removeTemp(root); }
});

test("pilot research selection is explicit, batch-constrained, immutable, and leaves batch storage untouched", () => {
  const root = mkdtempSync(join(tmpdir(), "acd-research-pilot-"));
  const dfc = "employer-128-u-s-international-development-finance-corporation-dfc";
  const boad = "employer-132-west-african-development-bank-boad";
  try {
    assert.throws(() => prepareResearchBatch(root, { batchId: "batch-07", employerIds: [dfc] }), /explicit pilot mode/);
    assert.throws(() => prepareResearchBatch(root, { batchId: "batch-07", pilot: true }), /at least one/);
    assert.throws(() => prepareResearchBatch(root, { batchId: "batch-07", pilot: true, employerIds: ["unknown-employer"] }), /Unknown employer/);
    assert.throws(() => prepareResearchBatch(root, { batchId: "batch-07", pilot: true, employerIds: ["employer-030-africa50"] }), /does not belong/);
    assert.throws(() => prepareResearchBatch(root, { batchId: "batch-07", pilot: true, employerIds: [dfc, dfc] }), /duplicate/);
    const preview = prepareResearchBatch(root, { batchId: "batch-07", pilot: true, employerIds: [dfc, boad], batchRunId: "pilot-batch-07-dfc-boad-preview", dryRun: true });
    assert.equal(preview.task.scope, "pilot");
    assert.deepEqual(preview.task.selectedEmployerIds, [dfc, boad]);
    assert.equal(existsSync(preview.taskPath), false);
    const fullBatch = prepareResearchBatch(root, { batchId: "batch-08", batchRunId: "batch-08-full-preview", dryRun: true });
    assert.equal(fullBatch.task.scope, "full_batch");
    assert.deepEqual(fullBatch.task.selectedEmployerIds, batches.find((batch) => batch.id === "batch-08")?.employerIds);
    const prepared = prepareResearchBatch(root, { batchId: "batch-07", pilot: true, employerIds: [dfc, boad], batchRunId: "pilot-batch-07-dfc-boad-fixture" });
    assert.equal(existsSync(join(root, "data/acd-runtime/acd.sqlite")), false);
    assert.equal(prepared.task.employers.length, 2);
    assert.deepEqual(readResearchTask(root, prepared.task.batchRunId).selectedEmployerIds, [dfc, boad]);
    assert.equal(prepareResearchBatch(root, { batchId: "batch-07", pilot: true, employerIds: [dfc, boad], batchRunId: prepared.task.batchRunId }).created, false);
    assert.throws(() => prepareResearchBatch(root, { batchId: "batch-07", pilot: true, employerIds: [boad, dfc], batchRunId: prepared.task.batchRunId }), /different immutable employer selection/);
  } finally { removeTemp(root); }
});
test("same employer and same requisition is an existing entry", () => {
  const vacancy = { sourceKey: "1", employerId: "pula", sourceId: "p", title: "Investment Manager", requisitionId: "42", sourceUrl: "https://example.test", sourceType: "Official ATS", evidence: "fixture", discoveredAt: "2026-01-01" };
  const matches = findDuplicates(vacancy, [{ id: 1, employerId: "pula", title: "Different role", requisitionId: "42" }]);
  assert.deepEqual(matches.map((match) => match.kind), ["exact"]);
  assert.equal(matches[0].basis, "requisition_id");
});

test("distinct requisitions with the same employer, title and role evidence stay cautious", () => {
  const vacancy = { sourceKey: "1", employerId: "afreximbank", sourceId: "p", title: "Investment Manager", location: "Kigali, Rwanda", requisitionId: "878EE60088", description: "Lead direct investment portfolio management", sourceUrl: "https://example.test", sourceType: "Official ATS", evidence: "fixture", discoveredAt: "2026-01-01" };
  const matches = findDuplicates(vacancy, [{ employerId: "afreximbank", title: "investment-manager", location: "Kigali, Rwanda", requisitionId: "1518D569F4", evidence: "Direct investment portfolio management" }]);
  assert.deepEqual(matches.map((match) => match.kind), ["cautious"]);
});

test("distinct requisitions with different mandates are not duplicates", () => {
  const vacancy = { sourceKey: "1", employerId: "afreximbank", sourceId: "p", title: "Director Treasury Resource Mobilisation", location: "Cairo", requisitionId: "CDC5C2F331", sourceUrl: "https://example.test", sourceType: "Official ATS", evidence: "Treasury resource mobilisation", discoveredAt: "2026-01-01" };
  const matches = findDuplicates(vacancy, [{ employerId: "afreximbank", title: "Investment Manager", location: "Kigali", requisitionId: "2993C85B66", evidence: "Investment portfolio management" }]);
  assert.deepEqual(matches, []);
});

test("different employers and generic or missing identities never make exact matches", () => {
  const vacancy = { sourceKey: "1", employerId: "pula", sourceId: "p", title: "Investment Manager", location: "Nairobi", applyUrl: "https://example.test/careers", sourceUrl: "https://example.test", sourceType: "Official ATS", evidence: "fixture", discoveredAt: "2026-01-01" };
  const matches = findDuplicates(vacancy, [{ employerId: "other", title: "Investment Manager", location: "Nairobi", applyUrl: "https://example.test/careers" }, { employerId: "pula", title: "Investment Manager", location: "Nairobi", applyUrl: "https://example.test/careers" }]);
  assert.equal(matches.some((match) => match.kind === "exact"), false);
});
test("classifier favours recall and identifies programmes", () => {
  const result = classify({ sourceKey: "1", employerId: "pula", sourceId: "p", title: "Graduate Investment Programme", description: "Finance and infrastructure rotation", sourceUrl: "x", sourceType: "Official ATS", evidence: "x", discoveredAt: "x" });
  assert.equal(result.outcome, "borderline"); assert.equal(result.section, "Programme");
  assert.equal(classify({ sourceKey: "2", employerId: "pula", sourceId: "p", title: "Role", sourceUrl: "x", sourceType: "Official ATS", evidence: "x", discoveredAt: "x" }).outcome, "insufficient_evidence");
});

test("review decisions persist and manifests reject unresolved blocking items", () => {
  const root = mkdtempSync(join(tmpdir(), "acd-test-"));
  try {
    mkdirSync(join(root, "tools/acd/migrations"), { recursive: true });
    writeFileSync(join(root, "tools/acd/migrations/001_initial.sql"), readFileSync(join(import.meta.dirname, "../migrations/001_initial.sql")));
    writeFileSync(join(root, "tools/acd/migrations/002_add_department.sql"), readFileSync(join(import.meta.dirname, "../migrations/002_add_department.sql")));
    writeFileSync(join(root, "tools/acd/migrations/003_add_freshness.sql"), readFileSync(join(import.meta.dirname, "../migrations/003_add_freshness.sql")));
    writeFileSync(join(root, "tools/acd/migrations/004_batches.sql"), readFileSync(join(import.meta.dirname, "../migrations/004_batches.sql")));
    writeFileSync(join(root, "tools/acd/migrations/005_research_imports.sql"), readFileSync(join(import.meta.dirname, "../migrations/005_research_imports.sql")));
    const db = new AcdDatabase(root); const run = db.createRun();
    const id = db.addVacancy(run, { sourceKey: "fixture", employerId: "pula", sourceId: "pula-bamboohr", title: "Investment Manager", deadline: "2099-01-01", applicationRouteStatus: "available", sourceUrl: "https://example.test", sourceType: "Official ATS", evidence: "fixture", discoveredAt: "2026-01-01" }, { outcome: "strong_candidate", section: "Job", confidence: 0.8, reasons: ["fixture"], missingFields: [], blocking: false });
    db.completeRun(run);
    assert.throws(() => db.createManifest(), /candidate or blocking/);
    db.decide(id, "deferred", {}, "Needs source check");
    db.close();
    const reopened = new AcdDatabase(root);
    assert.equal((reopened.dashboard().vacancies[0] as unknown as { action: string }).action, "deferred");
    reopened.decide(id, "approved", { title: "Edited" });
    assert.match(reopened.createManifest().path, /publication-manifest\.json$/);
    reopened.close();
  } finally { removeTemp(root); }
});

test("LinkedIn source state is explicit and never treated as complete coverage", async () => {
  const result = await collectSource({ id: "fixture-linkedin", employerId: "pula", type: "linkedin_jobs", url: "https://linkedin.example/jobs", priority: 3, required: true, active: true, accessMethod: "manual_review", lastVerified: "2026-01-01", expectedCoverage: "Partial", notes: "fixture" });
  assert.equal(result.result, "partially_successful");
  assert.equal(result.manualReviewRequired, true);
});

test("official adapters consume mocked feeds without requiring live websites", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL) => new Response(String(url).includes("afreximbank") ? workableFeed : String(url).endsWith("/list") ? JSON.stringify(pulaList) : JSON.stringify(pulaDetail), { status: 200 })) as typeof fetch;
  try {
    const workable = await collectSource({ id: "afreximbank-workable", employerId: "afreximbank", type: "official_ats", url: "https://apply.workable.com/afreximbank/jobs.md", priority: 1, required: true, active: true, accessMethod: "http_markdown", lastVerified: "x", expectedCoverage: "x", notes: "x" });
    const pula = await collectSource({ id: "pula-bamboohr", employerId: "pula", type: "official_ats", url: "https://pula.bamboohr.com/careers/list", priority: 1, required: true, active: true, accessMethod: "http_json", lastVerified: "x", expectedCoverage: "x", notes: "x" });
    assert.equal(workable.vacancies[0].requisitionId, "REQ-123"); assert.equal(workable.vacancies[0].applyUrl, "https://apply.workable.com/afreximbank/j/REQ-123/"); assert.equal(pula.vacancies[0].description, "Lead investment and climate finance work.");
  } finally { globalThis.fetch = originalFetch; }
});

test("an incomplete run is available for resumption and preserves its source checkpoint", () => {
  const root = mkdtempSync(join(tmpdir(), "acd-resume-"));
  try {
    mkdirSync(join(root, "tools/acd/migrations"), { recursive: true }); for (const id of ["001_initial", "002_add_department", "003_add_freshness", "004_batches", "005_research_imports"]) writeFileSync(join(root, `tools/acd/migrations/${id}.sql`), readFileSync(join(import.meta.dirname, `../migrations/${id}.sql`)));
    const first = new AcdDatabase(root); const run = first.createRun(); first.recordCheck(run, "pula-careers", "successful", 0); first.close();
    const reopened = new AcdDatabase(root); assert.equal(reopened.latestInterruptedRun(), run); assert.equal(reopened.sourceWasChecked(run, "pula-careers"), true); reopened.close();
  } finally { removeTemp(root); }
});

test("review page uses safe delegated decisions and exposes retry feedback", () => {
  assert.match(reviewHtml, /id="load-error"/);
  assert.match(reviewHtml, /data-action="retry"/);
  assert.doesNotMatch(reviewHtml, /Review request failed/);
  assert.match(reviewHtml, /data-decision=/);
  assert.doesNotMatch(reviewHtml, /onclick=/);
  const script = /<script>([\s\S]+)<\/script>/.exec(reviewHtml)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Script(script));
});

test("ordinary data and commercial roles are never made programmes by incidental copy", () => {
  const analyst = classify({ sourceKey: "data", employerId: "pula", sourceId: "p", title: "Data Analyst", description: "Our graduate programme supports agriculture insurance.", sourceUrl: "x", sourceType: "Official ATS", evidence: "x", discoveredAt: "x" });
  const commercial = classify({ sourceKey: "commercial", employerId: "pula", sourceId: "p", title: "Commercial Director, Data Services", description: "Our investment programme is growing.", sourceUrl: "x", sourceType: "Official ATS", evidence: "x", discoveredAt: "x" });
  assert.equal(analyst.section, "Job"); assert.equal(analyst.outcome, "borderline");
  assert.equal(commercial.section, "Job"); assert.equal(commercial.outcome, "out_of_scope");
});

test("location normalization removes placeholder and duplicate values", () => {
  assert.equal(normalizeLocation("Open", "Open"), "Location not specified");
  assert.equal(normalizeLocation("Kampala", "N/A"), "Kampala");
  assert.equal(normalizeLocation("NA (Hybrid)"), "Hybrid");
});

test("review page gives existing and possible duplicates their own queue", () => {
  assert.match(reviewHtml, /Existing \/ possible duplicates/);
  assert.match(reviewHtml, /possible_duplicate/);
  assert.match(reviewHtml, /Freshness reason/);
});

test("decision states have accessible distinct colours", () => {
  assert.match(reviewHtml, /\.decision\.approved\[aria-pressed="true"\]\{background:var\(--green\)/);
  assert.match(reviewHtml, /\.decision\.rejected\[aria-pressed="true"\]\{background:var\(--red\)/);
  assert.match(reviewHtml, /\.decision\.deferred\[aria-pressed="true"\]\{background:var\(--amber\)/);
  assert.match(reviewHtml, /aria-pressed=/);
});

test("Workable reviewer URLs use the human-readable route", () => {
  assert.equal(workableHumanUrl("656824C839"), "https://apply.workable.com/afreximbank/j/656824C839/");
});

test("existing and confirmed duplicates are excluded from manifests", () => {
  const root = mkdtempSync(join(tmpdir(), "acd-duplicates-"));
  try {
    mkdirSync(join(root, "tools/acd/migrations"), { recursive: true });
    for (const id of ["001_initial", "002_add_department", "003_add_freshness", "004_batches", "005_research_imports"]) writeFileSync(join(root, `tools/acd/migrations/${id}.sql`), readFileSync(join(import.meta.dirname, `../migrations/${id}.sql`)));
    const db = new AcdDatabase(root); const run = db.createRun();
    const add = (key: string, outcome: "existing_duplicate" | "possible_duplicate") => db.addVacancy(run, { sourceKey: key, employerId: "pula", sourceId: "pula-bamboohr", title: key, deadline: "2099-01-01", applicationRouteStatus: "available", sourceUrl: "https://example.test", sourceType: "Official ATS", evidence: "fixture", discoveredAt: "2026-01-01" }, { outcome, section: "Job", confidence: 0.8, reasons: ["fixture"], missingFields: [], blocking: false });
    const existing = add("Existing", "existing_duplicate"); const confirmed = add("Confirmed", "possible_duplicate"); const treatedNew = add("Treated new", "possible_duplicate");
    db.completeRun(run); db.decide(confirmed, "confirmed_duplicate", {}); db.decide(treatedNew, "treat_as_new", {});
    assert.throws(() => db.createManifest(), /candidate or blocking/);
    db.decide(treatedNew, "approved", {});
    const content = db.createManifest().content as { approved: Array<{ title: string }> };
    assert.deepEqual(content.approved.map((item) => item.title), ["Treated new"]);
    assert.equal((db.dashboard().vacancies.find((item) => (item as unknown as { id: number }).id === existing) as unknown as { action: null }).action, null);
    db.close();
  } finally { removeTemp(root); }
});

test("freshness rules cover deadlines, age boundaries, routes, confirmations and reposts", () => {
  const now = new Date("2026-08-29T12:00:00Z");
  assert.equal(assessFreshness({ deadline: "2026-08-30", applicationRouteStatus: "available", now }).status, "verified_active");
  assert.equal(assessFreshness({ deadline: "2026-08-28", applicationRouteStatus: "available", now }).status, "closed_expired");
  assert.equal(assessFreshness({ publishedAt: "2026-06-30", applicationRouteStatus: "available", now }).status, "verified_active");
  assert.equal(assessFreshness({ publishedAt: "2026-05-29", applicationRouteStatus: "available", now }).status, "check_freshness");
  assert.equal(assessFreshness({ applicationRouteStatus: "available", sourcePresent: true, now }).status, "check_freshness");
  assert.equal(assessFreshness({ publishedAt: "2026-08-01", applicationRouteStatus: "broken", now }).status, "check_freshness");
  assert.equal(confirmationIsValid("2026-07-30T12:00:00Z", now), true);
  assert.equal(confirmationIsValid("2026-07-29T11:59:59Z", now), false);
  assert.equal(isGenuineRepost({ requisitionId: "A", publishedAt: "2026-08-01", title: "Role" }, { requisitionId: "A", publishedAt: "2026-08-01", title: "Role", description: "Cosmetic copy" }), false);
  assert.equal(isGenuineRepost({ requisitionId: "A", publishedAt: "2026-08-01", title: "Role" }, { requisitionId: "B", publishedAt: "2026-08-01", title: "Role" }), true);
});
