import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { test } from "node:test";
import type { Opportunity } from "../../../src/types/index.ts";
import type { VerifiedDeadlineEvidence } from "../../../src/types/index.ts";
import type { VerifiedOpportunityFields } from "../../../src/lib/opportunity-data.ts";
import {
  buildOpportunityProjection,
  type ConfirmedClosure,
  deriveStructuredLocations,
  getLiveJobs,
  isIsoCalendarDate,
  normalizeDeadlineDisplay,
  normalizeEmployerName,
  validateEmployerIdentityMap,
  validateOpportunityRecords,
} from "../../../src/lib/opportunity-data.ts";
import { createJobPostingJsonLd, buildSitemap, ACD_SITE_URL } from "../../../src/lib/seo.ts";
import {
  EMPLOYER_ID_BY_COMPANY,
  UNRESOLVED_EMPLOYER_LABELS,
} from "../../../src/data/employer-identities.ts";
import { ENABLED_JOB_CATEGORY_PAGES } from "../../../src/data/job-categories.ts";
import { filterJobsForCategory } from "../../../src/lib/job-categories.ts";
import { filterJobsForBoard, type JobBoardFilters } from "../../../src/lib/job-filters.ts";
import { APPROVED_CONTENT_2026_09_27 } from "../../../src/data/approved-content-2026-09-27.ts";
import { APPROVED_CONTENT_2026_10_04, REFRESHED_FIELDS_2026_10_04, REFRESH_JOB_IDS_2026_10_04 } from "../../../src/data/approved-content-2026-10-04.ts";
import { APPROVED_CONTENT_2026_09_30, REMOVED_JOB_IDS_2026_09_30, CONFIRMED_CLOSURES_2026_09_30, REFRESHED_FIELDS_2026_09_30 } from "../../../src/data/approved-content-2026-09-30.ts";
import { filterJobsForCountry } from "../../../src/lib/job-countries.ts";
import { ENABLED_JOB_COUNTRY_PAGES } from "../../../src/data/job-countries.ts";

const root = process.cwd();
// Keep the accepted pre-refresh cohort for the existing architecture regression tests.
// The full September refresh is projected and checked separately below.
const publicSourceFiles = [
  "src/data/opportunities.ts",
  "src/data/batch-3-6-preview-opportunities.ts",
  "src/data/approved-jobs-2026-09-16.ts",
  "src/data/approved-jobs-2026-09-20.ts",
  "src/data/approved-content-2026-09-23.ts",
];

function getProperty(object: ts.ObjectLiteralExpression, name: string) {
  return object.properties.find((property): property is ts.PropertyAssignment =>
    ts.isPropertyAssignment(property) && property.name.getText().replace(/^['\"]|['\"]$/g, "") === name,
  )?.initializer;
}

function stringValue(node: ts.Expression | undefined): string | undefined {
  return node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;
}

function expressionValue(node: ts.Expression | undefined, source: ts.SourceFile): unknown {
  if (!node) return undefined;
  const literal = stringValue(node);
  if (literal !== undefined) return literal;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((item) => expressionValue(item as ts.Expression, source));
  if (ts.isObjectLiteralExpression(node)) return objectValue(node, source);
  return undefined;
}

function objectValue(node: ts.Expression | undefined, source: ts.SourceFile): Record<string, unknown> {
  if (!node || !ts.isObjectLiteralExpression(node)) return {};
  return Object.fromEntries(node.properties.flatMap((property) => {
    if (!ts.isPropertyAssignment(property)) return [];
    const name = property.name.getText(source).replace(/^['\"]|['\"]$/g, "");
    return [[name, expressionValue(property.initializer, source)]];
  }));
}

function readVariable(name: string, file: string) {
  const text = readFileSync(resolve(root, file), "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(source) === name) return { source, initializer: declaration.initializer };
    }
  }
  throw new Error(`Could not find ${name} in ${file}.`);
}

function readPublicRecords(): Opportunity[] {
  const records: Opportunity[] = [];
  for (const file of publicSourceFiles) {
    const text = readFileSync(resolve(root, file), "utf8");
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    function visit(node: ts.Node) {
      if (ts.isObjectLiteralExpression(node)) {
        const id = stringValue(getProperty(node, "id"));
        const slug = stringValue(getProperty(node, "slug"));
        const title = stringValue(getProperty(node, "title"));
        const company = stringValue(getProperty(node, "company"));
        if (id?.startsWith("ACD-") && slug && title && company) {
          records.push({
            ...objectValue(node, source),
            id,
            slug,
            title,
            company,
            companyInitials: stringValue(getProperty(node, "companyInitials")) ?? company.slice(0, 2),
            boardSection: (stringValue(getProperty(node, "boardSection")) ?? "Jobs") as Opportunity["boardSection"],
            roleType: (stringValue(getProperty(node, "roleType")) ?? "Private Equity, VC & Private Credit") as Opportunity["roleType"],
            city: stringValue(getProperty(node, "city")),
            country: stringValue(getProperty(node, "country")),
            region: stringValue(getProperty(node, "region")),
            locationDisplay: stringValue(getProperty(node, "locationDisplay")) ?? "",
            deadlineDisplay: stringValue(getProperty(node, "deadlineDisplay")),
            summary: stringValue(getProperty(node, "summary")) ?? title,
            applyUrl: stringValue(getProperty(node, "applyUrl")) ?? "https://example.invalid/apply",
            sourceUrl: stringValue(getProperty(node, "sourceUrl")) ?? "https://example.invalid/source",
            sourceType: (stringValue(getProperty(node, "sourceType")) ?? "Company website") as Opportunity["sourceType"],
            applyButtonText: stringValue(getProperty(node, "applyButtonText")) ?? "Apply",
            publishedAt: stringValue(getProperty(node, "publishedAt")),
            lastChecked: stringValue(getProperty(node, "lastChecked")) ?? "26 Sep 2026",
            status: "Active",
          });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  const byId = new Map<string, Opportunity>();
  for (const record of records) {
    const previous = byId.get(record.id);
    if (previous) {
      // The approved reactivation overlays one historical record, preserving its identity/date.
      assert.equal(record.id, "ACD-0139", "unexpected duplicate public opportunity");
      assert.equal(record.slug, previous.slug);
      byId.set(record.id, { ...previous, ...record, publishedAt: previous.publishedAt });
    } else {
      byId.set(record.id, record);
    }
  }
  return [...byId.values()];
}

function readRemovedIds(): Set<string> {
  const { initializer } = readVariable("REMOVED_JOB_IDS", "src/data/opportunities.ts");
  assert.ok(initializer && ts.isNewExpression(initializer));
  const list = initializer.arguments?.[0];
  assert.ok(list && ts.isArrayLiteralExpression(list));
  return new Set(list.elements.map((item) => stringValue(item as ts.Expression)).filter(Boolean) as string[]);
}

function readObjectVariable(name: string, file: string) {
  const { source, initializer } = readVariable(name, file);
  assert.ok(initializer);
  const objectExpression = ts.isAsExpression(initializer) ? initializer.expression : initializer;
  assert.ok(ts.isObjectLiteralExpression(objectExpression));
  return objectValue(objectExpression, source);
}

function fixture(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "ACD-TEST",
    slug: "role-employer-location",
    title: "Investment Analyst",
    company: "Example Employer",
    companyInitials: "EE",
    boardSection: "Jobs",
    roleType: "Private Equity, VC & Private Credit",
    locationDisplay: "Nairobi, Kenya",
    summary: "Support investment research and transactions.",
    applyUrl: "https://example.test/apply",
    sourceUrl: "https://example.test/job",
    sourceType: "Company website",
    applyButtonText: "Apply",
    lastChecked: "26 Sep 2026",
    status: "Active",
    ...overrides,
  };
}

const rawRecords = readPublicRecords();
const removedJobIds = readRemovedIds();
const confirmedClosures = readObjectVariable("CONFIRMED_CLOSURES", "src/data/opportunities.ts") as Record<string, ConfirmedClosure>;
const employerPostedAtByJobId = readObjectVariable("VERIFIED_EMPLOYER_POSTED_AT", "src/data/opportunities.ts") as Record<string, string>;
const verifiedFieldsByJobId = readObjectVariable("VERIFIED_STRUCTURED_FIELDS_BY_JOB_ID", "src/data/opportunities.ts") as Record<string, VerifiedOpportunityFields>;
const verifiedDeadlinesByJobId = readObjectVariable("VERIFIED_HARD_DEADLINES", "src/data/opportunities.ts") as Record<string, VerifiedDeadlineEvidence>;
const batch2cIds = ["ACD-0281", "ACD-0269", "ACD-0275", "ACD-0277", "ACD-0278"];
const before2cDeadlines = Object.fromEntries(Object.entries(verifiedDeadlinesByJobId).filter(([id]) => !batch2cIds.includes(id)));
const before2cClosures = Object.fromEntries(Object.entries(confirmedClosures).filter(([id]) => !batch2cIds.includes(id)));
const projectionOptions = {
  employerIdByCompany: EMPLOYER_ID_BY_COMPANY,
  removedJobIds,
  confirmedClosures,
  employerPostedAtByJobId,
  verifiedFieldsByJobId,
  today: "2026-09-27",
};
const projectionBeforeDeadlineRule = buildOpportunityProjection(rawRecords, { ...projectionOptions, confirmedClosures: before2cClosures });
const projectionBefore2c = buildOpportunityProjection(rawRecords, {
  ...projectionOptions, confirmedClosures: before2cClosures, verifiedDeadlinesByJobId: before2cDeadlines,
});
const projectedRecords = buildOpportunityProjection(rawRecords, {
  ...projectionOptions,
  verifiedDeadlinesByJobId,
});

const september30Source = [...rawRecords, ...APPROVED_CONTENT_2026_09_27];
const september30Options = { ...projectionOptions, verifiedDeadlinesByJobId, today: "2026-10-01" };
const september30Before = buildOpportunityProjection(september30Source, september30Options);
const september30After = buildOpportunityProjection([...september30Source, ...APPROVED_CONTENT_2026_09_30].map((record) => ({
  ...record, ...REFRESHED_FIELDS_2026_09_30[record.id],
})), {
  ...september30Options,
  removedJobIds: new Set([...removedJobIds, ...REMOVED_JOB_IDS_2026_09_30]),
  confirmedClosures: { ...confirmedClosures, ...CONFIRMED_CLOSURES_2026_09_30 },
});

test("30 September refresh adds eight distinct approved roles without changing unaffected records", () => {
  assert.equal(september30After.length, 197);
  const changed = new Set(["ACD-0242", "ACD-0270", ...REMOVED_JOB_IDS_2026_09_30]);
  for (const old of september30Before) {
    const current = september30After.find((job) => job.id === old.id);
    assert.ok(current, `History missing: ${old.id}`);
    if (!changed.has(old.id)) assert.deepEqual(current, old);
  }
  for (const record of APPROVED_CONTENT_2026_09_30) {
    assert.ok(EMPLOYER_ID_BY_COMPANY[record.company]);
    assert.ok(!september30Source.some((job) => job.id === record.id || job.slug === record.slug || job.applyUrl === record.applyUrl));
    assert.equal(record.boardSection, "Jobs");
    assert.equal(record.publishedAt, "2026-10-01");
  }
  assert.equal(getLiveJobs(september30After).length - getLiveJobs(september30Before).length, 6);
});

test("30 September approved removals disappear from discovery and sitemap while retaining history", () => {
  const removed = ["ACD-0227", "ACD-0228", "ACD-0242", "ACD-0244", ...REMOVED_JOB_IDS_2026_09_30];
  const filters: JobBoardFilters = {region: [], country: [], roleType: [], experience: [], language: []};
  for (const id of removed) {
    const record = september30After.find((job) => job.id === id)!;
    assert.ok(record);
    assert.equal(record.publicationStatus, "removed");
    assert.ok(!filterJobsForBoard(september30After, filters, record.title).some((job) => job.id === id));
    assert.ok(!buildSitemap(getLiveJobs(september30After)).some((entry) => entry.url.includes(`/jobs/${record.slug}/`)));
  }
  assert.equal(september30After.find((job) => job.id === "ACD-0242")?.lifecycleReason, "verified_closed");
});

test("restored RMB R53633 retains its identity and expires before the employer's exclusive closing date", () => {
  const previous = september30Before.find((job) => job.id === "ACD-0270")!;
  const restored = september30After.find((job) => job.id === "ACD-0270")!;
  assert.equal(restored.publicationStatus, "live");
  assert.equal(restored.lifecycleStatus, "active");
  for (const key of ["id", "slug", "publishedAt", "applyUrl", "employerId"] as const) assert.equal(restored[key], previous[key]);
  assert.equal(restored.deadlineDisplay, "Before 5 Oct 2026");
  assert.equal(restored.deadlineDate, "2026-10-04");
  assert.ok(buildSitemap(getLiveJobs(september30After)).some((entry) => entry.url.includes(`/jobs/${restored.slug}/`)));
  const options = { employerIdByCompany: EMPLOYER_ID_BY_COMPANY, removedJobIds: new Set<string>(), confirmedClosures: {} };
  assert.equal(buildOpportunityProjection([restored], { ...options, today: "2026-10-04" })[0].publicationStatus, "live");
  const expired = buildOpportunityProjection([restored], { ...options, today: "2026-10-05" })[0];
  assert.equal(expired.publicationStatus, "removed");
  assert.equal(expired.lifecycleReason, "deadline_passed");
});

test("approved multi-location internship and separate finance levels retain distinct identities", () => {
  const partech = september30After.find((job) => job.id === "ACD-0317")!;
  assert.equal(partech.employerId, "employer-063-partech-africa");
  assert.equal(partech.employmentType, "internship");
  assert.equal(partech.locations?.length, 2);
  for (const name of ["Kenya", "Nigeria"]) {
    const country = ENABLED_JOB_COUNTRY_PAGES.find((entry) => entry.country === name)
      ?? { country: name, slug: "nigeria", description: "", metaDescription: "" };
    assert.deepEqual(filterJobsForCountry([partech], country).map((job) => job.id), [partech.id]);
  }
  const nedbank = APPROVED_CONTENT_2026_09_30.filter((job) => job.company.startsWith("Nedbank"));
  assert.equal(nedbank.length, 2);
  assert.equal(new Set(nedbank.map((job) => job.applyUrl)).size, 2);
  assert.ok(september30After.some((job) => job.id === "ACD-0298"));
  assert.ok(september30After.some((job) => job.id === "ACD-0318"));
  assert.equal(september30After.find((job) => job.id === "ACD-0199")?.publicationStatus, "removed");
});

test("30 September verified deadlines expire automatically without inventing deadlines for undated roles", () => {
  const projected = buildOpportunityProjection(APPROVED_CONTENT_2026_09_30, {
    employerIdByCompany: EMPLOYER_ID_BY_COMPANY, removedJobIds: new Set(), confirmedClosures: {}, today: "2026-10-14",
  });
  assert.equal(projected.filter((job) => job.lifecycleReason === "deadline_passed").length, 6);
  assert.deepEqual(getLiveJobs(projected).map((job) => job.id), ["ACD-0317", "ACD-0318"]);
  assert.ok(projected.filter((job) => !job.verifiedDeadline).every((job) => !job.deadlineDate && !job.deadlineDisplay));
});

test("public source snapshots have stable unique IDs and every employer label is mapped or explicitly unresolved", () => {
  const companies = [...new Set(rawRecords.map((record) => record.company))];
  const mapped = new Set(Object.keys(EMPLOYER_ID_BY_COMPANY).map(normalizeEmployerName));
  const unresolved = new Set(UNRESOLVED_EMPLOYER_LABELS.map(normalizeEmployerName));

  assert.equal(rawRecords.length, 168);
  assert.equal(new Set(rawRecords.map((record) => record.id)).size, rawRecords.length);
  assert.equal(new Set(rawRecords.map((record) => record.slug)).size, rawRecords.length);
  assert.equal(companies.length, 89);
  assert.equal(new Set(Object.values(EMPLOYER_ID_BY_COMPANY)).size, 84); // Goodwell now has an approved public opportunity.
  assert.ok(companies.every((company) => mapped.has(normalizeEmployerName(company)) || unresolved.has(normalizeEmployerName(company))));
  assert.ok(UNRESOLVED_EMPLOYER_LABELS.every((company) => !mapped.has(normalizeEmployerName(company))));
  validateEmployerIdentityMap(EMPLOYER_ID_BY_COMPANY);
});

test("projection validates identity, dates, locations, lifecycle and retained removals", () => {
  validateOpportunityRecords(projectedRecords, removedJobIds, "2026-09-27");
  assert.equal(projectedRecords.length, rawRecords.length);
  assert.equal(projectedRecords.filter((record) => record.employerId).length, 159);
  assert.equal(projectedRecords.filter((record) => record.employerPostedAt).length, 24);
  assert.equal(projectedRecords.filter((record) => record.deadlineDate).length, 63);
  assert.equal(projectedRecords.filter((record) => record.locations?.length).length, 121);
  assert.equal(projectedRecords.filter((record) => record.workArrangement).length, 8);
  assert.equal(projectedRecords.filter((record) => record.employmentType).length, 11);
  const deadlineExpiredIds = projectedRecords
    .filter((record) => record.lifecycleReason === "deadline_passed")
    .map((record) => record.id)
    .sort();
  const expectedDeadlineExpiredIds = [
    "ACD-0207", "ACD-0245", "ACD-0246", "ACD-0247", "ACD-0248", "ACD-0251", "ACD-0269", "ACD-0281",
  ];
  assert.deepEqual(deadlineExpiredIds, expectedDeadlineExpiredIds);
  assert.equal(Object.keys(verifiedDeadlinesByJobId).length, 22);
  assert.equal(projectedRecords.filter((record) => record.publicationStatus === "removed").length, removedJobIds.size + 11 + 1);
  assert.equal(projectedRecords.filter((record) => record.lifecycleStatus === "closed").length, 35);

  const sourceJobs = rawRecords.filter((record) => record.boardSection === "Jobs");
  const liveBeforeDeadlineRule = getLiveJobs(projectionBeforeDeadlineRule);
  const liveJobs = getLiveJobs(projectedRecords);
  assert.equal(liveBeforeDeadlineRule.length, 77);
  assert.equal(liveJobs.length, 66);
  assert.equal(liveBeforeDeadlineRule.length + removedJobIds.size, sourceJobs.length);
  assert.deepEqual(liveJobs.filter((record) => !liveBeforeDeadlineRule.some((prior) => prior.id === record.id)), []);
  assert.deepEqual(
    liveBeforeDeadlineRule.map((record) => record.id).filter((id) => !liveJobs.some((record) => record.id === id)).sort(),
    [...deadlineExpiredIds, "ACD-0275", "ACD-0277", "ACD-0278"].sort(),
  );
  assert.equal(new Set(liveJobs.map((record) => record.id)).size, liveJobs.length);
  assert.ok(liveJobs.every((record) => record.publicationStatus === "live"));

  for (const section of ["Programmes", "Open Applications"] as const) {
    assert.deepEqual(
      projectedRecords.filter((record) => record.boardSection === section).map((record) => record.id).sort(),
      rawRecords.filter((record) => record.boardSection === section).map((record) => record.id).sort(),
    );
  }
  assert.equal(rawRecords.filter((record) => record.boardSection === "Programmes").length, 11);
  assert.equal(projectedRecords.filter((record) => record.boardSection === "Programmes" && record.publicationStatus === "live").length, 10);
  assert.equal(rawRecords.filter((record) => record.boardSection === "Open Applications").length, 14);
});

test("ACD publication dates never populate employerPostedAt and only exact deadlines normalize", () => {
  const publishedOnly = buildOpportunityProjection([fixture({ publishedAt: "2026-09-16" })], {
    employerIdByCompany: { "Example Employer": "example-employer" },
    removedJobIds: new Set(),
    confirmedClosures: {},
    today: "2026-09-26",
  })[0];
  assert.equal(publishedOnly.employerPostedAt, undefined);
  assert.equal(normalizeDeadlineDisplay("28 Sep 2026"), "2026-09-28");
  assert.equal(normalizeDeadlineDisplay("Before 28 Sep 2026"), undefined);
  assert.equal(normalizeDeadlineDisplay("31 Feb 2026"), undefined);
  assert.equal(isIsoCalendarDate("2026-09-26"), true);
  assert.equal(isIsoCalendarDate("2026-02-30"), false);
});

test("R1 history and reactivation are preserved while Batch 2C removes only the five reviewed live IDs", () => {
  const audit = JSON.parse(readFileSync(resolve(root, "docs/audits/2026-09-26-r1-reconciliation.json"), "utf8")) as {
    inventory: { approvedLiveJobIds: string[]; liveJobIds: string[]; programmeIds: string[]; openApplicationIds: string[] };
  };
  const liveJobs = getLiveJobs(projectedRecords);
  assert.deepEqual(getLiveJobs(projectionBefore2c).map((job) => job.id).sort(), [...audit.inventory.liveJobIds].sort());
  assert.deepEqual(liveJobs.map((job) => job.id).sort(), audit.inventory.liveJobIds.filter((id) => !batch2cIds.includes(id)).sort());
  assert.deepEqual(getLiveJobs(projectionBeforeDeadlineRule).map((job) => job.id).sort(), [...audit.inventory.approvedLiveJobIds].sort());
  const reactivated = projectedRecords.find((job) => job.id === "ACD-0139")!;
  assert.equal(reactivated.publicationStatus, "live");
  assert.notEqual(reactivated.lifecycleStatus, "closed");
  assert.equal(reactivated.publishedAt, undefined);
  assert.equal(reactivated.closureEvidence, undefined);
  assert.equal(reactivated.company, "CrossBoundary Energy");
  assert.equal(reactivated.applyUrl, "https://crossboundary.applytojob.com/apply/UNsmDvSMBR/Investment-AssociateSenior-Associate-CrossBoundary-Energy");
  assert.equal(projectedRecords.find((record) => record.id === "ACD-0170")?.publicationStatus, "removed");
  for (const [section, expected] of [["Programmes", audit.inventory.programmeIds], ["Open Applications", audit.inventory.openApplicationIds]] as const) {
    assert.deepEqual(projectedRecords.filter((record) => record.boardSection === section && record.publicationStatus === "live").map((record) => record.id).sort(), [...expected].sort());
  }
  assert.equal(projectedRecords.find((record) => record.id === "ACD-0281")?.publicationStatus, "removed", "PIDG's own employer advert now supplies verified expiry provenance");
});

test("reviewed Enza and MCB deadlines share schema and inclusive expiry evidence", () => {
  for (const [id, deadline, afterDeadline] of [
    ["ACD-0227", "2026-09-28", "2026-09-29"],
    ["ACD-0228", "2026-09-28", "2026-09-29"],
    ["ACD-0254", "2026-10-01", "2026-10-02"],
  ]) {
    const source = rawRecords.find((record) => record.id === id)!;
    const onDeadline = buildOpportunityProjection([source], { ...projectionOptions, removedJobIds: new Set(), verifiedDeadlinesByJobId, today: deadline })[0];
    assert.equal(onDeadline.publicationStatus, "live");
    assert.equal(createJobPostingJsonLd(onDeadline)?.validThrough, deadline);
    const expired = buildOpportunityProjection([source], { ...projectionOptions, removedJobIds: new Set(), verifiedDeadlinesByJobId, today: afterDeadline })[0];
    assert.equal(expired.lifecycleReason, "deadline_passed");
    assert.equal(createJobPostingJsonLd(expired), null);
  }
});

test("Batch 2C evidence is tied to five exact requisitions and preserves original cutoff wording", () => {
  const expected = [
    ["ACD-0281", "2026-09-24", "employer", "4458988023"],
    ["ACD-0269", "2026-09-25", "official_ats", "R53657"],
    ["ACD-0275", "2026-09-26", "official_ats", "16969"],
    ["ACD-0277", "2026-09-26", "official_ats", "16942"],
    ["ACD-0278", "2026-09-26", "official_ats", "16928"],
  ];
  for (const [id, date, authority, requisition] of expected) {
    const evidence = verifiedDeadlinesByJobId[id];
    assert.equal(evidence.deadlineDate, date);
    assert.equal(evidence.authority, authority);
    assert.equal(evidence.verifiedAt, "2026-09-27");
    assert.ok(evidence.sourceUrl.includes(requisition));
    assert.ok(evidence.statement.includes(requisition));
    assert.ok(!removedJobIds.has(id), "Batch 2C must not hard-code manual removals");
  }
  assert.match(verifiedDeadlinesByJobId["ACD-0281"].statement, /23:59 GMT\+1/);
  assert.match(verifiedDeadlinesByJobId["ACD-0269"].statement, /not accepted on 26\/09\/26 or afterwards/);
  assert.equal(rawRecords.find((record) => record.id === "ACD-0269")?.deadlineDisplay, "Before 26 Sep 2026");
  for (const id of ["ACD-0275", "ACD-0277", "ACD-0278"]) {
    assert.match(verifiedDeadlinesByJobId[id].statement, /2026-09-26T23:59:59\+02:00/);
    assert.equal(confirmedClosures[id].verifiedAt, "2026-09-27");
    assert.match(confirmedClosures[id].reason, /POSTING HAS ALREADY EXPIRED/);
    assert.equal(confirmedClosures[id].evidence, verifiedDeadlinesByJobId[id].sourceUrl);
  }
  assert.equal(confirmedClosures["ACD-0269"], undefined, "An unavailable page alone is not confirmed closure");
  assert.equal(confirmedClosures["ACD-0281"], undefined, "An SRI 404 alone is not confirmed closure");
});

test("Batch 2C deadline boundaries retain inclusive dates and exclude RMB on the entire 26th", () => {
  // Exercise the existing date-granularity rule without the later IDC closure override.
  for (const [id, lastEligibleDay, firstExpiredDay] of [
    ["ACD-0281", "2026-09-24", "2026-09-25"],
    ["ACD-0269", "2026-09-25", "2026-09-26"],
    ["ACD-0275", "2026-09-26", "2026-09-27"],
    ["ACD-0277", "2026-09-26", "2026-09-27"],
    ["ACD-0278", "2026-09-26", "2026-09-27"],
  ]) {
    const source = rawRecords.find((record) => record.id === id)!;
    const project = (today: string) => buildOpportunityProjection([source], {
      ...projectionOptions, removedJobIds: new Set(), confirmedClosures: {}, verifiedDeadlinesByJobId, today,
    })[0];
    assert.equal(project(lastEligibleDay).publicationStatus, "live", id);
    assert.equal(project(firstExpiredDay).publicationStatus, "removed", id);
    assert.equal(project(firstExpiredDay).lifecycleReason, "deadline_passed", id);
  }
});

test("Batch 2C retains every historical field and leaves all unrelated records unchanged", () => {
  assert.equal(projectionBefore2c.length, 168);
  assert.equal(projectedRecords.length, 168);
  assert.equal(getLiveJobs(projectionBefore2c).length, 71);
  assert.equal(getLiveJobs(projectedRecords).length, 66);
  const changedFields = new Set([
    "deadlineDate", "verifiedDeadline", "publicationStatus", "lifecycleStatus", "lifecycleReason",
    "closureVerifiedAt", "closureReason", "closureEvidence",
  ]);
  for (const before of projectionBefore2c) {
    const after = projectedRecords.find((record) => record.id === before.id)!;
    assert.ok(after, before.id);
    if (!batch2cIds.includes(before.id)) {
      assert.deepEqual(after, before, before.id);
      continue;
    }
    const originalFields = (record: Opportunity) => Object.fromEntries(Object.entries(record).filter(([key]) => !changedFields.has(key)));
    assert.deepEqual(originalFields(after), originalFields(before), before.id);
    assert.equal(after.publicationStatus, "removed");
    assert.equal(after.lifecycleStatus, "closed");
    assert.equal(after.lifecycleReason, confirmedClosures[before.id] ? "verified_closed" : "deadline_passed");
    assert.ok(after.verifiedDeadline);
  }
});

test("Batch 2C expired jobs are excluded from live discovery, sitemap and JobPosting", () => {
  const liveJobs = getLiveJobs(projectedRecords);
  const sitemap = buildSitemap(liveJobs);
  assert.equal(sitemap.length, 70, "66 job URLs plus four core routes; categories are added separately");
  for (const id of batch2cIds) {
    const historical = projectedRecords.find((record) => record.id === id)!;
    assert.ok(!liveJobs.some((record) => record.id === id));
    assert.ok(!liveJobs.find((record) => record.slug === historical.slug), "The detail lookup receives only live JOBS");
    assert.ok(!sitemap.some(({ url }) => url === `${ACD_SITE_URL}/jobs/${historical.slug}/`));
    assert.equal(createJobPostingJsonLd(historical), null);
    for (const category of ENABLED_JOB_CATEGORY_PAGES) {
      assert.ok(!filterJobsForCategory(liveJobs, category).some((record) => record.id === id));
    }
  }
});

test("explicit confirmed closure removes a role before its future deadline", () => {
  const closed = buildOpportunityProjection([fixture({ deadlineDisplay: "30 Sep 2026" })], {
    employerIdByCompany: {}, removedJobIds: new Set(), today: "2026-09-26",
    confirmedClosures: { "ACD-TEST": { verifiedAt: "2026-09-25", reason: "Employer confirmed the vacancy filled.", evidence: "https://example.test/job/closure" } },
  })[0];
  assert.equal(closed.publicationStatus, "removed");
  assert.equal(closed.lifecycleReason, "verified_closed");
  assert.deepEqual(getLiveJobs([closed]), []);
});

test("structured locations preserve city, country, region and multi-market shapes", () => {
  assert.deepEqual(deriveStructuredLocations(fixture({ city: "Nairobi", country: "Kenya" })), [
    { scope: "city", city: "Nairobi", country: "Kenya" },
  ]);
  assert.deepEqual(deriveStructuredLocations(fixture({ city: undefined, country: "Kenya", locationDisplay: "National, Kenya" })), [
    { scope: "country", country: "Kenya" },
  ]);
  assert.deepEqual(deriveStructuredLocations(fixture({ city: undefined, country: undefined, region: "West Africa", locationDisplay: "West Africa" })), [
    { scope: "region", region: "West Africa" },
  ]);
  assert.deepEqual(deriveStructuredLocations(fixture({
    city: "Cape Town",
    country: "South Africa",
    locationDisplay: "Cape Town / Johannesburg, South Africa (Remote)",
  })), []);
  assert.deepEqual(deriveStructuredLocations(fixture({
    city: "Tunis",
    country: "Tunisia",
    locationDisplay: "Tunis, Casablanca, Cairo",
  })), []);

  const mkopa = projectedRecords.find((record) => record.id === "ACD-0166");
  assert.deepEqual(mkopa?.locations, [
    { scope: "city", city: "Cape Town", country: "South Africa" },
    { scope: "city", city: "Johannesburg", country: "South Africa" },
  ]);
  assert.equal(mkopa?.workArrangement, "remote");

  const multiMarket = fixture({
    locations: [{ scope: "multi_market", countries: ["Kenya", "Uganda"], region: "East Africa" }],
  });
  assert.doesNotThrow(() => validateOpportunityRecords([multiMarket]));
  assert.throws(() => validateOpportunityRecords([fixture({ locations: [{ scope: "multi_market", countries: ["Kenya", "kenya"] }] })]), /distinct countries/);
});

test("deadline passage requests verification but does not remove a live opportunity", () => {
  const pastDeadline = buildOpportunityProjection([fixture({
    deadlineDisplay: "25 Sep 2026",
    deadlineDate: "2026-09-25",
  })], {
    employerIdByCompany: { "Example Employer": "example-employer" },
    removedJobIds: new Set(),
    confirmedClosures: {},
    today: "2026-09-26",
  })[0];

  assert.equal(pastDeadline.lifecycleStatus, "needs_verification");
  assert.equal(pastDeadline.publicationStatus, "live");
  assert.deepEqual(getLiveJobs([pastDeadline]).map((record) => record.id), [pastDeadline.id]);
});

test("verified hard deadline is inclusive through its UTC application date", () => {
  const deadline: VerifiedDeadlineEvidence = {
    deadlineDate: "2026-09-30",
    authority: "official_ats",
    sourceUrl: "https://example.test/jobs/role",
    verifiedAt: "2026-09-20",
    statement: "Applications close on 30 September 2026.",
  };
  const projectOn = (today: string, evidence = deadline) => buildOpportunityProjection([fixture({
    deadlineDate: evidence.deadlineDate,
    deadlineDisplay: "30 Sep 2026",
  })], {
    employerIdByCompany: { "Example Employer": "example-employer" },
    removedJobIds: new Set(),
    confirmedClosures: {},
    verifiedDeadlinesByJobId: { "ACD-TEST": evidence },
    today,
  })[0];

  for (const today of ["2026-09-29", "2026-09-30"]) {
    const opportunity = projectOn(today);
    assert.equal(opportunity.publicationStatus, "live");
    assert.equal(opportunity.lifecycleStatus, "active");
    assert.deepEqual(getLiveJobs([opportunity]).map((record) => record.id), ["ACD-TEST"]);
  }

  const expired = projectOn("2026-10-01");
  assert.equal(expired.publicationStatus, "removed");
  assert.equal(expired.lifecycleStatus, "closed");
  assert.equal(expired.lifecycleReason, "deadline_passed");
  assert.ok(expired.verifiedDeadline);
  assert.deepEqual(getLiveJobs([expired]), []);
  assert.ok(!buildSitemap(getLiveJobs([expired])).some((entry) => entry.url === `${ACD_SITE_URL}/jobs/${expired.slug}/`));
  assert.equal(createJobPostingJsonLd({
    ...expired,
    employerId: "example-employer",
    employerPostedAt: "2026-09-01",
    locations: [{ scope: "city", city: "Nairobi", country: "Kenya" }],
  }), null);
  assert.equal(expired.id, "ACD-TEST", "the historical opportunity record remains present");
  assert.equal(expired.title, "Investment Analyst");
});

test("deadlineDisplay and unverified deadlineDate never auto-expire a job", () => {
  for (const opportunity of [
    fixture({ deadlineDisplay: "25 Sep 2026" }),
    fixture({ deadlineDate: "2026-09-25", deadlineDisplay: "Before 25 Sep 2026" }),
    fixture(),
  ]) {
    const projected = buildOpportunityProjection([opportunity], {
      employerIdByCompany: { "Example Employer": "example-employer" },
      removedJobIds: new Set(),
      confirmedClosures: {},
      today: "2026-09-26",
    })[0];
    assert.equal(projected.publicationStatus, "live");
    assert.notEqual(projected.lifecycleReason, "deadline_passed");
    assert.deepEqual(getLiveJobs([projected]).map((record) => record.id), [opportunity.id]);
  }
});

test("verified manual closure evidence wins over a passed deadline", () => {
  const manualClosure: ConfirmedClosure = {
    verifiedAt: "2026-09-24",
    reason: "The employer confirmed this vacancy was filled before the deadline.",
    evidence: "https://example.test/jobs/role/closure-notice",
  };
  const projected = buildOpportunityProjection([fixture({
    deadlineDate: "2026-09-30",
    deadlineDisplay: "30 Sep 2026",
  })], {
    employerIdByCompany: { "Example Employer": "example-employer" },
    removedJobIds: new Set(),
    confirmedClosures: { "ACD-TEST": manualClosure },
    verifiedDeadlinesByJobId: {
      "ACD-TEST": {
        deadlineDate: "2026-09-30",
        authority: "official_ats",
        sourceUrl: "https://example.test/jobs/role",
        verifiedAt: "2026-09-20",
        statement: "Applications close on 30 September 2026.",
      },
    },
    today: "2026-10-01",
  })[0];

  assert.equal(projected.lifecycleStatus, "closed");
  assert.equal(projected.lifecycleReason, "verified_closed");
  assert.equal(projected.closureReason, manualClosure.reason);
  assert.equal(projected.closureEvidence, manualClosure.evidence);
  assert.equal(projected.closureVerifiedAt, manualClosure.verifiedAt);
});

test("a newer verified deadline extension controls the lifecycle", () => {
  const source = fixture({ deadlineDate: "2026-09-25", deadlineDisplay: "25 Sep 2026" });
  const project = (deadlineDate: string) => buildOpportunityProjection([source], {
    employerIdByCompany: { "Example Employer": "example-employer" },
    removedJobIds: new Set(),
    confirmedClosures: {},
    verifiedDeadlinesByJobId: {
      "ACD-TEST": {
        deadlineDate,
        authority: "official_ats",
        sourceUrl: "https://example.test/jobs/role",
        verifiedAt: deadlineDate === "2026-09-25" ? "2026-09-20" : "2026-09-26",
        statement: deadlineDate === "2026-09-25"
          ? "Applications close on 25 September 2026."
          : "The employer extended applications to 30 September 2026.",
      },
    },
    today: "2026-09-26",
  })[0];

  assert.equal(project("2026-09-25").lifecycleReason, "deadline_passed");
  const extended = project("2026-09-30");
  assert.equal(extended.deadlineDate, "2026-09-30");
  assert.equal(extended.verifiedDeadline?.verifiedAt, "2026-09-26");
  assert.equal(extended.publicationStatus, "live");
  assert.equal(extended.lifecycleStatus, "active");
});

test("closed lifecycle requires evidence, and optional structured fields remain backward compatible", () => {
  assert.doesNotThrow(() => validateOpportunityRecords([fixture()]));
  assert.doesNotThrow(() => validateOpportunityRecords([fixture({
    workArrangement: "hybrid",
    employmentType: "full-time",
    employmentTypeDisplay: "Full-time role",
  })]));
  assert.throws(() => validateOpportunityRecords([fixture({ lifecycleStatus: "closed" })]), /verified deadline provenance or explicit closure evidence/);
  assert.throws(() => validateOpportunityRecords([fixture({
    deadlineDate: "2026-09-30",
    verifiedDeadline: {
      deadlineDate: "2026-09-30",
      authority: "official_ats",
      sourceUrl: "https://example.test/jobs/role",
      verifiedAt: "2026-09-20",
      statement: "Applications close on 30 September 2026.",
    },
    publicationStatus: "removed",
    lifecycleStatus: "closed",
    lifecycleReason: "deadline_passed",
  })], new Set(), "2026-09-30"), /verified deadline provenance or explicit closure evidence/);
  assert.throws(() => validateOpportunityRecords([fixture({ employerPostedAt: "2026-09-31" })]), /employerPostedAt/);
  assert.throws(() => validateOpportunityRecords([fixture({ deadlineDate: "not-a-date" })]), /deadlineDate/);
  assert.throws(() => validateOpportunityRecords([fixture({ workArrangement: "flexible" as Opportunity["workArrangement"] })]), /work arrangement/);
  assert.throws(() => validateOpportunityRecords([fixture({ employmentType: "seasonal" as Opportunity["employmentType"] })]), /employment type/);
});

test("only jobs with verified dates, live lifecycle, stable identity and visible city locations get JobPosting schema", () => {
  const eligible = projectedRecords.filter((record) => createJobPostingJsonLd(record));
  assert.deepEqual(eligible.map((record) => record.id).sort(), [
    "ACD-0227", "ACD-0228", "ACD-0254", "ACD-0257", "ACD-0258", "ACD-0260", "ACD-0262", "ACD-0264",
  ]);
  for (const id of ["ACD-0227", "ACD-0228"]) {
    assert.equal(createJobPostingJsonLd(projectedRecords.find((record) => record.id === id)!)?.employmentType, "FULL_TIME");
  }
  assert.equal(createJobPostingJsonLd(fixture({
    employerId: "example-employer",
    employerPostedAt: "2026-09-16",
    locations: [{ scope: "country", country: "Kenya" }],
    publicationStatus: "live",
    lifecycleStatus: "active",
  })), null);
  assert.equal(createJobPostingJsonLd(fixture({
    employerId: "example-employer",
    employerPostedAt: "2026-09-16",
    locations: [
      { scope: "city", city: "Cape Town", country: "South Africa" },
      { scope: "city", city: "Johannesburg", country: "South Africa" },
    ],
    workArrangement: "remote",
    publicationStatus: "live",
    lifecycleStatus: "active",
  })), null);
});

test("enabled category counts cover unique current live Jobs including approved secondary discovery", () => {
  const liveJobs = getLiveJobs(projectedRecords);
  const counts = Object.fromEntries(ENABLED_JOB_CATEGORY_PAGES.map((category) => [
    category.slug,
    filterJobsForCategory(liveJobs, category).length,
  ]));

  assert.deepEqual(counts, {
    "private-equity-venture-capital": 11,
    "development-finance": 4,
    "infrastructure-project-finance": 17,
    "investment-banking": 13,
    "climate-impact-investing": 7,
  });
});

const privateMarketsAssignments: Record<string, Opportunity["roleType"]> = {
  "ACD-0005": "Infrastructure & Project Finance",
  "ACD-0009": "Climate & Impact Investing",
  "ACD-0016": "Infrastructure & Project Finance",
  "ACD-0041": "Climate & Impact Investing",
  "ACD-0083": "Infrastructure & Project Finance",
  "ACD-0151": "Climate & Impact Investing",
};

test("the private-markets pilot is limited to six approved live roles with unchanged primary categories", () => {
  const themed = projectedRecords.filter((record) => record.discoveryThemes?.length);
  assert.deepEqual(themed.map(({ id }) => id).sort(), Object.keys(privateMarketsAssignments).sort());
  const liveJobs = getLiveJobs(projectedRecords);
  for (const record of themed) {
    assert.deepEqual(record.discoveryThemes, ["private-markets"]);
    assert.equal(record.roleType, privateMarketsAssignments[record.id]);
    assert.ok(liveJobs.includes(record));
    const primaryPage = ENABLED_JOB_CATEGORY_PAGES.find((category) => category.roleType === record.roleType)!;
    assert.ok(filterJobsForCategory(liveJobs, primaryPage).includes(record));
  }
  for (const category of ENABLED_JOB_CATEGORY_PAGES.filter((category) => !category.discoveryTheme)) {
    assert.deepEqual(filterJobsForCategory(liveJobs, category), liveJobs.filter((job) => job.roleType === category.roleType));
  }
});

test("the PE page retains its five primary jobs and adds only the six approved secondary jobs", () => {
  const liveJobs = getLiveJobs(projectedRecords);
  const pe = ENABLED_JOB_CATEGORY_PAGES.find((category) => category.slug === "private-equity-venture-capital")!;
  const primaryIds = ["ACD-0211", "ACD-0227", "ACD-0228", "ACD-0252", "ACD-0263"];
  const expectedIds = [...primaryIds, ...Object.keys(privateMarketsAssignments)].sort();
  const matches = filterJobsForCategory(liveJobs, pe);
  assert.deepEqual(matches.map(({ id }) => id).sort(), expectedIds);
  assert.equal(new Set(matches.map(({ id }) => id)).size, 11);
  assert.deepEqual(matches, liveJobs.filter((record) => expectedIds.includes(record.id)), "Keep underlying board order");
  for (const id of ["ACD-0266", "ACD-0285", "ACD-0139", "ACD-0281"]) {
    assert.equal(projectedRecords.find((record) => record.id === id)?.discoveryThemes, undefined);
    assert.ok(!matches.some((record) => record.id === id), "Medium-confidence and expired candidates remain excluded");
  }
});

test("discovery themes do not change canonical job URLs, sitemap entries or JobPosting data", () => {
  const liveJobs = getLiveJobs(projectedRecords);
  const withoutThemes = liveJobs.map((record) => ({ ...record, discoveryThemes: undefined }));
  assert.deepEqual(buildSitemap(liveJobs), buildSitemap(withoutThemes));
  for (const record of liveJobs) {
    assert.deepEqual(createJobPostingJsonLd(record), createJobPostingJsonLd({ ...record, discoveryThemes: undefined }));
  }
  const pe = ENABLED_JOB_CATEGORY_PAGES.find((category) => category.discoveryTheme)!;
  const matches = filterJobsForCategory(liveJobs, pe);
  for (const id of Object.keys(privateMarketsAssignments)) {
    const record = liveJobs.find((record) => record.id === id)!;
    const primaryPage = ENABLED_JOB_CATEGORY_PAGES.find((category) => category.roleType === record.roleType)!;
    assert.strictEqual(matches.find((item) => item.id === id), record);
    assert.strictEqual(filterJobsForCategory(liveJobs, primaryPage).find((item) => item.id === id), record);
    assert.equal(buildSitemap(liveJobs).filter(({ url }) => url === `${ACD_SITE_URL}/jobs/${record.slug}/`).length, 1);
  }
});

test("discovery metadata accepts only the controlled array at compile time and runtime", () => {
  assert.doesNotThrow(() => validateOpportunityRecords([fixture({ discoveryThemes: ["private-markets"] })]));
  assert.doesNotThrow(() => validateOpportunityRecords([fixture({ discoveryThemes: [] })]));
  // @ts-expect-error Arbitrary free text is not an editorial discovery theme.
  const arbitrary: Opportunity["discoveryThemes"] = ["private-equity"];
  for (const value of [arbitrary, ["private-markets", "anything"], "private-markets", null, [42], ["private-markets", "private-markets"]]) {
    assert.throws(() => validateOpportunityRecords([fixture({ discoveryThemes: value as Opportunity["discoveryThemes"] })]), /controlled discovery themes/);
  }
});

const peBoardFilters = (overrides: Partial<JobBoardFilters> = {}): JobBoardFilters => ({
  region: [], country: [], roleType: ["Private Equity, VC & Private Credit"],
  experience: [], language: [], ...overrides,
});

test("Jobs-board PE discovery returns the same eleven primary and approved secondary records as the category page", () => {
  const liveJobs = getLiveJobs(projectedRecords);
  const category = ENABLED_JOB_CATEGORY_PAGES.find((category) => category.discoveryTheme)!;
  const results = filterJobsForBoard(liveJobs, peBoardFilters());
  assert.deepEqual(results, filterJobsForCategory(liveJobs, category));
  assert.deepEqual(results.map(({ id }) => id).sort(), [
    "ACD-0005", "ACD-0009", "ACD-0016", "ACD-0041", "ACD-0083", "ACD-0151",
    "ACD-0211", "ACD-0227", "ACD-0228", "ACD-0252", "ACD-0263",
  ]);
  assert.equal(results.length, 11);
  for (const [id, roleType] of Object.entries(privateMarketsAssignments)) {
    const result = results.find((job) => job.id === id)!;
    assert.equal(result.roleType, roleType);
    assert.strictEqual(result, liveJobs.find((job) => job.id === id));
  }
  for (const id of ["ACD-0266", "ACD-0285", "ACD-0139", "ACD-0281"]) {
    assert.ok(!results.some((job) => job.id === id), "Unapproved or expired roles stay excluded");
  }
});

test("Jobs-board discovery deduplicates stable IDs and retains order without mutating records", () => {
  const both = fixture({ id: "both", discoveryThemes: ["private-markets"] });
  const secondary = fixture({ id: "secondary", roleType: "Climate & Impact Investing", discoveryThemes: ["private-markets"] });
  const primary = fixture({ id: "primary" });
  const jobs = [secondary, both, { ...both }, primary, { ...secondary }];
  const before = structuredClone(jobs);
  assert.deepEqual(filterJobsForBoard(jobs, peBoardFilters()).map(({ id }) => id), ["secondary", "both", "primary"]);
  assert.deepEqual(jobs, before);
});

test("Jobs-board PE themes cannot bypass verified expiry, removal or board-section eligibility", () => {
  const stale = batch2cIds.map((id) => ({
    ...projectedRecords.find((job) => job.id === id)!, discoveryThemes: ["private-markets"] as Opportunity["discoveryThemes"],
  }));
  const themed = (overrides: Partial<Opportunity>) => fixture({
    roleType: "Infrastructure & Project Finance", discoveryThemes: ["private-markets"], ...overrides,
  });
  const jobs = [
    ...stale,
    themed({ id: "removed", publicationStatus: "removed" }),
    themed({ id: "closed", lifecycleStatus: "closed" }),
    themed({ id: "programme", boardSection: "Programmes" }),
    themed({ id: "open", boardSection: "Open Applications" }),
    themed({ id: "verification", lifecycleStatus: "needs_verification" }),
  ];
  assert.deepEqual(filterJobsForBoard(jobs, peBoardFilters()).map(({ id }) => id), ["verification"]);
});

const peCombinationCases: { name: string; filters: Partial<JobBoardFilters>; search?: string; ids: string[] }[] = [
  { name: "country", filters: { country: ["South Africa"] }, ids: ["ACD-0041", "ACD-0151", "ACD-0211"] },
  { name: "region", filters: { region: ["North Africa"] }, ids: ["ACD-0252", "ACD-0263"] },
  { name: "experience", filters: { experience: ["Leadership"] }, ids: ["ACD-0009", "ACD-0016"] },
  { name: "language", filters: { language: ["French"] }, ids: ["ACD-0005", "ACD-0016", "ACD-0083", "ACD-0151", "ACD-0252"] },
  { name: "keyword", filters: {}, search: "  AFRICA50  ", ids: ["ACD-0005", "ACD-0009", "ACD-0016", "ACD-0083"] },
  { name: "all filter dimensions together", filters: { country: ["Morocco"], region: ["Pan-African"], experience: ["Leadership"], language: ["French"] }, search: "Africa50", ids: ["ACD-0016"] },
];
for (const combination of peCombinationCases) {
  test(`Jobs-board PE plus ${combination.name} preserves existing narrowing semantics`, () => {
    assert.deepEqual(
      filterJobsForBoard(getLiveJobs(projectedRecords), peBoardFilters(combination.filters), combination.search).map(({ id }) => id).sort(),
      combination.ids,
    );
  });
}

test("other Jobs-board role types remain primary-only and clearing selections restores all live jobs", () => {
  const jobs = getLiveJobs(projectedRecords);
  assert.deepEqual(filterJobsForBoard(jobs, peBoardFilters({ roleType: [] })), jobs);
  for (const roleType of new Set(jobs.map((job) => job.roleType))) {
    if (roleType === "Private Equity, VC & Private Credit") continue;
    assert.deepEqual(filterJobsForBoard(jobs, peBoardFilters({ roleType: [roleType] })), jobs.filter((job) => job.roleType === roleType));
  }
  assert.deepEqual(filterJobsForBoard(jobs, peBoardFilters({ roleType: ["Unapproved role type"] })), []);
});

test("Jobs-board multiselect remains OR within a filter and AND between filters", () => {
  const jobs = getLiveJobs(projectedRecords);
  const pe = new Set(filterJobsForBoard(jobs, peBoardFilters()).map(({ id }) => id));
  const filters = peBoardFilters({ roleType: ["Private Equity, VC & Private Credit", "Infrastructure & Project Finance"], country: ["Morocco", "South Africa"] });
  const results = filterJobsForBoard(jobs, filters);
  assert.deepEqual(results, jobs.filter((job) =>
    (pe.has(job.id) || job.roleType === "Infrastructure & Project Finance") &&
    (job.country === "Morocco" || job.country === "South Africa"),
  ));
  assert.equal(new Set(results.map(({ id }) => id)).size, results.length);
  assert.deepEqual(filterJobsForBoard(jobs, peBoardFilters({ country: ["Kenya"], language: ["French"] })), []);
});

const refreshedRecords = buildOpportunityProjection([...rawRecords, ...APPROVED_CONTENT_2026_09_27], {
  ...projectionOptions,
  verifiedDeadlinesByJobId,
});

test("September refresh adds only 16 Jobs, two Programmes and three Open Applications, reusing Lorax", () => {
  assert.equal(APPROVED_CONTENT_2026_09_27.length, 21);
  assert.equal(refreshedRecords.length, 189);
  assert.equal(new Set(refreshedRecords.map(({ id }) => id)).size, 189);
  assert.equal(new Set(refreshedRecords.map(({ slug }) => slug)).size, 189);
  assert.equal(getLiveJobs(refreshedRecords).length, 82);
  assert.equal(refreshedRecords.filter((o) => o.boardSection === "Programmes" && o.publicationStatus === "live").length, 12);
  assert.equal(refreshedRecords.filter((o) => o.boardSection === "Open Applications" && o.publicationStatus === "live").length, 17);
  const lorax = refreshedRecords.filter((o) => o.applyUrl === "https://loraxcapitalpartners.com/careers/");
  assert.equal(lorax.length, 1);
  assert.equal(lorax[0].id, "ACD-0051");
  assert.equal(lorax[0].slug, "analyst-application-career-portal-lorax-capital-partners-cairo");
  assert.equal(lorax[0].publishedAt, undefined);
  for (const record of APPROVED_CONTENT_2026_09_27) {
    assert.ok(EMPLOYER_ID_BY_COMPANY[record.company], record.company);
    assert.equal(record.publishedAt, "2026-09-27");
    assert.equal(record.discoveryThemes, undefined);
    assert.ok(!rawRecords.some((o) => o.id === record.id || o.slug === record.slug));
    assert.ok(!rawRecords.some((o) => o.company === record.company && o.title === record.title && o.country === record.country));
    assert.ok(!rawRecords.some((o) => o.applyUrl === record.applyUrl && new URL(record.applyUrl).pathname !== "/careers"));
  }
});

test("September refresh preserves approved application identities and verified locations", () => {
  const byId = (id: string) => APPROVED_CONTENT_2026_09_27.find((o) => o.id === id)!;
  for (const [id, jobId] of [["ACD-0296", "744000149549665"], ["ACD-0297", "744000149553928"], ["ACD-0298", "744000149056460"], ["ACD-0299", "744000149539850"]]) {
    const job = byId(id);
    assert.equal(job.applyUrl, `https://www.standardbank.com/sbg/standard-bank-group/careers/apply/jobs/view-all-jobs/job-detail?jobID=${jobId}`);
    assert.equal(job.sourceUrl, job.applyUrl);
    assert.equal(EMPLOYER_ID_BY_COMPANY[job.company], EMPLOYER_ID_BY_COMPANY["Standard Bank CIB"]);
  }
  assert.equal(byId("ACD-0299").city, "Cape Town");
  assert.equal(byId("ACD-0305").city, undefined);
  assert.equal(byId("ACD-0305").country, "South Africa");
  assert.equal(byId("ACD-0306").city, "Pretoria");
  assert.equal(byId("ACD-0307").city, "Pretoria");
  assert.equal(byId("ACD-0294").applyUrl, "https://f6vc.bamboohr.com/careers/40?source=aWQ9NA%3D%3D");
  assert.equal(byId("ACD-0301").applyUrl, "https://www.linkedin.com/posts/privateequity-investment-hiring-share-7505596269009158144-dBM8/");
});

test("September verified deadlines expire through existing lifecycle rules without losing history", () => {
  const expected = new Map([
    ["ACD-0295", "2026-09-30"], ["ACD-0302", "2026-10-09"],
    ["ACD-0303", "2026-10-30"], ["ACD-0304", "2026-10-30"],
    ["ACD-0305", "2026-09-30"], ["ACD-0306", "2026-10-02"],
    ["ACD-0307", "2026-10-02"], ["ACD-0308", "2026-09-30"],
  ]);
  for (const record of APPROVED_CONTENT_2026_09_27) {
    assert.equal(record.deadlineDate, expected.get(record.id));
    assert.equal(record.verifiedDeadline?.deadlineDate, expected.get(record.id));
    if (expected.has(record.id)) {
      const deadline = record.verifiedDeadline!;
      assert.ok(deadline.statement && deadline.sourceUrl && deadline.verifiedAt);
    } else {
      assert.equal(record.deadlineDisplay, undefined);
    }
  }
  const expired = buildOpportunityProjection(APPROVED_CONTENT_2026_09_27, {
    ...projectionOptions, removedJobIds: new Set(), confirmedClosures: {}, today: "2026-10-31",
  });
  assert.equal(expired.length, 21);
  assert.deepEqual(expired.filter((o) => o.lifecycleStatus === "closed").map((o) => o.id).sort(), [...expected.keys()].sort());
  assert.ok(expired.filter((o) => expected.has(o.id)).every((o) => o.publicationStatus === "removed" && o.lifecycleReason === "deadline_passed"));
});

test("September refresh uses existing category discovery, sitemap and conservative JobPosting eligibility", () => {
  const jobs = getLiveJobs(refreshedRecords);
  const counts: Record<string, number> = {
    "private-equity-venture-capital": 16, "development-finance": 4,
    "infrastructure-project-finance": 21, "investment-banking": 16, "climate-impact-investing": 7,
  };
  assert.equal(ENABLED_JOB_CATEGORY_PAGES.length, 5);
  for (const category of ENABLED_JOB_CATEGORY_PAGES) {
    assert.equal(filterJobsForCategory(jobs, category).length, counts[category.slug]);
  }
  const category = ENABLED_JOB_CATEGORY_PAGES.find((c) => c.slug === "private-equity-venture-capital")!;
  const board = filterJobsForBoard(jobs, { region: [], country: [], roleType: [category.roleType], experience: [], language: [] });
  assert.deepEqual(board.map((o) => o.id), filterJobsForCategory(jobs, category).map((o) => o.id));
  assert.equal(buildSitemap(jobs).length, 86);
  for (const record of APPROVED_CONTENT_2026_09_27) {
    // An ACD publication date is not an employer posting date.
    assert.equal(createJobPostingJsonLd(record), null);
  }
  const source = readFileSync(resolve(root, "src/data/opportunities.ts"), "utf8");
  assert.match(source, /\.\.\.\[\.\.\.APPROVED_CONTENT_2026_09_27\]\.reverse\(\)/);
});

test("October refresh reconciles the existing Power and Infrastructure requisition and adds only approved records", () => {
  const additions = APPROVED_CONTENT_2026_10_04;
  assert.equal(additions.length, 18);
  assert.equal(additions.filter((o) => o.boardSection === "Jobs").length, 15);
  assert.equal(additions.filter((o) => o.boardSection === "Programmes").length, 3);
  assert.ok(additions.every((o) => o.boardSection !== "Open Applications"));
  assert.deepEqual(additions.map((o) => o.id), Array.from({ length: 18 }, (_, i) => `ACD-${String(322 + i).padStart(4, "0")}`));
  const all = [...rawRecords, ...APPROVED_CONTENT_2026_09_27, ...APPROVED_CONTENT_2026_09_30, ...additions];
  assert.equal(new Set(all.map((o) => o.id)).size, all.length);
  assert.equal(new Set(all.map((o) => o.slug)).size, all.length);
  assert.deepEqual(Object.keys(REFRESHED_FIELDS_2026_10_04), ["ACD-0204"]);
  const original = rawRecords.find((o) => o.id === "ACD-0204")!;
  const reconciled = { ...original, ...REFRESHED_FIELDS_2026_10_04[original.id] };
  for (const key of ["id", "slug", "publishedAt"] as const) assert.equal(reconciled[key], original[key]);
  assert.equal(EMPLOYER_ID_BY_COMPANY[reconciled.company], "employer-091-crossboundary-group");
  assert.equal(reconciled.language, undefined);
  assert.equal(reconciled.languageTags, undefined);
  const byId = (id: string) => all.find((o) => o.id === id)!;
  const crossBoundary = [byId("ACD-0322"), byId("ACD-0323"), byId("ACD-0324"), reconciled];
  assert.deepEqual(crossBoundary.map((o) => new URL(o.applyUrl).pathname.split("/")[2]), ["H5AR9vjMfA", "XwOeUO2FLt", "Ha2mIKdhAN", "XF8MGrTZmV"]);
  assert.equal(REFRESH_JOB_IDS_2026_10_04.length, 16);
  assert.equal(new Set(REFRESH_JOB_IDS_2026_10_04).size, 16);
  assert.deepEqual(REFRESH_JOB_IDS_2026_10_04.slice(0, 4), crossBoundary.map((o) => o.id));
});

test("October application destinations, employer identities and substantive eligibility remain intact", () => {
  const byId = (id: string) => APPROVED_CONTENT_2026_10_04.find((o) => o.id === id)!;
  assert.equal(byId("ACD-0336").applyUrl, "https://www.pic.gov.za/careers");
  assert.equal(byId("ACD-0329").applyUrl, "https://targetapply.bii.targetconnect.com/c/bii?utm_source=linkedin");
  assert.match(byId("ACD-0329").requirements!.join(" "), /Permanent right to work in the UK/);
  assert.match(byId("ACD-0329").summary, /Graduate and Student visas are not accepted/);
  for (const [id, jobId] of [["ACD-0330", "744000152670306"], ["ACD-0331", "744000152741449"], ["ACD-0332", "744000152337259"]]) {
    assert.equal(byId(id).applyUrl, `https://www.standardbank.com/sbg/standard-bank-group/careers/apply/jobs/view-all-jobs/job-detail?jobID=${jobId}`);
  }
  assert.equal(byId("ACD-0333").employmentType, "contract");
  assert.match(byId("ACD-0333").employmentTypeDisplay!, /Independent/);
  assert.equal(byId("ACD-0332").city, "London");
  assert.equal(byId("ACD-0332").region, "Pan-African");
  assert.equal(byId("ACD-0334").applyUrl, "https://dbsa.erecruit.co/candidateapp/Jobs/View/DBS251126-1");
  assert.equal(byId("ACD-0337").applyUrl, "https://jobs.mcbgroup.com/#en/sites/CX/job/2447");
  assert.equal(byId("ACD-0339").applyUrl, "https://afdb.jobs2web.com/job/Abidjan-2027-INTERNSHIP-PROGRAM-SESSION-1/1441963333/");
  assert.match(byId("ACD-0339").requirements!.join(" "), /no older than 30/);
  assert.match(byId("ACD-0339").requirements!.join(" "), /member country/);
  assert.match(byId("ACD-0339").requirements!.join(" "), /within one year/);
  for (const record of APPROVED_CONTENT_2026_10_04) {
    assert.ok(EMPLOYER_ID_BY_COMPANY[record.company], record.company);
    assert.equal(record.publishedAt, record.id === "ACD-0339" ? "2026-10-05" : "2026-10-04");
    assert.equal(record.discoveryThemes, undefined);
    const words = [record.summary, record.aboutRole, ...(record.responsibilities ?? []), ...(record.requirements ?? [])].filter(Boolean).join(" ").split(/\s+/).length;
    assert.ok(words >= 180, `${record.id}: ${words} words`);
    assert.ok(readFileSync(resolve(root, "public", record.logoUrl!.slice(1))).length > 0);
  }
});

test("October verified deadlines use existing expiry rules and retain historical records", () => {
  const expected = new Map([
    ["ACD-0325", "2026-10-15"], ["ACD-0326", "2026-10-15"],
    ["ACD-0327", "2026-10-08"], ["ACD-0328", "2026-10-14"],
    ["ACD-0334", "2026-10-16"], ["ACD-0335", "2026-10-14"],
    ["ACD-0336", "2026-10-06"], ["ACD-0337", "2026-10-05"],
    ["ACD-0339", "2026-10-12"],
  ]);
  for (const record of APPROVED_CONTENT_2026_10_04) {
    assert.equal(record.deadlineDate, expected.get(record.id));
    assert.equal(record.verifiedDeadline?.deadlineDate, expected.get(record.id));
    if (expected.has(record.id)) assert.ok(record.verifiedDeadline?.statement && record.verifiedDeadline.sourceUrl && record.verifiedDeadline.verifiedAt);
  }
  const options = { ...projectionOptions, removedJobIds: new Set<string>(), confirmedClosures: {} };
  const current = buildOpportunityProjection(APPROVED_CONTENT_2026_10_04, { ...options, today: "2026-10-04" });
  assert.ok(current.every((o) => o.publicationStatus === "live" && o.lifecycleStatus === "active"));
  const expired = buildOpportunityProjection(APPROVED_CONTENT_2026_10_04, { ...options, today: "2026-10-17" });
  assert.equal(expired.length, APPROVED_CONTENT_2026_10_04.length);
  assert.deepEqual(expired.filter((o) => o.lifecycleStatus === "closed").map((o) => o.id).sort(), [...expected.keys()].sort());
  assert.ok(expired.filter((o) => expected.has(o.id)).every((o) => o.publicationStatus === "removed" && o.lifecycleReason === "deadline_passed"));
});
