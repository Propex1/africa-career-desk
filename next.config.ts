import jobSlugRedirects from "./src/data/job-slug-redirects.json";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  trailingSlash: true,
  async redirects() {
    return Object.entries(jobSlugRedirects).map(([from, to]) => ({
      source: `/jobs/${from}/`,
      destination: `/jobs/${to}/`,
      permanent: true,
    }));
  },
};

export default nextConfig;
