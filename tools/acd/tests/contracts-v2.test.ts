import assert from "node:assert/strict";
import { test } from "node:test";
import { ACD_V2_CONTRACT_VERSION, ACD_V2_TAXONOMY_VERSION } from "../../../src/contracts/acd-v2.ts";
import type { ClassificationProposal, ProposedCareerClassification, MonitoringSourceResult } from "../../../src/contracts/acd-v2.ts";
import { getApprovedCareerClassification, isClassificationMetadata } from "../../../src/lib/career-classification.ts";
import drafts from "../../../src/data/career-classification-proposals.json" with { type: "json" };

test("shared AI contract reuses valid current metadata without granting approval", () => {
  const [id, draft] = Object.entries(drafts).find(([, value]) => value.classification.status === "proposed")!;
  const classification = draft.classification;
  assert.ok(isClassificationMetadata(classification));
  assert.equal(classification.status, "proposed");
  if (classification.status !== "proposed") throw new Error("Expected a proposal fixture");
  const proposal: ClassificationProposal = {
    contractVersion: ACD_V2_CONTRACT_VERSION,
    taxonomyVersion: ACD_V2_TAXONOMY_VERSION,
    opportunityId: id,
    sourceRevision: "fixture-source-revision-1",
    evidence: draft.evidence,
    result: { kind: "mapped", classification },
    scopeRecommendation: "in-scope",
    scopeReason: "The stored investment responsibilities support specialist finance work.",
    createdAt: "2026-11-28T17:00:00Z",
    producer: { actorId: "test-classification-agent", promptVersion: "fixture-v1" },
  };
  assert.equal(getApprovedCareerClassification(proposal.result.kind === "mapped" ? proposal.result.classification : undefined), undefined);
  // This must fail compilation: AI output cannot contain an approved classification.
  // @ts-expect-error Approval is outside the AI proposal contract.
  const forbidden: ProposedCareerClassification = { ...classification, status: "approved", approvedBy: "model", approvedAt: "2026-11-28" };
  assert.equal(forbidden.status, "approved"); // Type fixture only; never passed to storage/publication.
});

test("shared contract carries unresolved evidence and monitoring failure without a forced mapping", () => {
  const proposal: ClassificationProposal = {
    contractVersion: ACD_V2_CONTRACT_VERSION,
    taxonomyVersion: ACD_V2_TAXONOMY_VERSION,
    opportunityId: "fixture-sovereign-risk",
    sourceRevision: "fixture-source-revision-2",
    evidence: { summary: "Country and sovereign risk analysis.", aboutRole: "", responsibilities: ["Assess sovereign debt sustainability and country limits."], requirements: [] },
    result: { kind: "unresolved", reason: "Cross-bank country risk has no accurate existing subcategory.", suggestedAreaId: "banking-structured-finance", suggestedJobFunction: "Risk & Underwriting" },
    scopeRecommendation: "in-scope",
    scopeReason: "Substantive specialist financial risk analysis; category fit remains unresolved.",
    createdAt: "2026-11-28T17:00:00Z",
    producer: { actorId: "test-classification-agent" },
  };
  assert.equal(isClassificationMetadata(proposal.result), false);
  assert.equal(getApprovedCareerClassification(proposal.result), undefined);
  const sourceResult: MonitoringSourceResult = {
    runId: "fixture-run", employerId: "fixture-employer", sourceUrl: "https://example.test/careers",
    checkedAt: "2026-11-28T17:00:00Z", outcome: "failed", observations: [], issues: ["Source request timed out; existing vacancies are not verified closed."],
  };
  assert.equal(sourceResult.outcome, "failed");
  assert.ok(sourceResult.issues.length);
});
