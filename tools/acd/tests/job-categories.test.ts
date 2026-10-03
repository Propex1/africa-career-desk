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

test("unthemed category filters use exact existing roleType and exclude non-live or other sections", () => {
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

test("private-markets discovery preserves board order and unique IDs across both match mechanisms", () => {
  const category = getEnabledJobCategory("private-equity-venture-capital")!;
  const secondary = job({ id: "secondary", roleType: "Infrastructure & Project Finance", discoveryThemes: ["private-markets"] });
  const both = job({ id: "both", discoveryThemes: ["private-markets"] });
  const primary = job({ id: "primary" });
  const jobs = [secondary, both, primary, { ...both }, { ...secondary }];
  const before = structuredClone(jobs);

  const matches = filterJobsForCategory(jobs, category);
  assert.deepEqual(matches.map(({ id }) => id), ["secondary", "both", "primary"]);
  assert.equal(matches.length, new Set(matches.map(({ id }) => id)).size);
  assert.strictEqual(matches[0], secondary, "Discovery keeps the original record and primary category");
  assert.deepEqual(jobs, before, "Filtering must not mutate the shared board records");
  assert.ok(filterJobsForCategory(jobs, getEnabledJobCategory("infrastructure-project-finance")!).includes(secondary));
});

test("secondary themes never bypass publication, lifecycle or board-section eligibility", () => {
  const themed = (overrides: Partial<Opportunity>) => job({
    roleType: "Climate & Impact Investing", discoveryThemes: ["private-markets"], ...overrides,
  });
  const jobs = [
    themed({ id: "live" }),
    themed({ id: "verification", lifecycleStatus: "needs_verification" }),
    themed({ id: "expired", publicationStatus: "removed", lifecycleStatus: "closed", lifecycleReason: "deadline_passed" }),
    themed({ id: "removed", publicationStatus: "removed" }),
    themed({ id: "closed", lifecycleStatus: "closed" }),
    themed({ id: "programme", boardSection: "Programmes" }),
    themed({ id: "open-application", boardSection: "Open Applications" }),
    themed({ id: "unapproved", discoveryThemes: undefined, title: "Private Equity Investment Director", company: "Africa50" }),
  ];
  assert.deepEqual(filterJobsForCategory(jobs, getEnabledJobCategory("private-equity-venture-capital")!).map(({ id }) => id), ["live", "verification"]);
});

test("only the PE page opts into the pilot; other pages keep exact primary-category matching", () => {
  assert.deepEqual(ENABLED_JOB_CATEGORY_PAGES.filter((category) => category.discoveryTheme).map(({ slug, discoveryTheme }) => ({ slug, discoveryTheme })), [
    { slug: "private-equity-venture-capital", discoveryTheme: "private-markets" },
  ]);
  const jobs = ENABLED_JOB_CATEGORY_PAGES.map((category) => job({
    id: category.slug, roleType: category.roleType, discoveryThemes: ["private-markets"],
  }));
  for (const category of ENABLED_JOB_CATEGORY_PAGES.filter((category) => !category.discoveryTheme)) {
    assert.deepEqual(filterJobsForCategory(jobs, category), jobs.filter((item) => item.roleType === category.roleType));
  }
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
  assert.ok(metadata.every((item) => item.openGraph?.description === item.description));
  assert.ok(metadata.every((item) => item.twitter?.title === item.title));
  assert.ok(metadata.every((item) => item.twitter?.description === item.description));
  assert.deepEqual(ENABLED_JOB_CATEGORY_PAGES.map(({ detailLinkLabel }) => detailLinkLabel), [
    "More Private Equity, VC & Private Credit opportunities",
    "More Development Finance opportunities",
    "More Infrastructure & Project Finance opportunities",
    "More Investment Banking & Advisory opportunities",
    "More Climate & Impact opportunities",
  ]);
  assert.deepEqual(ENABLED_JOB_CATEGORY_PAGES.map(({ title }) => title), [
    "Private Equity & Venture Capital Jobs in Africa",
    "Development Finance & DFI Jobs in Africa",
    "Infrastructure & Project Finance Jobs in Africa",
    "Investment Banking & Corporate Finance Jobs in Africa",
    "Climate Finance & Impact Investing Jobs in Africa",
  ]);
  assert.ok(ENABLED_JOB_CATEGORY_PAGES.every((category) => category.metaTitle === `${category.title} | Africa Career Desk`));
  assert.match(ENABLED_JOB_CATEGORY_PAGES[0].description, /private credit/);
  assert.match(ENABLED_JOB_CATEGORY_PAGES[0].metaDescription, /private credit/);
  assert.match(ENABLED_JOB_CATEGORY_PAGES[1].description, /development finance institutions \(DFIs\)/);
  assert.match(ENABLED_JOB_CATEGORY_PAGES[3].description, /transaction advisory/);
  assert.match(ENABLED_JOB_CATEGORY_PAGES[4].description, /ESG/);
  for (const { description } of ENABLED_JOB_CATEGORY_PAGES) {
    const words = description.split(/\s+/).length;
    assert.ok(words >= 20 && words <= 35, "Intros stay concise");
    assert.equal((description.match(/[.!?]/g) ?? []).length, 1, "Intros stay one sentence");
  }
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
  assert.match(source, /getEnabledJobCategoriesForJob\(job\)/);
  assert.match(source, /jobs\/category\/\$\{categoryPage\.slug\}/);
  assert.equal(getEnabledJobCategoryForRoleType("Legal, Risk & Compliance"), undefined);
});
