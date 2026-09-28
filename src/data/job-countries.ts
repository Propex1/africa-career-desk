export interface JobCountryPageDefinition {
  slug: string;
  country: string;
  description: string;
  metaDescription: string;
}

// Editorial allowlist: new inventory never enables another public country route.
export const ENABLED_JOB_COUNTRY_PAGES: readonly JobCountryPageDefinition[] = [
  {
    slug: "south-africa",
    country: "South Africa",
    description: "Explore current investment and finance jobs in South Africa across private equity, infrastructure, development finance, investment banking, fund management and related roles.",
    metaDescription: "Discover investment and finance jobs in South Africa across private equity, infrastructure, investment banking and development finance, curated by Africa Career Desk.",
  },
  {
    slug: "morocco",
    country: "Morocco",
    description: "Explore current investment and finance jobs in Morocco across private equity, infrastructure, corporate finance, investment banking, asset management and related roles.",
    metaDescription: "Discover investment and finance jobs in Morocco across private equity, infrastructure, investment banking and asset management, curated by Africa Career Desk.",
  },
  {
    slug: "kenya",
    country: "Kenya",
    description: "Explore current investment and finance jobs in Kenya across private equity, infrastructure investment, fund management and advisory, curated for Africa-focused investment professionals.",
    metaDescription: "Discover investment and finance jobs in Kenya across private equity, infrastructure investment, fund management and advisory, curated by Africa Career Desk.",
  },
];
