"use client";

import { useEffect } from "react";
import type { Opportunity } from "@/types";
import { trackJobDetailViewed } from "@/lib/analytics";

/** Fires a `job_detail_viewed` event once when a job detail page mounts. */
export default function JobDetailTracker({ job }: { job: Opportunity }) {
  useEffect(() => {
    trackJobDetailViewed(job);
    // Only re-fire when navigating to a different job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  return null;
}
