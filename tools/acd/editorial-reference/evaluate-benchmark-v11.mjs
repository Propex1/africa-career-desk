/** Compare candidate and frozen framework on identical, fixed source records. No model calls. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import benchmark from "./editorial-benchmark-v1.json" with { type: "json" };
import { assessFrameworkV1, ELIGIBILITY_FRAMEWORK_VERSION } from "./framework-v1.ts";
import { assessFrameworkV11, ELIGIBILITY_V11 } from "./framework-v11.ts";
import { validateModelProposal } from "./classification-assistant-v1.ts";
import { isCareerSelection } from "../../../src/data/career-taxonomy.ts";
import { JOB_FUNCTIONS } from "../../../src/data/job-functions.ts";

const read = file => JSON.parse(fs.readFileSync(new URL(file, import.meta.url), "utf8"));
const revision = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const keys = ["scope", "areaId", "subcategoryId", "jobFunction"];

function decision(scope, result) {
  return result.kind === "mapped"
    ? { scope, areaId: result.classification.areaId, subcategoryId: result.classification.subcategoryId, jobFunction: result.classification.jobFunction }
    : { scope, areaId: result.suggestedAreaId ?? null, subcategoryId: null, jobFunction: result.suggestedJobFunction ?? null };
}

function fromAssessment(assessment) {
  return decision(assessment.eligibility.decision, assessment.classification);
}

const count = (rows, predicate) => rows.filter(predicate).length;
const fullMatch = (actual, expected) => keys.every(key => actual[key] === expected[key]);

function counts(rows, field) {
  const scored = rows.filter(row => row[field]);
  return {
    compared: scored.length,
    agreement: Object.fromEntries(keys.map(key => [key, count(scored, row => row.expected[key] === row[field][key])])),
    fullAgreement: count(scored, row => fullMatch(row[field], row.expected)),
    needsReview: count(scored, row => row[field].scope === "needs-review"),
    unresolved: count(scored, row => row[field].subcategoryId === null),
    expectedMappingButUnresolved: count(scored, row => row.expected.subcategoryId !== null && row[field].subcategoryId === null),
  };
}

function compare(before, after, expected, key) {
  if (before[key] === after[key]) return after[key] === null || (key === "scope" && after[key] === "needs-review")
    ? "unchanged-unresolved-or-review" : "unchanged";
  if (after[key] === expected[key]) return "improved";
  if (before[key] === expected[key]) return "worsened";
  return "changed-still-disagrees";
}

function verifySource() {
  const index = read("./reference-index.json");
  const snapshots = read("./generated/recovered-history.json");
  assert.equal(snapshots.sourceRef, benchmark.sourceRef);
  assert.equal(index.sourceRef, benchmark.sourceRef);
  const indexed = new Map(index.recordShards.flatMap(name => read(name).records).map(row => [row.id, row]));
  const sourceRows = new Map(snapshots.records.map(row => [row.referenceId, row]));
  const workbook = new Map(read("./historical-workbook-candidates.json").records.map(row => [row.id, row]));
  for (const row of benchmark.cases) {
    const id = row.input.id;
    if (row.sourceKind === "workbook-history") {
      const stored = workbook.get(id);
      assert.equal(revision(stored.sourceObservations), row.sourceRevision, id);
      assert.deepEqual(stored.historicalDecisions, row.historical.originalDecisions, id);
      assert.deepEqual(row.input.responsibilities, [], id);
      continue;
    }
    const original = sourceRows.get(id);
    const selected = original.current ?? original.observations.filter(item => typeof item.payload?.title === "string").at(-1)?.payload;
    assert.equal(indexed.get(id).sourceRevision, row.sourceRevision, id);
    assert.equal(revision(selected), row.sourceRevision, id);
    assert.deepEqual(indexed.get(id).historicalFacts, row.historical.projection, id);
    assert.deepEqual(indexed.get(id).confirmedLabel ?? null, row.ownerConfirmed, id);
    const review = indexed.get(id).previousReview;
    const retainedReview = review && Object.fromEntries(Object.entries(review).filter(([key]) => key !== "evidence"));
    assert.deepEqual(retainedReview ?? null, row.historical.priorReview, id);
    const fields = ["summary", "aboutRole", "responsibilities", "requirements", "country", "region", "locationDisplay",
      "boardSection", "deadlineDate", "lifecycleStatus", "publicationStatus", "applyUrl"];
    for (const field of fields) assert.deepEqual(row.input[field], selected[field] ??
      (["responsibilities", "requirements"].includes(field) ? [] : ["summary", "aboutRole"].includes(field) ? "" : undefined), id + " " + field);
    assert.equal(row.input.sourceUrl, selected.sourceUrl ?? selected.applyUrl ?? "", id);
  }
}

/** @param {{checkSource?: boolean, replay?: {response: {opportunityId: string, [key: string]: unknown}, provenance: import("./classification-assistant-v1.ts").ModelOutputProvenance}[]}} [options] */
export function evaluateBenchmark({ checkSource = false, replay = [] } = {}) {
  if (checkSource) verifySource();
  const recorded = new Map(read("./framework-v1-assessments.json").records.map(row => [row.id, row.assessment]));
  const recordedWorkbook = new Map(read("./framework-v1-workbook-assessments.json").records.map(row => [row.id, row.assessment]));
  assert.equal(benchmark.cases.length, 46);
  assert.equal(new Set(benchmark.cases.map(row => row.input.id)).size, 46);
  const responses = new Map(replay.map(row => [row.response?.opportunityId, row]));
  assert.equal(responses.size, replay.length, "Duplicate model replays");
  const rows = benchmark.cases.map(row => {
    const { input, sourceRevision, editorial, ownerConfirmed } = row;
    assert.ok(editorial.subcategoryId === null || isCareerSelection(editorial), input.id);
    assert.ok(editorial.jobFunction === null || JOB_FUNCTIONS.includes(editorial.jobFunction), input.id);
    assert.ok(editorial.dutyNumbers.every(number => input.responsibilities[number - 1]), input.id);
    const expected = ownerConfirmed ? { scope: ownerConfirmed.scope, ...ownerConfirmed.selection, jobFunction: ownerConfirmed.function } :
      Object.fromEntries(keys.map(key => [key, editorial[key]]));
    const baseline = assessFrameworkV1(input, benchmark.asOfDate);
    const candidate = assessFrameworkV11(input, benchmark.asOfDate);
    const v1 = fromAssessment(baseline);
    const v11 = fromAssessment(candidate);
    assert.deepEqual(v1, fromAssessment((row.sourceKind === "workbook-history" ? recordedWorkbook : recorded).get(input.id)), input.id + " frozen decision");
    const replayRow = responses.get(input.id);
    const model = replayRow ? validateModelProposal({ input, sourceRevision }, replayRow.response, replayRow.provenance) : null;
    responses.delete(input.id);
    return { id: input.id, title: input.title, employer: input.company, batch: row.batch, sourceRevision,
      sourceKind: row.sourceKind, authority: editorial.authority, expected, v1, v11,
      sourceInput: input, provenance: row.provenance, historical: row.historical, ownerConfirmed, editorial,
      change: Object.fromEntries(keys.map(key => [key, compare(v1, v11, expected, key)])),
      eligibilityEvidence: candidate.evidence.eligibilityDutyNumbers,
      classificationEvidence: candidate.evidence.classificationDutyNumbers,
      competingSubcategoryIds: candidate.evidence.competingSubcategoryIds,
      publicationReadiness: candidate.publicationReadiness,
      modelReplayDecision: model && decision(model.proposal.scopeRecommendation, model.proposal.result),
      modelReplayProvenance: model?.proposal.producer ?? null,
    };
  });
  assert.equal(responses.size, 0, "Model replays must link to benchmark IDs");
  const cohorts = {
    confirmed: rows.filter(row => row.authority === "owner-confirmed-existing"),
    provisionalJobs: rows.filter(row => row.authority === "provisional-analyst" && row.sourceKind === "recovered-job"),
    workbookEvidenceGaps: rows.filter(row => row.sourceKind === "workbook-history"),
  };
  return {
    benchmark: benchmark.version, sourceRef: benchmark.sourceRef,
    frameworkVersions: { baseline: ELIGIBILITY_FRAMEWORK_VERSION, candidate: ELIGIBILITY_V11 },
    metrics: Object.fromEntries(Object.entries(cohorts).map(([cohort, cases]) => [cohort, {
      v1: counts(cases, "v1"), v11: counts(cases, "v11"), modelReplay: replay.length ? counts(cases, "modelReplayDecision") : null,
    }])),
    modelReplayCount: replay.length,
    rows,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const replay = args.find(arg => arg.startsWith("--replay="))?.slice("--replay=".length);
  const summary = args.includes("--summary");
  const report = evaluateBenchmark({ checkSource: args.includes("--verify-source"), replay: replay ? JSON.parse(fs.readFileSync(replay, "utf8")) : [] });
  console.log(JSON.stringify(summary ? report.metrics : report, null, 2));
}
