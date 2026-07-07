"use client";

import { useEffect } from "react";
import type { BoardSection } from "@/types";
import { trackSectionViewed } from "@/lib/analytics";

/** Fires a `section_viewed` event once when a board section mounts. */
export default function SectionViewTracker({
  section,
}: {
  section: BoardSection;
}) {
  useEffect(() => {
    trackSectionViewed(section);
  }, [section]);

  return null;
}
