import type { DiscoveryTheme, Opportunity } from "../types/index.ts";
import { ENABLED_JOB_CATEGORY_PAGES } from "../data/job-categories.ts";

export interface JobBoardFilters {
  region: string[];
  country: string[];
  roleType: string[];
  experience: string[];
  language: string[];
}

export type JobBoardFilterKey = keyof JobBoardFilters;

export interface JobFilterCounts {
  all: number;
  options: Record<string, number>;
}

export interface JobBoardRecoverySuggestion {
  key: JobBoardFilterKey | "search";
  count: number;
}

interface DiscoverySelection {
  roleType: string;
  discoveryTheme?: DiscoveryTheme;
}

/** Shared live eligibility, editorial relevance and identity deduplication. */
export function filterJobsForDiscovery(
  jobs: readonly Opportunity[],
  selections: readonly DiscoverySelection[],
): Opportunity[] {
  const seenIds = new Set<string>();
  return jobs.filter((job) => {
    const matches = selections.length === 0 || selections.some((selection) =>
      job.roleType === selection.roleType ||
      Boolean(selection.discoveryTheme && job.discoveryThemes?.includes(selection.discoveryTheme)),
    );
    if (
      job.boardSection !== "Jobs" ||
      job.status !== "Active" ||
      (job.publicationStatus ?? "live") !== "live" ||
      (job.lifecycleStatus ?? "active") === "closed" ||
      !matches || seenIds.has(job.id)
    ) return false;

    // Preserve board order regardless of which selection or mechanism matched.
    seenIds.add(job.id);
    return true;
  });
}

export function filterJobsForBoard(
  jobs: readonly Opportunity[],
  filters: JobBoardFilters,
  search = "",
): Opportunity[] {
  // Only explicitly configured categories can expand beyond primary roleType.
  const selections = filters.roleType.map((roleType) =>
    ENABLED_JOB_CATEGORY_PAGES.find((category) => category.roleType === roleType) ?? { roleType },
  );
  const q = search.trim().toLowerCase();

  return filterJobsForDiscovery(jobs, selections).filter((job) => {
    if (filters.region.length && !filters.region.includes(job.region ?? "")) return false;
    if (filters.country.length && !filters.country.includes(job.country ?? "")) return false;
    if (filters.experience.length && !filters.experience.includes(job.experienceBucket ?? "")) return false;
    if (filters.language.length && !(job.languageTags ?? []).some((tag) => filters.language.includes(tag))) return false;
    if (q) {
      const hay = [job.title, job.company, job.city ?? "", job.country ?? "", job.region ?? "", job.roleType]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function getJobFilterCounts(
  jobs: readonly Opportunity[],
  filters: JobBoardFilters,
  search: string,
  filterKey: JobBoardFilterKey,
  options: readonly string[],
): JobFilterCounts {
  const baseFilters = { ...filters, [filterKey]: [] } as JobBoardFilters;
  const counts: Record<string, number> = {};

  for (const option of options) {
    const optionFilters = {
      ...baseFilters,
      [filterKey]: [option],
    } as JobBoardFilters;
    counts[option] = filterJobsForBoard(jobs, optionFilters, search).length;
  }

  return {
    all: filterJobsForBoard(jobs, baseFilters, search).length,
    options: counts,
  };
}

export function getJobBoardRecoverySuggestions(
  jobs: readonly Opportunity[],
  filters: JobBoardFilters,
  search: string,
): JobBoardRecoverySuggestion[] {
  const suggestions: JobBoardRecoverySuggestion[] = [];

  if (search.trim()) {
    const count = filterJobsForBoard(jobs, filters, "").length;
    if (count > 0) suggestions.push({ key: "search", count });
  }

  (Object.keys(filters) as JobBoardFilterKey[]).forEach((key) => {
    if (filters[key].length === 0) return;
    const relaxedFilters = { ...filters, [key]: [] } as JobBoardFilters;
    const count = filterJobsForBoard(jobs, relaxedFilters, search).length;
    if (count > 0) suggestions.push({ key, count });
  });

  return suggestions
    .sort((first, second) => second.count - first.count)
    .slice(0, 3);
}
