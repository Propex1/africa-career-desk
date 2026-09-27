import type { DiscoveryTheme, RoleType } from "@/types";

export interface JobCategoryPageDefinition {
  slug: string;
  roleType: RoleType;
  discoveryTheme?: DiscoveryTheme;
  detailLinkLabel: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  enabled: boolean;
}

export const JOB_CATEGORY_PAGES: readonly JobCategoryPageDefinition[] = [
  {
    slug: "private-equity-venture-capital",
    roleType: "Private Equity, VC & Private Credit",
    discoveryTheme: "private-markets",
    detailLinkLabel: "More Private Equity, VC & Private Credit opportunities",
    title: "Private Equity & Venture Capital Jobs in Africa",
    description: "Explore private equity, venture capital and private credit opportunities with investment funds, private-markets teams and investors focused on African markets.",
    metaTitle: "Private Equity & Venture Capital Jobs in Africa | Africa Career Desk",
    metaDescription: "Private equity, venture capital and private credit opportunities with Africa-focused funds and investment teams, curated by Africa Career Desk.",
    enabled: true,
  },
  {
    slug: "development-finance",
    roleType: "Development Finance & Multilaterals",
    detailLinkLabel: "More Development Finance opportunities",
    title: "Development Finance & DFI Jobs in Africa",
    description: "Explore roles with development finance institutions (DFIs), multilateral organisations and investment teams financing businesses, infrastructure and economic development across African markets.",
    metaTitle: "Development Finance & DFI Jobs in Africa | Africa Career Desk",
    metaDescription: "Development finance and DFI jobs with development finance institutions, multilaterals and investment teams focused on African markets.",
    enabled: true,
  },
  {
    slug: "infrastructure-project-finance",
    roleType: "Infrastructure & Project Finance",
    detailLinkLabel: "More Infrastructure & Project Finance opportunities",
    title: "Infrastructure & Project Finance Jobs in Africa",
    description: "Explore infrastructure investment and project finance opportunities, including investment, project development and advisory roles with employers focused on African markets.",
    metaTitle: "Infrastructure & Project Finance Jobs in Africa | Africa Career Desk",
    metaDescription: "Infrastructure investment and project finance jobs across African markets, including investment, project development and advisory roles.",
    enabled: true,
  },
  {
    slug: "investment-banking",
    roleType: "Investment Banking & Advisory",
    detailLinkLabel: "More Investment Banking & Advisory opportunities",
    title: "Investment Banking & Corporate Finance Jobs in Africa",
    description: "Explore investment banking, corporate finance and transaction advisory opportunities, alongside related financing and client coverage roles serving businesses across African markets.",
    metaTitle: "Investment Banking & Corporate Finance Jobs in Africa | Africa Career Desk",
    metaDescription: "Investment banking, corporate finance and transaction advisory jobs, plus related financing and client coverage roles focused on African markets.",
    enabled: true,
  },
  {
    slug: "climate-impact-investing",
    roleType: "Climate & Impact Investing",
    detailLinkLabel: "More Climate & Impact opportunities",
    title: "Climate Finance & Impact Investing Jobs in Africa",
    description: "Explore climate finance, impact investing and ESG opportunities with investment managers, development institutions and teams supporting businesses and projects across African markets.",
    metaTitle: "Climate Finance & Impact Investing Jobs in Africa | Africa Career Desk",
    metaDescription: "Climate finance, impact investing and ESG jobs with Africa-focused investment managers, development institutions and project teams.",
    enabled: true,
  },
];

export const ENABLED_JOB_CATEGORY_PAGES = JOB_CATEGORY_PAGES.filter((category) => category.enabled);
