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

const root = process.cwd();
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
const projectionOptions = {
  employerIdByCompany: EMPLOYER_ID_BY_COMPANY,
  removedJobIds,
  confirmedClosures,
  employerPostedAtByJobId,
  verifiedFieldsByJobId,
  today: "2026-09-26",
};
const projectionBeforeDeadlineRule = buildOpportunityProjection(rawRecords, projectionOptions);
const projectedRecords = buildOpportunityProjection(rawRecords, {
  ...projectionOptions,
  verifiedDeadlinesByJobId,
});

test("public source snapshots have stable unique IDs and every employer label is mapped or explicitly unresolved", () => {
  const companies = [...new Set(rawRecords.map((record) => record.company))];
  const mapped = new Set(Object.keys(EMPLOYER_ID_BY_COMPANY).map(normalizeEmployerName));
  const unresolved = new Set(UNRESOLVED_EMPLOYER_LABELS.map(normalizeEmployerName));

  assert.equal(rawRecords.length, 168);
  assert.equal(new Set(rawRecords.map((record) => record.id)).size, rawRecords.length);
  assert.equal(new Set(rawRecords.map((record) => record.slug)).size, rawRecords.length);
  assert.equal(companies.length, 89);
  assert.equal(new Set(Object.values(EMPLOYER_ID_BY_COMPANY)).size, 73);
  assert.ok(companies.every((company) => mapped.has(normalizeEmployerName(company)) || unresolved.has(normalizeEmployerName(company))));
  assert.ok(UNRESOLVED_EMPLOYER_LABELS.every((company) => !mapped.has(normalizeEmployerName(company))));
  validateEmployerIdentityMap(EMPLOYER_ID_BY_COMPANY);
});

test("projection validates identity, dates, locations, lifecycle and retained removals", () => {
  validateOpportunityRecords(projectedRecords, removedJobIds, "2026-09-26");
  assert.equal(projectedRecords.length, rawRecords.length);
  assert.equal(projectedRecords.filter((record) => record.employerId).length, 159);
  assert.equal(projectedRecords.filter((record) => record.employerPostedAt).length, 24);
  assert.equal(projectedRecords.filter((record) => record.deadlineDate).length, 61);
  assert.equal(projectedRecords.filter((record) => record.locations?.length).length, 121);
  assert.equal(projectedRecords.filter((record) => record.workArrangement).length, 8);
  assert.equal(projectedRecords.filter((record) => record.employmentType).length, 11);
  const deadlineExpiredIds = projectedRecords
    .filter((record) => record.lifecycleReason === "deadline_passed")
    .map((record) => record.id)
    .sort();
  const expectedDeadlineExpiredIds = [
    "ACD-0207", "ACD-0245", "ACD-0246", "ACD-0247", "ACD-0248", "ACD-0251",
  ];
  assert.deepEqual(deadlineExpiredIds, expectedDeadlineExpiredIds);
  assert.equal(Object.keys(verifiedDeadlinesByJobId).length, 17);
  assert.equal(projectedRecords.filter((record) => record.publicationStatus === "removed").length, removedJobIds.size + 6 + 1);
  assert.equal(projectedRecords.filter((record) => record.lifecycleStatus === "closed").length, 30);

  const sourceJobs = rawRecords.filter((record) => record.boardSection === "Jobs");
  const liveBeforeDeadlineRule = getLiveJobs(projectionBeforeDeadlineRule);
  const liveJobs = getLiveJobs(projectedRecords);
  assert.equal(liveBeforeDeadlineRule.length, 77);
  assert.equal(liveJobs.length, 71);
  assert.equal(liveBeforeDeadlineRule.length + removedJobIds.size, sourceJobs.length);
  assert.deepEqual(liveJobs.filter((record) => !liveBeforeDeadlineRule.some((prior) => prior.id === record.id)), []);
  assert.deepEqual(
    liveBeforeDeadlineRule.map((record) => record.id).filter((id) => !liveJobs.some((record) => record.id === id)).sort(),
    deadlineExpiredIds,
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

test("R1 preserves the approved ID set, reactivation and programme removal", () => {
  const audit = JSON.parse(readFileSync(resolve(root, "docs/audits/2026-09-26-r1-reconciliation.json"), "utf8")) as {
    inventory: { approvedLiveJobIds: string[]; liveJobIds: string[]; programmeIds: string[]; openApplicationIds: string[] };
  };
  const liveJobs = getLiveJobs(projectedRecords);
  assert.deepEqual(liveJobs.map((job) => job.id).sort(), [...audit.inventory.liveJobIds].sort());
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
  assert.equal(projectedRecords.find((record) => record.id === "ACD-0281")?.publicationStatus, "live", "a retained search-firm deadline is not employer/official-ATS expiry provenance");
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

test("enabled category counts exactly cover their matching current live Jobs records", () => {
  const liveJobs = getLiveJobs(projectedRecords);
  const counts = Object.fromEntries(ENABLED_JOB_CATEGORY_PAGES.map((category) => [
    category.slug,
    filterJobsForCategory(liveJobs, category).length,
  ]));

  assert.deepEqual(counts, {
    "private-equity-venture-capital": 5,
    "development-finance": 7,
    "infrastructure-project-finance": 18,
    "investment-banking": 14,
    "climate-impact-investing": 7,
  });
});
