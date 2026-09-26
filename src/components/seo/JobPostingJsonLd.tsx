import type { Opportunity } from "@/types";
import { createJobPostingJsonLd } from "@/lib/seo";

export default function JobPostingJsonLd({ job }: { job: Opportunity }) {
  const jsonLd = createJobPostingJsonLd(job);
  if (!jsonLd) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}