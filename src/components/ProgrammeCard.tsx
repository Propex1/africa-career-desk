"use client";

import type { Opportunity } from "@/types";
import LogoContainer from "./LogoContainer";
import NewOpportunityBadge from "./NewOpportunityBadge";
import { trackApplyClicked } from "@/lib/analytics";

interface ProgrammeCardProps {
  programme: Opportunity;
  showDetails?: boolean;
}

export default function ProgrammeCard({ programme, showDetails = false }: ProgrammeCardProps) {
  return (
    <div className="relative bg-white border border-acd-border rounded-[18px] px-7 py-6 flex items-center gap-6 flex-wrap transition-[border-color,box-shadow] duration-[180ms] hover:border-acd-border-hover hover:shadow-[0_8px_28px_-16px_rgba(20,43,63,0.22)]">
      <div className="absolute top-2 right-4 md:right-8">
        <NewOpportunityBadge publishedAt={programme.publishedAt} />
      </div>
      <LogoContainer
        company={programme.company}
        initials={programme.companyInitials}
        logoUrl={programme.logoUrl}
        size="sm"
      />

      <div className="flex-1 min-w-[240px] pr-16 md:pr-0">
        <p className="m-0 mb-[7px] text-[12.5px] font-semibold text-acd-green tracking-[0.4px] uppercase">
          {programme.roleType}
        </p>
        <p className="m-0 font-serif font-semibold text-[21px] text-acd-navy tracking-[-0.2px]">
          {programme.title}
        </p>
        <p className="m-0 mt-[5px] text-[15px] font-semibold text-acd-green-body">
          {programme.company}
        </p>
        <p className="m-0 mt-2 text-[14px] text-acd-dim">
          {programme.locationDisplay}
        </p>
      </div>

      {programme.deadlineDisplay && (
        <div className="min-w-[118px]">
          <p className="m-0 text-[12px] text-acd-dimest font-medium">
            Applications close
          </p>
          <p className="m-0 mt-[3px] text-[14.5px] text-acd-navy-mid font-semibold">
            {programme.deadlineDisplay}
          </p>
        </div>
      )}

      <a
        href={programme.applyUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackApplyClicked(programme)}
        className="inline-flex items-center gap-2 bg-white text-acd-green border-[1.5px] border-acd-border-hover rounded-[11px] px-[18px] py-3 text-[14.5px] font-semibold hover:bg-acd-green hover:text-white hover:border-acd-green transition-colors duration-150 no-underline shrink-0 whitespace-nowrap"
      >
        View programme
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
      {showDetails && (
        <details className="w-full border-t border-acd-border pt-5 text-acd-green-body">
          <summary className="cursor-pointer text-[15px] font-semibold text-acd-green">
            Programme details and eligibility
          </summary>
          <div className="mt-5 max-w-[780px] text-[16px] leading-[1.7]">
            <h2 className="font-serif font-semibold text-[23px] text-acd-navy">Summary</h2>
            <p className="mt-3">{programme.summary}</p>
            {([
              ["Programme experience", programme.responsibilities],
              ["Key requirements", programme.requirements],
              ["Nice to have", programme.niceToHave],
            ] as const).map(([heading, items]) => items && items.length > 0 && (
              <section key={heading} className="mt-7">
                <h3 className="font-serif font-semibold text-[21px] text-acd-navy">{heading}</h3>
                <ul className="mt-3 list-disc pl-5 space-y-3">
                  {items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            ))}
            {programme.applicationNotes && (
              <p className="mt-7 bg-acd-green-pale border border-acd-green-pale-border rounded-[14px] px-[22px] py-[18px] text-[15px]">
                {programme.applicationNotes}
              </p>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
