import Link from "next/link";
import LogoContainer from "./LogoContainer";
import type { Opportunity } from "@/types";

interface JobCardProps {
  job: Opportunity;
}

export default function JobCard({ job }: JobCardProps) {
  const otherTags = [job.experienceBucket, job.language].filter(Boolean) as string[];

  return (
    <div className="bg-white border border-acd-border-card rounded-[18px] p-5 md:p-[28px_32px] flex items-center gap-6 flex-wrap transition-[border-color,box-shadow] duration-[180ms] hover:border-acd-border-hover hover:shadow-[0_8px_28px_-16px_rgba(20,43,63,0.22)] shadow-[0_1px_3px_rgba(20,43,63,0.04)]">
      {/* Logo */}
      <LogoContainer
        company={job.company}
        initials={job.companyInitials}
        logoUrl={job.logoUrl}
      />

      {/* Title + company + location */}
      <div className="flex-1 min-w-[200px]">
        <Link
          href={`/jobs/${job.slug}`}
          className="font-serif font-semibold text-[20px] text-acd-navy leading-tight tracking-[-0.2px] hover:text-acd-green transition-colors no-underline block"
        >
          {job.title}
        </Link>
        <p className="mt-2 text-[14px] text-acd-dim flex items-center flex-wrap gap-1 m-0">
          <span className="text-acd-green-mid font-semibold">{job.company}</span>
          <span className="text-[#C7CFD2] mx-2">·</span>
          <span className="inline-flex items-center gap-[5px]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#AEB7BC"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 21s-6-5.2-6-10a6 6 0 1112 0c0 4.8-6 10-6 10z" />
              <circle cx="12" cy="11" r="2.2" />
            </svg>
            {job.locationDisplay}
          </span>
        </p>
      </div>

      {/* Tags */}
      <div className="w-full md:w-[348px] shrink-0 flex flex-wrap gap-2">
        <span className="bg-acd-tag-green-bg text-acd-tag-green-text text-[12px] font-semibold px-3 py-[6px] rounded-[8px] whitespace-nowrap">
          {job.roleType}
        </span>
        {otherTags.map((tag) => (
          <span
            key={tag}
            className="bg-acd-tag-muted-bg text-acd-tag-muted-text text-[12px] font-medium px-3 py-[6px] rounded-[8px] whitespace-nowrap"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Deadline */}
      <div className="w-auto md:w-[126px] md:text-right shrink-0">
        {job.deadlineDisplay && (
          <p className="m-0 text-[12.5px] text-acd-dimmer">
            Closes{" "}
            <span className="text-acd-green-body2 font-semibold">
              {job.deadlineDisplay}
            </span>
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href={`/jobs/${job.slug}`}
          className="inline-flex items-center gap-2 bg-white text-acd-green-mid border border-acd-border-green rounded-[11px] px-[19px] py-3 text-[14px] font-semibold hover:bg-acd-green hover:text-white hover:border-acd-green transition-colors duration-150 no-underline whitespace-nowrap"
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
