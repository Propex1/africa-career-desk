import type {
  Opportunity,
  OpportunityEmploymentType,
  OpportunityLifecycleStatus,
  OpportunityLifecycleReason,
  OpportunityLocation,
  OpportunityPublicationStatus,
  OpportunityWorkArrangement,
  VerifiedDeadlineEvidence,
} from "@/types";
import { DISCOVERY_THEMES } from "../types/index.ts";

const MONTHS: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
};

const WORK_ARRANGEMENTS = new Set<OpportunityWorkArrangement>(["onsite", "hybrid", "remote"]);
const EMPLOYMENT_TYPES = new Set<OpportunityEmploymentType>([
  "full-time", "part-time", "contract", "internship", "temporary", "other",
]);
const LIFECYCLE_STATUSES = new Set<OpportunityLifecycleStatus>([
  "active", "needs_verification", "closed",
]);
const PUBLICATION_STATUSES = new Set<OpportunityPublicationStatus>(["live", "removed"]);
const DEADLINE_AUTHORITIES = new Set(["employer", "official_ats"]);

export interface ConfirmedClosure {
  verifiedAt: string;
  reason: string;
  evidence: string;
}

export type VerifiedOpportunityFields = Partial<Pick<
  Opportunity,
  "locations" | "workArrangement" | "employmentType" | "employmentTypeDisplay"
>>;

export interface OpportunityProjectionOptions {
  employerIdByCompany: Readonly<Record<string, string>>;
  removedJobIds: ReadonlySet<string>;
  confirmedClosures: Readonly<Record<string, ConfirmedClosure>>;
  employerPostedAtByJobId?: Readonly<Record<string, string>>;
  verifiedDeadlinesByJobId?: Readonly<Record<string, VerifiedDeadlineEvidence>>;
  verifiedFieldsByJobId?: Readonly<Record<string, VerifiedOpportunityFields>>;
  today?: string;
}

export function normalizeEmployerName(value: string): string {
  return value.toLowerCase().replace(/&amp;/g, "and").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

export function isIsoCalendarDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Shared by lifecycle projection and JobPosting: a normalized date alone is not evidence.
export function hasVerifiedHardDeadline(
  evidence: VerifiedDeadlineEvidence | undefined,
  deadlineDate: string | undefined,
): evidence is VerifiedDeadlineEvidence {
  if (!evidence) return false;
  let source: URL;
  try { source = new URL(evidence.sourceUrl); } catch { return false; }
  return isIsoCalendarDate(evidence.deadlineDate) &&
    evidence.deadlineDate === deadlineDate &&
    isIsoCalendarDate(evidence.verifiedAt) &&
    DEADLINE_AUTHORITIES.has(evidence.authority) &&
    source.protocol === "https:" && Boolean(evidence.statement.trim());
}

export function normalizeDeadlineDisplay(value?: string): string | undefined {
  const match = /^(\d{1,2}) ([A-Z][a-z]{2}) (\d{4})$/.exec(value ?? "");
  if (!match) return undefined;
  const [, day, monthName, year] = match;
  const month = MONTHS[monthName];
  if (!month) return undefined;
  const normalized = `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`;
  return isIsoCalendarDate(normalized) ? normalized : undefined;
}

function includesLocationPart(display: string, value: string): boolean {
  return normalizeEmployerName(display).includes(normalizeEmployerName(value));
}

export function deriveStructuredLocations(opportunity: Opportunity): OpportunityLocation[] {
  const display = opportunity.locationDisplay;
  const commaCount = (display.match(/,/g) ?? []).length;
  if (/[;/]|\bor\b/i.test(display) || commaCount > 1) return [];

  if (
    opportunity.city &&
    opportunity.country &&
    includesLocationPart(display, opportunity.city) &&
    includesLocationPart(display, opportunity.country)
  ) {
    return [{ scope: "city", city: opportunity.city, country: opportunity.country }];
  }

  if (!opportunity.city && opportunity.country && includesLocationPart(display, opportunity.country)) {
    return [{ scope: "country", country: opportunity.country }];
  }

  if (opportunity.region && includesLocationPart(display, opportunity.region)) {
    return [{ scope: "region", region: opportunity.region }];
  }

  return [];
}

function assertValidLocation(location: OpportunityLocation, jobId: string) {
  const required = (value: string | undefined) => Boolean(value?.trim());
  if (location.scope === "city" && (!required(location.city) || !required(location.country))) {
    throw new Error(`${jobId}: city locations require both city and country.`);
  }
  if (location.scope === "country" && !required(location.country)) {
    throw new Error(`${jobId}: country locations require a country.`);
  }
  if (location.scope === "region" && !required(location.region)) {
    throw new Error(`${jobId}: region locations require a region.`);
  }
  if (location.scope === "multi_market") {
    const countries = location.countries.map(normalizeEmployerName);
    if (countries.length < 2 || countries.some((country) => !country) || new Set(countries).size !== countries.length) {
      throw new Error(`${jobId}: multi-market locations require at least two distinct countries.`);
    }
  }
  if (location.scope === "region" && location.countries) {
    const countries = location.countries.map(normalizeEmployerName);
    if (countries.some((country) => !country) || new Set(countries).size !== countries.length) {
      throw new Error(`${jobId}: region country values must be non-empty and unique.`);
    }
  }
}

export function validateEmployerIdentityMap(map: Readonly<Record<string, string>>) {
  const normalizedLabels = new Map<string, string>();
  for (const [label, employerId] of Object.entries(map)) {
    const normalized = normalizeEmployerName(label);
    if (!normalized || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(employerId)) {
      throw new Error(`Invalid employer identity mapping for "${label}".`);
    }
    const prior = normalizedLabels.get(normalized);
    if (prior && prior !== employerId) {
      throw new Error(`Employer alias "${label}" resolves to multiple stable IDs.`);
    }
    normalizedLabels.set(normalized, employerId);
  }
}

export function validateOpportunityRecords(
  opportunities: readonly Opportunity[],
  removedJobIds: ReadonlySet<string> = new Set(),
  today = new Date().toISOString().slice(0, 10),
) {
  if (!isIsoCalendarDate(today)) throw new Error("Validation date must use a valid YYYY-MM-DD date.");
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const foundIds = new Set<string>();

  for (const opportunity of opportunities) {
    if (!opportunity.id.trim() || ids.has(opportunity.id)) {
      throw new Error(`Opportunity ID is missing or duplicated: "${opportunity.id}".`);
    }
    if (!opportunity.slug.trim() || slugs.has(opportunity.slug)) {
      throw new Error(`Opportunity slug is missing or duplicated: "${opportunity.slug}".`);
    }
    ids.add(opportunity.id);
    slugs.add(opportunity.slug);
    foundIds.add(opportunity.id);

    const themes = opportunity.discoveryThemes;
    if (themes !== undefined && (
      !Array.isArray(themes) ||
      themes.some((theme) => !DISCOVERY_THEMES.includes(theme)) ||
      new Set(themes).size !== themes.length
    )) {
      throw new Error(`${opportunity.id}: discoveryThemes must contain distinct controlled discovery themes.`);
    }

    if (opportunity.employerId && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(opportunity.employerId)) {
      throw new Error(`${opportunity.id}: invalid employerId "${opportunity.employerId}".`);
    }
    if (opportunity.employerPostedAt && !isIsoCalendarDate(opportunity.employerPostedAt)) {
      throw new Error(`${opportunity.id}: employerPostedAt must use a valid YYYY-MM-DD date.`);
    }
    if (opportunity.deadlineDate && !isIsoCalendarDate(opportunity.deadlineDate)) {
      throw new Error(`${opportunity.id}: deadlineDate must use a valid YYYY-MM-DD date.`);
    }
    if (opportunity.verifiedDeadline) {
      if (!hasVerifiedHardDeadline(opportunity.verifiedDeadline, opportunity.deadlineDate)) {
        throw new Error(`${opportunity.id}: verified deadline provenance is incomplete or inconsistent.`);
      }
    }
    if (opportunity.closureVerifiedAt && !isIsoCalendarDate(opportunity.closureVerifiedAt)) {
      throw new Error(`${opportunity.id}: closureVerifiedAt must use a valid YYYY-MM-DD date.`);
    }
    if (opportunity.workArrangement && !WORK_ARRANGEMENTS.has(opportunity.workArrangement)) {
      throw new Error(`${opportunity.id}: unsupported work arrangement.`);
    }
    if (opportunity.employmentType && !EMPLOYMENT_TYPES.has(opportunity.employmentType)) {
      throw new Error(`${opportunity.id}: unsupported employment type.`);
    }

    opportunity.locations?.forEach((location) => assertValidLocation(location, opportunity.id));

    const publicationStatus = opportunity.publicationStatus ?? "live";
    const lifecycleStatus = opportunity.lifecycleStatus ?? "active";
    if (!PUBLICATION_STATUSES.has(publicationStatus) || !LIFECYCLE_STATUSES.has(lifecycleStatus)) {
      throw new Error(`${opportunity.id}: unsupported publication or lifecycle status.`);
    }
    if (removedJobIds.has(opportunity.id) && publicationStatus !== "removed") {
      throw new Error(`${opportunity.id}: removed IDs must remain in the historical records as removed.`);
    }
    if (publicationStatus === "removed" && lifecycleStatus === "active") {
      throw new Error(`${opportunity.id}: removed records cannot have active lifecycle status.`);
    }
    if (lifecycleStatus === "closed") {
      const deadlineDate = opportunity.deadlineDate;
      const deadlineClosure = opportunity.lifecycleReason === "deadline_passed" &&
        publicationStatus === "removed" &&
        Boolean(opportunity.verifiedDeadline) &&
        isIsoCalendarDate(deadlineDate) &&
        deadlineDate === opportunity.verifiedDeadline?.deadlineDate &&
        deadlineDate < today;
      const evidencedClosure = opportunity.lifecycleReason !== "deadline_passed" &&
        publicationStatus === "removed" &&
        Boolean(opportunity.closureVerifiedAt && opportunity.closureReason?.trim() && opportunity.closureEvidence?.trim());
      if (!deadlineClosure && !evidencedClosure) {
        throw new Error(`${opportunity.id}: closed records require verified deadline provenance or explicit closure evidence.`);
      }
    } else if (opportunity.lifecycleReason === "deadline_passed") {
      throw new Error(`${opportunity.id}: deadline_passed reason requires a closed lifecycle.`);
    }
  }

  for (const removedId of removedJobIds) {
    if (!foundIds.has(removedId)) throw new Error(`Removed job ${removedId} is missing from historical opportunity records.`);
  }
}

export function buildOpportunityProjection(
  source: readonly Opportunity[],
  options: OpportunityProjectionOptions,
): Opportunity[] {
  validateEmployerIdentityMap(options.employerIdByCompany);
  const aliases = new Map(
    Object.entries(options.employerIdByCompany).map(([label, employerId]) => [normalizeEmployerName(label), employerId]),
  );
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  if (!isIsoCalendarDate(today)) throw new Error("Projection date must use a valid YYYY-MM-DD date.");

  const opportunities = source.map((record): Opportunity => {
    const verifiedFields = options.verifiedFieldsByJobId?.[record.id];
    const employerId = record.employerId ?? aliases.get(normalizeEmployerName(record.company));
    const employerPostedAt = record.employerPostedAt ?? options.employerPostedAtByJobId?.[record.id];
    const verifiedDeadline = options.verifiedDeadlinesByJobId?.[record.id] ?? record.verifiedDeadline;
    const deadlineDate = verifiedDeadline?.deadlineDate ?? record.deadlineDate ?? normalizeDeadlineDisplay(record.deadlineDisplay);
    const locations = record.locations ?? verifiedFields?.locations ?? deriveStructuredLocations(record);
    const workArrangement = record.workArrangement ?? verifiedFields?.workArrangement;
    const employmentType = record.employmentType ?? verifiedFields?.employmentType;
    const employmentTypeDisplay = record.employmentTypeDisplay ?? verifiedFields?.employmentTypeDisplay;
    const confirmedClosure = options.confirmedClosures[record.id];
    // Date-only deadlines remain live for the entire UTC calendar date shown.
    const deadlinePassed = Boolean(
      hasVerifiedHardDeadline(verifiedDeadline, deadlineDate) &&
      verifiedDeadline.deadlineDate < today,
    );
    const manuallyRemoved = options.removedJobIds.has(record.id) || record.publicationStatus === "removed";
    const removed = manuallyRemoved || deadlinePassed || Boolean(confirmedClosure);
    const deadlineNeedsVerification = Boolean(
      record.deadlineDisplay && (!deadlineDate || deadlineDate < today) && !verifiedDeadline,
    );
    const lifecycleStatus = confirmedClosure
      ? "closed"
      : deadlinePassed && !manuallyRemoved
        ? "closed"
      : removed || deadlineNeedsVerification
        ? "needs_verification"
        : record.lifecycleStatus ?? "active";
    const lifecycleReason: OpportunityLifecycleReason | undefined = confirmedClosure
      ? "verified_closed"
      : deadlinePassed && !manuallyRemoved
        ? "deadline_passed"
        : manuallyRemoved
          ? record.lifecycleReason ?? "manual_removal"
          : deadlineNeedsVerification
            ? "needs_verification"
            : record.lifecycleReason;

    return {
      ...record,
      ...(employerId ? { employerId } : {}),
      ...(employerPostedAt ? { employerPostedAt } : {}),
      ...(deadlineDate ? { deadlineDate } : {}),
      ...(verifiedDeadline ? { verifiedDeadline } : {}),
      ...(locations.length ? { locations } : {}),
      ...(workArrangement ? { workArrangement } : {}),
      ...(employmentType ? { employmentType } : {}),
      ...(employmentTypeDisplay ? { employmentTypeDisplay } : {}),
      publicationStatus: removed ? "removed" : record.publicationStatus ?? "live",
      lifecycleStatus,
      ...(lifecycleReason ? { lifecycleReason } : {}),
      ...(confirmedClosure ? {
        closureVerifiedAt: confirmedClosure.verifiedAt,
        closureReason: confirmedClosure.reason,
        closureEvidence: confirmedClosure.evidence,
      } : {}),
    };
  });

  validateOpportunityRecords(opportunities, options.removedJobIds, today);
  return opportunities;
}

export function getLiveJobs(opportunities: readonly Opportunity[]): Opportunity[] {
  return opportunities.filter((opportunity) =>
    opportunity.boardSection === "Jobs" &&
    (opportunity.publicationStatus ?? "live") === "live" &&
    (opportunity.lifecycleStatus ?? "active") !== "closed",
  );
}
