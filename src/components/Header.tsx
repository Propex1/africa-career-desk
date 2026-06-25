"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Jobs", href: "/" },
  { label: "Programmes", href: "/programmes" },
  { label: "Open Applications", href: "/open-applications" },
  { label: "About", href: "/about" },
];

function AcdMark({ compact }: { compact?: boolean }) {
  const dim = compact
    ? { w: 42, h: 34, text: "text-[12px]", radius: "rounded-[9px]", borderW: "border-[1.4px]", linePos: "left-[6px] right-[6px] bottom-[6px] h-[1.6px]" }
    : { w: 54, h: 44, text: "text-base", radius: "rounded-[11px]", borderW: "border-[1.5px]", linePos: "left-[9px] right-[9px] bottom-[9px] h-0.5" };
  return (
    <span
      className={`relative inline-flex items-center justify-center ${dim.borderW} border-acd-navy ${dim.radius} font-serif font-semibold ${dim.text} tracking-[0.5px] text-acd-navy`}
      style={{ width: dim.w, height: dim.h }}
    >
      ACD
      <span className={`absolute ${dim.linePos} bg-acd-green rounded-sm`} />
    </span>
  );
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/" || pathname.startsWith("/jobs");
    return pathname.startsWith(href);
  }

  return (
    <header className="border-b border-acd-border sticky top-0 z-40 bg-[rgba(251,251,248,0.9)] backdrop-saturate-[140%] backdrop-blur-[6px]">
      <div className="max-w-[1180px] mx-auto px-8 py-[18px] flex items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 no-underline shrink-0 focus:outline-none focus-visible:shadow-[0_0_0_2px_rgba(22,82,42,0.28)] focus-visible:rounded-[11px]">
          <AcdMark />
          <span className="font-serif font-semibold text-[22px] tracking-[-0.2px] text-acd-navy whitespace-nowrap">
            Africa Career Desk
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-[38px]">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={`text-[15.5px] font-medium no-underline pb-[6px] pt-[6px] border-b-[2px] transition-colors focus:outline-none ${
                isActive(href)
                  ? "text-acd-navy border-acd-green"
                  : "text-acd-dim border-transparent hover:text-acd-navy focus-visible:shadow-[0_0_0_2px_rgba(22,82,42,0.28)] focus-visible:rounded-[3px]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="lg:hidden flex items-center justify-center w-11 h-11 border border-acd-border-light rounded-[11px] bg-white text-acd-navy cursor-pointer focus:outline-none focus-visible:shadow-[0_0_0_2px_rgba(22,82,42,0.28)]"
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-acd-surface border-b border-acd-border shadow-[0_16px_32px_-18px_rgba(20,43,63,0.28)] px-4 pb-4 pt-2 flex flex-col gap-1 z-50">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`text-left no-underline text-[16px] font-medium px-3 py-[13px] rounded-[9px] transition-colors focus:outline-none ${
                isActive(href)
                  ? "text-acd-green-mid font-semibold"
                  : "text-acd-navy hover:bg-[#F0F4F0] focus-visible:shadow-[0_0_0_2px_rgba(22,82,42,0.28)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
