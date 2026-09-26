import type { Metadata, MetadataRoute } from "next";
import type { Opportunity, OpportunityLocation } from "@/types";
import { hasVerifiedHardDeadline, isIsoCalendarDate, normalizeEmployerName } from "./opportunity-data.ts";

export const ACD_SITE_URL = "https://www.africacareerdesk.com";

export const NO_INDEX_ROBOTS = {
  index: false,
  follow: false,
} satisfies Metadata["robots"];

const JOB_POSTING_EMPLOYMENT_TYPES = {
  "full-time": "FULL_TIME",
  "part-time": "PART_TIME",
  contract: "CONTRACTOR",
  internship: "INTERN",
  temporary: "TEMPORARY",
  other: "OTHER",
} as const;

export function canonicalPath(path: string): string {
  const pathname = path.split(/[?#]/, 1)[0] || "/";
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (withLeadingSlash === "/") return "/";
  return `${withLeadingSlash.replace(/\/+$/, "")}/`;
}

function jobTitleLocation(job: Opportunity): string | undefined {
  if (job.city && job.country) return `${job.city}, ${job.country}`;
  return job.city ?? job.country;
}

export function jobPageMetadata(job: Opportunity): Metadata {
  const location = jobTitleLocation(job);
  const title = `${job.title} at ${job.company}${location ? ` | ${location}` : ""} | Africa Career Desk`;
  const url = new URL(canonicalPath(`/jobs/${job.slug}`), ACD_SITE_URL).toString();

  return {
    title,
    description: job.summary,
    alternates: { canonical: canonicalPath(`/jobs/${job.slug}`) },
    openGraph: {
      type: "website",
      siteName: "Africa Career Desk",
      title,
      description: job.summary,
      url,
    },
    twitter: {
      card: "summary",
      title,
      description: job.summary,
    },
  };
}

export function createJobPostingJsonLd(job: Opportunity): Record<string, unknown> | null {
  const locations = (job.locations ?? []).filter((location): location is Extract<OpportunityLocation, { scope: "city" }> => {
    if (location.scope !== "city") return false;
    const visibleLocation = normalizeEmployerName(job.locationDisplay);
    return visibleLocation.includes(normalizeEmployerName(location.city)) &&
      visibleLocation.includes(normalizeEmployerName(location.country));
  });

  if (
    job.status !== "Active" ||
    job.publicationStatus !== "live" ||
    job.lifecycleStatus !== "active" ||
    job.workArrangement === "remote" ||
    !job.employerId ||
    !job.title.trim() ||
    !job.summary.trim() ||
    !job.company.trim() ||
    !isIsoCalendarDate(job.employerPostedAt) ||
    locations.length === 0 ||
    locations.length !== job.locations?.length
  ) {
    return null;
  }

  const jobLocation = locations.map((location) => ({
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: location.city,
      addressCountry: location.country,
    },
  }));
  const employmentType = job.employmentType
    ? JOB_POSTING_EMPLOYMENT_TYPES[job.employmentType]
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.summary,
    datePosted: job.employerPostedAt,
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
    },
    jobLocation: jobLocation.length === 1 ? jobLocation[0] : jobLocation,
    ...(employmentType ? { employmentType } : {}),
    ...(hasVerifiedHardDeadline(job.verifiedDeadline, job.deadlineDate) ? { validThrough: job.deadlineDate } : {}),
  };
}

export function buildSitemap(jobs: readonly Pick<Opportunity, "slug">[]): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: new URL("/", ACD_SITE_URL).toString(), changeFrequency: "daily", priority: 1 },
    { url: new URL("/programmes/", ACD_SITE_URL).toString(), changeFrequency: "weekly", priority: 0.8 },
    { url: new URL("/open-applications/", ACD_SITE_URL).toString(), changeFrequency: "weekly", priority: 0.8 },
    { url: new URL("/about/", ACD_SITE_URL).toString(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const jobPages: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: new URL(canonicalPath(`/jobs/${job.slug}`), ACD_SITE_URL).toString(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...jobPages];
}
