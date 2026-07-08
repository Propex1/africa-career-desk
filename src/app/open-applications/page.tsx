import type { Metadata } from "next";
import OpenAppCard from "@/components/OpenAppCard";
import SectionViewTracker from "@/components/analytics/SectionViewTracker";
import { OPEN_APPLICATIONS } from "@/data/opportunities";

const OPEN_APPLICATIONS_DESCRIPTION =
  "Find open application channels for Africa-focused finance, investment, DFI, infrastructure, VC, climate and strategy roles.";

export const metadata: Metadata = {
  title: "Open Applications | Africa Career Desk",
  description: OPEN_APPLICATIONS_DESCRIPTION,
  openGraph: {
    siteName: "Africa Career Desk",
    type: "website",
    title: "Open Applications | Africa Career Desk",
    description: OPEN_APPLICATIONS_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: "Open Applications | Africa Career Desk",
    description: OPEN_APPLICATIONS_DESCRIPTION,
  },
};

export default function OpenApplicationsPage() {
  return (
    <section className="max-w-[1180px] mx-auto px-5 md:px-8 py-14 md:py-[54px]">
      <SectionViewTracker section="Open Applications" />
      <p className="m-0 mb-4 text-[13px] font-semibold tracking-[2.4px] text-acd-green uppercase">
        Speculative Applications
      </p>
      <h1 className="m-0 font-serif font-medium text-[clamp(34px,5.5vw,54px)] leading-[1.05] tracking-[-1px] text-acd-navy max-w-[740px]">
        Firms accepting open applications
      </h1>
      <p className="mt-[22px] text-[18px] leading-relaxed text-acd-muted max-w-[660px]">
        Selected investors and institutions that welcome speculative applications
        from strong candidates, even when no specific role is advertised. Apply
        directly through their official channels.
      </p>

      <div className="mt-[42px] grid grid-cols-1 md:grid-cols-2 gap-4">
        {OPEN_APPLICATIONS.map((o) => (
          <OpenAppCard key={o.id} item={o} />
        ))}
      </div>
    </section>
  );
}
