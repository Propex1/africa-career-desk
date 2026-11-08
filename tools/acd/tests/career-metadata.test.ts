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

test("approved additions retain seven parents and add the three exact subcategories", () => {
  assert.equal(CAREER_AREAS.length, 7);
  for (const [parent, id] of [["private-markets", "fund-investments-secondaries"], ["corporate-structured-finance", "treasury-funding-alm"], ["corporate-development-investments", "strategic-finance-capital-allocation"]]) {
    assert.ok(CAREER_AREAS.find(area => area.id === parent)?.subcategories.some(sub => sub.id === id));
    const state = parseJobBoardState(new URLSearchParams(`career=${id}`), { regions: [], countries: [], roleTypes: [], experienceBuckets: [], languages: [] });
    assert.equal(serializeJobBoardState(state).get("career"), id);
  }
});

test("every proposal has exactly one valid function; imported invalid metadata fails closed", () => {
  for (const draft of Object.values(drafts)) {
    assert.ok(isClassificationMetadata(draft.classification));
    assert.ok(JOB_FUNCTIONS.includes(draft.classification.jobFunction as typeof JOB_FUNCTIONS[number]));
    assert.equal(getApprovedCareerClassification(draft.classification), undefined);
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
  const projected = withCareerPreviewProposals(records);
  for (const [id, query] of [["treasury-funding-alm", "ALM"], ["strategic-finance-capital-allocation", "Strategic Finance"], ["fund-investments-secondaries", "Fund Finance & Operations"]]) {
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
    assert.ok(filterJobsForBoard(projected, EMPTY_JOB_BOARD_FILTERS).some(job => job.id === item.id));
  }
});
