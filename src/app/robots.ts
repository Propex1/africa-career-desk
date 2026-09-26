import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/newsletter", "/api/subscribe"] },
    sitemap: "https://www.africacareerdesk.com/sitemap.xml",
  };
}
