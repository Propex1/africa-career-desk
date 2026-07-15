import type { Metadata } from "next";
import JobsBoard from "@/components/JobsBoard";
import SectionViewTracker from "@/components/analytics/SectionViewTracker";
import {
  JOBS,
  JOB_REGIONS,
  JOB_COUNTRIES,
  JOB_ROLE_TYPES,
  JOB_EXPERIENCE_BUCKETS,
  JOB_LANGUAGES,
} from "@/data/opportunities";

const HOME_DESCRIPTION =
  "Find curated Africa-focused roles in finance, investment, private equity, infrastructure, DFI, climate, VC and strategy. Explore jobs, programmes and open application channels across leading Africa-focused employers.";

export const metadata: Metadata = {
  title: "Africa Career Desk | Curated Africa-Focused Career Opportunities",
  description: HOME_DESCRIPTION,
  openGraph: {
    siteName: "Africa Career Desk",
    type: "website",
    title: "Africa Career Desk | Curated Africa-Focused Career Opportunities",
    description: HOME_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "Africa Career Desk | Curated Africa-Focused Career Opportunities",
    description: HOME_DESCRIPTION,
  },
};

export default function JobsPage() {
  return (
    <>
      <SectionViewTracker section="Jobs" />
      <JobsBoard
        jobs={JOBS}
        regions={JOB_REGIONS}
        countries={JOB_COUNTRIES}
        roleTypes={JOB_ROLE_TYPES}
        experienceBuckets={JOB_EXPERIENCE_BUCKETS}
        languages={JOB_LANGUAGES}
      />
    </>
  );
}
