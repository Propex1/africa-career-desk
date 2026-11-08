/** Separate from investment field: one primary responsibility per classified job. */
export const JOB_FUNCTIONS = [
  "Investment",
  "Research & Analysis",
  "Trading & Structuring",
  "Financing & Origination",
  "Portfolio & Asset Management",
  "Strategic Finance",
  "Fundraising & Investor Relations",
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
