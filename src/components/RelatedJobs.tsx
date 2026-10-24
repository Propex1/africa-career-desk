"use client";

import Link from "next/link";
import type { Opportunity } from "@/types";
import LogoContainer from "./LogoContainer";
import { trackRelatedJobClicked } from "@/lib/analytics";

interface RelatedJobsProps {
  sourceJob: Opportunity;
  jobs: Opportunity[];
}

export default function RelatedJobs({ sourceJob, jobs }: RelatedJobsProps) {
  if (jobs.length === 0) return null;

  return (
    <section
      aria-labelledby="related-jobs-heading"
      className="mt-14 border-t border-acd-border pt-10 md:mt-16 md:pt-12"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="m-0 text-[12px] font-semibold uppercase tracking-[2px] text-acd-green">
            Keep exploring
          </p>
          <h2
            id="related-jobs-heading"
            className="m-0 mt-2 font-serif text-[28px] font-semibold tracking-[-0.4px] text-acd-navy"
          >
            Similar opportunities
          </h2>
        </div>
        <Link
          href="/"
          className="text-[14px] font-semibold text-acd-green no-underline hover:underline"
        >
          View all jobs
        </Link>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/jobs/${job.slug}`}
            onClick={() => trackRelatedJobClicked(sourceJob, job)}
            className="group flex min-w-0 items-start gap-4 rounded-[16px] border border-acd-border-card bg-white p-4 no-underline shadow-[0_1px_3px_rgba(20,43,63,0.04)] transition-[border-color,box-shadow] hover:border-acd-border-hover hover:shadow-[0_8px_24px_-18px_rgba(20,43,63,0.28)]"
          >
            <LogoContainer
              company={job.company}
              initials={job.companyInitials}
              logoUrl={job.logoUrl}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <h3 className="m-0 line-clamp-2 font-serif text-[18px] font-semibold leading-[1.18] tracking-[-0.2px] text-acd-navy transition-colors group-hover:text-acd-green">
                {job.title}
              </h3>
              <p className="m-0 mt-1.5 line-clamp-1 text-[13.5px] font-semibold text-acd-green-mid">
                {job.company}
              </p>
              <p className="m-0 mt-1 line-clamp-1 text-[13px] text-acd-dim">
                {job.locationDisplay}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="max-w-full rounded-[7px] bg-acd-tag-green-bg px-2.5 py-1 text-[11px] font-semibold leading-[1.25] text-acd-tag-green-text">
                  {job.roleType}
                </span>
                {job.experienceBucket && (
                  <span className="rounded-[7px] bg-acd-tag-muted-bg px-2.5 py-1 text-[11px] font-medium text-acd-tag-muted-text">
                    {job.experienceBucket}
                  </span>
                )}
              </div>
            </div>
            <svg
              aria-hidden="true"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-1 shrink-0 text-acd-green transition-transform group-hover:translate-x-0.5"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
