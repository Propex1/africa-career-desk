import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Africa Career Desk",
  description:
    "Africa Career Desk is a curated discovery platform for high-quality, Africa-focused roles in finance, investment, infrastructure, private capital, venture capital, climate finance and strategy.",
};

const FOCUS_AREAS = [
  "Private Equity & Private Capital",
  "Venture Capital & Growth Equity",
  "Infrastructure & Project Finance",
  "DFI / MDB investment roles",
  "Climate Finance & Impact Investing",
  "Corporate Development, M&A & Strategy",
];

function CheckIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#16522A"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <section className="max-w-[1180px] mx-auto px-5 md:px-8 py-14 md:py-[54px]">
      <div className="max-w-[820px]">
        <p className="m-0 mb-4 text-[13px] font-semibold tracking-[2.4px] text-acd-green uppercase">
          About
        </p>
        <h1 className="m-0 font-serif font-medium text-[clamp(34px,5vw,48px)] leading-[1.1] tracking-[-1px] text-acd-navy">
          Built for serious Africa finance &amp; investment careers
        </h1>
        <p className="mt-[26px] text-[19px] leading-[1.65] text-acd-green-body">
          Africa Career Desk is a curated discovery platform for high-quality,
          Africa-focused roles in finance, investment, infrastructure, private
          capital, venture capital, climate finance and strategy.
        </p>
        <p className="mt-[18px] text-[16px] leading-[1.7] text-acd-green-body">
          We are not a general job board. We focus on a smaller number of
          genuinely relevant opportunities from credible employers, making them
          easier to find and compare.
        </p>

        <h2 className="mt-12 m-0 font-serif font-semibold text-[26px] text-acd-navy">
          Our standard
        </h2>
        <p className="mt-[14px] text-[16px] leading-[1.7] text-acd-green-body">
          Every role on Africa Career Desk is selected with four things in mind:
          employer quality, career relevance, Africa exposure and a verified
          application source.
        </p>
        <p className="mt-[14px] text-[16px] leading-[1.7] text-acd-green-body">
          If a role appears here, it should be worth the attention of candidates
          looking for serious Africa-focused finance and investment opportunities.
        </p>

        <h2 className="mt-11 m-0 font-serif font-semibold text-[26px] text-acd-navy">
          What we focus on
        </h2>
        <div className="mt-[18px] bg-acd-green-pale border border-acd-green-pale-border rounded-[18px] p-[26px_30px] grid grid-cols-1 sm:grid-cols-2 gap-[14px_28px]">
          {FOCUS_AREAS.map((item) => (
            <p
              key={item}
              className="m-0 text-[15.5px] text-[#243B30] font-medium flex gap-[11px] items-center"
            >
              <CheckIcon />
              {item}
            </p>
          ))}
        </div>

        <h2 className="mt-11 m-0 font-serif font-semibold text-[26px] text-acd-navy">
          Our curation approach
        </h2>
        <p className="mt-[14px] text-[16px] leading-[1.7] text-acd-green-body">
          We focus on roles with clear career value, credible employers and
          strong relevance to Africa-focused finance, investment or strategy
          careers.
        </p>
        <p className="mt-[14px] text-[16px] leading-[1.7] text-acd-green-body">
          This means we do not try to list every job in Africa. Instead, we
          select opportunities that fit the platform&apos;s promise: fewer roles,
          higher relevance and better signal.
        </p>

        <h2 className="mt-11 m-0 font-serif font-semibold text-[26px] text-acd-navy">
          Who it&apos;s for
        </h2>
        <p className="mt-[14px] text-[16px] leading-[1.7] text-acd-green-body">
          Africa Career Desk is built for globally trained African and
          Africa-focused talent, including analysts, associates, managers and
          senior professionals from private equity, DFIs, infrastructure,
          venture capital, climate finance, M&amp;A, consulting and strategy.
        </p>
        <p className="mt-[14px] text-[16px] leading-[1.7] text-acd-green-body">
          It is for people who want to work in Africa or on Africa-focused
          mandates without compromising on career quality.
        </p>
      </div>
    </section>
  );
}
