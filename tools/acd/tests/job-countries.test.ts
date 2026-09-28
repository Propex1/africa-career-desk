import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import { runInThisContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";
import type { Opportunity } from "../../../src/types/index.ts";
import { ENABLED_JOB_COUNTRY_PAGES } from "../../../src/data/job-countries.ts";
import {
  filterJobsForCountry, getEnabledJobCountry, getEnabledJobCountriesForJob,
  jobCountryTitle, jobCountryMetadata, jobCountrySitemapEntries,
} from "../../../src/lib/job-countries.ts";
import { buildOpportunityProjection } from "../../../src/lib/opportunity-data.ts";
import { proxy, config as proxyConfig } from "../../../src/proxy.ts";

const kenya = getEnabledJobCountry("kenya")!;

test("country request guard rejects unapproved and case-variant slugs before static lookup", () => {
  const request = (path: string) => ({ nextUrl: new URL(`https://example.test${path}`) }) as Parameters<typeof proxy>[0];
  assert.equal(proxyConfig.matcher, "/jobs/country/:path*");
  for (const { slug } of ENABLED_JOB_COUNTRY_PAGES) {
    assert.equal(proxy(request(`/jobs/country/${slug}/`)), undefined);
    assert.equal(proxy(request(`/jobs/country/${slug}`)), undefined);
  }
  for (const path of ["Kenya/", "MOROCCO/", "south-Africa/", "nigeria/", "kenya/extra/", ""]) {
    const response = proxy(request(`/jobs/country/${path}`));
    assert.equal(response?.status, 404);
    assert.equal(response?.headers.get("X-Robots-Tag"), "noindex");
  }
});
const job = (overrides: Partial<Opportunity> = {}): Opportunity => ({
  id: "test", slug: "test-job", title: "Investment Analyst", company: "Example",
  companyInitials: "E", boardSection: "Jobs", roleType: "Private Equity, VC & Private Credit",
  city: "Nairobi", country: "Kenya", locationDisplay: "Nairobi, Kenya",
  summary: "Investment work", applyUrl: "https://example.test/apply", sourceUrl: "https://example.test/job",
  sourceType: "Official ATS", applyButtonText: "Apply", lastChecked: "28 Sep 2026",
  status: "Active", publicationStatus: "live", lifecycleStatus: "active", ...overrides,
});

test("country routes use only the three explicit editorial approvals", () => {
  assert.deepEqual(ENABLED_JOB_COUNTRY_PAGES.map(({ slug }) => slug), ["south-africa", "morocco", "kenya"]);
  for (const slug of ["nigeria", "egypt", "cote-divoire", "senegal", "Kenya", "unknown"]) {
    assert.equal(getEnabledJobCountry(slug), undefined);
  }
});

test("single-country legacy fields require consistent location presentation", () => {
  const fixtures = [job(), job({ id: "city-only", locationDisplay: "Nairobi" }),
    job({ id: "country-only", city: undefined, locationDisplay: "Kenya" }),
    job({ id: "admin", locationDisplay: "Nairobi, Nairobi County, Kenya" })];
  assert.deepEqual(filterJobsForCountry(fixtures, kenya), fixtures);
});

test("country matching rejects ambiguous, missing and conflicting legacy locations", () => {
  const fixtures = [
    job({ country: undefined }), job({ country: "Kenya / Senegal", locationDisplay: "Kenya / Senegal" }),
    job({ locationDisplay: "Multiple countries" }), job({ locationDisplay: "Nairobi or Dakar" }),
    job({ locationDisplay: "London, United Kingdom" }), job({ locationDisplay: "Pan-African" }),
    job({ country: undefined, region: "Kenya", locationDisplay: "Kenya" }),
  ];
  for (const fixture of fixtures) {
    assert.deepEqual(filterJobsForCountry([fixture], kenya), []);
    assert.deepEqual(getEnabledJobCountriesForJob(fixture), []);
  }
});

test("explicit multi-market locations match each approved country without enabling others", () => {
  const fixture = job({ country: undefined, city: undefined, locationDisplay: "Multiple countries",
    locations: [{ scope: "multi_market", countries: ["Kenya", "South Africa", "Senegal"] }] });
  assert.deepEqual(getEnabledJobCountriesForJob(fixture).map(({ slug }) => slug), ["south-africa", "kenya"]);
  assert.deepEqual(filterJobsForCountry([fixture], kenya), [fixture]);
  assert.equal(getEnabledJobCountry("senegal"), undefined);
});

test("explicit city and country alternatives deduplicate and retain primary categories", () => {
  const fixture = job({ country: "Kenya / Morocco", locationDisplay: "Nairobi / Casablanca",
    roleType: "Infrastructure & Project Finance", discoveryThemes: ["private-markets"],
    locations: [{ scope: "city", city: "Nairobi", country: "Kenya" }, { scope: "country", country: "Morocco" },
      { scope: "country", country: "Kenya" }] });
  const before = structuredClone(fixture);
  assert.deepEqual(getEnabledJobCountriesForJob(fixture).map(({ slug }) => slug), ["morocco", "kenya"]);
  assert.deepEqual(filterJobsForCountry([fixture, { ...fixture }], kenya), [fixture]);
  assert.deepEqual(fixture, before);
  assert.strictEqual(filterJobsForCountry([fixture], kenya)[0], fixture);
});

test("regional coverage and employer or theme clues cannot create country membership", () => {
  const fixture = job({ company: "Kenya Investment Fund", country: undefined, city: undefined,
    region: "East Africa", locationDisplay: "Africa", discoveryThemes: ["private-markets"],
    locations: [{ scope: "region", region: "East Africa", countries: ["Kenya"] }] });
  assert.deepEqual(getEnabledJobCountriesForJob(fixture), []);
});

test("structured locations cannot silently override conflicting country fields", () => {
  for (const country of ["South Africa", "Kenya / Morocco"]) {
    const fixture = job({ country, locations: [{ scope: "country", country: "Kenya" }] });
    assert.deepEqual(getEnabledJobCountriesForJob(fixture), []);
  }
});

test("country discovery excludes removed, closed and non-Job records", () => {
  const fixtures = [job({ id: "live" }), job({ id: "verification", lifecycleStatus: "needs_verification" }),
    job({ id: "removed", publicationStatus: "removed" }), job({ id: "closed", lifecycleStatus: "closed" }),
    job({ id: "programme", boardSection: "Programmes" }), job({ id: "open", boardSection: "Open Applications" })];
  assert.deepEqual(filterJobsForCountry(fixtures, kenya).map(({ id }) => id), ["live", "verification"]);
});

test("verified deadline expiry automatically removes country membership on the next projection", () => {
  const fixture = job({ deadlineDisplay: "28 Sep 2026" });
  const options = { employerIdByCompany: { Example: "example" }, removedJobIds: new Set<string>(), confirmedClosures: {},
    verifiedDeadlinesByJobId: { test: { deadlineDate: "2026-09-28", authority: "employer" as const,
      sourceUrl: "https://example.test/job", verifiedAt: "2026-09-28", statement: "Applications close 28 September 2026." } } };
  assert.equal(filterJobsForCountry(buildOpportunityProjection([fixture], { ...options, today: "2026-09-28" }), kenya).length, 1);
  assert.equal(filterJobsForCountry(buildOpportunityProjection([fixture], { ...options, today: "2026-09-29" }), kenya).length, 0);
});

test("future additions, removals and ordering flow through country discovery without static lists", () => {
  const original = job({ id: "original" });
  const added = job({ id: "future", company: "Future Employer", roleType: "Legal, Risk & Compliance" });
  assert.deepEqual(filterJobsForCountry([added, original], kenya), [added, original]);
  assert.deepEqual(filterJobsForCountry([added], kenya), [added]);
  assert.deepEqual(filterJobsForCountry([], kenya), []);
});

test("country metadata is unique, canonical and consistent across social surfaces", () => {
  const metadata = ENABLED_JOB_COUNTRY_PAGES.map(jobCountryMetadata);
  assert.equal(new Set(metadata.map((item) => item.title)).size, 3);
  assert.equal(new Set(metadata.map((item) => item.description)).size, 3);
  ENABLED_JOB_COUNTRY_PAGES.forEach((country, i) => {
    const m = metadata[i];
    assert.equal(m.title, `${jobCountryTitle(country)} | Africa Career Desk`);
    assert.equal(m.alternates?.canonical, `/jobs/country/${country.slug}/`);
    assert.equal(m.openGraph?.url, `https://www.africacareerdesk.com/jobs/country/${country.slug}/`);
    assert.equal(m.openGraph?.title, m.title); assert.equal(m.twitter?.title, m.title);
    assert.equal(m.openGraph?.description, m.description); assert.equal(m.twitter?.description, m.description);
    assert.equal(m.robots, undefined);
    const words = country.description.split(/\s+/).length;
    assert.ok(words >= 20 && words <= 35);
  });
});

test("country sitemap entries persist at zero inventory without guessed modification dates", () => {
  for (const country of ENABLED_JOB_COUNTRY_PAGES) assert.deepEqual(filterJobsForCountry([], country), []);
  const entries = jobCountrySitemapEntries();
  assert.deepEqual(entries.map(({ url }) => url), ENABLED_JOB_COUNTRY_PAGES.map(({ slug }) => `https://www.africacareerdesk.com/jobs/country/${slug}/`));
  assert.ok(entries.every((entry) => entry.lastModified === undefined));
});

test("country route wires live JOBS to shared cards, allowlist-only routes and no list JobPosting", () => {
  const source = readFileSync("src/app/jobs/country/[slug]/page.tsx", "utf8");
  assert.match(source, /dynamicParams = false/);
  assert.match(source, /generateStaticParams[\s\S]*ENABLED_JOB_COUNTRY_PAGES/);
  assert.match(source, /if \(!country\) notFound\(\)/);
  assert.match(source, /filterJobsForCountry\(JOBS, country\)/);
  assert.match(source, /jobs.length/); assert.match(source, /<JobCard/);
  assert.match(source, /No live opportunities/); assert.match(source, /Browse All Jobs/);
  assert.doesNotMatch(source, /JobPosting|application\/ld\+json/);
  assert.match(readFileSync("src/app/sitemap.ts", "utf8"), /jobCountrySitemapEntries\(\)/);
});

test("job-detail country links use the same reliable location selector", () => {
  const source = readFileSync("src/app/jobs/[slug]/page.tsx", "utf8");
  assert.match(source, /getEnabledJobCountriesForJob\(job\)/);
  assert.match(source, /countryPages.map/);
  assert.match(source, /jobs\/country\/\$\{country.slug\}/);
  assert.deepEqual(getEnabledJobCountriesForJob(job()).map(({ slug }) => slug), ["kenya"]);
  assert.deepEqual(getEnabledJobCountriesForJob(job({ publicationStatus: "removed" })), []);
});

test("actual current JOBS drive country membership without changing inventory or classification", () => {
  // Evaluate the application's actual exports, including aliases, without a build or generated fixture.
  const cache = new Map<string, { exports: Record<string, unknown> }>();
  function load(file: string): Record<string, unknown> {
    file = resolve(file); if (!extname(file)) file += ".ts";
    if (cache.has(file)) return cache.get(file)!.exports;
    const loadedModule = { exports: {} }; cache.set(file, loadedModule);
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const requireSource = (name: string) => {
      if (name.startsWith("@/")) return load(`src/${name.slice(2)}`);
      if (name.startsWith(".")) return load(resolve(dirname(file), name));
      throw new Error(`Unexpected data dependency: ${name}`);
    };
    runInThisContext(`(function(require,module,exports){${code}\n})`)(requireSource, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  const jobs = load("src/data/opportunities.ts").JOBS as Opportunity[];
  const before = structuredClone(jobs);
  for (const country of ENABLED_JOB_COUNTRY_PAGES) {
    const matches = filterJobsForCountry(jobs, country);
    assert.deepEqual(matches, jobs.filter((job) => getEnabledJobCountriesForJob(job).some((page) => page.slug === country.slug)));
    assert.equal(new Set(matches.map(({ id }) => id)).size, matches.length);
    for (const match of matches) assert.strictEqual(match, jobs.find(({ id }) => id === match.id));
  }
  for (const id of ["ACD-0250", "ACD-0231", "ACD-0204", "ACD-0035"]) {
    const ambiguous = jobs.find((job) => job.id === id);
    if (ambiguous) assert.deepEqual(getEnabledJobCountriesForJob(ambiguous), []);
  }
  assert.deepEqual(jobs, before);
});
