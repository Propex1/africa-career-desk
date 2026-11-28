/** Stable discovery IDs. These are not job URLs or replacements for legacy RoleType. */
export const CAREER_AREAS = [
  { id: "private-markets", label: "Private Markets", subcategories: [
    { id: "private-equity-growth", label: "Private Equity & Growth" },
    { id: "venture-capital", label: "Venture Capital" },
    { id: "private-credit", label: "Private Credit" },
    { id: "infrastructure-real-assets", label: "Infrastructure & Real Assets" },
    { id: "fund-investments-secondaries", label: "Fund Investments & Secondaries" },
  ] },
  { id: "development-finance", label: "Development Finance", subcategories: [
    { id: "investment-lending", label: "Investment & Lending" },
    { id: "advisory-capital-mobilisation", label: "Advisory & Capital Mobilisation" },
  ] },
  { id: "investment-banking-advisory", label: "Investment Banking & Advisory", subcategories: [
    { id: "ma-corporate-finance", label: "M&A & Corporate Finance" },
    { id: "transaction-restructuring-advisory", label: "Transaction & Restructuring Advisory" },
    { id: "capital-markets", label: "Capital Markets" },
  ] },
  { id: "asset-management-research", label: "Asset Management & Research", subcategories: [
    { id: "portfolio-management", label: "Portfolio Management" },
    { id: "investment-research", label: "Investment Research" },
    { id: "investment-advisory-wealth-management", label: "Investment Advisory & Wealth Management" },
  ] },
  { id: "global-markets-structuring", label: "Global Markets & Structuring", subcategories: [
    { id: "institutional-sales-trading", label: "Institutional Sales & Trading" },
    { id: "structuring-financial-engineering", label: "Structuring & Financial Engineering" },
  ] },
  { id: "banking-structured-finance", label: "Banking & Structured Finance", subcategories: [
    { id: "corporate-banking", label: "Corporate Banking" },
    { id: "project-structured-finance", label: "Project & Structured Finance" },
    { id: "trade-syndicated-finance", label: "Trade & Syndicated Finance" },
    { id: "treasury-funding-alm", label: "Treasury, Funding & ALM" },
  ] },
  { id: "corporate-finance-strategy", label: "Corporate Finance & Strategy", subcategories: [
    { id: "corporate-ma", label: "Corporate M&A" },
    { id: "strategic-finance-investments", label: "Strategic Finance & Investments" },
    { id: "fpa-finance-leadership", label: "FP&A & Finance Leadership" },
    { id: "corporate-investor-relations", label: "Corporate Investor Relations" },
  ] },
] as const;

type CareerArea = (typeof CAREER_AREAS)[number];
export type CareerAreaId = CareerArea["id"];
export type CareerSubcategoryId = CareerArea["subcategories"][number]["id"];

/** A mismatched area/subcategory pair is a compile-time error. */
export type CareerSelection = {
  [Area in CareerArea as Area["id"]]: {
    areaId: Area["id"];
    subcategoryId: Area["subcategories"][number]["id"];
  }
}[CareerAreaId];

export const DEFAULT_EXPANDED_CAREER_AREA: CareerAreaId = "private-markets";

export const CAREER_FILTER_OPTIONS: readonly string[] = [
  ...CAREER_AREAS.flatMap(area => [area.id, ...area.subcategories.map(item => item.id)]),
  "unclassified",
];

/** URL compatibility only: old themes broaden to their current activity-based parent.
 * These aliases must never be used to classify an individual job automatically.
 */
export const LEGACY_CAREER_FILTER_ALIASES: Readonly<Record<string, string>> = {
  "corporate-structured-finance": "banking-structured-finance",
  "corporate-development-investments": "corporate-finance-strategy",
  "dfi-investments": "investment-lending",
  "development-blended-finance": "development-finance",
  "impact-climate-finance": "development-finance",
  "valuation-transaction-advisory": "transaction-restructuring-advisory",
  "equity-fixed-income": "asset-management-research",
  "sales-trading": "institutional-sales-trading",
  "derivatives-structured-products": "structuring-financial-engineering",
  "strategic-investments-strategy": "strategic-finance-investments",
  "strategic-finance-capital-allocation": "strategic-finance-investments",
};

export function normalizeCareerFilterIds(ids: readonly string[]): string[] {
  return [...new Set(ids.map(id => LEGACY_CAREER_FILTER_ALIASES[id] ?? id)
    .filter(id => CAREER_FILTER_OPTIONS.includes(id)))];
}

export function careerFilterLabel(id: string): string {
  id = LEGACY_CAREER_FILTER_ALIASES[id] ?? id;
  if (id === "unclassified") return "Awaiting classification";
  for (const area of CAREER_AREAS) {
    if (area.id === id) return area.label;
    const subcategory = area.subcategories.find(item => item.id === id);
    if (subcategory) return subcategory.label;
  }
  return id;
}

/** Parent selection includes every child; deselecting one child narrows that parent. */
export function toggleCareerSelection(selected: readonly string[], id: string): string[] {
  selected = normalizeCareerFilterIds(selected);
  id = LEGACY_CAREER_FILTER_ALIASES[id] ?? id;
  const area = CAREER_AREAS.find(item => item.id === id);
  if (area) {
    const children: readonly string[] = area.subcategories.map(item => item.id);
    const allSelected = selected.includes(id) || children.every(child => selected.includes(child));
    return [...selected.filter(item => item !== id && !children.includes(item)), ...(allSelected ? [] : [id])];
  }
  const parent = CAREER_AREAS.find(item => item.subcategories.some(child => child.id === id));
  if (parent && selected.includes(parent.id)) {
    return [...selected.filter(item => item !== parent.id), ...parent.subcategories.filter(item => item.id !== id).map(item => item.id)];
  }
  return selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id];
}

export function isCareerSelection(value: unknown): value is CareerSelection {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return CAREER_AREAS.some(area => area.id === candidate.areaId &&
    area.subcategories.some(subcategory => subcategory.id === candidate.subcategoryId));
}
