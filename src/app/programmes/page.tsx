import type { Metadata } from "next";
import ProgrammeCard from "@/components/ProgrammeCard";
import SectionViewTracker from "@/components/analytics/SectionViewTracker";
import { PROGRAMMES } from "@/data/opportunities";

const PROGRAMMES_DESCRIPTION =
  "Explore Africa-focused graduate programmes, fellowships, internships and early-career pathways in finance, investment, development finance, infrastructure and strategy.";

export const metadata: Metadata = {
  title: "Programmes | Africa Career Desk",
  description: PROGRAMMES_DESCRIPTION,
  openGraph: {
    siteName: "Africa Career Desk",
    type: "website",
    title: "Programmes | Africa Career Desk",
    description: PROGRAMMES_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "Programmes | Africa Career Desk",
    description: PROGRAMMES_DESCRIPTION,
  },
};

export default function ProgrammesPage() {
  return (
    <section className="max-w-[1180px] mx-auto px-5 md:px-8 py-14 md:py-[54px]">
      <SectionViewTracker section="Programmes" />
      <p className="m-0 mb-4 text-[13px] font-semibold tracking-[2.4px] text-acd-green uppercase">
        Structured Pathways
      </p>
      <h1 className="m-0 font-serif font-medium text-[clamp(34px,5.5vw,54px)] leading-[1.05] tracking-[-1px] text-acd-navy max-w-[740px]">
        Graduate programmes &amp; fellowships
      </h1>
      <p className="mt-[22px] text-[18px] leading-relaxed text-acd-muted max-w-[640px]">
        Explore Africa-focused graduate programmes, fellowships, internships and
        early-career pathways in finance, investment, development finance,
        infrastructure and strategy. Selective multi-year programmes from leading
        investors and development finance institutions.
      </p>

      <div className="mt-[42px] flex flex-col gap-[14px]">
        {PROGRAMMES.map((p) => (
          <ProgrammeCard key={p.id} programme={p} />
        ))}
      </div>

      <p className="mt-[30px] text-center text-[14px] text-acd-dimmer flex items-center justify-center gap-[9px]">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#16522A"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        All programmes link to the official provider page.
      </p>
    </section>
  );
}
