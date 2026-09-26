import type { RoleType } from "@/types";

export interface JobCategoryPageDefinition {
  slug: string;
  roleType: RoleType;
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
    detailLinkLabel: "More Private Equity, VC & Private Credit opportunities",
    title: "Private equity, venture capital and private credit roles in Africa",
    description: "Curated private equity, venture capital and private credit roles from Africa-focused employers.",
    metaTitle: "Private Equity, VC & Private Credit Jobs in Africa | Africa Career Desk",
    metaDescription: "Curated private equity, venture capital and private credit roles across Africa from Africa Career Desk.",
    enabled: true,
  },
  {
    slug: "development-finance",
    roleType: "Development Finance & Multilaterals",
    detailLinkLabel: "More Development Finance opportunities",
    title: "Development finance and multilateral opportunities in Africa",
    description: "Selected roles with development finance institutions and multilateral organisations working across African markets.",
    metaTitle: "Development Finance & Multilateral Jobs in Africa | Africa Career Desk",
    metaDescription: "Selected roles with development finance institutions and multilateral organisations working across African markets.",
    enabled: true,
  },
  {
    slug: "infrastructure-project-finance",
    roleType: "Infrastructure & Project Finance",
    detailLinkLabel: "More Infrastructure & Project Finance opportunities",
    title: "Infrastructure and project finance opportunities in Africa",
    description: "Curated infrastructure investment, project finance and advisory roles connected to African markets.",
    metaTitle: "Infrastructure & Project Finance Jobs in Africa | Africa Career Desk",
    metaDescription: "Browse selected infrastructure investment, project finance and advisory roles with Africa-facing mandates.",
    enabled: true,
  },
  {
    slug: "investment-banking",
    roleType: "Investment Banking & Advisory",
    detailLinkLabel: "More Investment Banking & Advisory opportunities",
    title: "Investment banking and advisory opportunities in Africa",
    description: "Selected investment banking and transaction-advisory roles with an Africa-facing mandate.",
    metaTitle: "Investment Banking & Advisory Jobs in Africa | Africa Career Desk",
    metaDescription: "Curated transaction, banking and advisory roles across Africa-facing financial institutions.",
    enabled: true,
  },
  {
    slug: "climate-impact-investing",
    roleType: "Climate & Impact Investing",
    detailLinkLabel: "More Climate & Impact opportunities",
    title: "Climate finance and impact investing opportunities in Africa",
    description: "Selected climate finance, ESG and impact-investing roles connected to African markets.",
    metaTitle: "Climate & Impact Investing Jobs in Africa | Africa Career Desk",
    metaDescription: "Selected climate finance, ESG and impact-investing roles with African mandates.",
    enabled: true,
  },
];

export const ENABLED_JOB_CATEGORY_PAGES = JOB_CATEGORY_PAGES.filter((category) => category.enabled);
