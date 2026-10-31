import type { Opportunity } from "../types/index";

const DAY = 86_400_000;
export function publicationDay(value?: string): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
}
export function addedLabel(value: string | undefined, today: string): string {
  const date = publicationDay(value), now = publicationDay(today);
  if (date === null || now === null || date > now) return "Added date unavailable";
  const age = Math.floor((now - date) / DAY);
  return age === 0 ? "Added today" : age === 1 ? "Added yesterday" : `Added ${age} days ago`;
}
export function addedWithin(job: Opportunity, days: number, today: string): boolean {
  if (!days) return true;
  const date = publicationDay(job.publishedAt), now = publicationDay(today);
  return date !== null && now !== null && date <= now && date > now - days * DAY;
}
export function visibleOnBoard(job: Opportunity, today: string): boolean {
  const deadline = publicationDay(job.deadlineDate), now = publicationDay(today);
  return job.status === "Active" && (job.publicationStatus ?? "live") === "live" && job.lifecycleStatus !== "closed" && (deadline === null || now === null || deadline >= now);
}

/** Original ACD publication date only. Same-day jobs retain their existing order. */
export function newestJobs(items: readonly Opportunity[]): Opportunity[] {
  return [...items].sort((a, b) => {
    const left = publicationDay(a.publishedAt), right = publicationDay(b.publishedAt);
    if (left === right) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return right - left;
  });
}
