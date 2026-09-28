import type { Metadata, MetadataRoute } from "next";
import type { Opportunity } from "../types/index.ts";
import { ENABLED_JOB_COUNTRY_PAGES, type JobCountryPageDefinition } from "../data/job-countries.ts";
import { filterJobsForDiscovery } from "./job-filters.ts";
import { ACD_SITE_URL, canonicalPath } from "./seo.ts";

const normalize = (value: string) => value.trim().toLowerCase().replace(/[’‘]/g, "'");
const isSingleLocation = (value: string | undefined): value is string =>
  Boolean(value?.trim()) && !/[\/;]|\bor\b|\bmultiple\b|\bmulti-country\b/i.test(value!);

/** Country identity comes only from location fields, never from mandate or employer. */
function workCountries(job: Opportunity): string[] {
  if (job.locations?.length) {
    const countries = [...new Set(job.locations.flatMap((location) => {
      if (location.scope === "city" || location.scope === "country") return [normalize(location.country)];
      if (location.scope === "multi_market") return location.countries.map(normalize);
      return []; // A regional mandate, even with covered countries, is insufficient.
    }))];
    // Legacy country fields may corroborate locations but never add membership.
    // Every named country must agree; compound labels are not used as a fallback.
    if (job.country && job.country.split(/[\/;]|\bor\b/i).some((value) => !countries.includes(normalize(value)))) return [];
    return countries;
  }

  // Older records have structured country/city fields without a locations array.
  // Display text only corroborates or vetoes those fields; it never supplies a country.
  if (!isSingleLocation(job.country) || !isSingleLocation(job.locationDisplay)) return [];
  const country = normalize(job.country);
  const display = normalize(job.locationDisplay);
  const city = job.city ? normalize(job.city) : undefined;
  return display === country || display === city || display.endsWith(`, ${country}`) ? [country] : [];
}

export function getEnabledJobCountry(slug: string): JobCountryPageDefinition | undefined {
  return ENABLED_JOB_COUNTRY_PAGES.find((country) => country.slug === slug);
}

export function filterJobsForCountry(
  jobs: readonly Opportunity[],
  country: JobCountryPageDefinition,
): Opportunity[] {
  return filterJobsForDiscovery(jobs, []).filter((job) => workCountries(job).includes(normalize(country.country)));
}

export function getEnabledJobCountriesForJob(job: Opportunity): JobCountryPageDefinition[] {
  return ENABLED_JOB_COUNTRY_PAGES.filter((country) => filterJobsForCountry([job], country).length > 0);
}

export function jobCountryTitle(country: JobCountryPageDefinition): string {
  return `Investment & Finance Jobs in ${country.country}`;
}

export function jobCountryMetadata(country: JobCountryPageDefinition): Metadata {
  const path = canonicalPath(`/jobs/country/${country.slug}`);
  const title = `${jobCountryTitle(country)} | Africa Career Desk`;
  return {
    title,
    description: country.metaDescription,
    alternates: { canonical: path },
    openGraph: {
      type: "website", siteName: "Africa Career Desk", title,
      description: country.metaDescription,
      url: new URL(path, ACD_SITE_URL).toString(),
    },
    twitter: { card: "summary", title, description: country.metaDescription },
  };
}

export function jobCountrySitemapEntries(): MetadataRoute.Sitemap {
  return ENABLED_JOB_COUNTRY_PAGES.map((country) => ({
    url: new URL(canonicalPath(`/jobs/country/${country.slug}`), ACD_SITE_URL).toString(),
    changeFrequency: "daily", priority: 0.65,
  }));
}
