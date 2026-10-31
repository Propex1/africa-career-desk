"use client";
import Link from "next/link";
import LogoContainer from "./LogoContainer";
import type { Opportunity } from "@/types";
import { trackJobCardClicked } from "@/lib/analytics";
import { rememberJobBoardPosition } from "@/lib/job-board-state";
import { deadlinePresentation } from "@/lib/deadline-presentation";
import { addedLabel, publicationDay } from "@/lib/job-freshness";

export default function CompactJobCard({job, today}: {job: Opportunity; today: string}) {
  const deadline = publicationDay(job.deadlineDate);
  const presentation = job.deadlineDisplay && job.deadlineDisplay !== "Not stated" ? deadlinePresentation(job.deadlineDisplay) : undefined;
  const closing = presentation ? `${presentation.label} ${presentation.value}` : deadline !== null ? `Closes ${new Date(deadline).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric",timeZone:"UTC"})}` : job.deadlineDisplay && job.deadlineDisplay !== "Not stated" ? job.deadlineDisplay : "Deadline not stated";
  return <article id={`job-${job.slug}`} className="compact-job">
    <LogoContainer company={job.company} initials={job.companyInitials} logoUrl={job.logoUrl}/>
    <div className="compact-identity"><h2><Link href={`/jobs/${job.slug}`} onClick={()=>{rememberJobBoardPosition(job.slug);trackJobCardClicked(job)}} className="compact-role-link">{job.title}</Link></h2><div className="compact-meta"><p className="compact-company">{job.company}</p><p className="compact-location">{job.locationDisplay}</p></div></div>
    <div className="compact-tags"><span>{job.roleType}</span>{job.experienceBucket && <span className="muted-tag">{job.experienceBucket}</span>}</div>
    <div className="compact-dates"><span title={job.publishedAt ? `Added to ACD ${job.publishedAt}` : undefined}>{addedLabel(job.publishedAt,today)}</span><span>{closing}</span></div>
    <span className="compact-view" aria-hidden="true">View role →</span>
  </article>;
}
