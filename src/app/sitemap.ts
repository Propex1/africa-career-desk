import type { MetadataRoute } from "next";
import { JOBS } from "@/data/opportunities";
import { buildSitemap } from "@/lib/seo";
import { jobCategorySitemapEntries } from "@/lib/job-categories";

export default function sitemap(): MetadataRoute.Sitemap {
  return [...buildSitemap(JOBS), ...jobCategorySitemapEntries()];
}
