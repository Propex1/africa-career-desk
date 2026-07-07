import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getJobBySlug, JOBS } from "@/data/opportunities";
import LogoContainer from "@/components/LogoContainer";
import BackButton from "@/components/BackButton";
import ApplyLink from "@/components/analytics/ApplyLink";
import JobDetailTracker from "@/components/analytics/JobDetailTracker";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return JOBS.map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) return { title: "Role not found | Africa Career Desk" };
  return {
    title: `${job.title} at ${job.company} | Africa Career Desk`,
    description: job.summary,
  };
}

export default async function JobDetailPage({ params }: Props) {
  const { slug } = await params;
  const job = getJobBySlug(slug);
  if (!job) notFound();

  const metaItems = [
    { label: "Role type", value: job.roleType },
    job.experienceBucket ? { label: "Experience", value: job.experienceBucket } : null,
    job.language ? { label: "Language", value: job.language } : null,
    job.deadlineDisplay ? { label: "Deadline", value: job.deadlineDisplay } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <section className="max-w-[1180px] mx-auto px-5 md:px-8 py-9 pb-[72px]">
      <JobDetailTracker job={job} />

      {/* Back */}
      <BackButton />

      <div className="flex gap-10 items-start flex-wrap">
        {/* ── Left content ── */}
        <div className="flex-1 min-w-[320px]">
          {/* Header */}
          <div className="flex items-start gap-[22px] flex-wrap">
            <LogoContainer
              company={job.company}
              initials={job.companyInitials}
              logoUrl={job.logoUrl}
              size="lg"
            />
            <div className="flex-1 min-w-[240px]">
              <h1 className="m-0 font-serif font-medium text-[38px] leading-[1.1] tracking-[-0.5px] text-acd-navy">
                {job.title}
              </h1>
              <p className="m-0 mt-2 text-[17px] font-semibold text-acd-green">
                {job.company}
              </p>
              <p className="m-0 mt-[6px] text-[15px] text-acd-dim flex items-center gap-[7px]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9AA6AB"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 21s-6-5.2-6-10a6 6 0 1112 0c0 4.8-6 10-6 10z" />
                  <circle cx="12" cy="11" r="2.2" />
                </svg>
                {job.locationDisplay}{job.region ? ` · ${job.region}` : ""}
              </p>
            </div>
          </div>

          {/* Meta grid */}
          <div className="mt-7 border border-acd-border rounded-[16px] px-[26px] py-0 bg-white grid grid-cols-2 sm:grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
            {metaItems.map(({ label, value }) => (
              <div key={label} className="py-[18px]">
                <p className="m-0 text-[12px] tracking-[0.5px] uppercase text-acd-dimest font-semibold">
                  {label}
                </p>
                <p className="m-0 mt-[6px] text-[15px] text-acd-navy font-semibold">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Summary */}
          <h2 className="mt-[38px] m-0 font-serif font-semibold text-[23px] text-acd-navy">
            Summary
          </h2>
          <p className="mt-[14px] text-[16px] leading-[1.7] text-acd-green-body">
            {job.summary}
          </p>

          {/* About the role */}
          {job.aboutRole && (
            <>
              <h2 className="mt-9 m-0 font-serif font-semibold text-[23px] text-acd-navy">
                About the role
              </h2>
              <p className="mt-[14px] text-[16px] leading-[1.7] text-acd-green-body">
                {job.aboutRole}
              </p>
            </>
          )}

          {/* Responsibilities */}
          {job.responsibilities && job.responsibilities.length > 0 && (
            <>
              <h2 className="mt-9 m-0 font-serif font-semibold text-[23px] text-acd-navy">
                Key responsibilities
              </h2>
              <div className="mt-[14px] flex flex-col gap-3">
                {job.responsibilities.map((item, i) => (
                  <div key={i} className="flex gap-[13px] items-start">
                    <span className="mt-[10px] w-[6px] h-[6px] rounded-full bg-acd-green shrink-0" />
                    <p className="m-0 text-[16px] leading-[1.6] text-acd-green-body">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <>
              <h2 className="mt-9 m-0 font-serif font-semibold text-[23px] text-acd-navy">
                Key requirements
              </h2>
              <div className="mt-[14px] flex flex-col gap-3">
                {job.requirements.map((item, i) => (
                  <div key={i} className="flex gap-[13px] items-start">
                    <svg
                      className="mt-[3px] shrink-0"
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#16522A"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    <p className="m-0 text-[16px] leading-[1.6] text-acd-green-body">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Nice to have */}
          {job.niceToHave && job.niceToHave.length > 0 && (
            <>
              <h2 className="mt-9 m-0 font-serif font-semibold text-[23px] text-acd-navy">
                Nice to have
              </h2>
              <div className="mt-[14px] flex flex-col gap-3">
                {job.niceToHave.map((item, i) => (
                  <div key={i} className="flex gap-[13px] items-start">
                    <span className="mt-[10px] w-[6px] h-[6px] rounded-full bg-[#CBDDD0] shrink-0" />
                    <p className="m-0 text-[16px] leading-[1.6] text-acd-green-body">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Application notes */}
          {job.applicationNotes && (
            <div className="mt-9 bg-acd-green-pale border border-acd-green-pale-border rounded-[14px] px-[22px] py-[18px] flex gap-[14px] items-start">
              <svg
                className="mt-[2px] shrink-0 text-acd-green"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              <p className="m-0 text-[15px] leading-[1.65] text-acd-green-body">
                {job.applicationNotes}
              </p>
            </div>
          )}
        </div>

        {/* ── Apply card (sticky) ── */}
        <aside className="w-full md:w-[330px] shrink-0 md:sticky md:top-[104px]">
          <div className="bg-white border border-acd-border rounded-[18px] p-[26px] shadow-[0_10px_36px_-22px_rgba(20,43,63,0.3)]">
            {/* Verified badge */}
            <span className="inline-flex items-center gap-2 bg-acd-verified-bg text-acd-green-mid text-[12.5px] font-semibold px-[13px] py-[7px] rounded-full">
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
                <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              Source verified
            </span>

            {/* Details */}
            <div className="mt-5 flex flex-col gap-[15px]">
              <div>
                <p className="m-0 text-[12px] tracking-[0.5px] uppercase text-acd-dimest font-semibold">
                  Source
                </p>
                <p className="m-0 mt-1 text-[15px] text-acd-navy font-semibold">
                  {job.sourceType}
                </p>
                {job.sourceDescription && (
                  <p className="m-0 mt-[6px] text-[13px] leading-snug text-acd-dim">
                    {job.sourceDescription}
                  </p>
                )}
              </div>
              <div>
                <p className="m-0 text-[12px] tracking-[0.5px] uppercase text-acd-dimest font-semibold">
                  Last checked
                </p>
                <p className="m-0 mt-1 text-[15px] text-acd-navy font-semibold">
                  {job.lastChecked}
                </p>
              </div>
              <div>
                <p className="m-0 text-[12px] tracking-[0.5px] uppercase text-acd-dimest font-semibold">
                  Status
                </p>
                <p className="m-0 mt-1 text-[15px] text-acd-green font-semibold flex items-center gap-[7px]">
                  <span className="w-[7px] h-[7px] rounded-full bg-acd-green" />
                  Active
                </p>
              </div>
            </div>

            {/* CTA */}
            <ApplyLink
              job={job}
              href={job.applyUrl}
              className="mt-[22px] w-full inline-flex items-center justify-center gap-[9px] bg-acd-green hover:bg-acd-green-dark text-white border-0 rounded-[12px] py-4 text-[15.5px] font-semibold cursor-pointer font-sans transition-colors duration-150 no-underline"
            >
              {job.applyButtonText}
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 17L17 7M9 7h8v8" />
              </svg>
            </ApplyLink>

            <p className="mt-[15px] text-[12.5px] text-acd-dimest text-center leading-snug">
              {job.applyUrl.startsWith("mailto:")
                ? "Opens your email client to contact the employer."
                : "Opens the official employer page in a new tab."}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
