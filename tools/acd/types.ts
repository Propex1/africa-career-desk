export type SourceResult = "attempted" | "successful" | "partially_successful" | "inaccessible" | "login_required" | "rate_limited" | "blocked" | "unsupported" | "parser_error" | "no_vacancies_found";
export type ReviewOutcome = "strong_candidate" | "borderline" | "out_of_scope" | "existing_duplicate" | "possible_duplicate" | "insufficient_evidence" | "source_inaccessible";
export type DecisionAction = "approved" | "rejected" | "deferred" | "confirmed_duplicate" | "treat_as_new";
export type ApplicationRouteStatus = "available" | "broken" | "unknown";
export type FreshnessStatus = "verified_active" | "check_freshness" | "closed_expired";
export type ACDSection = "Job" | "Programme" | "Open Application";

export interface Employer { id: string; name: string; aliases: string[]; logoUrl?: string; }
export interface Source { id: string; employerId: string; type: "official_careers" | "official_ats" | "linkedin_company" | "linkedin_jobs"; url: string; priority: number; required: boolean; active: boolean; accessMethod: "http_json" | "http_markdown" | "web_page" | "manual_review"; lastVerified: string; expectedCoverage: string; notes: string; }
export interface CollectedVacancy { sourceKey: string; employerId: string; sourceId: string; title: string; department?: string; location?: string; description?: string; employmentType?: string; requisitionId?: string; publishedAt?: string; deadline?: string; applyUrl?: string; applicationRouteStatus?: ApplicationRouteStatus; sourceUrl: string; sourceType: string; evidence: string; discoveredAt: string; }
export interface Classification { outcome: ReviewOutcome; section: ACDSection; category?: string; confidence: number; reasons: string[]; missingFields: string[]; blocking: boolean; }
export interface DuplicateMatch { kind: "exact" | "cautious"; basis: "requisition_id" | "application_url" | "title_location" | "existing_listing" | "previous_decision"; vacancyId?: number; externalReference?: string; detail: string; }
