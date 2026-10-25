import type { Opportunity } from "../types/index";
import { BOARD_POSITION_PREFERENCES, BOARD_REVIEW_FLAGS } from "../data/board-curation-2026-10-25.ts";

const DAY = 86_400_000;
export const RANKING_WINDOW_DAYS = 14;
export const OPENING_SIZE = 20;
export const CATEGORY_TARGETS: Record<string, number> = {
  "Corporate Development, M&A & Strategy": 6,
  "Infrastructure & Project Finance": 4,
  "Private Equity, VC & Private Credit": 3,
  "Development Finance & Multilaterals": 3,
  "Markets / advisory / asset management": 3,
  "Climate & Impact Investing": 1,
};
export function rankingCategory(job: Opportunity): string {
  return ["Investment Banking & Advisory", "Fund Management, Treasury & Investor Relations"].includes(job.roleType ?? "")
    ? "Markets / advisory / asset management" : job.roleType ?? "Other";
}
function day(value?: string): number | null {
  if (!value) return null;
  // Existing records contain both ISO dates and English display dates.
  const time = Date.parse(value);
  return Number.isFinite(time) ? Math.floor(time / DAY) : null;
}
/** Uses responsibility evidence, never the title or the employer's prestige. */
export function roleQuality(job: Opportunity): number {
  if (BOARD_REVIEW_FLAGS[job.id]) return 0;
  const duties = (job.responsibilities ?? []).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (duties.length < 160 || (job.requirements ?? []).join(" ").length < 60) return 0;
  const signals = [
    /transaction|due diligence|acquisition|deal struct|deal execut|negotiat/,
    /financial model|valuation|business case|investment case|npv|\birr\b/,
    /capital allocat|investment propos|investment commit|capital structure|investment strateg/,
    /project financ|infrastructure|project develop|development.financ|investissement/,
    /portfolio|investment research|equity research|fundrais|investor/,
    /strategic partner|market.entry|corporate strateg|payments|payment.*strateg/,
    /impact|esg|climate/,
  ].filter(pattern => pattern.test(duties)).length;
  return signals >= 2 ? 2 : signals === 1 ? 1 : 0;
}
export function eligibleForOpening(job: Opportunity, now = new Date()): boolean {
  const today = Math.floor(now.getTime() / DAY), published = day(job.publishedAt), checked = day(job.lastChecked), posted = day(job.employerPostedAt), deadline = day(job.deadlineDate);
  return job.publicationStatus === "live" && job.lifecycleStatus === "active"
    && published !== null && today - published >= 0 && today - published <= RANKING_WINDOW_DAYS
    && checked !== null && today - checked >= 0 && today - checked <= RANKING_WINDOW_DAYS
    && (posted === null || today - posted >= 0 && today - posted <= 60)
    && (deadline === null || deadline >= today) && roleQuality(job) > 0
    && rankingCategory(job) in CATEGORY_TARGETS;
}
/** Stable dates first; identifiers break same-day ties, not research-batch order. */
export function recentJobs(items: readonly Opportunity[]): Opportunity[] {
  return [...items].sort((a, b) => (day(b.publishedAt) ?? -Infinity) - (day(a.publishedAt) ?? -Infinity) || a.id.localeCompare(b.id));
}
/**
 * At most twenty fresh, evidenced roles are diversified; everything else remains
 * available in first-publication order. Targets are penalties, never quotas.
 * Score = 28 - publication age + 4 * quality - 18 * category count / target
 *         - 20 * max(0, count - target + 1) - 8 if repeating the last category.
 */
export function rankJobs(items: readonly Opportunity[], now = new Date()): Opportunity[] {
  const ordered = recentJobs(items), pool = ordered.filter(job => eligibleForOpening(job, now));
  const selected: Opportunity[] = [], counts: Record<string, number> = {};
  const today = Math.floor(now.getTime() / DAY);
  while (pool.length && selected.length < OPENING_SIZE) {
    const score = (job: Opportunity) => {
      const category = rankingCategory(job), count = counts[category] ?? 0, target = CATEGORY_TARGETS[category];
      return 28 - (today - day(job.publishedAt)!) + 4 * roleQuality(job)
        - 18 * count / target - 20 * Math.max(0, count - target + 1)
        - (selected.length && rankingCategory(selected.at(-1)!) === category ? 8 : 0);
    };
    pool.sort((a, b) => score(b) - score(a) || (day(b.publishedAt)! - day(a.publishedAt)!) || a.id.localeCompare(b.id));
    const next = pool.shift()!; selected.push(next);
    const category = rankingCategory(next); counts[category] = (counts[category] ?? 0) + 1;
  }
  // Owner preferences exchange two eligible roles without changing the mix,
  // other positions, publication dates or the freshness eligibility rules.
  for (const preference of BOARD_POSITION_PREFERENCES) {
    const promote = selected.findIndex(job => job.id === preference.promoteId);
    const replace = selected.findIndex(job => job.id === preference.replaceId);
    if (replace >= 0 && promote > replace) {
      [selected[promote], selected[replace]] = [selected[replace], selected[promote]];
    }
  }
  const ids = new Set(selected.map(job => job.id));
  return [...selected, ...ordered.filter(job => !ids.has(job.id))];
}
