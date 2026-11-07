import assert from "node:assert/strict";
import { test } from "node:test";
import type { Opportunity } from "../../../src/types/index.ts";
import { toggleCareerSelection } from "../../../src/data/career-taxonomy.ts";
import { filterJobsForBoard, getJobFilterCounts, getJobBoardRecoverySuggestions } from "../../../src/lib/job-filters.ts";
import { EMPTY_JOB_BOARD_FILTERS, parseJobBoardState, serializeJobBoardState } from "../../../src/lib/job-board-state.ts";
import { withCareerPreviewProposals } from "../../../src/lib/career-preview.ts";
import proposals from "../../../src/data/career-classification-proposals.json" with { type: "json" };
import { isCareerSelection } from "../../../src/data/career-taxonomy.ts";

const job = (id: string, changes: Partial<Opportunity> = {}): Opportunity => ({
  id, slug: id, title: "Analyst", company: "Example", companyInitials: "E",
  boardSection: "Jobs", roleType: "Infrastructure & Project Finance", country: "Kenya",
  locationDisplay: "Nairobi", summary: "An investment role.", applyUrl: "https://example.test",
  sourceUrl: "https://example.test", sourceType: "Company website", applyButtonText: "Apply",
  lastChecked: "8 Nov 2026", status: "Active", ...changes,
});
const proposal = {
  areaId: "private-markets", subcategoryId: "infrastructure-real-assets", status: "proposed",
  method: "ai-assisted", interestTags: ["renewable energy"], rationale: "Infrastructure equity investing.",
  sourceUrl: "https://example.test", proposedBy: "assistant", proposedAt: "2026-11-08",
} as const;
const approved = { ...proposal, status: "approved", approvedBy: "editor", approvedAt: "2026-11-08" } as const;

test("career hierarchy selects parent OR child and preserves order, identity and eligibility", () => {
  const jobs = [job("approved", { careerClassification: approved }), job("pending", { careerClassification: proposal }),
    job("unknown"), job("closed", { lifecycleStatus: "closed", careerClassification: approved }),
    job("removed", { publicationStatus: "removed", careerClassification: approved }),
    job("programme", { boardSection: "Programmes", careerClassification: approved })];
  const before = structuredClone(jobs);
  const filters = { ...EMPTY_JOB_BOARD_FILTERS, career: ["private-markets", "infrastructure-real-assets"] };
  assert.deepEqual(filterJobsForBoard(jobs, filters).map(j => j.id), ["approved"]);
  assert.deepEqual(filterJobsForBoard(jobs, filters, "", true).map(j => j.id), ["approved", "pending"]);
  assert.deepEqual(filterJobsForBoard(jobs, { ...filters, career: ["unclassified"] }).map(j => j.id), ["pending", "unknown"]);
  assert.deepEqual(filterJobsForBoard(jobs, { ...filters, career: ["unclassified"] }, "", true).map(j => j.id), ["unknown"]);
  assert.deepEqual(filterJobsForBoard([...jobs, jobs[0]], EMPTY_JOB_BOARD_FILTERS).map(j => j.id), ["approved", "pending", "unknown"]);
  assert.deepEqual(jobs, before);
});

test("career facets and search use the same approved or explicitly preview-only results", () => {
  const jobs = [job("equity", { careerClassification: approved }), job("proposal", { careerClassification: proposal, country: "Ghana" }), job("unknown")];
  const filters = { ...EMPTY_JOB_BOARD_FILTERS, career: ["private-markets"], country: ["Kenya"] };
  const counts = getJobFilterCounts(jobs, filters, "", "career", ["private-markets", "infrastructure-real-assets", "unclassified"], true);
  assert.equal(counts.all, 2);
  assert.equal(counts.options["private-markets"], 1);
  assert.equal(counts.options["infrastructure-real-assets"], 1);
  assert.equal(counts.options.unclassified, 1);
  assert.deepEqual(filterJobsForBoard(jobs, EMPTY_JOB_BOARD_FILTERS, "renewable energy").map(j => j.id), ["equity"]);
  assert.deepEqual(filterJobsForBoard(jobs, EMPTY_JOB_BOARD_FILTERS, "renewable energy", true).map(j => j.id), ["equity", "proposal"]);
  assert.ok(getJobBoardRecoverySuggestions(jobs, { ...filters, career: ["private-credit"] }, "").some(s => s.key === "career"));
});

test("parent and child toggles avoid redundant selections and allow narrowing a parent", () => {
  assert.deepEqual(toggleCareerSelection(["private-equity-growth", "venture-capital"], "private-markets"), ["private-markets"]);
  const narrowed = toggleCareerSelection(["private-markets", "development-finance"], "venture-capital");
  assert.deepEqual(narrowed, ["development-finance", "private-equity-growth", "private-credit", "infrastructure-real-assets"]);
  assert.deepEqual(toggleCareerSelection(["private-markets"], "private-markets"), []);
});

test("career URLs round trip independently of existing role links and reject unknown IDs", () => {
  const allowed = { regions: [], countries: [], roleTypes: ["Infrastructure & Project Finance"], experienceBuckets: [], languages: [] };
  const state = parseJobBoardState(new URLSearchParams("career=private-markets&career=private-credit&career=wrong&career=private-credit&role=Infrastructure+%26+Project+Finance"), allowed);
  assert.deepEqual(state.filters.career, ["private-markets", "private-credit"]);
  assert.deepEqual(state.filters.roleType, ["Infrastructure & Project Finance"]);
  assert.deepEqual(parseJobBoardState(serializeJobBoardState(state), allowed), state);
});

test("preview overlays preserve canonical records and reject stale proposals", () => {
  for (const draft of Object.values(proposals)) {
    assert.equal(draft.classification.status, "proposed");
    assert.ok(isCareerSelection(draft.classification));
  }
  const [id, draft] = Object.entries(proposals)[0];
  const original = job(id, { title: draft.title, company: draft.company, roleType: draft.roleType as Opportunity["roleType"], sourceUrl: draft.classification.sourceUrl });
  const before = structuredClone(original);
  assert.equal(withCareerPreviewProposals([original])[0].careerClassification?.status, "proposed");
  assert.deepEqual(original, before);
  const edited = { ...original, title: "Changed role" };
  assert.strictEqual(withCareerPreviewProposals([edited])[0], edited);
  const alreadyApproved = { ...original, careerClassification: approved };
  assert.strictEqual(withCareerPreviewProposals([alreadyApproved])[0], alreadyApproved);
  const newJob = job("new-main-job");
  assert.strictEqual(withCareerPreviewProposals([newJob])[0], newJob);
});
