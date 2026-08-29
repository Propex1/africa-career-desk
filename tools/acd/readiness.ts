import type { Classification } from "./types.ts";

export type ReadinessField = "employer" | "title" | "location" | "opportunity_type" | "application_url" | "description" | "freshness" | "classification" | "duplicate_resolution";

export interface ReadinessInput {
  employerName?: unknown;
  title?: unknown;
  location?: unknown;
  description?: unknown;
  applicationUrl?: unknown;
  opportunityType?: unknown;
  freshnessStatus?: unknown;
  applicationRouteStatus?: unknown;
  classification: Classification;
  importedMissingFields?: string[];
}

export interface ReadinessAssessment {
  opportunityType: "Job" | "Programme" | "Open Application";
  missingFields: ReadinessField[];
  optionalFields: string[];
  notApplicableFields: string[];
  blockers: string[];
  ready: boolean;
}

const isText = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const isUrl = (value: unknown) => {
  if (!isText(value)) return false;
  try { const url = new URL(String(value)); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; }
};

export function readinessType(value: unknown): ReadinessAssessment["opportunityType"] {
  return value === "Open Application" ? "Open Application" : value === "Programme" ? "Programme" : "Job";
}

/**
 * Publication readiness is intentionally opportunity-type aware. Research metadata that
 * does not exist for an open channel (for example a requisition ID) is not a blocker.
 */
export function assessReadiness(input: ReadinessInput): ReadinessAssessment {
  const opportunityType = readinessType(input.opportunityType);
  const imported = new Set(input.importedMissingFields ?? []);
  const missingFields: ReadinessField[] = [];
  if (!isText(input.employerName)) missingFields.push("employer");
  if (!isText(input.title)) missingFields.push("title");
  if (!isText(input.location)) missingFields.push("location");
  if (!isUrl(input.applicationUrl) || input.applicationRouteStatus !== "available") missingFields.push("application_url");
  if (!isText(input.description)) missingFields.push("description");
  if (input.freshnessStatus !== "verified_active") missingFields.push("freshness");
  if (!input.classification?.outcome) missingFields.push("classification");
  if (input.classification?.outcome === "possible_duplicate") missingFields.push("duplicate_resolution");

  const optionalFields = ["requisition_id", "official_posting_date"];
  if (!isText(input.description) || imported.has("role_description")) {
    // Description itself is already assessed above; the research field name is not duplicated.
  }
  if (opportunityType === "Open Application") optionalFields.push("official_deadline", "direct_application_form_url");
  else {
    // A vacancy/programme deadline is required only where the official source states one.
    optionalFields.push("official_deadline", "direct_application_form_url");
  }
  const notApplicableFields = opportunityType === "Open Application" ? ["requisition_id", "official_posting_date", "official_deadline"] : [];
  const blockers = missingFields.map((field) => ({
    employer: "Employer is missing.", title: "Title is missing.", location: "Location or geographic scope is missing.",
    opportunity_type: "Opportunity type is missing.", application_url: "The official application destination is not confirmed usable.",
    description: opportunityType === "Open Application" ? "A factual official-channel description is missing." : "A verified role or programme description is missing.",
    freshness: "Freshness is not verified active.", classification: "Editorial classification is missing.", duplicate_resolution: "Duplicate resolution is still required."
  }[field]!));
  return { opportunityType, missingFields, optionalFields, notApplicableFields, blockers, ready: blockers.length === 0 };
}
