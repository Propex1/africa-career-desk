import assert from "node:assert/strict";
import { test } from "node:test";
import { CAREER_AREAS, DEFAULT_EXPANDED_CAREER_AREA, isCareerSelection, type CareerSelection } from "../../../src/data/career-taxonomy.ts";
import { getApprovedCareerClassification } from "../../../src/lib/career-classification.ts";

test("career registry has unique IDs, seven areas and twenty subcategories", () => {
  const areas = CAREER_AREAS.map(area => area.id);
  const subcategories = CAREER_AREAS.flatMap(area => area.subcategories.map(subcategory => subcategory.id));
  assert.equal(areas.length, 7);
  assert.equal(new Set(areas).size, 7);
  assert.equal(subcategories.length, 20);
  assert.equal(new Set(subcategories).size, 20);
  assert.equal(DEFAULT_EXPANDED_CAREER_AREA, "private-markets");
});

test("investment and financing infrastructure classifications have distinct parents", () => {
  assert.ok(isCareerSelection({ areaId: "private-markets", subcategoryId: "infrastructure-real-assets" }));
  assert.ok(isCareerSelection({ areaId: "corporate-structured-finance", subcategoryId: "project-structured-finance" }));
  assert.equal(isCareerSelection({ areaId: "private-markets", subcategoryId: "project-structured-finance" }), false);
  assert.equal(isCareerSelection({ areaId: "development-finance", subcategoryId: "private-credit" }), false);
  assert.equal(isCareerSelection(null), false);
  // @ts-expect-error Cross-area pairs must also fail static validation.
  const invalid: CareerSelection = { areaId: "private-markets", subcategoryId: "project-structured-finance" };
  assert.equal(isCareerSelection(invalid), false);
});

test("AI proposals require explicit human approval and complete provenance", () => {
  const proposal = {
    areaId: "private-markets", subcategoryId: "infrastructure-real-assets",
    interestTags: ["infrastructure"], rationale: "Role involves equity investments.",
    sourceUrl: "https://example.test/role", method: "ai-assisted",
    proposedBy: "classification-assistant", proposedAt: "2026-11-08", status: "proposed",
  };
  const before = structuredClone(proposal);
  assert.equal(getApprovedCareerClassification(proposal), undefined);
  assert.equal(getApprovedCareerClassification(undefined), undefined);
  const approved = { ...proposal, status: "approved", approvedBy: "editor", approvedAt: "2026-11-08" };
  assert.strictEqual(getApprovedCareerClassification(approved), approved);
  for (const field of ["approvedBy", "approvedAt", "sourceUrl", "rationale"]) {
    assert.equal(getApprovedCareerClassification({ ...approved, [field]: "" }), undefined);
  }
  assert.equal(getApprovedCareerClassification({ ...approved, subcategoryId: "project-structured-finance" }), undefined);
  assert.equal(getApprovedCareerClassification({ ...approved, interestTags: [1] }), undefined);
  assert.deepEqual(proposal, before);
});
