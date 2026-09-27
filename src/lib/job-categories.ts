import type { Metadata, MetadataRoute } from "next";
import type { Opportunity } from "@/types";
import { ENABLED_JOB_CATEGORY_PAGES, type JobCategoryPageDefinition } from "../data/job-categories.ts";
import { ACD_SITE_URL, canonicalPath } from "./seo.ts";

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
  const seenIds = new Set<string>();
  return jobs.filter((job) => {
    const matches = job.roleType === category.roleType ||
      Boolean(category.discoveryTheme && job.discoveryThemes?.includes(category.discoveryTheme));
    if (
      job.boardSection !== "Jobs" ||
      job.status !== "Active" ||
      (job.publicationStatus ?? "live") !== "live" ||
      (job.lifecycleStatus ?? "active") === "closed" ||
      !matches || seenIds.has(job.id)
    ) return false;

    // Filter in the board's existing order, irrespective of how a job matched.
    seenIds.add(job.id);
    return true;
  });
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
