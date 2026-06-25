import JobsBoard from "@/components/JobsBoard";
import {
  JOBS,
  JOB_REGIONS,
  JOB_COUNTRIES,
  JOB_ROLE_TYPES,
  JOB_EXPERIENCE_BUCKETS,
  JOB_LANGUAGES,
} from "@/data/opportunities";

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
