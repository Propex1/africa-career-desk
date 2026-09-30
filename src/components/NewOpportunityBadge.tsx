"use client";

import { useEffect, useState } from "react";
import { isNewlyPublished } from "@/lib/opportunity-publication";

interface NewOpportunityBadgeProps {
  publishedAt?: string;
}

export default function NewOpportunityBadge({ publishedAt }: NewOpportunityBadgeProps) {
  // Keep server and initial client markup identical across time zones.
  // The effect applies the reader's calendar date and refreshes it at midnight.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const refresh = () => setVisible(isNewlyPublished({ publishedAt }));
    let timer: number;
    const scheduleRefresh = () => {
      refresh();
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = window.setTimeout(scheduleRefresh, nextMidnight.getTime() - now.getTime() + 50);
    };
    scheduleRefresh();
    return () => window.clearTimeout(timer);
  }, [publishedAt]);

  if (!visible) return null;
  return <span className="inline-flex items-center rounded-full bg-[#edf5ed] px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] text-acd-green-mid">New</span>;
}
