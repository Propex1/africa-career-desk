import assert from "node:assert/strict";
import test from "node:test";
import { classify } from "../classifier.ts";
import { findDuplicates } from "../dedupe.ts";
import { duplicateKey, normalizeUrl } from "../normalize.ts";
import { AcdDatabase } from "../db.ts";
import { collectSource, workableHumanUrl } from "../collectors.ts";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Script } from "node:vm";
import { pulaDetail, pulaList, workableFeed } from "./fixtures.ts";
import { reviewHtml } from "../server.ts";
import { normalizeLocation } from "../location.ts";
import { assessFreshness, confirmationIsValid, isGenuineRepost } from "../freshness.ts";

test("normalizes URLs and cautious duplicate keys", () => {
  assert.equal(normalizeUrl("https://x.example/jobs/1/?utm_source=test#top"), "https://x.example/jobs/1");
  assert.equal(duplicateKey("pula", "Investment Manager", "Nairobi"), duplicateKey("pula", " investment-manager ", " Nairobi "));
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
  } finally { rmSync(root, { recursive: true, force: true }); }
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
    mkdirSync(join(root, "tools/acd/migrations"), { recursive: true }); writeFileSync(join(root, "tools/acd/migrations/001_initial.sql"), readFileSync(join(import.meta.dirname, "../migrations/001_initial.sql"))); writeFileSync(join(root, "tools/acd/migrations/002_add_department.sql"), readFileSync(join(import.meta.dirname, "../migrations/002_add_department.sql"))); writeFileSync(join(root, "tools/acd/migrations/003_add_freshness.sql"), readFileSync(join(import.meta.dirname, "../migrations/003_add_freshness.sql")));
    const first = new AcdDatabase(root); const run = first.createRun(); first.recordCheck(run, "pula-careers", "successful", 0); first.close();
    const reopened = new AcdDatabase(root); assert.equal(reopened.latestInterruptedRun(), run); assert.equal(reopened.sourceWasChecked(run, "pula-careers"), true); reopened.close();
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("review page uses safe delegated decisions and exposes retry feedback", () => {
  assert.match(reviewHtml, /id="load-error"/);
  assert.match(reviewHtml, /data-action="retry"/);
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
    for (const id of ["001_initial", "002_add_department", "003_add_freshness"]) writeFileSync(join(root, `tools/acd/migrations/${id}.sql`), readFileSync(join(import.meta.dirname, `../migrations/${id}.sql`)));
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
  } finally { rmSync(root, { recursive: true, force: true }); }
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
