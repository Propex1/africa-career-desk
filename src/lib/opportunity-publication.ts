import type { Opportunity } from "@/types";

const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

function calendarDate(value: string): number | null {
  if (!CALENDAR_DATE.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.getTime()
    : null;
}

export function publicationCalendarDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Keeps a first-publication date immutable when an entry is corrected or republished. */
export function withFirstPublicationDate<T extends Pick<Opportunity, "id" | "publishedAt">>(
  opportunity: T,
  existing?: Pick<Opportunity, "publishedAt">,
  now = new Date(),
): T & { publishedAt: string } {
  const publishedAt = existing?.publishedAt ?? opportunity.publishedAt ?? publicationCalendarDate(now);
  if (calendarDate(publishedAt) === null) throw new Error("publishedAt must use YYYY-MM-DD.");
  return { ...opportunity, publishedAt };
}

/** Dated entries appear first; same-day and undated entries retain source order. */
export function sortByFirstPublication<T extends Pick<Opportunity, "id" | "publishedAt">>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index, date: item.publishedAt ? calendarDate(item.publishedAt) : null }))
    .sort((a, b) => {
      if (a.date === null && b.date === null) return a.index - b.index;
      if (a.date === null) return 1;
      if (b.date === null) return -1;
      return b.date - a.date || a.index - b.index;
    })
    .map(({ item }) => item);
}

/** Visible on the publication day plus the following six calendar days. */
export function isNewlyPublished(opportunity: Pick<Opportunity, "publishedAt">, now = new Date()): boolean {
  if (!opportunity.publishedAt) return false;
  const published = calendarDate(opportunity.publishedAt);
  if (published === null) return false;
  const today = calendarDate(publicationCalendarDate(now));
  return today !== null && today >= published && today < published + 7 * 24 * 60 * 60 * 1000;
}
