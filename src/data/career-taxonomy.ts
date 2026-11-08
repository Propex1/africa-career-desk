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
    { id: "dfi-investments", label: "DFI Investments" },
    { id: "development-blended-finance", label: "Development & Blended Finance" },
    { id: "impact-climate-finance", label: "Impact & Climate Finance" },
  ] },
  { id: "investment-banking-advisory", label: "Investment Banking & Advisory", subcategories: [
    { id: "ma-corporate-finance", label: "M&A & Corporate Finance" },
    { id: "valuation-transaction-advisory", label: "Valuation & Transaction Advisory" },
    { id: "capital-markets", label: "Capital Markets" },
  ] },
  { id: "asset-management-research", label: "Asset Management & Research", subcategories: [
    { id: "equity-fixed-income", label: "Equity & Fixed Income" },
    { id: "portfolio-management", label: "Portfolio Management" },
    { id: "investment-research", label: "Investment Research" },
  ] },
  { id: "global-markets-structuring", label: "Global Markets & Structuring", subcategories: [
    { id: "sales-trading", label: "Sales & Trading" },
    { id: "derivatives-structured-products", label: "Derivatives & Structured Products" },
  ] },
  { id: "corporate-structured-finance", label: "Corporate & Structured Finance", subcategories: [
    { id: "corporate-banking", label: "Corporate Banking" },
    { id: "project-structured-finance", label: "Project & Structured Finance" },
    { id: "trade-syndicated-finance", label: "Trade & Syndicated Finance" },
    { id: "treasury-funding-alm", label: "Treasury, Funding & ALM" },
  ] },
  { id: "corporate-development-investments", label: "Corporate Development & Investments", subcategories: [
    { id: "corporate-ma", label: "Corporate M&A" },
    { id: "strategic-investments-strategy", label: "Strategic Investments & Strategy" },
    { id: "strategic-finance-capital-allocation", label: "Strategic Finance & Capital Allocation" },
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

export function careerFilterLabel(id: string): string {
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
