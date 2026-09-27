import type { DiscoveryTheme, Opportunity } from "../types/index.ts";
import { ENABLED_JOB_CATEGORY_PAGES } from "../data/job-categories.ts";

export interface JobBoardFilters {
  region: string[];
  country: string[];
  roleType: string[];
  experience: string[];
  language: string[];
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
