import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Opportunity } from "../../../src/types/index.ts";
import robots from "../../../src/app/robots.ts";
import {
  ACD_SITE_URL,
  buildSitemap,
  canonicalPath,
  createJobPostingJsonLd,
  jobPageMetadata,
  NO_INDEX_ROBOTS,
} from "../../../src/lib/seo.ts";

const job: Opportunity = {
  id: "ACD-TEST",
  slug: "investment-analyst-example-employer-nairobi",
  title: "Investment Analyst",
  company: "Example Employer",
  companyInitials: "EE",
  boardSection: "Jobs",
  roleType: "Private Equity, VC & Private Credit",
  city: "Nairobi",
  country: "Kenya",
  locationDisplay: "Nairobi, Kenya",
  summary: "Support investment research and transaction execution.",
  applyUrl: "https://example.com/apply",
  sourceUrl: "https://example.com/role",
  sourceType: "Company website",
  applyButtonText: "Apply",
  publishedAt: "2026-09-16",
  lastChecked: "16 Sep 2026",
  status: "Active",
};

test("canonical paths and job metadata use the production origin and trailing slashes", () => {
  assert.equal(canonicalPath("/"), "/");
  assert.equal(canonicalPath("jobs/example?source=test"), "/jobs/example/");

  const metadata = jobPageMetadata(job);
  assert.equal(metadata.alternates?.canonical, "/jobs/investment-analyst-example-employer-nairobi/");
  assert.equal(metadata.title, "Investment Analyst at Example Employer | Nairobi, Kenya | Africa Career Desk");
  assert.equal(metadata.openGraph?.url, `${ACD_SITE_URL}/jobs/investment-analyst-example-employer-nairobi/`);
  assert.equal(metadata.description, job.summary);
  assert.equal(metadata.twitter?.title, metadata.title);
});

test("job metadata omits location when no structured location is available", () => {
  const metadata = jobPageMetadata({ ...job, city: undefined, country: undefined });
  assert.equal(metadata.title, "Investment Analyst at Example Employer | Africa Career Desk");
});

test("sitemap contains only core routes and supplied live jobs without fabricated dates", () => {
  const sitemap = buildSitemap([job]);
  const urls = sitemap.map((entry) => entry.url);

  assert.deepEqual(urls.slice(0, 4), [
    `${ACD_SITE_URL}/`,
    `${ACD_SITE_URL}/programmes/`,
    `${ACD_SITE_URL}/open-applications/`,
    `${ACD_SITE_URL}/about/`,
  ]);
  assert.deepEqual(urls.slice(4), [`${ACD_SITE_URL}/jobs/${job.slug}/`]);
  assert.ok(urls.every((url) => url.endsWith("/")));
  assert.ok(sitemap.every((entry) => entry.lastModified === undefined));
  assert.ok(!urls.some((url) => url.includes("programme-slug") || url.includes("open-application-slug")));
  assert.ok(!urls.includes(`${ACD_SITE_URL}/jobs/removed-job/`));
});

test("robots leaves newsletter confirmation crawlable for its noindex directive", () => {
  const directives = robots().rules;
  const serialized = JSON.stringify(directives);

  assert.deepEqual(NO_INDEX_ROBOTS, { index: false, follow: false });
  assert.ok(!serialized.includes('"/newsletter"'));
  assert.ok(serialized.includes("/api/newsletter"));
  assert.ok(serialized.includes("/api/subscribe"));

  const confirmationSource = readFileSync(
    new URL("../../../src/app/newsletter/confirmed/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(confirmationSource, /robots:\s*NO_INDEX_ROBOTS/);
});

test("JobPosting is emitted only with employer date and visible structured location", () => {
  const eligibleJob: Opportunity = {
    ...job,
    employerId: "example-employer",
    employerPostedAt: "2026-09-14",
    deadlineDate: "2026-10-01",
    verifiedDeadline: {
      deadlineDate: "2026-10-01",
      verifiedAt: "2026-09-14",
      authority: "employer",
      sourceUrl: job.sourceUrl,
      statement: "Applications close on 1 October 2026.",
    },
    employmentType: "full-time",
    employmentTypeDisplay: "Full-time role",
    locations: [{ scope: "city", city: "Nairobi", country: "Kenya" }],
    publicationStatus: "live",
    lifecycleStatus: "active",
  };
  const schema = createJobPostingJsonLd(eligibleJob);

  assert.ok(schema);
  assert.equal(schema["@type"], "JobPosting");
  assert.equal(schema.title, job.title);
  assert.equal(schema.description, job.summary);
  assert.equal(schema.datePosted, eligibleJob.employerPostedAt);
  assert.equal(schema.validThrough, "2026-10-01");
  for (const unverified of [
    { ...eligibleJob, verifiedDeadline: undefined },
    { ...eligibleJob, verifiedDeadline: { ...eligibleJob.verifiedDeadline!, statement: "" } },
    { ...eligibleJob, verifiedDeadline: { ...eligibleJob.verifiedDeadline!, sourceUrl: "http://example.com/role" } },
    { ...eligibleJob, verifiedDeadline: { ...eligibleJob.verifiedDeadline!, deadlineDate: "2026-10-02" } },
  ]) {
    const unverifiedSchema = createJobPostingJsonLd(unverified);
    assert.ok(unverifiedSchema);
    assert.equal("validThrough" in unverifiedSchema, false);
  }
  assert.equal(schema.employmentType, "FULL_TIME");
  assert.deepEqual(schema.hiringOrganization, { "@type": "Organization", name: job.company });
  assert.deepEqual(schema.jobLocation, {
    "@type": "Place",
    address: { "@type": "PostalAddress", addressLocality: "Nairobi", addressCountry: "Kenya" },
  });
  assert.equal("jobLocationType" in schema, false);

  const withoutEmploymentType = createJobPostingJsonLd({
    ...eligibleJob,
    employmentType: undefined,
    employmentTypeDisplay: undefined,
  });
  assert.ok(withoutEmploymentType);
  assert.equal("employmentType" in withoutEmploymentType, false);

  const invalidDeadlineSchema = createJobPostingJsonLd({
    ...eligibleJob,
    deadlineDate: "2026-02-30",
  });
  assert.ok(invalidDeadlineSchema);
  assert.equal("validThrough" in invalidDeadlineSchema, false);
});

test("JobPosting fails closed without required evidence and does not use ACD publishedAt", () => {
  assert.equal(createJobPostingJsonLd(job), null);
  assert.equal(createJobPostingJsonLd({ ...job, employerId: "example-employer" }), null);
  assert.equal(
    createJobPostingJsonLd({
      ...job,
      employerId: "example-employer",
      employerPostedAt: "2026-09-14",
      locations: [{ scope: "region", region: "Pan-African" }],
      publicationStatus: "live",
      lifecycleStatus: "active",
    }),
    null,
  );
  assert.equal(
    createJobPostingJsonLd({
      ...job,
      employerId: "example-employer",
      employerPostedAt: "2026-09-14",
      locations: [{ scope: "city", city: "Nairobi", country: "Kenya" }],
      publicationStatus: "removed",
      lifecycleStatus: "needs_verification",
    }),
    null,
  );
  assert.equal(
    createJobPostingJsonLd({
      ...job,
      employerId: "example-employer",
      employerPostedAt: "2026-09-14",
      locations: [{ scope: "city", city: "Nairobi", country: "Kenya" }],
      publicationStatus: "live",
      lifecycleStatus: "needs_verification",
    }),
    null,
  );
});

test("only individual job detail route references the JobPosting component", () => {
  const root = new URL("../../../src/app/", import.meta.url);
  const routeFiles = ["page.tsx", "programmes/page.tsx", "open-applications/page.tsx"];

  for (const route of routeFiles) {
    const source = readFileSync(new URL(route, root), "utf8");
    assert.doesNotMatch(source, /JobPostingJsonLd/);
  }

  const detailSource = readFileSync(new URL("jobs/[slug]/page.tsx", root), "utf8");
  assert.match(detailSource, /JobPostingJsonLd/);
});

test("all existing public routes declare canonicals and sitemap uses live jobs only", () => {
  const appRoot = new URL("../../../src/app/", import.meta.url);
  const staticRoutes = [
    ["page.tsx", 'canonicalPath("/")'],
    ["programmes/page.tsx", 'canonicalPath("/programmes/")'],
    ["open-applications/page.tsx", 'canonicalPath("/open-applications/")'],
    ["about/page.tsx", 'canonicalPath("/about/")'],
  ];

  for (const [route, canonical] of staticRoutes) {
    const source = readFileSync(new URL(route, appRoot), "utf8");
    assert.ok(source.includes(canonical));
    assert.match(source, /alternates:\s*\{\s*canonical:/);
  }

  const sitemapSource = readFileSync(new URL("sitemap.ts", appRoot), "utf8");
  assert.match(sitemapSource, /buildSitemap\(JOBS\)/);
  assert.doesNotMatch(sitemapSource, /OPPORTUNITIES/);
});
