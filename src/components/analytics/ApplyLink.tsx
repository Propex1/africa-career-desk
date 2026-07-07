"use client";

import type { Opportunity } from "@/types";
import { trackApplyClicked } from "@/lib/analytics";

/**
 * External apply/source link that records an `apply_clicked` event.
 * Styling and contents are passed in so each surface keeps its own markup.
 */
export default function ApplyLink({
  job,
  href,
  className,
  children,
}: {
  job: Opportunity;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackApplyClicked(job)}
    >
      {children}
    </a>
  );
}
