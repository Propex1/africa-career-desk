import assert from "node:assert/strict";
import { test } from "node:test";
import { CAREER_AREAS } from "../../../src/data/career-taxonomy.ts";
import { JOB_FUNCTIONS } from "../../../src/data/job-functions.ts";
import { isClassificationMetadata, getApprovedCareerClassification } from "../../../src/lib/career-classification.ts";
import { filterJobsForBoard, getJobFilterCounts } from "../../../src/lib/job-filters.ts";
import { EMPTY_JOB_BOARD_FILTERS, parseJobBoardState, serializeJobBoardState } from "../../../src/lib/job-board-state.ts";
import { withCareerPreviewProposals } from "../../../src/lib/career-preview.ts";
import { publicModules } from "../lifecycle/public-data.mjs";
import type { Opportunity } from "../../../src/types/index.ts";
import drafts from "../../../src/data/career-classification-proposals.json" with { type: "json" };
import review from "../../../src/data/career-classification-review.json" with { type: "json" };
import audit from "../../../docs/acd-v2-classification-audit-2026-11-28.json" with { type: "json" };
import previousAudit from "../../../docs/acd-v2-classification-audit-2026-11-19.json" with { type: "json" };

test("revised hierarchy retains specialist fund, treasury and strategic finance options", () => {
  assert.equal(CAREER_AREAS.length, 7);
  for (const [parent, id] of [["private-markets", "fund-investments-secondaries"], ["banking-structured-finance", "treasury-funding-alm"], ["corporate-finance-strategy", "strategic-finance-investments"]]) {
    assert.ok(CAREER_AREAS.find(area => area.id === parent)?.subcategories.some(sub => sub.id === id));
    const state = parseJobBoardState(new URLSearchParams(`career=${id}`), { regions: [], countries: [], roleTypes: [], experienceBuckets: [], languages: [] });
    assert.equal(serializeJobBoardState(state).get("career"), id);
  }
});

test("every proposal has exactly one valid function; imported invalid metadata fails closed", () => {
  for (const draft of Object.values(drafts)) {
    assert.ok(isClassificationMetadata(draft.classification));
    assert.ok(JOB_FUNCTIONS.includes(draft.classification.jobFunction as typeof JOB_FUNCTIONS[number]));
    assert.equal(Boolean(getApprovedCareerClassification(draft.classification)), draft.classification.status === "approved");
  }
  const sample = Object.values(drafts)[0].classification;
  assert.equal(isClassificationMetadata({ ...sample, jobFunction: "Sales Admin" }), false);
  assert.equal(isClassificationMetadata({ ...sample, jobFunction: undefined }), false);
  assert.equal(isClassificationMetadata({ ...sample, employerType: "Guessed" }), false);
});

test("projection preserves ALL canonical records and historical data, invalidates duty edits", () => {
  const records = publicModules().records as Opportunity[];
  const before = structuredClone(records);
  const projected = withCareerPreviewProposals(records);
  assert.equal(projected.length, records.length);
  projected.forEach((record, i) => {
    const { careerClassification, ...originalFields } = record;
    const { careerClassification: previous, ...expected } = records[i];
    assert.deepEqual(originalFields, expected);
    if (previous) assert.deepEqual(careerClassification, previous);
  });
  assert.deepEqual(records, before);
  const source = records.find(job => drafts[job.id as keyof typeof drafts])!;
  const edited = { ...source, summary: `${source.summary} New duties.` };
  assert.strictEqual(withCareerPreviewProposals([edited])[0], edited);
  const incoming = { ...source, id: "new-job-from-main" };
  assert.strictEqual(withCareerPreviewProposals([incoming])[0], incoming);
});

test("new metadata is searchable and facets agree with results; proposals remain preview-only", () => {
  const records = publicModules().records as Opportunity[];
  // Isolate metadata behavior from owner-approved closures on main.
  // Canonical lifecycle preservation is tested separately above.
  const projected = withCareerPreviewProposals(records).map(job => ({ ...job, status: "Active", publicationStatus: "live", lifecycleStatus: "active" } as Opportunity));
  for (const [id, query] of [["treasury-funding-alm", "ALM"], ["strategic-finance-investments", "Strategic Finance"], ["fund-investments-secondaries", "Fund Finance & Operations"]]) {
    const filters = { ...EMPTY_JOB_BOARD_FILTERS, career: [id] };
    const results = filterJobsForBoard(projected, filters, query, true);
    assert.ok(results.length > 0, `${id} should be populated in the preview`);
    const counts = getJobFilterCounts(projected, filters, query, "career", [id], true);
    assert.equal(counts.options[id], results.length);
    assert.equal(filterJobsForBoard(projected, filters, query).length, 0);
  }
  assert.ok(filterJobsForBoard(projected, EMPTY_JOB_BOARD_FILTERS, "DFI / Multilateral", true).length > 0);
  assert.ok(filterJobsForBoard(projected, EMPTY_JOB_BOARD_FILTERS, "fund of funds", true).some(job => job.id === "ACD-0231"));
  for (const item of review) {
    assert.ok(!drafts[item.id as keyof typeof drafts], "Ambiguous roles must not silently receive a forced subcategory");
    assert.ok(projected.some(job => job.id === item.id), "Held records must remain in the source projection, including previously closed records");
  }
});


test("corporate IR stays distinct from fund fundraising in search and parent-child counts", () => {
  const records = publicModules().records as Opportunity[];
  const projected = withCareerPreviewProposals(records);
  const beltone = projected.find(job => job.id === "DRAFT-e770d8631261")!;
  assert.equal(beltone.careerClassification?.subcategoryId, "corporate-investor-relations");
  assert.equal(beltone.careerClassification?.jobFunction, "Corporate Investor Relations");
  assert.equal(beltone.careerClassification?.status, "approved");
  const filters = { ...EMPTY_JOB_BOARD_FILTERS, career: ["corporate-investor-relations"] };
  assert.ok(filterJobsForBoard(projected, filters, "Corporate Investor Relations", true).some(job => job.id === beltone.id));
  assert.equal(filterJobsForBoard(projected, filters, "Fundraising", true).length, 0);
  const counts = getJobFilterCounts(projected, filters, "", "career", ["corporate-investor-relations"], true);
  assert.equal(counts.options["corporate-investor-relations"], filterJobsForBoard(projected, filters, "", true).length);
  // No overlay reaches production: even owner approval is metadata in the preview source only.
  assert.equal(records.find(job => job.id === beltone.id)?.careerClassification, undefined);
});

test("revised finance scope distinguishes FP&A from strategy enablement and preserves publication", () => {
  const records = publicModules().records as Opportunity[];
  const projected = withCareerPreviewProposals(records);
  assert.equal(projected.find(job => job.id === "DRAFT-c93d3acd7658")?.careerClassification?.subcategoryId, "strategic-finance-investments");
  assert.equal(projected.find(job => job.id === "DRAFT-ac7c1fc547f6")?.careerClassification?.subcategoryId, "fpa-finance-leadership");
  assert.equal(projected.find(job => job.id === "DRAFT-aa4d33a969b6")?.careerClassification, undefined);
  for (const item of review) {
    assert.equal(item.publicationAction, "none");
    const before = records.find(job => job.id === item.id)!;
    assert.strictEqual(projected.find(job => job.id === item.id), before);
    assert.ok(item.reason.length > 40);
  }
});


test("final audit accounts for every mapping and hold with unchanged responsibility evidence", () => {
  const records = publicModules().records as Opportunity[];
  const ids = audit.records.map(row => row.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), [...Object.keys(drafts), ...review.map(row => row.id)].sort());
  for (const row of audit.records) {
    const source = records.find(job => job.id === row.id)!;
    assert.ok(source);
    assert.equal(row.sourceUrl, source.sourceUrl);
    assert.deepEqual(row.responsibilityEvidence, source.responsibilities);
    assert.equal(row.publicationAction, "none");
    if (row.classification) assert.deepEqual(row.classification, drafts[row.id as keyof typeof drafts].classification);
  }
});

// Classification behaviour across the current activity hierarchy, independent of
// source vacancies expiring after this review. These fixture copies never publish.
function activeMetadataFixtures() {
  return withCareerPreviewProposals(publicModules().records as Opportunity[])
    .map(job => ({ ...job, status: "Active", publicationStatus: "live", lifecycleStatus: "active" } as Opportunity));
}

test("all 23 career facets agree with result sets and parent unions", () => {
  const jobs = activeMetadataFixtures();
  for (const area of CAREER_AREAS) {
    const children = area.subcategories.map(sub => sub.id);
    const parent = filterJobsForBoard(jobs, { ...EMPTY_JOB_BOARD_FILTERS, career: [area.id] }, "", true);
    const union = filterJobsForBoard(jobs, { ...EMPTY_JOB_BOARD_FILTERS, career: children }, "", true);
    assert.deepEqual(parent.map(job => job.id), union.map(job => job.id));
    for (const sub of area.subcategories) {
      const results = filterJobsForBoard(jobs, { ...EMPTY_JOB_BOARD_FILTERS, career: [sub.id] }, "", true);
      const counts = getJobFilterCounts(jobs, EMPTY_JOB_BOARD_FILTERS, "", "career", [sub.id], true);
      assert.equal(counts.options[sub.id], results.length);
      assert.ok(results.every(job => job.careerClassification?.areaId === area.id));
    }
  }
});

test("broader finance scope, investment advice and ESG functions follow responsibility evidence", () => {
  const jobs = activeMetadataFixtures();
  for (const [id, sub, fn] of [
    ["DRAFT-ac7c1fc547f6", "fpa-finance-leadership", "FP&A & Business Partnering"],
    ["DRAFT-926bda1c10ae", "fpa-finance-leadership", "Finance Leadership"],
    ["DRAFT-c93d3acd7658", "strategic-finance-investments", "Strategic Finance"],
    ["DRAFT-9fe8bfbbe223", "investment-advisory-wealth-management", "Investment Advisory"],
    ["DRAFT-c07abbd13795", "infrastructure-real-assets", "Impact & ESG"],
    ["DRAFT-542bfcbb7027", "institutional-sales-trading", "Trading"],
    ["DRAFT-adb4aab0efa4", "structuring-financial-engineering", "Structuring & Financial Engineering"],
  ]) {
    const result = filterJobsForBoard(jobs, { ...EMPTY_JOB_BOARD_FILTERS, career: [sub] }, fn, true);
    assert.ok(result.some(job => job.id === id), `${id} should be searchable by its specialist function`);
  }
  for (const id of ["DRAFT-aa4d33a969b6", "DRAFT-69b14b6c42ef", "DRAFT-43904592e8cf", "DRAFT-b2b3e647c4a8"]) {
    assert.ok(filterJobsForBoard(jobs, { ...EMPTY_JOB_BOARD_FILTERS, career: ["unclassified"] }, "", true).some(job => job.id === id));
  }
  assert.equal(jobs.find(job => job.id === "ACD-0193")?.careerClassification?.subcategoryId, "private-equity-growth");
  assert.equal(jobs.find(job => job.id === "ACD-0231")?.careerClassification?.subcategoryId, "fund-investments-secondaries");
  assert.ok(filterJobsForBoard(jobs, EMPTY_JOB_BOARD_FILTERS, "climate", true).some(job => job.id === "DRAFT-c07abbd13795"));
  assert.ok(filterJobsForBoard(jobs, { ...EMPTY_JOB_BOARD_FILTERS, career: ["advisory-capital-mobilisation"] }, "blended finance", true).length > 0);
});


test("taxonomy revision preserves previous evidence and creates no additional approvals", () => {
  for (const previous of previousAudit.records) {
    const current = audit.records.find(row => row.id === previous.id)!;
    assert.ok(current, `Historical review ${previous.id} must remain accounted for`);
    assert.deepEqual(current.responsibilityEvidence, previous.responsibilityEvidence);
    assert.deepEqual(current.previousClassification, previous.classification);
  }
  const approvals = Object.entries(drafts).filter(([, draft]) => draft.classification.status === "approved");
  assert.deepEqual(approvals.map(([id]) => id), ["DRAFT-e770d8631261"]);
  const before = previousAudit.records.find(row => row.id === approvals[0][0])!.classification!;
  const retainedApproval = getApprovedCareerClassification(approvals[0][1].classification)!;
  assert.equal(retainedApproval.approvedAt, before.approvedAt);
  assert.equal(retainedApproval.approvedBy, before.approvedBy);
});

test("future finance-leadership metadata validates as a proposal without approving or publishing it", () => {
  const metadata = { ...Object.values(drafts)[0].classification, areaId: "corporate-finance-strategy", subcategoryId: "fpa-finance-leadership", jobFunction: "Finance Leadership", status: "proposed" };
  assert.ok(isClassificationMetadata(metadata));
  assert.equal(getApprovedCareerClassification(metadata), undefined);
  assert.equal(isClassificationMetadata({ ...metadata, areaId: "private-markets" }), false);
  assert.equal(isClassificationMetadata({ ...metadata, subcategoryId: "generic-accounting" }), false);
});
