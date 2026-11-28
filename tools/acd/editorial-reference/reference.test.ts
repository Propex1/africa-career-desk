import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CAREER_AREAS, isCareerSelection } from "../../../src/data/career-taxonomy.ts";
import { getApprovedCareerClassification, isClassificationMetadata } from "../../../src/lib/career-classification.ts";
import { asSharedProposal, reassessEvidence } from "./policy.ts";
import { evaluatePredictions } from "./evaluation.ts";
import type { EvaluationExample, EvaluationPrediction } from "./evaluation.ts";
import fixtures from "./policy-fixtures.json" with { type: "json" };
import index from "./reference-index.json" with { type: "json" };
import coverage from "./coverage.json" with { type: "json" };
import legacy from "./historical-workbook-candidates.json" with { type: "json" };
const dir = path.dirname(fileURLToPath(import.meta.url));
interface ReferenceRow {
  id: string; currentCanonical: boolean; labelAuthority: string;
  confirmedLabel: { scope: string; selection: { areaId: string; subcategoryId: string } } | null;
  currentLifecycleStatus: string | null; currentPublicationStatus: string | null;
  historicalFacts: { observedInPublicJobsProjection: boolean };
  evidenceLocator: { variants: { sources: { source: number }[] }[] };
  reassessment: { result: { kind: string; classification?: unknown } };
}
const rows = index.recordShards.flatMap(name => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")).records) as ReferenceRow[];

test("reference inventory covers current, closed/removed and historic-only records without changing source files", () => {
  assert.equal(rows.length, index.recordCount);
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  assert.equal(rows.filter(row => row.currentCanonical).length, coverage.coverage.currentCanonical);
  assert.ok(rows.some(row => !row.currentCanonical && row.historicalFacts.observedInPublicJobsProjection));
  assert.ok(rows.some(row => row.currentLifecycleStatus === "closed"));
  assert.ok(rows.some(row => row.currentPublicationStatus === "removed"));
  for (const row of rows) for (const variant of row.evidenceLocator.variants) for (const source of variant.sources) assert.ok(index.sourceTable[source.source]);
});

test("published history and old rejections do not become confirmed ACD 2.0 labels", () => {
  const confirmed = rows.filter(row => row.labelAuthority === "owner-confirmed");
  assert.deepEqual(confirmed.map(row => row.id), ["DRAFT-e770d8631261"]);
  for (const row of rows) {
    if (row.reassessment.result.kind === "mapped") {
      assert.ok(isClassificationMetadata(row.reassessment.result.classification));
      if (row.labelAuthority !== "owner-confirmed") assert.equal(getApprovedCareerClassification(row.reassessment.result.classification), undefined);
    }
  }
  assert.equal(legacy.records.filter(row => row.historicalDecisions.length).length, coverage.coverage.legacyCandidatesWithRemovalReviewOrRejectionDecision);
  for (const row of legacy.records) {
    assert.equal(row.labelAuthority, "source-history-only");
    assert.notEqual(row.reassessment.result.kind === "mapped" ? row.reassessment.result.classification?.status : "unresolved", "approved");
    for (const event of row.historicalDecisions) { assert.ok(event.decision); assert.ok(event.reason); assert.ok(event.provenance.blob); }
  }
  const expired = legacy.records.find(row => row.title === "Managing Director, Finance" && row.company === "Aceli Africa")!;
  assert.ok(expired.historicalDecisions.some(event => /expired/.test(event.reason)));
  assert.equal(expired.reassessment.scopeRecommendation, "needs-review");
});

test("synthetic regression set covers every approved subcategory, remains distinct from history", () => {
  const actual = new Set(fixtures.fixtures.flatMap(row => "expectedSelection" in row && row.expectedSelection ? [row.expectedSelection.subcategoryId] : []));
  const expected = new Set(CAREER_AREAS.flatMap(area => area.subcategories.map(sub => sub.id)));
  assert.deepEqual(actual, expected);
  assert.equal(actual.size, 23);
  for (const row of fixtures.fixtures) {
    assert.equal(row.labelAuthority, "synthetic-policy");
    const output = asSharedProposal(row.input);
    assert.equal(output.scopeRecommendation, row.expectedScope, row.id);
    if ("expectedSelection" in row && row.expectedSelection) {
      assert.equal(output.result.kind, "mapped", row.id);
      if (output.result.kind === "mapped") {
        assert.ok(isCareerSelection(output.result.classification));
        assert.equal(output.result.classification.subcategoryId, row.expectedSelection.subcategoryId, row.id);
        assert.equal(output.result.classification.status, "proposed");
      }
    }
  }
});

test("expiry and titles cannot override responsibility-based eligibility", () => {
  const input = fixtures.fixtures.find(row => row.id === "synthetic-strategic-finance-investments")!.input;
  const expired = { ...input, deadlineDate: "2000-01-01", historicalDecision: "Do not add — expired" };
  assert.equal(reassessEvidence(expired).scopeRecommendation, "in-scope");
  assert.equal(reassessEvidence({ ...input, summary: "Finance Manager", aboutRole: "", responsibilities: [] }).scopeRecommendation, "needs-review");
  assert.equal(reassessEvidence({ ...input, sourceUrl: "" }).result.kind, "unresolved");
});

test("evaluation excludes proposed/history labels and penalises missing or invalid confirmed predictions", () => {
  const examples: EvaluationExample[] = [
    { id: "confirmed", labelAuthority: "owner-confirmed", expectedScope: "in-scope", expectedSelection: { areaId: "private-markets", subcategoryId: "private-credit" } },
    { id: "proposal", labelAuthority: "ai-proposed", expectedScope: "in-scope" },
    { id: "old-rejection", labelAuthority: "source-history-only", expectedScope: "outside-future-scope" },
  ];
  const empty = evaluatePredictions(examples, []);
  assert.equal(empty.eligibleExamples, 1); assert.equal(empty.excludedUnconfirmed, 2); assert.equal(empty.missingPredictions, 1); assert.equal(empty.scope.accuracy, 0);
  const wrong: EvaluationPrediction[] = [{ id: "confirmed", scopeRecommendation: "in-scope", selection: { areaId: "development-finance", subcategoryId: "private-credit" } }];
  const score = evaluatePredictions(examples, wrong);
  assert.equal(score.scope.accuracy, 1); assert.equal(score.subcategory.accuracy, 0); assert.equal(score.invalidSelections, 1);
  assert.throws(() => evaluatePredictions(examples, [...wrong, ...wrong]), /Duplicate prediction/);
  assert.throws(() => evaluatePredictions(examples, [{ id: "unknown", scopeRecommendation: "in-scope" }]), /Unknown prediction/);
  assert.equal(evaluatePredictions([{ id: "unconfirmed", labelAuthority: "ai-proposed" }], []).scope.accuracy, null);
});

test("specialist sovereign risk can be in scope while remaining without a fabricated child category", () => {
  const output = reassessEvidence({ id: "synthetic-sovereign-risk", company: "Synthetic wholesale bank", sourceUrl: "https://example.test/sovereign-risk", sourceRevision: "synthetic-v1", summary: "Specialist country and sovereign financial risk leadership across a bank's regional portfolio.", aboutRole: "Synthetic policy case; not a historical vacancy.", responsibilities: ["Assess sovereign debt sustainability, country limits and external liquidity; recommend cross-border credit risk appetite."], requirements: [] });
  assert.equal(output.scopeRecommendation, "in-scope");
  assert.equal(output.result.kind, "unresolved");
});
