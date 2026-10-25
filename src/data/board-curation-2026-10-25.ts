/** Display curation only. Original records and research/owner history are retained. */
/** Owner-requested exchange, applied only while both roles qualify for the opening selection. */
export const BOARD_POSITION_PREFERENCES = [
  { promoteId: "DRAFT-afd673f177a7", replaceId: "DRAFT-5c545baad9e3" }, // CFAO Project Finance Associate swaps with MTN Portfolio Management.
] as const;

export const BOARD_REMOVALS: Record<string, string> = {
  "DRAFT-0ded2321a796": "Owner request, 25 October 2026: AGL Commercial Manager, Malawi is predominantly sales, commercial-team leadership and client acquisition, with insufficient investment/deals/strategic-finance overlap.",
};

/** Kept public pending owner review; not promoted into the opening curated selection. */
export const BOARD_REVIEW_FLAGS: Record<string, string> = {
  "DRAFT-43904592e8cf": "Visa fintech Account Executive: partnerships overlap, but the candidate profile emphasises B2B sales, relationship management and payment-volume growth.",
  "DRAFT-ac7c1fc547f6": "Orange Business Performance Partner: forecasts, budgets, KPI reporting and variance analysis dominate; investment/capital-allocation responsibility is unclear.",
  "DRAFT-22fd3e5c8b1f": "Orange Satellite Program Manager: strategic partnerships overlap, but presales and programme coordination may dominate; transaction/modelling responsibility is unclear.",
  "DRAFT-00fe1ab79fde": "AGL Vendor Management Inventory: trade-finance/business-case overlap, but account acquisition and delivery coordination may dominate.",
  "DRAFT-2d7b2c277bb4": "AGL Chargé d’étude: feasibility/business-case overlap, but substantial PMO reporting, schedules and process administration.",
  "DRAFT-d7c9cc824e36": "AGL Offre PME: service strategy overlaps, but digital adoption, customer retention and operational delivery may dominate.",
  "DRAFT-0528e706c5c3": "TotalEnergies Business Analyst: commercial dashboards, pipeline conversion, renewals and budget reporting dominate the available responsibilities.",
  "DRAFT-a8b08d2fc2e3": "CMA CGM VIE Business Developer: investment-programme/project exposure, but execution coordination and reporting; depth of finance/deal work unclear.",
};
