import type { Metadata } from "next";
import Link from "next/link";
import BeehiivNewsletterSection from "@/components/BeehiivNewsletterSection";
import { JOBS } from "@/data/opportunities";

export const metadata: Metadata = {
  title: "About | Africa Career Desk",
  description:
    "Africa Career Desk is a curated discovery platform for high-quality, Africa-focused roles in finance, investment, infrastructure, private capital, venture capital, climate finance and strategy.",
};

const FOCUS_AREAS = [
  "Private Equity & Private Capital",
  "Infrastructure & Project Finance",
  "DFI / MDB Investment Roles",
  "Venture Capital & Growth Equity",
  "Climate Finance & Impact Investing",
  "Corporate Development, M&A & Strategy",
];

const CURATION_STEPS = [
  ["01", "Source", "Identify opportunities from credible employers and official sources."],
  ["02", "Screen", "Assess roles for career quality, relevance and meaningful Africa exposure."],
  ["03", "Verify", "Review application sources, key role information and stated deadlines."],
  ["04", "Publish", "Only relevant opportunities are surfaced on Africa Career Desk."],
] as const;

const AUDIENCES = [
  ["Early career", "Analysts, graduates and young professionals seeking high-quality entry points."],
  ["Investment professionals", "Associates, managers and senior professionals across private capital, infrastructure, DFI and related fields."],
  ["Global & diaspora talent", "Professionals seeking to work in Africa or move into Africa-focused mandates."],
] as const;

const PLATFORM_METRICS = [
  { value: JOBS.length, label: "Live roles" },
  { value: new Set(JOBS.map((job) => job.company)).size, label: "Employers" },
  { value: new Set(JOBS.flatMap((job) => (job.country ? [job.country] : []))).size, label: "Countries" },
  { value: new Set(JOBS.map((job) => job.roleType)).size, label: "Role categories" },
];

function ProofIcon({ type }: { type: "curated" | "reviewed" | "official" | "africa" }) {
  const paths = {
    curated: <><path d="M5 7.5h14v11H5z" /><path d="M8 7.5V5h8v2.5" /><path d="M9 13h6" /></>,
    reviewed: <><path d="M6 4.5h9l3 3V19.5H6z" /><path d="M15 4.5v3h3" /><path d="m9 13 2 2 4-4" /></>,
    official: <><path d="M12 3.5 19 7v5c0 4.2-2.9 7.2-7 8.5C7.9 19.2 5 16.2 5 12V7z" /><path d="m9.2 12.2 1.8 1.8 3.9-4" /></>,
    africa: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.3 2.2 3.5 4.9 3.5 8S14.3 17.8 12 20M12 4c-2.3 2.2-3.5 4.9-3.5 8s1.2 5.8 3.5 8" /></>,
  };

  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-acd-green">{paths[type]}</svg>;
}

function FocusIcon({ index }: { index: number }) {
  const paths = [
    <><path d="M4.5 18.5h15" /><path d="M6.5 16V10h3v6M10.5 16V6h3v10M14.5 16V8h3v8" /></>,
    <><path d="M4 18.5h16" /><path d="M6 18.5V12l6-6 6 6v6.5" /><path d="M10 18.5v-4h4v4" /></>,
    <><path d="M5.5 19V7.5L12 4l6.5 3.5V19" /><path d="M4 19h16M9 10h.01M15 10h.01M9 14h.01M15 14h.01" /></>,
    <><path d="M5 18.5V9.5h14v9" /><path d="M8 9.5V6.5h8v3M8.5 13h7M12 13v5.5" /></>,
    <><path d="M12 20V11" /><path d="M12 14c-5 0-7-3.2-7-7 4.4 0 7 2.2 7 7ZM12 11c0-4.8 2.8-7 7-7 0 4.6-2.2 7-7 7Z" /></>,
    <><path d="M5 18.5h14" /><path d="M7 16v-4M12 16V8M17 16v-7" /><path d="m5 9 4-3 3 2 5-4" /></>,
  ];

  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-acd-green">{paths[index]}</svg>;
}

export default function AboutPage() {
  return (
    <div className="max-w-[1180px] mx-auto px-5 pb-16 pt-14 md:px-8 md:pb-24 md:pt-[74px]">
      <section aria-labelledby="about-heading" className="grid gap-10 lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)] lg:items-center lg:gap-16">
        <div>
          <p className="m-0 text-[13px] font-semibold uppercase tracking-[2.4px] text-acd-green">About</p>
          <h1 id="about-heading" className="m-0 mt-4 max-w-[700px] font-serif text-[clamp(38px,4.8vw,57px)] font-medium leading-[1.04] tracking-[-1.2px] text-acd-navy">Built for serious Africa finance &amp; investment careers</h1>
          <p className="m-0 mt-7 max-w-[680px] text-[18px] leading-[1.65] text-acd-green-body md:text-[19px]">Africa Career Desk is a curated discovery platform for high-quality, Africa-focused opportunities across private capital, infrastructure, development finance, climate finance and strategy.</p>
          <p className="m-0 mt-4 max-w-[650px] text-[16px] leading-[1.65] text-acd-muted">We focus on fewer opportunities, stronger relevance and verified application sources.</p>
        </div>

        <aside aria-labelledby="proof-heading" className="border border-acd-green-pale-border bg-acd-green-pale p-6 md:p-7">
          <h2 id="proof-heading" className="m-0 font-serif text-[25px] font-medium tracking-[-0.4px] text-acd-navy">Why Africa Career Desk</h2>
          <div className="mt-5 divide-y divide-acd-border-green border-y border-acd-border-green">
            {[
              ["curated", "Curated, not scraped", "Roles are selected for relevance and career quality."],
              ["reviewed", "Reviewed opportunities", "Key role information and application sources are checked."],
              ["official", "Official application sources", "Candidates are directed to credible employer application channels."],
              ["africa", "Africa-focused by design", "The platform is built around Africa-facing finance and investment careers."],
            ].map(([type, title, description]) => (
              <div key={title} className="flex gap-4 py-3.5">
                <ProofIcon type={type as "curated" | "reviewed" | "official" | "africa"} />
                <div><h3 className="m-0 text-[15px] font-semibold text-acd-navy">{title}</h3><p className="m-0 mt-1 text-[14px] leading-[1.5] text-acd-muted">{description}</p></div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section aria-label="Platform snapshot" className="mt-14 border-y border-acd-border md:mt-[4.5rem]">
        <dl className="grid grid-cols-2 lg:grid-cols-4">
          {PLATFORM_METRICS.map((metric, index) => <div key={metric.label} className={`px-1 py-7 sm:px-5 md:py-8 ${index > 0 ? "lg:border-l lg:border-acd-border" : ""} ${index > 1 ? "border-t border-acd-border lg:border-t-0" : ""}`}><dt className="text-[13px] uppercase tracking-[1.7px] text-acd-dim">{metric.label}</dt><dd className="m-0 mt-2 font-serif text-[38px] font-medium leading-none tracking-[-0.8px] text-acd-navy">{metric.value}</dd></div>)}
        </dl>
      </section>

      <section aria-labelledby="why-heading" className="grid gap-7 py-14 md:grid-cols-[minmax(210px,0.7fr)_minmax(0,1.3fr)] md:gap-14 md:py-20">
        <div><p className="m-0 text-[13px] font-semibold uppercase tracking-[2.4px] text-acd-green">Purpose</p><h2 id="why-heading" className="m-0 mt-4 font-serif text-[clamp(30px,3.5vw,42px)] font-medium leading-[1.08] tracking-[-0.8px] text-acd-navy">Why ACD exists</h2></div>
        <div className="max-w-[680px] border-l border-acd-border-green pl-5 md:pl-8"><p className="m-0 text-[19px] font-medium leading-[1.58] text-acd-navy md:text-[20px]">Africa-focused career opportunities remain fragmented across employer websites, professional networks and general job boards.</p><p className="m-0 mt-5 text-[17px] leading-[1.65] text-acd-green-body">Africa Career Desk brings relevant opportunities into one curated place, making them easier to discover, assess and compare.</p></div>
      </section>

      <section aria-labelledby="approach-heading" className="border-t border-acd-border pt-14 md:pt-[4.5rem]">
        <div className="max-w-[660px]"><p className="m-0 text-[13px] font-semibold uppercase tracking-[2.4px] text-acd-green">Method</p><h2 id="approach-heading" className="m-0 mt-4 font-serif text-[clamp(30px,3.5vw,42px)] font-medium leading-[1.08] tracking-[-0.8px] text-acd-navy">Our curation approach</h2></div>
        <ol className="m-0 mt-10 grid list-none border-y border-acd-border p-0 md:grid-cols-4">
          {CURATION_STEPS.map(([number, title, description], index) => <li key={number} className={`min-h-[190px] px-0 py-7 sm:px-5 md:px-6 md:py-8 ${index > 0 ? "border-t border-acd-border md:border-l md:border-t-0" : ""}`}><span className="font-serif text-[27px] leading-none text-acd-green">{number}</span><h3 className="m-0 mt-7 font-serif text-[23px] font-medium tracking-[-0.3px] text-acd-navy">{title}</h3><p className="m-0 mt-3 text-[14px] leading-[1.6] text-acd-muted">{description}</p></li>)}
        </ol>
      </section>

      <section aria-labelledby="focus-heading" className="pt-14 md:pt-20">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="m-0 text-[13px] font-semibold uppercase tracking-[2.4px] text-acd-green">Coverage</p><h2 id="focus-heading" className="m-0 mt-4 font-serif text-[clamp(30px,3.5vw,42px)] font-medium leading-[1.08] tracking-[-0.8px] text-acd-navy">What we focus on</h2></div><p className="m-0 max-w-[330px] text-[15px] leading-[1.6] text-acd-muted sm:text-right">Selected pathways across Africa-facing finance, investment and strategy.</p></div>
        <ul className="m-0 mt-10 grid list-none overflow-hidden border border-acd-green-pale-border bg-acd-green-pale p-0 md:grid-cols-3">
          {FOCUS_AREAS.map((area, index) => <li key={area} className={`flex min-h-[112px] items-center gap-4 px-5 py-6 ${index > 0 ? "border-t border-acd-green-pale-border" : ""} ${index % 3 !== 0 ? "md:border-l" : ""} ${index < 3 ? "md:border-t-0" : ""}`}><FocusIcon index={index} /><span className="text-[15px] font-medium leading-[1.4] text-acd-navy">{area}</span></li>)}
        </ul>
      </section>

      <section aria-labelledby="audience-heading" className="pt-14 md:pt-20">
        <div className="max-w-[640px]"><p className="m-0 text-[13px] font-semibold uppercase tracking-[2.4px] text-acd-green">Audience</p><h2 id="audience-heading" className="m-0 mt-4 font-serif text-[clamp(30px,3.5vw,42px)] font-medium leading-[1.08] tracking-[-0.8px] text-acd-navy">Who it&apos;s for</h2></div>
        <div className="mt-10 grid border-y border-acd-border md:grid-cols-3">
          {AUDIENCES.map(([title, description], index) => <div key={title} className={`py-7 md:px-7 md:py-8 ${index > 0 ? "border-t border-acd-border md:border-l md:border-t-0" : ""}`}><h3 className="m-0 font-serif text-[24px] font-medium tracking-[-0.35px] text-acd-navy">{title}</h3><p className="m-0 mt-4 text-[15px] leading-[1.65] text-acd-muted">{description}</p></div>)}
        </div>
      </section>

      <section aria-labelledby="explore-heading" className="mt-16 border border-acd-green-pale-border bg-acd-green-pale px-6 py-10 md:mt-24 md:px-12 md:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-12"><div className="max-w-[720px]"><p className="m-0 text-[13px] font-semibold uppercase tracking-[2.4px] text-acd-green">Africa Career Desk</p><h2 id="explore-heading" className="m-0 mt-4 font-serif text-[clamp(30px,3.8vw,44px)] font-medium leading-[1.08] tracking-[-0.8px] text-acd-navy">Explore Africa-focused opportunities</h2><p className="m-0 mt-4 text-[17px] leading-[1.6] text-acd-green-body">Discover curated roles across private capital, infrastructure, development finance, climate finance and more.</p></div><div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row"><Link href="/" className="inline-flex min-h-[46px] items-center justify-center rounded-[11px] bg-acd-green px-6 text-[15px] font-semibold text-white no-underline transition-colors hover:bg-acd-green-mid">Browse opportunities</Link><BeehiivNewsletterSection variant="trigger" /></div></div>
      </section>
    </div>
  );
}
