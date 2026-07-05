import type { Metadata } from "next";
import JobsBoard from "@/components/JobsBoard";
import {
  JOBS,
  JOB_REGIONS,
  JOB_COUNTRIES,
  JOB_ROLE_TYPES,
  JOB_EXPERIENCE_BUCKETS,
  JOB_LANGUAGES,
} from "@/data/opportunities";

export const metadata: Metadata = {
  title: "Africa Career Desk | Curated Africa-Focused Career Opportunities",
  description:
    "Curated Africa-focused jobs, internships and programmes in finance, investment, infrastructure, climate, strategy and venture capital.",
  openGraph: {
    siteName: "Africa Career Desk",
    type: "website",
    title: "Africa Career Desk | Curated Africa-Focused Career Opportunities",
    description:
      "Curated Africa-focused jobs, internships and programmes in finance, investment, infrastructure, climate, strategy and venture capital.",
  },
  twitter: {
    card: "summary",
    title: "Africa Career Desk | Curated Africa-Focused Career Opportunities",
    description:
      "Curated Africa-focused jobs, internships and programmes in finance, investment, infrastructure, climate, strategy and venture capital.",
  },
};

export default function JobsPage() {
  return (
    <JobsBoard
      jobs={JOBS}
      regions={JOB_REGIONS}
      countries={JOB_COUNTRIES}
      roleTypes={JOB_ROLE_TYPES}
      experienceBuckets={JOB_EXPERIENCE_BUCKETS}
      languages={JOB_LANGUAGES}
    />
  );
}
