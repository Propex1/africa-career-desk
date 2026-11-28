/** Separate from investment field: one primary responsibility per classified job. */
export const JOB_FUNCTIONS = [
  "Investment",
  "Research & Analysis",
  "Trading",
  "Institutional Sales",
  "Structuring & Financial Engineering",
  "Financing & Origination",
  "Portfolio & Asset Management",
  "Strategic Finance",
  "FP&A & Business Partnering",
  "Finance Leadership",
  "Impact & ESG",
  "Investment Advisory",
  "Fundraising & Investor Relations", // Investment-fund capital raising and LP relations.
  "Corporate Investor Relations", // Corporate earnings, disclosures and shareholder communications.
  "Risk & Underwriting",
  "Investment Legal",
  "Fund Finance & Operations",
] as const;
export type JobFunction = (typeof JOB_FUNCTIONS)[number];

export const EMPLOYER_TYPES = [
  "Investment Manager", "DFI / Multilateral", "Bank", "Advisory Firm",
  "Corporate", "Investment Platform", "Securities Firm",
] as const;
export type EmployerType = (typeof EMPLOYER_TYPES)[number];
