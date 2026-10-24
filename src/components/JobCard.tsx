"use client";

import Link from "next/link";
import LogoContainer from "./LogoContainer";
import NewOpportunityBadge from "./NewOpportunityBadge";
import type { Opportunity } from "@/types";
import { trackJobCardClicked } from "@/lib/analytics";
import { deadlinePresentation } from "@/lib/deadline-presentation";

interface JobCardProps {
  job: Opportunity;
}

export default function JobCard({ job }: JobCardProps) {
  const onClick = () => trackJobCardClicked(job);
  const deadline = deadlinePresentation(job.deadlineDisplay);
  const otherTags = [job.experienceBucket, job.language].filter(
    Boolean
  ) as string[];

  return (
    <div
      id={`job-${job.slug}`}
      className="job-card relative scroll-mt-6 bg-white border border-acd-border-card rounded-[16px] p-4 md:rounded-[18px] md:p-[28px_32px] flex items-start md:items-center gap-x-3 gap-y-3 md:gap-6 flex-wrap transition-[border-color,box-shadow] duration-[180ms] hover:border-acd-border-hover hover:shadow-[0_8px_28px_-16px_rgba(20,43,63,0.22)] shadow-[0_1px_3px_rgba(20,43,63,0.04)]"
    >
      <div className="absolute top-3 right-3 md:top-2 md:right-8">
        <NewOpportunityBadge publishedAt={job.publishedAt} />
      </div>

      <LogoContainer
        company={job.company}
        initials={job.companyInitials}
        logoUrl={job.logoUrl}
      />

      <div className="flex-1 min-w-0 pr-12 md:min-w-[200px] md:pr-0">
        <Link
          href={`/jobs/${job.slug}`}
          onClick={onClick}
          className="line-clamp-3 font-serif font-semibold text-[18px] text-acd-navy leading-[1.12] tracking-[-0.2px] hover:text-acd-green transition-colors no-underline block md:line-clamp-none md:text-[20px] md:leading-tight"
        >
          {job.title}
        </Link>
        <p className="m-0 mt-1.5 flex flex-col items-start gap-1 text-[13px] leading-[1.35] text-acd-dim md:mt-2 md:flex-row md:items-center md:flex-wrap md:gap-1 md:text-[14px]">
          <span className="line-clamp-2 font-semibold text-acd-green-mid md:line-clamp-none">
            {job.company}
          </span>
          <span className="hidden text-[#C7CFD2] mx-2 md:inline">·</span>
          <span className="inline-flex min-w-0 items-center gap-[5px]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#AEB7BC"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M12 21s-6-5.2-6-10a6 6 0 1112 0c0 4.8-6 10-6 10z" />
              <circle cx="12" cy="11" r="2.2" />
            </svg>
            <span className="truncate md:whitespace-normal">
              {job.locationDisplay}
            </span>
          </span>
        </p>
      </div>

      <div className="w-full md:w-[348px] min-w-0 shrink-0 flex flex-wrap gap-1.5 md:gap-2">
        <span className="max-w-full bg-acd-tag-green-bg text-acd-tag-green-text text-[11px] md:text-[12px] font-semibold px-2.5 md:px-3 py-[5px] md:py-[6px] rounded-[8px] whitespace-normal break-words leading-[1.3] md:leading-[1.35]">
          {job.roleType}
        </span>
        {otherTags.map((tag) => (
          <span
            key={tag}
            className="max-w-full bg-acd-tag-muted-bg text-acd-tag-muted-text text-[11px] md:text-[12px] font-medium px-2.5 md:px-3 py-[5px] md:py-[6px] rounded-[8px] whitespace-normal break-words leading-[1.3] md:leading-[1.35]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1 md:w-[126px] md:flex-none md:text-right shrink-0">
        {deadline && (
          <p className="m-0 text-[12px] text-acd-dimmer md:text-[12.5px]">
            {deadline.label}{" "}
            <span className="text-acd-green-body2 font-semibold">
              {deadline.value}
            </span>
          </p>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3 shrink-0 md:ml-0">
        <Link
          href={`/jobs/${job.slug}`}
          onClick={onClick}
          className="inline-flex items-center gap-2 bg-white text-acd-green-mid border border-acd-border-green rounded-[10px] md:rounded-[11px] px-4 md:px-[19px] py-2.5 md:py-3 text-[13px] md:text-[14px] font-semibold hover:bg-acd-green hover:text-white hover:border-acd-green transition-colors duration-150 no-underline whitespace-nowrap"
        >
          View role
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
