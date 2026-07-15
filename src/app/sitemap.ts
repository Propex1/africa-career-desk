import type { MetadataRoute } from "next";
import { OPPORTUNITIES } from "@/data/opportunities";

const BASE = "https://www.africacareerdesk.com";

// Date of the SEO update — used for static pages whose content changed then.
const SEO_UPDATE = "2026-07-15";

// Parse "15 Jul 2026" → "2026-07-15"
function parseLastChecked(dateStr: string): string {
  const months: Record<string, string> = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04",
    May: "05", Jun: "06", Jul: "07", Aug: "08",
    Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const parts = dateStr.split(" ");
  const dd = parts[0].padStart(2, "0");
  const mm = months[parts[1]] ?? "01";
  const yyyy = parts[2];
  return `${yyyy}-${mm}-${dd}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/`,
      lastModified: SEO_UPDATE,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE}/programmes/`,
      lastModified: SEO_UPDATE,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE}/open-applications/`,
      lastModified: SEO_UPDATE,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE}/about/`,
      lastModified: SEO_UPDATE,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const opportunityPages: MetadataRoute.Sitemap = OPPORTUNITIES.map((opp) => ({
    url: `${BASE}/jobs/${opp.slug}/`,
    lastModified: parseLastChecked(opp.lastChecked),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...opportunityPages];
}
