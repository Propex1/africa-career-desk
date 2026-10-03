import type { Metadata, MetadataRoute } from "next";
import type { Opportunity } from "@/types";
import { ENABLED_JOB_CATEGORY_PAGES, type JobCategoryPageDefinition } from "../data/job-categories.ts";
import { ACD_SITE_URL, canonicalPath } from "./seo.ts";
import { filterJobsForDiscovery } from "./job-filters.ts";

export function getEnabledJobCategory(slug: string): JobCategoryPageDefinition | undefined {
  return ENABLED_JOB_CATEGORY_PAGES.find((category) => category.slug === slug);
}

export function getEnabledJobCategoryForRoleType(
  roleType: Opportunity["roleType"],
): JobCategoryPageDefinition | undefined {
  return ENABLED_JOB_CATEGORY_PAGES.find((category) => category.roleType === roleType);
}

export function filterJobsForCategory(
  jobs: readonly Opportunity[],
  category: JobCategoryPageDefinition,
): Opportunity[] {
  return filterJobsForDiscovery(jobs, [category]);
}

/** Primary destination first, followed by approved secondary discovery destinations. */
export function getEnabledJobCategoriesForJob(job: Opportunity): JobCategoryPageDefinition[] {
  return ENABLED_JOB_CATEGORY_PAGES
    .filter((category) => filterJobsForCategory([job], category).length > 0)
    .sort((a, b) => Number(b.roleType === job.roleType) - Number(a.roleType === job.roleType));
}

export function jobCategoryMetadata(category: JobCategoryPageDefinition): Metadata {
  const path = canonicalPath(`/jobs/category/${category.slug}`);
  const url = new URL(path, ACD_SITE_URL).toString();

  return {
    title: category.metaTitle,
    description: category.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "Africa Career Desk",
      title: category.metaTitle,
      description: category.metaDescription,
      url,
    },
    twitter: {
      card: "summary",
      title: category.metaTitle,
      description: category.metaDescription,
    },
  };
}

export function jobCategorySitemapEntries(): MetadataRoute.Sitemap {
  return ENABLED_JOB_CATEGORY_PAGES.map((category) => ({
    url: new URL(canonicalPath(`/jobs/category/${category.slug}`), ACD_SITE_URL).toString(),
    changeFrequency: "daily",
    priority: 0.65,
  }));
}
