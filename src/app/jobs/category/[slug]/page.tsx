import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import JobCard from "@/components/JobCard";
import { JOBS } from "@/data/opportunities";
import { ENABLED_JOB_CATEGORY_PAGES } from "@/data/job-categories";
import { filterJobsForCategory, getEnabledJobCategory, jobCategoryMetadata } from "@/lib/job-categories";
import { NO_INDEX_ROBOTS } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return ENABLED_JOB_CATEGORY_PAGES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getEnabledJobCategory(slug);
  if (!category) return { title: "Category not found | Africa Career Desk", robots: NO_INDEX_ROBOTS };
  return jobCategoryMetadata(category);
}

export default async function JobCategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getEnabledJobCategory(slug);
  if (!category) notFound();

  const jobs = filterJobsForCategory(JOBS, category);

  return (
    <section className="max-w-[1180px] mx-auto px-5 md:px-8 py-10 md:py-14">
      <div className="max-w-[820px]">
        <p className="m-0 mb-3 text-[12px] font-semibold uppercase tracking-[2px] text-acd-green">
          Curated Africa finance &amp; investment careers
        </p>
        <h1 className="m-0 font-serif font-medium text-[34px] md:text-[42px] leading-[1.08] text-acd-navy">
          {category.title}
        </h1>
        <p className="m-0 mt-4 max-w-[700px] text-[16px] md:text-[17px] leading-relaxed text-acd-muted">
          {category.description}
        </p>
        <div className="mt-6 flex items-center justify-between gap-4 border-y border-acd-border py-4">
          <p className="m-0 text-[15px] font-semibold text-acd-navy" aria-live="polite">
            {jobs.length} live {jobs.length === 1 ? "opportunity" : "opportunities"}
          </p>
          <Link href="/" className="text-[14px] font-semibold text-acd-green no-underline hover:underline">
            All Jobs
          </Link>
        </div>
      </div>

      {jobs.length > 0 ? (
        <div className="mt-5 flex flex-col gap-[14px]">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      ) : (
        <div className="mt-5 border-y border-acd-border py-10">
          <h2 className="m-0 font-serif text-[22px] font-medium text-acd-navy">
            No live opportunities in this focus right now
          </h2>
          <p className="m-0 mt-2 text-[15px] text-acd-muted">
            Browse all current curated opportunities across Africa.
          </p>
          <Link href="/" className="mt-4 inline-block text-[14px] font-semibold text-acd-green no-underline hover:underline">
            Browse All Jobs
          </Link>
        </div>
      )}
    </section>
  );
}
