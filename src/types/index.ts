export type BoardSection = "Jobs" | "Programmes" | "Open Applications";

export type RoleType =
  | "Private Equity, VC & Private Credit"
  | "Infrastructure & Project Finance"
  | "Development Finance & Multilaterals"
  | "Climate & Impact Investing"
  | "Investment Banking & Advisory"
  | "Corporate Development, M&A & Strategy"
  | "Fund Management, Treasury & Investor Relations"
  | "Legal, Risk & Compliance";

export type SourceType =
  | "Company website"
  | "Official ATS"
  | "LinkedIn company post"
  | "Email application"
  | "Trusted third-party";

export type OpportunityLifecycleStatus = "active" | "needs_verification" | "closed";
export type OpportunityPublicationStatus = "live" | "removed";
export type OpportunityLifecycleReason = "deadline_passed" | "manual_removal" | "needs_verification" | "verified_closed";
export type OpportunityWorkArrangement = "onsite" | "hybrid" | "remote";
export type OpportunityEmploymentType =
  | "full-time"
  | "part-time"
  | "contract"
  | "internship"
  | "temporary"
  | "other";

export type OpportunityLocation =
  | { scope: "city"; city: string; country: string }
  | { scope: "country"; country: string }
  | { scope: "region"; region: string; countries?: string[] }
  | { scope: "multi_market"; countries: string[]; region?: string };

export interface VerifiedDeadlineEvidence {
  deadlineDate: string;
  authority: "employer" | "official_ats";
  sourceUrl: string;
  verifiedAt: string;
  statement: string;
}

export type Opportunity = {
  id: string;
  slug: string;
  employerId?: string;
  title: string;
  company: string;
  companyInitials: string;
  logoUrl?: string;
  boardSection: BoardSection;
  roleType: RoleType;
  experienceBucket?: string;
  city?: string;
  country?: string;
  region?: string;
  locations?: OpportunityLocation[];
  locationDisplay: string;
  language?: string;
  languageTags?: string[];
  deadlineDisplay?: string;
  deadlineDate?: string;
  verifiedDeadline?: VerifiedDeadlineEvidence;
  employerPostedAt?: string;
  workArrangement?: OpportunityWorkArrangement;
  employmentType?: OpportunityEmploymentType;
  employmentTypeDisplay?: string;
  summary: string;
  aboutRole?: string;
  responsibilities?: string[];
  requirements?: string[];
  niceToHave?: string[];
  applicationNotes?: string;
  sourceDescription?: string;
  applyUrl: string;
  sourceUrl: string;
  sourceType: SourceType;
  applyButtonText: string;
  /** Immutable calendar date of first publication on Africa Career Desk. */
  publishedAt?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  publicationStatus?: OpportunityPublicationStatus;
  lifecycleStatus?: OpportunityLifecycleStatus;
  lifecycleReason?: OpportunityLifecycleReason;
  closureVerifiedAt?: string;
  closureReason?: string;
  closureEvidence?: string;
  lastChecked: string;
  status: "Active";
};
