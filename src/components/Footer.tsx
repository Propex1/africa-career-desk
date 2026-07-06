import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-acd-border bg-acd-surface mt-5">
      <div className="max-w-[1180px] mx-auto px-8 py-5">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <Link href="/" className="flex items-center gap-2 no-underline">
            <span
              className="relative inline-flex items-center justify-center border-[1.3px] border-acd-navy-soft rounded-[7px] font-serif font-semibold text-[11px] tracking-[0.3px] text-acd-navy-soft"
              style={{ width: 32, height: 28 }}
            >
              ACD
              <span className="absolute left-[5px] right-[5px] bottom-[5px] h-[1.4px] bg-acd-green rounded-sm" />
            </span>
            <span className="font-serif font-semibold text-[15px] text-acd-navy-soft">
              Africa Career Desk
            </span>
          </Link>

          <nav className="flex gap-6 flex-wrap">
            {[
              { label: "Jobs", href: "/" },
              { label: "Programmes", href: "/programmes" },
              { label: "Open Applications", href: "/open-applications" },
              { label: "About", href: "/about" },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="text-[13.5px] text-acd-dim hover:text-acd-green transition-colors no-underline"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-4 pt-4 border-t border-[#EEEEE7] flex items-center justify-between gap-4 flex-wrap">
          <p className="m-0 text-[12.5px] text-acd-dimmer">
            Curated Africa finance, investment and infrastructure opportunities.
          </p>
          <p className="m-0 text-[12.5px] text-acd-dimmer">
            &copy; 2026 Africa Career Desk
          </p>
        </div>

        <p data-nosnippet className="mt-3 text-[11.5px] leading-relaxed text-acd-dimmer">
          Africa Career Desk is an independent curated job-discovery platform.
          Company names and logos are used only to identify listed
          opportunities. Applications are submitted through official employer or
          application pages.
        </p>
      </div>
    </footer>
  );
}
