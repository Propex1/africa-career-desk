"use client";
import Link from "next/link";
import LogoContainer from "./LogoContainer";
import type { Opportunity } from "@/types";
import { trackJobCardClicked } from "@/lib/analytics";
import { rememberJobBoardPosition } from "@/lib/job-board-state";
import { deadlinePresentation } from "@/lib/deadline-presentation";
import { addedLabel, publicationDay } from "@/lib/job-freshness";

// Presentation-only aliases for the local mobile preview; source data stays intact.
const mobileEmployers: Record<string, string> = {
  "International Finance Corporation (IFC)": "IFC",
  "Development Bank of Southern Africa (DBSA)": "DBSA",
  "European Bank for Reconstruction and Development (EBRD)": "EBRD",
  "African Export-Import Bank (Afreximbank)": "Afreximbank",
  "Vodafone Egypt (Vodacom Group)": "Vodafone Egypt",
  "Standard Bank Corporate & Investment Banking": "Standard Bank CIB",
};
const mobileCategories: Record<string, string> = {
  "Infrastructure & Project Finance": "Infrastructure",
  "Development Finance & Multilaterals": "Development Finance",
  "Investment Banking & Advisory": "Investment Banking",
  "Corporate Development, M&A & Strategy": "Strategy & M&A",
  "Private Equity, VC & Private Credit": "PE, VC & Private Credit",
  "Fund Management, Treasury & Investor Relations": "Funds, Treasury & IR",
  "Climate & Impact Investing": "Climate & Impact",
  "Legal, Risk & Compliance": "Legal, Risk & Compliance",
};
function mobileLocation(location: string) {
  return location.replace(/, (?:Khomas Region|Greater Accra Region), /g, ", ");
}
export default function CompactJobCard({job, today}: {job: Opportunity; today: string}) {
  const deadline = publicationDay(job.deadlineDate);
  const presentation = job.deadlineDisplay && job.deadlineDisplay !== "Not stated" ? deadlinePresentation(job.deadlineDisplay) : undefined;
  const closing = presentation ? `${presentation.label} ${presentation.value}` : deadline !== null ? `Closes ${new Date(deadline).toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric",timeZone:"UTC"})}` : job.deadlineDisplay && job.deadlineDisplay !== "Not stated" ? job.deadlineDisplay : "Deadline not stated";
  const currentDay = publicationDay(today);
  const approaching = deadline !== null && currentDay !== null && deadline >= currentDay && deadline - currentDay <= 14 * 86_400_000;
  const mobileClosing = deadline !== null && /^\d{4}-\d{2}-\d{2}$/.test(job.deadlineDisplay ?? "")
    ? "Closes " + new Date(deadline).toLocaleDateString("en-GB", {day:"numeric", month:"short", timeZone:"UTC"}) : closing;
  return <article id={`job-${job.slug}`} className="compact-job">
    <LogoContainer company={job.company} initials={job.companyInitials} logoUrl={job.logoUrl}/>
    <div className="compact-identity"><h2><Link href={`/jobs/${job.slug}`} onClick={()=>{rememberJobBoardPosition(job.slug);trackJobCardClicked(job)}} className="compact-role-link">{job.title}</Link></h2><div className="compact-meta"><p className="compact-company"><span className="card-desktop-copy">{job.company}</span><span className="card-mobile-copy">{mobileEmployers[job.company] ?? job.company}</span></p><p className="compact-location"><span className="card-desktop-copy">{job.locationDisplay}</span><span className="card-mobile-copy">{mobileLocation(job.locationDisplay)}</span></p></div></div>
    <div className="compact-footer"><div className="compact-tags"><span className="card-desktop-copy">{job.roleType}</span><span className="card-mobile-copy">{mobileCategories[job.roleType ?? ""] ?? job.roleType}</span>{job.experienceBucket && <span className="muted-tag">{job.experienceBucket}</span>}</div>
    <div className="compact-dates"><span title={job.publishedAt ? `Added to ACD ${job.publishedAt}` : undefined}>{addedLabel(job.publishedAt,today)}</span><span className="card-desktop-copy">{closing}</span>{approaching && <span className="card-mobile-copy">{mobileClosing}</span>}</div></div>
    <span className="compact-view" aria-hidden="true">View role →</span>
  </article>;
}
