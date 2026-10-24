import assert from "node:assert/strict";
import { test } from "node:test";
import type { Opportunity, RoleType } from "../../../src/types/index.ts";
import {
  filterJobsForBoard,
  getJobBoardRecoverySuggestions,
  getJobFilterCounts,
  type JobBoardFilters,
} from "../../../src/lib/job-filters.ts";
import {
  parseJobBoardState,
  serializeJobBoardState,
} from "../../../src/lib/job-board-state.ts";
import { getRelatedJobs } from "../../../src/lib/related-jobs.ts";

function job(
  id: string,
  overrides: Partial<Opportunity> = {}
): Opportunity {
  return {
    id,
    slug: `job-${id}`,
    title: `Job ${id}`,
    company: `Company ${id}`,
    companyInitials: id,
    boardSection: "Jobs",
    roleType: "Private Equity, VC & Private Credit",
    experienceBucket: "Analyst",
    city: "Nairobi",
    country: "Kenya",
    region: "East Africa",
    locationDisplay: "Nairobi, Kenya",
    language: "English",
    languageTags: ["English"],
    summary: "Summary",
    applyUrl: "https://example.com/apply",
    sourceUrl: "https://example.com/job",
    sourceType: "Company website",
    applyButtonText: "View role and apply",
    lastChecked: "24 Oct 2026",
    status: "Active",
    publicationStatus: "live",
    lifecycleStatus: "active",
    ...overrides,
  };
}

const emptyFilters: JobBoardFilters = {
  region: [],
  country: [],
  roleType: [],
  experience: [],
  language: [],
};

test("job board URL state keeps valid filters and ignores unknown values", () => {
  const params = new URLSearchParams();
  params.set("q", " analyst ");
  params.append("country", "Kenya");
  params.append("country", "Unknown");
  params.append("role", "Private Equity, VC & Private Credit");
  params.set("sort", "deadline");

  const state = parseJobBoardState(params, {
    regions: ["East Africa"],
    countries: ["Kenya", "Nigeria"],
    roleTypes: ["Private Equity, VC & Private Credit"],
    experienceBuckets: ["Analyst", "Associate"],
    languages: ["English", "French"],
  });

  assert.equal(state.search, "analyst");
  assert.deepEqual(state.filters.country, ["Kenya"]);
  assert.deepEqual(state.filters.roleType, [
    "Private Equity, VC & Private Credit",
  ]);
  assert.equal(state.sort, "deadline");

  const roundTrip = serializeJobBoardState(state);
  assert.equal(roundTrip.get("q"), "analyst");
  assert.deepEqual(roundTrip.getAll("country"), ["Kenya"]);
  assert.equal(roundTrip.get("sort"), "deadline");
});

test("faceted counts ignore their own dimension but respect other filters", () => {
  const jobs = [
    job("1"),
    job("2", { experienceBucket: "Associate" }),
    job("3", { country: "Nigeria", city: "Lagos", locationDisplay: "Lagos, Nigeria" }),
  ];
  const filters: JobBoardFilters = {
    ...emptyFilters,
    country: ["Kenya"],
  };

  const counts = getJobFilterCounts(
    jobs,
    filters,
    "",
    "experience",
    ["Analyst", "Associate", "Senior"]
  );

  assert.equal(counts.all, 2);
  assert.deepEqual(counts.options, {
    Analyst: 1,
    Associate: 1,
    Senior: 0,
  });
});

test("no-result recovery identifies the restrictive filter", () => {
  const jobs = [job("1"), job("2", { experienceBucket: "Associate" })];
  const filters: JobBoardFilters = {
    ...emptyFilters,
    country: ["Kenya"],
    roleType: ["Investment Banking & Advisory"],
  };

  assert.equal(filterJobsForBoard(jobs, filters, "").length, 0);
  const suggestions = getJobBoardRecoverySuggestions(jobs, filters, "");
  assert.deepEqual(suggestions[0], { key: "roleType", count: 2 });
});

test("related jobs prioritise employer, role type, seniority and geography", () => {
  const current = job("current", { company: "Africa Fund" });
  const sameCompany = job("same-company", {
    company: "Africa Fund",
    roleType: "Infrastructure & Project Finance",
    experienceBucket: "Senior",
    country: "Morocco",
    region: "North Africa",
  });
  const sameProfile = job("same-profile", {
    company: "Another Fund",
  });
  const weakMatch = job("weak", {
    company: "Bank",
    roleType: "Investment Banking & Advisory",
    experienceBucket: "Leadership",
    country: "Nigeria",
    region: "West Africa",
    languageTags: ["French"],
  });

  const related = getRelatedJobs(
    current,
    [current, sameCompany, sameProfile, weakMatch],
    3
  );

  assert.deepEqual(
    related.map((item) => item.id),
    ["same-profile", "same-company", "weak"]
  );
});

test("role filters keep the existing board filtering semantics", () => {
  const role: RoleType = "Investment Banking & Advisory";
  const jobs = [job("1"), job("2", { roleType: role })];
  const filtered = filterJobsForBoard(
    jobs,
    { ...emptyFilters, roleType: [role] },
    ""
  );
  assert.deepEqual(filtered.map((item) => item.id), ["2"]);
});
