import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, resolve } from "node:path";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { Opportunity } from "../../../src/types/index.ts";
import { ENABLED_JOB_CATEGORY_PAGES } from "../../../src/data/job-categories.ts";
import { ENABLED_JOB_COUNTRY_PAGES } from "../../../src/data/job-countries.ts";
import { getEnabledJobCategoriesForJob, jobCategoryMetadata } from "../../../src/lib/job-categories.ts";
import { getEnabledJobCountriesForJob, jobCountryMetadata } from "../../../src/lib/job-countries.ts";

// Render the real TSX component with React/Next; no substitute anchor renderer.
const requireExternal = createRequire(import.meta.url);
const cache = new Map<string, { exports: Record<string, unknown> }>();
function load(file: string): Record<string, unknown> {
  file = resolve(file);
  if (!extname(file)) file += existsSync(`${file}.tsx`) ? ".tsx" : ".ts";
  if (cache.has(file)) return cache.get(file)!.exports;
  const loaded = { exports: {} }; cache.set(file, loaded);
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const requireSource = (name: string): unknown => {
    if (name.startsWith("@/")) return load(`src/${name.slice(2)}`);
    if (name.startsWith(".")) return load(resolve(dirname(file), name));
    return requireExternal(name);
  };
  runInThisContext(`(function(require,module,exports){${code}\n})`)(requireSource, loaded, loaded.exports);
  return loaded.exports;
}
const Explore = load("src/components/ExploreOpportunities.tsx").default as ComponentType;
// Standalone React rendering needs the trailing-slash flag normally injected by Next.
const previousTrailingSlash = process.env.__NEXT_TRAILING_SLASH;
process.env.__NEXT_TRAILING_SLASH = "true";
const html = renderToStaticMarkup(createElement(Explore));
if (previousTrailingSlash === undefined) delete process.env.__NEXT_TRAILING_SLASH;
else process.env.__NEXT_TRAILING_SLASH = previousTrailingSlash;
const hrefs = [...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map((match) => match[1]);
const job = (overrides: Partial<Opportunity> = {}): Opportunity => ({
  id: "discovery-test", slug: "investment-role-example", title: "Investment role", company: "Example",
  companyInitials: "E", boardSection: "Jobs", roleType: "Infrastructure & Project Finance",
  city: "Nairobi", country: "Kenya", locationDisplay: "Nairobi, Kenya", summary: "Investment work",
  applyUrl: "https://example.test/apply", sourceUrl: "https://example.test/job", sourceType: "Official ATS",
  applyButtonText: "Apply", lastChecked: "3 Oct 2026", status: "Active", publicationStatus: "live",
  lifecycleStatus: "active", ...overrides,
});
const slugs = (fixture: Opportunity) => getEnabledJobCategoriesForJob(fixture).map((page) => page.slug);

test("Explore renders exactly the eight approved destinations, without unapproved routes", () => {
  assert.deepEqual(hrefs, [
    "/jobs/category/private-equity-venture-capital/", "/jobs/category/development-finance/",
    "/jobs/category/infrastructure-project-finance/", "/jobs/category/investment-banking/",
    "/jobs/category/climate-impact-investing/", "/jobs/country/south-africa/",
    "/jobs/country/morocco/", "/jobs/country/kenya/",
  ]);
  assert.equal(new Set(hrefs).size, 8);
  assert.deepEqual(hrefs, [
    ...ENABLED_JOB_CATEGORY_PAGES.map((page) => jobCategoryMetadata(page).alternates!.canonical),
    ...ENABLED_JOB_COUNTRY_PAGES.map((page) => jobCountryMetadata(page).alternates!.canonical),
  ]);
});

test("Explore emits accessible grouped HTML anchors before hydration with concise labels", () => {
  assert.match(html, /<aside aria-labelledby="explore-opportunities-heading"/);
  assert.match(html, /<h2 id="explore-opportunities-heading"[^>]*>Explore opportunities<\/h2>/);
  assert.equal((html.match(/<ul\b/g) ?? []).length, 2);
  assert.equal((html.match(/<li\b/g) ?? []).length, 8);
  assert.equal((html.match(/<\/a>/g) ?? []).length, 8);
  const labels = [...html.matchAll(/<a\b[^>]*>([^<]+)<\/a>/g)].map((match) => match[1].replaceAll("&amp;", "&"));
  assert.deepEqual(labels, ["Private Equity & VC", "Development Finance", "Infrastructure", "Investment Banking",
    "Climate & Impact", "South Africa", "Morocco", "Kenya"]);
  assert.doesNotMatch(html, /nofollow|onclick=|javascript:|<button|hidden|<h1\b/);
});

test("secondary discovery links follow approved themes while keeping the primary destination first", () => {
  for (const roleType of ["Infrastructure & Project Finance", "Climate & Impact Investing"] as const) {
    const fixture = job({ roleType, discoveryThemes: ["private-markets"] });
    const before = structuredClone(fixture);
    assert.deepEqual(slugs(fixture), [roleType === "Infrastructure & Project Finance"
      ? "infrastructure-project-finance" : "climate-impact-investing", "private-equity-venture-capital"]);
    assert.deepEqual(fixture, before);
  }
});

test("unthemed roles receive no secondary destination from employer or title keywords", () => {
  assert.deepEqual(slugs(job({ company: "Africa50", title: "Private Markets Investment Associate" })),
    ["infrastructure-project-finance"]);
  assert.deepEqual(slugs(job({ roleType: "Legal, Risk & Compliance" })), []);
});

test("a PE primary match carrying the theme still receives only one PE link", () => {
  assert.deepEqual(slugs(job({ roleType: "Private Equity, VC & Private Credit", discoveryThemes: ["private-markets"] })),
    ["private-equity-venture-capital"]);
});

test("detail links retain every enabled primary category and approved country without mutating jobs", () => {
  for (const category of ENABLED_JOB_CATEGORY_PAGES) {
    const fixture = job({ roleType: category.roleType });
    assert.deepEqual(slugs(fixture), [category.slug]);
    assert.deepEqual(getEnabledJobCountriesForJob(fixture).map((page) => page.slug), ["kenya"]);
  }
  const fixture = job({ discoveryThemes: ["private-markets"], country: undefined, city: undefined,
    locationDisplay: "Multiple countries", locations: [{ scope: "multi_market", countries: ["Kenya", "Morocco", "Nigeria"] }] });
  assert.deepEqual(getEnabledJobCountriesForJob(fixture).map((page) => page.slug), ["morocco", "kenya"]);
});

test("secondary detail links cannot bypass existing live Jobs eligibility", () => {
  for (const override of [{ publicationStatus: "removed" }, { lifecycleStatus: "closed" },
    { boardSection: "Programmes" }, { boardSection: "Open Applications" }] as Partial<Opportunity>[]) {
    assert.deepEqual(slugs(job({ discoveryThemes: ["private-markets"], ...override })), []);
  }
  assert.equal(slugs(job({ discoveryThemes: ["private-markets"], lifecycleStatus: "needs_verification" })).length, 2);
});

test("current private-markets jobs link back to PE with their primary labels and country links preserved", () => {
  const jobs = load("src/data/opportunities.ts").JOBS as Opportunity[];
  const before = structuredClone(jobs);
  const secondary = jobs.filter((j) => j.discoveryThemes?.includes("private-markets") && j.roleType !== "Private Equity, VC & Private Credit");
  assert.deepEqual(secondary.map((j) => j.id).sort(), ["ACD-0005", "ACD-0009", "ACD-0016", "ACD-0041", "ACD-0083", "ACD-0151"]);
  for (const fixture of secondary) {
    assert.equal(slugs(fixture).filter((slug) => slug === "private-equity-venture-capital").length, 1);
    assert.equal(getEnabledJobCategoriesForJob(fixture)[0].roleType, fixture.roleType);
    assert.ok(getEnabledJobCountriesForJob(fixture).length > 0);
  }
  assert.deepEqual(jobs, before);
});
