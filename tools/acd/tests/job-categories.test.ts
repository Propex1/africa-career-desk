import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { Opportunity } from "../../../src/types/index.ts";
import { ENABLED_JOB_CATEGORY_PAGES } from "../../../src/data/job-categories.ts";
import {
  filterJobsForCategory,
  getEnabledJobCategory,
  getEnabledJobCategoryForRoleType,
  jobCategoryMetadata,
  jobCategorySitemapEntries,
} from "../../../src/lib/job-categories.ts";

const job = (overrides: Partial<Opportunity> = {}): Opportunity => ({
  id: "ACD-CAT-TEST",
  slug: "test-role-company-nairobi",
  employerId: "example-employer",
  title: "Investment Analyst",
  company: "Example Employer",
  companyInitials: "EE",
  boardSection: "Jobs",
  roleType: "Private Equity, VC & Private Credit",
  city: "Nairobi",
  country: "Kenya",
  locationDisplay: "Nairobi, Kenya",
  summary: "Support investment work.",
  applyUrl: "https://example.test/apply",
  sourceUrl: "https://example.test/job",
  sourceType: "Company website",
  applyButtonText: "Apply",
  lastChecked: "26 Sep 2026",
  status: "Active",
  publicationStatus: "live",
  lifecycleStatus: "active",
  ...overrides,
});

test("only the five editorially enabled categories have route definitions", () => {
  assert.deepEqual(ENABLED_JOB_CATEGORY_PAGES.map(({ slug }) => slug), [
    "private-equity-venture-capital",
    "development-finance",
    "infrastructure-project-finance",
    "investment-banking",
    "climate-impact-investing",
  ]);
  assert.equal(new Set(ENABLED_JOB_CATEGORY_PAGES.map(({ roleType }) => roleType)).size, 5);
  assert.equal(getEnabledJobCategory("corporate-development"), undefined);
  assert.equal(getEnabledJobCategoryForRoleType("Corporate Development, M&A & Strategy"), undefined);
});

test("category filters use exact existing roleType and exclude non-live or other sections", () => {
  const category = getEnabledJobCategory("private-equity-venture-capital");
  assert.ok(category);
  const jobs = [
    job({ id: "ACD-1" }),
    job({ id: "ACD-2", publicationStatus: "removed", lifecycleStatus: "closed" }),
    job({ id: "ACD-3", lifecycleStatus: "needs_verification" }),
    job({ id: "ACD-4", roleType: "Investment Banking & Advisory" }),
    job({ id: "ACD-5", boardSection: "Programmes" }),
  ];

  assert.deepEqual(filterJobsForCategory(jobs, category).map(({ id }) => id), ["ACD-1", "ACD-3"]);
});

test("category metadata has unique descriptions and trailing-slash canonicals", () => {
  const metadata = ENABLED_JOB_CATEGORY_PAGES.map(jobCategoryMetadata);
  const titles = metadata.map((item) => item.title);
  const descriptions = metadata.map((item) => item.description);
  const canonicals = metadata.map((item) => item.alternates?.canonical);

  assert.equal(new Set(titles).size, ENABLED_JOB_CATEGORY_PAGES.length);
  assert.equal(new Set(descriptions).size, ENABLED_JOB_CATEGORY_PAGES.length);
  assert.deepEqual(canonicals, ENABLED_JOB_CATEGORY_PAGES.map((category) => `/jobs/category/${category.slug}/`));
  assert.ok(metadata.every((item) => item.openGraph?.url?.toString().endsWith(item.alternates?.canonical as string)));
  assert.ok(metadata.every((item) => item.openGraph?.title === item.title));
  assert.ok(metadata.every((item) => item.twitter?.title === item.title));
  assert.deepEqual(ENABLED_JOB_CATEGORY_PAGES.map(({ detailLinkLabel }) => detailLinkLabel), [
    "More Private Equity, VC & Private Credit opportunities",
    "More Development Finance opportunities",
    "More Infrastructure & Project Finance opportunities",
    "More Investment Banking & Advisory opportunities",
    "More Climate & Impact opportunities",
  ]);
  assert.ok(ENABLED_JOB_CATEGORY_PAGES[0].title.includes("private credit"));
  assert.ok(ENABLED_JOB_CATEGORY_PAGES[4].title.includes("Climate finance"));
  assert.ok(ENABLED_JOB_CATEGORY_PAGES.every((category) => !/thousands|best jobs|#1|leading job board/i.test(`${category.title} ${category.description} ${category.metaTitle} ${category.metaDescription}`)));
});

test("enabled category sitemap entries remain at zero inventory and use canonical URLs", () => {
  const entries = jobCategorySitemapEntries();
  assert.equal(entries.length, ENABLED_JOB_CATEGORY_PAGES.length);
  assert.deepEqual(entries.map(({ url }) => url), ENABLED_JOB_CATEGORY_PAGES.map((category) =>
    `https://www.africacareerdesk.com/jobs/category/${category.slug}/`,
  ));
  assert.ok(entries.every((entry) => entry.lastModified === undefined));

  const category = ENABLED_JOB_CATEGORY_PAGES[0];
  assert.deepEqual(filterJobsForCategory([], category), []);
  assert.equal(jobCategorySitemapEntries().length, 5);
});

test("category routes are static allowlist-only and contain no JobPosting schema", () => {
  const source = readFileSync(new URL("../../../src/app/jobs/category/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(source, /export const dynamicParams = false/);
  assert.match(source, /generateStaticParams[\s\S]*ENABLED_JOB_CATEGORY_PAGES/);
  assert.match(source, /filterJobsForCategory\(JOBS, category\)/);
  assert.match(source, /All Jobs/);
  assert.doesNotMatch(source, /JobPostingJsonLd|createJobPostingJsonLd/);

  const sitemap = readFileSync(new URL("../../../src/app/sitemap.ts", import.meta.url), "utf8");
  assert.match(sitemap, /jobCategorySitemapEntries\(\)/);
});

test("job detail linking only resolves enabled category definitions", () => {
  const source = readFileSync(new URL("../../../src/app/jobs/[slug]/page.tsx", import.meta.url), "utf8");
  assert.match(source, /getEnabledJobCategoryForRoleType\(job\.roleType\)/);
  assert.match(source, /jobs\/category\/\$\{categoryPage\.slug\}/);
  assert.equal(getEnabledJobCategoryForRoleType("Legal, Risk & Compliance"), undefined);
});
