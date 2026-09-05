import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Subscription confirmed | Africa Career Desk",
  description: "Your Africa Career Desk newsletter subscription is confirmed.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NewsletterConfirmedPage() {
  return (
    <section className="mx-auto max-w-[1180px] px-5 py-14 md:px-8 md:py-[72px]">
      <div className="max-w-[680px] rounded-[20px] border border-acd-green-pale-border bg-acd-green-pale px-6 py-8 md:px-9 md:py-10">
        <p className="m-0 text-[13px] font-semibold uppercase tracking-[2.4px] text-acd-green">
          Newsletter
        </p>
        <h1 className="m-0 mt-3 font-serif text-[clamp(34px,5vw,46px)] font-medium leading-[1.1] tracking-[-1px] text-acd-navy">
          Your subscription is confirmed
        </h1>
        <p className="m-0 mt-5 text-[17px] leading-[1.65] text-acd-green-body">
          Thank you for joining Africa Career Desk. Curated opportunities and career intelligence will arrive in your inbox.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex min-h-[46px] items-center justify-center rounded-[11px] bg-acd-green px-6 text-[15px] font-semibold text-white no-underline transition-colors hover:bg-acd-green-mid focus:outline-none focus:ring-2 focus:ring-acd-green focus:ring-offset-2"
        >
          Explore opportunities
        </Link>
      </div>
    </section>
  );
}
