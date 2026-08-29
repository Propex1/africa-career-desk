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

export type Opportunity = {
  id: string;
  slug: string;
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
  locationDisplay: string;
  language?: string;
  languageTags?: string[];
  deadlineDisplay?: string;
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
  lastChecked: string;
  status: "Active";
};
