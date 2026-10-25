import type { JobBoardFilters } from "./job-filters";

export type JobBoardSort = "curated" | "recent" | "deadline";

export interface JobBoardState {
  search: string;
  filters: JobBoardFilters;
  sort: JobBoardSort;
}

export interface JobBoardAllowedValues {
  regions: readonly string[];
  countries: readonly string[];
  roleTypes: readonly string[];
  experienceBuckets: readonly string[];
  languages: readonly string[];
}

export const EMPTY_JOB_BOARD_FILTERS: JobBoardFilters = {
  region: [],
  country: [],
  roleType: [],
  experience: [],
  language: [],
};

const RETURN_URL_KEY = "acd_job_board_return_url";
const RETURN_SCROLL_KEY = "acd_job_board_return_scroll_y";
const RETURN_ANCHOR_KEY = "acd_job_board_return_anchor";
const RETURN_SAVED_AT_KEY = "acd_job_board_return_saved_at";
const HISTORY_RETURN_MAX_AGE_MS = 2 * 60 * 60 * 1000;

function uniqueAllowedValues(
  values: string[],
  allowed: readonly string[]
): string[] {
  const allowedSet = new Set(allowed);
  return [...new Set(values.filter((value) => allowedSet.has(value)))];
}

export function parseJobBoardState(
  params: URLSearchParams,
  allowed: JobBoardAllowedValues
): JobBoardState {
  const requestedSort = params.get("sort");

  return {
    search: params.get("q")?.trim() ?? "",
    filters: {
      region: uniqueAllowedValues(params.getAll("region"), allowed.regions),
      country: uniqueAllowedValues(params.getAll("country"), allowed.countries),
      roleType: uniqueAllowedValues(params.getAll("role"), allowed.roleTypes),
      experience: uniqueAllowedValues(
        params.getAll("experience"),
        allowed.experienceBuckets
      ),
      language: uniqueAllowedValues(
        params.getAll("language"),
        allowed.languages
      ),
    },
    sort: requestedSort === "deadline" ? "deadline" : requestedSort === "recent" ? "recent" : "curated",
  };
}

export function serializeJobBoardState(state: JobBoardState): URLSearchParams {
  const params = new URLSearchParams();
  const search = state.search.trim();

  if (search) params.set("q", search);
  state.filters.region.forEach((value) => params.append("region", value));
  state.filters.country.forEach((value) => params.append("country", value));
  state.filters.roleType.forEach((value) => params.append("role", value));
  state.filters.experience.forEach((value) =>
    params.append("experience", value)
  );
  state.filters.language.forEach((value) => params.append("language", value));
  if (state.sort !== "curated") params.set("sort", state.sort);

  return params;
}

export function rememberJobBoardPosition(jobSlug: string): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      RETURN_URL_KEY,
      `${window.location.pathname}${window.location.search}`
    );
    window.sessionStorage.setItem(
      RETURN_SCROLL_KEY,
      String(Math.max(0, Math.round(window.scrollY)))
    );
    window.sessionStorage.setItem(RETURN_ANCHOR_KEY, jobSlug);
    window.sessionStorage.setItem(RETURN_SAVED_AT_KEY, String(Date.now()));
  } catch {
    // Browsing still works when storage is blocked.
  }
}

export function getJobBoardReturnHref(fallbackJobSlug: string): string {
  const fallback = `/#job-${encodeURIComponent(fallbackJobSlug)}`;
  if (typeof window === "undefined") return fallback;

  try {
    const returnUrl = window.sessionStorage.getItem(RETURN_URL_KEY);
    const anchor =
      window.sessionStorage.getItem(RETURN_ANCHOR_KEY) ?? fallbackJobSlug;

    if (!returnUrl?.startsWith("/")) return fallback;
    return `${returnUrl}#job-${encodeURIComponent(anchor)}`;
  } catch {
    return fallback;
  }
}

export function canUseNativeJobBoardHistoryReturn(jobSlug: string): boolean {
  if (typeof window === "undefined" || window.history.length <= 1) return false;

  try {
    const returnUrl = window.sessionStorage.getItem(RETURN_URL_KEY);
    const anchor = window.sessionStorage.getItem(RETURN_ANCHOR_KEY);
    const rawSavedAt = window.sessionStorage.getItem(RETURN_SAVED_AT_KEY);
    const savedAt = rawSavedAt === null ? NaN : Number(rawSavedAt);

    return (
      Boolean(returnUrl?.startsWith("/")) &&
      anchor === jobSlug &&
      Number.isFinite(savedAt) &&
      Date.now() - savedAt <= HISTORY_RETURN_MAX_AGE_MS
    );
  } catch {
    return false;
  }
}

export function prepareNativeJobBoardHistoryReturn(): void {
  if (typeof window === "undefined") return;

  try {
    // Let the browser restore the previous history entry's exact scroll position.
    // Removing our delayed manual scroll prevents the visible second jump.
    window.sessionStorage.removeItem(RETURN_SCROLL_KEY);
  } catch {
    // Native history still works when storage is blocked.
  }
}

export function consumeJobBoardScrollPosition(
  currentPathAndSearch: string
): number | null {
  if (typeof window === "undefined") return null;

  try {
    const returnUrl = window.sessionStorage.getItem(RETURN_URL_KEY);
    const rawScroll = window.sessionStorage.getItem(RETURN_SCROLL_KEY);
    if (returnUrl !== currentPathAndSearch || rawScroll === null) return null;

    window.sessionStorage.removeItem(RETURN_SCROLL_KEY);
    const scrollY = Number(rawScroll);
    return Number.isFinite(scrollY) && scrollY >= 0 ? scrollY : null;
  } catch {
    return null;
  }
}
